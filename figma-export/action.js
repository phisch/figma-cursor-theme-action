const core = require('@actions/core');
const fs = require('fs');
const https = require('https');
const path = require('path');
const Figma = require('figma-js');

try {
  const FIGMA_ACCESS_TOKEN = core.getInput('figma_access_token');
  const FIGMA_FILE_KEY = core.getInput('figma_file_key');
  const OUTPUT_DIRECTORY = path.normalize(core.getInput('output_directory'));

  if (!FIGMA_ACCESS_TOKEN) {
    throw Error('Provoide your Figma access token as the `figma_access_token` input!');
  }

  if (!FIGMA_FILE_KEY) {
    throw Error('Provide your Figma file key as the `figma_file_key` input!');
  }

  const client = Figma.Client({
    personalAccessToken: FIGMA_ACCESS_TOKEN,
  });

  if (!fs.existsSync(OUTPUT_DIRECTORY)) {
    core.info(`Created output directory '${OUTPUT_DIRECTORY}'.`);
    fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  }

  client.file(FIGMA_FILE_KEY).then(file => {
    const exports = {};
    const fileNames = [];

    const iterate = (node) => {
      if (node.exportSettings) {
        node.exportSettings.forEach(setting => {
          const format = setting.format.toLowerCase();
          
          const fileName = `${node.name}${setting.suffix ? `_${setting.suffix}` : ''}.${format}`;

          if (fileNames.includes(fileName)) {
            throw Error(`The Figma file ${FIGMA_FILE_KEY} contains conflicting exports that try to export as '${fileName}'!`);
          }

          fileNames.push(fileName);
          
          exports[setting.format] = exports[setting.format] || {};
          exports[setting.format][setting.constraint.value] = exports[setting.format][setting.constraint.value] || {};
          exports[setting.format][setting.constraint.value][node.id] = {
            file: path.join(OUTPUT_DIRECTORY, fileName),
          };
        });
      }
      if (node.children) {
        node.children.forEach(iterate);
      }
    };

    core.info(`Collecting information about the Figma file ${FIGMA_FILE_KEY}.`);
    iterate(file.data.document);

    core.info(`Found exports for formats: ${Object.keys(exports).join(', ')}`);

    Object.keys(exports).forEach(format => {
      core.info(`Need to export scales ${Object.keys(exports[format]).join('x, ')} for ${format} format.`);
      Object.keys(exports[format]).forEach(scale => {
        core.info(`Requesting ${format} exports for scale ${scale}x.`);
        client.fileImages(FIGMA_FILE_KEY, {
          ids: Object.keys(exports[format][scale]),
          scale: scale,
          format: format.toLowerCase()
        }).then(imagesResponse => {
          core.info(`Downloading ${Object.keys(imagesResponse.data.images).length} images for ${format} format at scale ${scale}x.`);
          Object.keys(imagesResponse.data.images).forEach(id => {
            const url = imagesResponse.data.images[id];
            core.debug(`Downloading ${url} to ${exports[format][scale][id].file}.`);
            https.get(url, (response) => {
              if (response.statusCode !== 200) {
                throw Error(`Failed to download image from ${url}!`);
              }
              response.pipe(fs.createWriteStream(exports[format][scale][id].file));
            });
          });
        }).catch(error => {
          throw Error(error);
        });
      });
    });
  }).catch(error => {
    throw Error(error);
  });
} catch (error) {
  core.setFailed(error.message);
}
