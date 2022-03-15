const Figma = require('figma-js');
const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const sharp = require('sharp');
const got = require('got');
const {SVG} = require('@svgdotjs/svg.js');

class FigmaCursorThemeGenerator {
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

  async #getExports() {
    const file = await this.getFigmaFile();
    return this.#recursivelyGetExports(file.document);
  }

  #recursivelyGetExports(node, previousExports = {}) {
    const exports = previousExports;
    node.exportSettings?.forEach((settings) => {
      const format = settings.format.toLowerCase();
      const scale = settings.constraint.value;
      exports[format] ??= {};
      exports[format][scale] ??= {};
      exports[format][scale][node.id] = `${node.name}${settings.suffix ? `_${settings.suffix}` : ''}.${format}`;
    });
    node.children?.forEach((child) => this.#recursivelyGetExports(child, exports));
    return exports;
  }

  async downloadFigmaExports(destination) {
    const exports = await this.#getExports();
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    await Promise.all(Object.entries(exports).map(async ([format, scales]) => {
      await Promise.all(Object.entries(scales).map(async ([scale, nodes]) => {
        const imagesResponse = await this.figma.fileImages(this.fileKey, {
          ids: Object.keys(nodes),
          scale,
          format,
        });
        if (imagesResponse.status !== 200) {
          throw Error(`Failed to fetch Figma file images with status code ${imagesResponse.status}.`);
        }
        await Promise.all(Object.entries(imagesResponse.data.images).map(async ([id, url]) => {
          const filePath = path.join(destination, exports[format][scale][id]);
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
        }));
      }));
    }));
  }

  async #getCompoents() {
    const file = await this.getFigmaFile();
    return file.components;
  }

  async #getSprites(spriteComponentSetId) {
    const components = await this.#getCompoents();

    const sprites = Object.entries(components)
      .filter(([, value]) => value.componentSetId === spriteComponentSetId)
      .reduce((spriteAccumulator, [id, sprite]) => ({
        ...spriteAccumulator,
        [id]: sprite.name.split(', ').reduce((propertyAccumulator, cur) => {
          const [key, value] = cur.split('=');
          return { ...propertyAccumulator, [key]: value };
        }, {}),
      }), {});

    const fileImagesResponse = await this.figma.fileImages(this.fileKey, {
      ids: Object.keys(sprites),
      scale: 1,
      format: 'svg',
      svg_simplify_stroke: false,
      use_absolute_bounds: true,
      svg_include_id: true,
    });

    if (fileImagesResponse.status !== 200) {
      throw Error(`Failed to fetch sprite svg links with status code ${fileImagesResponse.status}.`);
    }

    await Promise.all(Object.entries(fileImagesResponse.data.images).map(async ([id, url]) => {
      const image = await got(url);
      sprites[id].image = image.body;
    }));

    return sprites;
  }

  /**
   * @param {string} cursor
   * @param {string} variant
   * @param {sharp.Sharp} svg
   * @param {string} animate
   */
  async addSpriteToCursor(cursorName, variant, svg, animate) {
    this.cursors[cursorName] ??= {};
    this.cursors[cursorName][variant] ??= {};

    /*
    const metadata = await svg.metadata();
    if (metadata.width !== metadata.height) {
      throw Error(`Sprite '${cursorName}' of variant '${variant}' is not square.`);
    }
    */
    console.log(svg);

    const draw = SVG();
    const foo = draw.svg(svg);
    //console.log(foo);


    // console.log(editable.svg());



    // create sharp image from svg path
    // const image = sharp(Buffer.from(svg), {
    //   density: 72,
    // });

    // const filePath = path.join('test', `${cursorName}_${variant}.png`);
    // await image.png().toFile(filePath);
  }

  async generateCursorTheme(themeDirectory, spriteComponentSetId) {
    const sprites = await this.#getSprites(spriteComponentSetId);

    // iterate over all sprites asynchronously
    await Promise.all(Object.entries(sprites).map(async ([id, sprite]) => {
      await this.addSpriteToCursor(
        sprite.cursor,
        sprite.variant,
        sprite.image,
        sprite.animate,
      );
    }));

    //console.log(sprites);
  }
}

module.exports = FigmaCursorThemeGenerator;
