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

    fs.mkdirSync(path.join(OUTPUT_DIRECTORY, 'cursors'), { recursive: true });

    const cursors = {};
  
    const files = fs.readdirSync(SPRITE_DIRECTORY);
    for (const file of files) {
      if (!file.endsWith('.png')) {
        continue;
      }

      let image = await pixels(path.join(SPRITE_DIRECTORY, file));

      if (image.width !== image.height) {
        throw new Error(`Image ${file} is not a square!`);
      }

      const baseName = path.basename(file, path.extname(file));
      const propertyString = baseName.replace(/_@[0-9]+x$/, '');
      const properties = propertyString.split(', ').reduce((accumulator, cur) => {
        const [key, value] = cur.split('=');
        accumulator[key] = value;
        return accumulator;
      }, {});
  
      cursors[properties.name] = cursors[properties.name] || {};
      cursors[properties.name][image.width] = cursors[properties.name][image.width] || {};
      cursors[properties.name][image.width][properties.frame] = {
        type: image.width,
        xhot: properties.hotspot_x,
        yhot: properties.hotspot_y,
        data: image.data,
        delay: properties.frame_duration,
      };
    }

    Object.entries(cursors).forEach(([name, sizes]) => {
      const images = [];
      Object.entries(sizes).forEach(([size, frames]) => {
        Object.entries(frames).forEach(([frame, data]) => {
          images.push(data);
        });
      });
      const encoder = new Encoder(images);
      fs.writeFileSync(path.join(OUTPUT_DIRECTORY, 'cursors', name), Buffer.from(encoder.pack()));
    });
    
    fs.writeFileSync(
      path.join(OUTPUT_DIRECTORY, 'index.theme'),
      `[Icon Theme]\nName=${THEME_NAME}\n${THEME_COMMENT ? `Comment=${THEME_COMMENT}\n` : ''}`
    );

  } catch (error) {
    core.setFailed(error.message);
  }
})();
