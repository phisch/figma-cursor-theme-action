const Figma = require('figma-js');
const path = require('path');
const fs = require('fs-extra');
const got = require('got');

const Sprite = require('./sprite');

class FigmaExporter {
  constructor(accessToken, fileKey) {
    this.figma = Figma.Client({
      personalAccessToken: accessToken,
    });
    this.fileKey = fileKey;
    this.cursors = {};
  }

  async getFigmaFile() {
    if (!this.file) {
      const fileResponse = await this.figma.file(this.fileKey);
      if (fileResponse.status !== 200) {
        throw Error(`Failed to fetch Figma file '${this.fileKey}' with status code ${fileResponse.status}.`);
      }
      this.file = fileResponse.data;
    }
    return this.file;
  }

  async saveFigmaFile() {
    const file = await this.getFigmaFile();
    fs.writeFileSync(
      path.join('figma_file.json'),
      JSON.stringify(file, null, 2),
    );
  }

  async #getSpriteComponents() {
    const file = await this.getFigmaFile();
    const componentSetId = await this.getComponentSetId('sprite');
    return Object.fromEntries(
      Object.entries(file.components).filter(
        ([, component]) => component.componentSetId === componentSetId,
      ),
    );
  }

  async getSprites() {
    const spriteComponents = await this.#getSpriteComponents();

    const urls = await this.getSvgUrlsForComponents(
      Object.keys(spriteComponents),
    );

    return Promise.all(
      Object.entries(urls).map(async ([id, url]) => {
        const image = await got(url);

        const properties = spriteComponents[id].name.split(', ').reduce((acc, cur) => {
          const [key, value] = cur.split('=');
          return { ...acc, [key]: value };
        }, {});

        return new Sprite(
          properties.variant,
          properties.cursor,
          image.body,
          properties.size,
          spriteComponents[id].description,
        );
      }),
    );
  }

  async getSvgUrlsForComponents(componentIds) {
    const fileImagesResponse = await this.figma.fileImages(
      this.fileKey,
      {
        ids: componentIds,
        scale: 1,
        format: 'svg',
        svg_include_id: true,
        svg_simplify_stroke: false,
        use_absolute_bounds: true,
      },
    );

    if (fileImagesResponse.status !== 200) {
      throw Error(`Failed to fetch sprite svg links with status code ${fileImagesResponse.status}.`);
    }

    return fileImagesResponse.data.images;
  }

  async getComponentSetId(name) {
    const file = await this.getFigmaFile();
    return Object.keys(file.componentSets).find(
      (id) => file.componentSets[id].name === name,
    );
  }
}

module.exports = FigmaExporter;
