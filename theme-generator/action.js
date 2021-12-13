const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
var pixels = require('image-pixels')
var Encoder = require('xcursor').Encoder;

(async() => {
  try {
    const SPRITE_DIRECTORY = path.normalize(core.getInput('sprite_directory'));
    const OUTPUT_DIRECTORY = path.normalize(core.getInput('output_directory'));
    const THEME_NAME = core.getInput('theme_name');
    const THEME_COMMENT = core.getInput('theme_comment');

    const cursors = {};
  
    core.info(`Reading files from ${SPRITE_DIRECTORY}`);
    const files = fs.readdirSync(SPRITE_DIRECTORY);
    for (const file of files) {
      if (!file.endsWith('.png')) {
        core.debug(`Skipping ${file}, it is not a png file.`);
        continue;
      }

      core.debug(`Reading ${file} and flipping red and blue channels.`);
      let image = await pixels(path.join(SPRITE_DIRECTORY, file));
      // x11 cursors require BGRA data instead of RGBA
      for (let i = 0; i < image.data.length; i += 4) {
        let r = image.data[i];
        let b = image.data[i + 2];
        image.data[i] = b;
        image.data[i + 2] = r;
      }

      const baseName = path.basename(file, path.extname(file));
      const propertyString = baseName.replace(/_@[0-9]+x$/, '');
      const properties = propertyString.split(', ').reduce((accumulator, cur) => {
        const [key, value] = cur.split('=');
        accumulator[key] = value;
        return accumulator;
      }, {});

      const requiredProperties = ['name', 'hotspot_x', 'hotspot_y', 'frame', 'frame_delay', 'variant'];
      // check if properties are missing
      for (const property of requiredProperties) {
        if (!(property in properties)) {
          core.debug(`Skipping ${file}, it is missing the ${property} property.`);
          continue;
        }
      }

      if (image.width !== image.height) {
        throw new Error(`Image ${file} is not a square!`);
      }
      
      cursors[properties.variant] = cursors[properties.variant] || {};
      cursors[properties.variant][properties.name] = cursors[properties.variant][properties.name] || {};
      cursors[properties.variant][properties.name][image.width] = cursors[properties.variant][properties.name][image.width] || {};
      cursors[properties.variant][properties.name][image.width][properties.frame] = {
        type: image.width,
        xhot: properties.hotspot_x,
        yhot: properties.hotspot_y,
        data: image.data,
        delay: properties.frame_delay,
      };
    }

    const generateVariant = (variant) => {
      const defaultSlug = `${THEME_NAME}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const slug = `${THEME_NAME}${variant === 'default' ? '' : `-${variant}`}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      core.debug(`Creating directory ${path.join(OUTPUT_DIRECTORY, slug, 'cursors')}`);
      fs.mkdirSync(path.join(OUTPUT_DIRECTORY, slug, 'cursors'), { recursive: true });

      if (variant !== 'default') {
        core.info(`Symlinking missing cursors from default to variant ${variant}`);
        for (const cursorName in cursors.default) {
          if (!cursors[variant][cursorName]) {
            core.debug(`Symlinking ${cursorName} from default to variant ${variant}`);
            fs.symlinkSync(
              path.relative(
                path.join(OUTPUT_DIRECTORY, slug, 'cursors'),
                path.join(OUTPUT_DIRECTORY, defaultSlug, 'cursors', cursorName)
              ),
              path.join(OUTPUT_DIRECTORY, slug,'cursors', cursorName)
            );
          }
        }
      }
    
      Object.entries(cursors[variant]).forEach(([name, sizes]) => {
        const images = [];
        Object.entries(sizes).forEach(([size, frames]) => {
          const animated = Object.keys(frames).length > 1;
          Object.entries(frames).forEach(([frame, data]) => {
            data.delay = animated ? data.delay : 50;
            images.push(data);
          });
        });
        core.debug(`Generating cursor ${name} from ${images.length} images.`);
        const encoder = new Encoder(images);
        fs.writeFileSync(
          path.join(OUTPUT_DIRECTORY, slug, 'cursors', name),
          Buffer.from(encoder.pack())
        );
      });
      
      core.debug(`Creating index.theme file for variant ${variant}`);
      fs.writeFileSync(
        path.join(OUTPUT_DIRECTORY, slug, 'index.theme'),
        `[Icon Theme]\nName=${THEME_NAME}${variant === 'default' ? '' : ` - ${variant}`}\n${THEME_COMMENT ? `Comment=${THEME_COMMENT}\n` : ''}`
      );
    }

    core.info(`Generating cursors for default variant.`);
    generateVariant('default');

    for (const variant of Object.keys(cursors)) {
      if (variant !== 'default') {
        core.info(`Generating cursors for ${variant} variant.`);
        generateVariant(variant);
      }
    }

  } catch (error) {
    core.setFailed(error.message);
  }
})();
