const core = require('@actions/core');
const fs = require('fs');
const https = require('https');
const path = require('path');
const Figma = require('figma-js');

try {
  const FIGMA_ACCESS_TOKEN = core.getInput('figma_access_token');
  const FIGMA_FILE_KEY = core.getInput('figma_file_key');
  const EXPORT_DIRECTORY = path.normalize(core.getInput('export_directory'));

  if (!FIGMA_ACCESS_TOKEN) {
    throw Error('Provoide your Figma access token as the `figma_access_token` input!');
  }

  if (!FIGMA_FILE_KEY) {
    throw Error('Provide your Figma file key as the `figma_file_key` input!');
  }

  const client = Figma.Client({
    personalAccessToken: FIGMA_ACCESS_TOKEN,
  });

  fs.mkdir(EXPORT_DIRECTORY, { recursive: true }, (err) => {
    if (err) throw err;
  });

  client.file(FIGMA_FILE_KEY).then(({ data: figmaFile }) => {
    const exports = {};
    const fileNames = [];

    function findExports(node) {
      node.exportSettings.forEach((settings) => {
        if (!Object.prototype.hasOwnProperty.call(exports, settings.format)) {
          exports[settings.format] = {};
        }
        if (!Object.prototype.hasOwnProperty.call(
          exports[settings.format],
          settings.constraint.value,
        )) {
          exports[settings.format][settings.constraint.value] = {};
        }

        const format = settings.format.toLowerCase();
        const fileName = settings.suffix ? `${node.name}_${settings.suffix}.${format}` : `${node.name}.${format}`;

        if (fileNames.includes(fileName)) {
          throw Error(`The figma file ${FIGMA_FILE_KEY} contains conflicting exports that try to export as '${fileName}'. Resolve conflicting exports!`);
        }

        fileNames.push(fileName);

        exports[settings.format][settings.constraint.value][node.id] = {
          file: path.join(EXPORT_DIRECTORY, fileName),
        };
      });

      if (node.children) {
        node.children.forEach(findExports);
      }
    }

    findExports(figmaFile.document);

    Object.keys(exports).forEach((format) => {
      Object.keys(exports[format]).forEach((scale) => {
        client.fileImages(
          FIGMA_FILE_KEY,
          {
            ids: Object.keys(exports[format][scale]),
            scale,
            format: format.toLowerCase(),
          },
        ).then(({ data: imageResponse }) => {
          Object.entries(imageResponse.images).forEach(([id, url]) => {
            const node = exports[format][scale][id];
            https.get(url, (res) => {
              if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(node.file)).on('error', (error) => {
                  console.log(error);
                });
              } else {
                console.warn(`could not download ${node.file} from ${url}`);
              }
            });
          });
        });
      });
    });
  });
} catch (error) {
  core.setFailed(error.message);
}
