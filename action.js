const core = require('@actions/core');
const fs = require('fs-extra');
const https = require('https');
const path = require('path');
const Figma = require('figma-js');
const { Encoder } = require('xcursor');
const sharp = require('sharp');
const got = require('got');

(async () => {
  try {
    const FIGMA_ACCESS_TOKEN = core.getInput('figma_access_token', { required: true });
    const FIGMA_FILE_KEY = core.getInput('figma_file_key', { required: true });

    const ALIAS_COMPONENT_SET_ID = core.getInput('alias_component_set_id', { required: true });
    const SPRITE_COMPOENT_SET_ID = core.getInput('sprite_component_set_id', { required: true });

    const THEME_DIRECTORY = core.getInput('theme_directory', { required: true });
    const EXPORT_DIRECTORY = core.getInput('export_directory');
    const SVG_DIRECTORY = core.getInput('svg_directory');

    const THEME_NAME = core.getInput('theme_name', { required: true });
    const THEME_COMMENT = core.getInput('theme_comment');

    const client = Figma.Client({ personalAccessToken: FIGMA_ACCESS_TOKEN });

    const file = await client.file(FIGMA_FILE_KEY);

    if (file.status !== 200) {
      throw Error(`Failed to fetch Figma file '${FIGMA_FILE_KEY}' with status code ${file.status}`);
    }

    core.setOutput('version', file.data.version);

    const getExports = (node, previousExports = {}) => {
      const exports = previousExports;
      node.exportSettings?.forEach((settings) => {
        const format = settings.format.toLowerCase();
        const scale = settings.constraint.value;
        exports[format] ??= {};
        exports[format][scale] ??= {};
        exports[format][scale][node.id] = `${node.name}${settings.suffix ? `_${settings.suffix}` : ''}.${format}`;
      });
      node.children?.forEach((child) => getExports(child, exports));
      return exports;
    };

    const downloadFigmaExports = async (exports) => {
      if (!fs.existsSync(EXPORT_DIRECTORY)) {
        fs.mkdirSync(EXPORT_DIRECTORY, { recursive: true });
      }
      await Promise.all(Object.entries(exports).map(async ([format, scales]) => {
        await Promise.all(Object.entries(scales).map(async ([scale, nodes]) => {
          const imagesResponse = await client.fileImages(FIGMA_FILE_KEY, {
            ids: Object.keys(nodes),
            scale,
            format,
          });
          if (imagesResponse.status !== 200) {
            throw Error(`Failed to fetch Figma file images with status code ${imagesResponse.status}.`);
          }
          await Promise.all(Object.entries(imagesResponse.data.images).map(async ([id, url]) => {
            const filePath = path.join(EXPORT_DIRECTORY, exports[format][scale][id]);
            const request = https.get(url, (response) => {
              if (response.statusCode !== 200) {
                throw Error(`Failed to download ${url} with status code ${response.statusCode}.`);
              }
              response.pipe(fs.createWriteStream(filePath));
            });
            await new Promise((resolve, reject) => {
              request.on('error', reject);
              request.on('finish', resolve);
            });
            core.debug(`downloaded ${filePath} from ${url}`);
          }));
        }));
      }));
    };

    if (EXPORT_DIRECTORY) {
      await downloadFigmaExports(getExports(file.data.document));
    }

    const parseProperties = (propertiesString) => propertiesString.split(', ').reduce((acc, cur) => {
      const [key, value] = cur.split('=');
      return { ...acc, [key]: value };
    }, {});

    const aliases = Object.entries(file.data.components)
      .filter(([, value]) => value.componentSetId === ALIAS_COMPONENT_SET_ID)
      .map(([, value]) => parseProperties(value.name));

    const getSprites = async (node) => {
      const sprites = Object.entries(node)
        .filter(([, value]) => value.componentSetId === SPRITE_COMPOENT_SET_ID)
        .reduce((acc, [key, value]) => ({
          ...acc,
          [key]: { ...parseProperties(value.name), images: {} },
        }), {});

      const response = await client.fileImages(FIGMA_FILE_KEY, {
        ids: Object.keys(sprites),
        scale: 1,
        format: 'svg',
      });
      if (response.status !== 200) {
        throw Error(`Failed to fetch file images with status code ${response.status}.`);
      }

      await Promise.all(Object.entries(response.data.images).map(async ([id, url]) => {
        core.debug(`Downloading sprite ${id} from ${url}`);
        const buffer = await got(url).buffer();

        if (buffer.length === 0) {
          core.warning(`Skipping empty sprite with id ${id} and url ${url}.`);
          return;
        }

        const meta = await sharp(buffer).metadata();
        if (meta.width !== meta.height) {
          throw Error(`Sprite with id '${id}' is not a square.`);
        }

        if (SVG_DIRECTORY) {
          const svgFilePath = path.join(
            SVG_DIRECTORY,
            sprites[id].base,
            sprites[id].variant,
            `${sprites[id].cursor}${sprites[id].frame > 0 ? `_${sprites[id].frame}` : ''}.svg`,
          );
          fs.ensureDirSync(path.dirname(svgFilePath));
          fs.writeFileSync(svgFilePath, buffer);
        }

        await Promise.all([1, 2, 4].map(async (scale) => {
          const rawBuffer = await sharp(buffer, { density: 72 * scale })
            .resize(meta.width * scale, meta.height * scale)
            .raw()
            .toBuffer();
          for (let i = 0; i < rawBuffer.length; i += 4) {
            const alpha = rawBuffer[i + 3];
            const red = Math.round(rawBuffer[i] * (alpha / 255));
            const green = Math.round(rawBuffer[i + 1] * (alpha / 255));
            const blue = Math.round(rawBuffer[i + 2] * (alpha / 255));
            rawBuffer[i] = blue;
            rawBuffer[i + 1] = green;
            rawBuffer[i + 2] = red;
          }
          sprites[id].images[meta.width * scale] = { scale, buffer: rawBuffer };
        }));
      }));

      return sprites;
    };

    const sprites = await getSprites(file.data.components);
    const variants = Object.entries(sprites).reduce((acc, [id, sprite]) => {
      acc[sprite.variant] ??= {};
      acc[sprite.variant][sprite.cursor] ??= {};
      Object.entries(sprite.images).forEach(([size]) => {
        acc[sprite.variant][sprite.cursor][size] ??= {};
        acc[sprite.variant][sprite.cursor][size][sprite.frame] = id;
      });
      return acc;
    }, {});

    const getSlug = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    Object.entries(variants).forEach(([variant, cursors]) => {
      const slug = getSlug(`${THEME_NAME}${variant === 'default' ? '' : ` ${variant}`}`);
      const variantDirectory = path.join(THEME_DIRECTORY, slug);
      const cursorsDirectory = path.join(variantDirectory, 'cursors');
      fs.ensureDirSync(cursorsDirectory);
      Object.entries(cursors).forEach(([cursor, sizes]) => {
        core.info(`Generating cursor '${cursor}' for variant '${variant}'.`);
        const encoder = new Encoder(Object.entries(sizes).flatMap(([size, frames]) => {
          const animated = Object.keys(frames).length > 1;
          return Object.values(frames).map((id) => ({
            type: size,
            xhot: sprites[id].xhot * sprites[id].images[size].scale,
            yhot: sprites[id].yhot * sprites[id].images[size].scale,
            data: sprites[id].images[size].buffer,
            delay: animated ? sprites[id].delay : 50,
          }));
        }));
        fs.writeFileSync(path.join(cursorsDirectory, cursor), Buffer.from(encoder.pack()));
      });

      fs.writeFileSync(
        path.join(variantDirectory, 'index.theme'),
        `[Icon Theme]\nName=${THEME_NAME}${variant === 'default' ? '' : ` (${variant})`}\n${THEME_COMMENT ? `Comment=${THEME_COMMENT}\n` : ''}`,
      );

      if (variant !== 'default') {
        Object.keys(variants.default).forEach((cursor) => {
          if (!variants[variant][cursor]) {
            core.info(`Symlinking cursor '${cursor}' from 'default' to '${variant}'.`);
            fs.symlinkSync(
              path.join('../..', getSlug(THEME_NAME), 'cursors', cursor),
              path.join(cursorsDirectory, cursor),
            );
          }
        });
      }

      aliases.forEach((alias) => {
        core.debug(`Creating alias '${alias.alias}' -> '${alias.cursor}' for '${variant}' variant.`);
        if (fs.existsSync(path.join(cursorsDirectory, alias.cursor))) {
          fs.symlinkSync(path.join(alias.cursor), path.join(cursorsDirectory, alias.alias));
        } else {
          core.warning(`Alias '${alias.alias}' is defined for cursor '${alias.cursor}' which doesn't exist.`);
        }
      });
    });
  } catch (error) {
    core.setFailed(error.message);
  }
})();
