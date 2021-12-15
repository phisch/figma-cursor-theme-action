const core = require('@actions/core');
const fs = require('fs');
const https = require('https');
const path = require('path');
const Figma = require('figma-js');
const pixels = require('image-pixels');
const { Encoder } = require('xcursor');

(async () => {
  try {
    const FIGMA_ACCESS_TOKEN = core.getInput('figma_access_token', { required: true });
    const FIGMA_FILE_KEY = core.getInput('figma_file_key', { required: true });
    const OUTPUT_DIRECTORY = path.normalize(core.getInput('output_directory', { required: true }));
    const THEME_NAME = core.getInput('theme_name', { required: true });
    const THEME_COMMENT = core.getInput('theme_comment');

    const client = Figma.Client({
      personalAccessToken: FIGMA_ACCESS_TOKEN,
    });

    const file = await client.file(FIGMA_FILE_KEY);

    if (file.status !== 200) {
      throw Error(`Failed to fetch file with key '${FIGMA_FILE_KEY}'.`);
    }

    core.setOutput('version', file.data.version);

    const download = async (url, filePath) => {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
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
    };

    const exports = {};
    const collectExportsRecursively = (node) => {
      if (node.exportSettings) {
        node.exportSettings.forEach((settings) => {
          const format = settings.format.toLowerCase();
          const scale = settings.constraint.value;
          const fileName = `${node.name}${settings.suffix ? `_${settings.suffix}` : ''}.${format}`;
          exports[format] = exports[format] || {};
          exports[format][scale] = exports[format][scale] || {};
          exports[format][scale][node.id] = fileName;
        });
      }
      if (node.children) {
        node.children.forEach(collectExportsRecursively);
      }
    };
    collectExportsRecursively(file.data.document);

    const exportDirectory = path.join(OUTPUT_DIRECTORY, 'export');
    core.setOutput('export_directory', exportDirectory);

    Object.entries(exports).forEach(async ([format, scales]) => {
      Object.entries(scales).forEach(async ([scale, nodes]) => {
        await client.fileImages(FIGMA_FILE_KEY, {
          ids: Object.keys(nodes),
          scale,
          format,
        }).then(async (imagesResponse) => {
          core.info(`Downloading ${Object.keys(imagesResponse.data.images).length} sprite ${format} files for ${scale}x scale.`);
          const downloads = [];
          Object.entries(imagesResponse.data.images).forEach(([id, url]) => {
            const filePath = path.join(exportDirectory, exports[format][scale][id]);
            downloads.push(download(url, filePath));
          });
          await Promise.all(downloads);
        }).catch((error) => {
          core.setFailed(error.message);
        });
      });
    });

    const getComponentsFromSetId = (setId) => Object.entries(file.data.components).reduce(
      (acc, [key, value]) => (value.componentSetId === setId ? { ...acc, [key]: value } : acc),
      {},
    );

    const parseProperties = (propertiesString) => propertiesString.split(', ')
      .reduce((acc, cur) => {
        const [key, value] = cur.split('=');
        return { ...acc, [key]: value };
      }, {});

    const ALIAS_COMPONENT_SET_ID = core.getInput('alias_component_set_id', { required: true });
    const aliases = Object.values(getComponentsFromSetId(ALIAS_COMPONENT_SET_ID))
      .map((aliasComponent) => parseProperties(aliasComponent.name));
    core.debug(`Found ${aliases.length} defines aliases in the Figma file.`);

    const SPRITE_COMPOENT_SET_ID = core.getInput('sprite_component_set_id', { required: true });
    const spriteComponents = getComponentsFromSetId(SPRITE_COMPOENT_SET_ID);
    core.debug(`Found ${Object.keys(spriteComponents).length} defined sprites in the Figma file.`);

    const sprites = {};

    Object.entries(spriteComponents).forEach(([id, spriteComponent]) => {
      sprites[id] = { ...parseProperties(spriteComponent.name), images: {} };
    });

    [1, 2, 4].forEach(async (scale) => {
      core.info(`Requesting Figma export for sprites at scale ${scale}x.`);
      await client.fileImages(FIGMA_FILE_KEY, {
        ids: Object.keys(spriteComponents),
        scale,
        format: 'png',
      }).then(async (imagesResponse) => {
        core.info(`Received ${Object.keys(imagesResponse.data.images).length} image urls for scale ${scale}x, downloading them now.`);
        const images = await pixels.all(imagesResponse.data.images);
        Object.entries(images).forEach(([id, image]) => {
          if (image.width !== image.height) {
            throw Error(`Image with id '${id}' is not square at scale ${scale}.`);
          }
          const { data } = image;
          for (let i = 0; i < data.length; i += 4) {
            const temp = image.data[i];
            data[i] = image.data[i + 2];
            data[i + 2] = temp;
          }
          sprites[id].images[image.width] = {
            scale,
            data,
          };
        });
      }).catch((error) => {
        core.setFailed(error.message);
      });
    });

    const svgDirectory = path.join(OUTPUT_DIRECTORY, 'svg');
    core.setOutput('svg_directory', svgDirectory);
    await client.fileImages(FIGMA_FILE_KEY, {
      ids: Object.keys(spriteComponents),
      scale: 1,
      format: 'svg',
    }).then(async (imagesResponse) => {
      core.info(`Downloading ${Object.keys(imagesResponse.data.images).length} sprite svg files.`);
      const downloads = [];
      Object.entries(imagesResponse.data.images).forEach(([id, url]) => {
        const filePath = path.join(svgDirectory, sprites[id].base, sprites[id].variant, `${sprites[id].cursor}.svg`);
        downloads.push(download(url, filePath));
      });
      await Promise.all(downloads);
    }).catch((error) => {
      core.setFailed(error.message);
    });

    const variants = {};
    Object.entries(sprites).forEach(([id, sprite]) => {
      variants[sprite.variant] = variants[sprite.variant] || {};
      variants[sprite.variant][sprite.cursor] = variants[sprite.variant][sprite.cursor] || {};
      Object.entries(sprite.images).forEach(([size]) => {
        variants[sprite.variant][sprite.cursor][size] = (
          variants[sprite.variant][sprite.cursor][size] || {}
        );
        variants[sprite.variant][sprite.cursor][size][sprite.frame] = { spriteId: id };
      });
    });

    const slugify = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const themeDirectory = path.join(OUTPUT_DIRECTORY, 'themes');
    core.setOutput('theme_directory', themeDirectory);

    Object.entries(variants).forEach(([variant, cursors]) => {
      const variantDirectory = path.join(
        themeDirectory,
        slugify(variant === 'default' ? THEME_NAME : `${THEME_NAME} ${variant}`),
      );

      fs.mkdirSync(path.join(variantDirectory, 'cursors'), { recursive: true });

      Object.entries(cursors).forEach(([cursor, sizes]) => {
        core.info(`Generating cursor '${cursor}' for variant '${variant}'.`);
        const images = [];
        Object.entries(sizes).forEach(([size, frames]) => {
          const animated = Object.keys(frames).length > 1;
          Object.values(frames).forEach((frame) => {
            images.push({
              type: size,
              xhot: sprites[frame.spriteId].xhot * sprites[frame.spriteId].images[size].scale,
              yhot: sprites[frame.spriteId].yhot * sprites[frame.spriteId].images[size].scale,
              data: sprites[frame.spriteId].images[size].data,
              delay: animated ? sprites[frame.spriteId].delay : 50,
            });
          });
        });
        const encoder = new Encoder(images);
        fs.writeFileSync(
          path.join(variantDirectory, 'cursors', cursor),
          Buffer.from(encoder.pack()),
        );
        core.debug(`Saved cursor '${cursor}' for variant '${variant}' in '${path.join(variantDirectory, 'cursors', cursor)}'.`);
      });

      fs.writeFileSync(
        path.join(variantDirectory, 'index.theme'),
        `[Icon Theme]\nName=${THEME_NAME}${variant === 'default' ? '' : ` - ${variant}`}\n${THEME_COMMENT ? `Comment=${THEME_COMMENT}\n` : ''}`,
      );

      core.info(`Generated index.theme for '${variant}' variant in '${variantDirectory}'.`);

      if (variant !== 'default') {
        core.info(`Symlinking default cursors that are missing in '${variant}' variant.`);
        Object.keys(variants.default).forEach((cursor) => {
          if (!variants[variant][cursor]) {
            core.debug(`Symlinking cursor '${cursor}' from 'default' variant to '${variant}' variant.`);
            fs.symlinkSync(
              path.join('../..', slugify(THEME_NAME), 'cursors', cursor),
              path.join(variantDirectory, 'cursors', cursor),
            );
          }
        });
      }

      core.info(`Generating aliases for '${variant}' variant.`);
      aliases.forEach((alias) => {
        core.debug(`Aliasing '${alias.cursor}' to '${alias.name}' for variant '${variant}'.`);
        if (fs.existsSync(path.join(variantDirectory, 'cursors', alias.cursor))) {
          fs.symlinkSync(
            path.join(alias.cursor),
            path.join(variantDirectory, 'cursors', alias.alias),
          );
        } else {
          core.warning(`Alias '${alias.alias}' defined for cursor '${alias.cursor}' which doesn't exist.`);
        }
      });
    });
  } catch (error) {
    core.setFailed(error.message);
  }
})();
