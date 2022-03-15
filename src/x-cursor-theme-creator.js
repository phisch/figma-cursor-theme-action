const { Encoder } = require('xcursor');
const CursorTheme = require('./cursor-theme');
const Sprite = require('./sprite');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const Cursor = require('./cursor');
const Variant = require('./variant');

class XCursorThemeCreator {
  /**
   * @param { CursorTheme } cursorTheme
   * @param { string } targetDirectory
   */
  constructor(cursorTheme, targetDirectory) {
    this.cursorTheme = cursorTheme;
    this.targetDirectory = targetDirectory;
  }

  /**
   * X Mouse Cursor bitmaps are BGR with premultiplied alphas.
   *
   * @param { Buffer } buffer
   * @returns
   */
  static toXMouseCursorBuffer(buffer) {
    for (let i = 0; i < buffer.length; i += 4) {
      const alpha = buffer[i + 3];
      const red = Math.round(buffer[i] * (alpha / 255));
      const green = Math.round(buffer[i + 1] * (alpha / 255));
      const blue = Math.round(buffer[i + 2] * (alpha / 255));
      buffer[i] = blue;
      buffer[i + 1] = green;
      buffer[i + 2] = red;
    }
    return buffer;
  }

  /**
   * @param { Cursor } cursor the cursor to create
   * @param { string } targetDirectory directory to create the cursor in
   */
  async createCursor(cursor, targetDirectory) {
    const sizeMap = new Map();
    cursor.sprites.forEach((sprite) => {
      this.cursorTheme.scales.forEach((scale) => {
        sizeMap.set(sprite.getSize() * scale, sprite);
      });
    });

    const images = await Promise.all(cursor.getSpriteArray().map(async (sprite) => {
      const validScales = this.cursorTheme.scales.filter(
        (scale) => sprite.getSize() * scale <= 512 && sizeMap.get(sprite.getSize() * scale) === sprite,
      );
      await sprite.createFrames();

      return Promise.all(validScales.map(async (scale) => {
        const frames = await sprite.framesRightHanded;
        //const spriteFrames = await sprite.getFrames();
        return Promise.all(frames.map(async (frame) => ({
          type: sprite.getSize() * scale,
          xhot: frame.x,
          yhot: frame.y,
          data: XCursorThemeCreator.toXMouseCursorBuffer(await frame.render(scale)),
          delay: frame.duration,
        })));
      }));
    })).then((array) => array.flat(2));

    //console.log(images);

    fs.writeFileSync(
      path.join(targetDirectory, cursor.name),
      Buffer.from(new Encoder(images).pack()),
    );
  }

  async create(directory) {
    this.cursorTheme.variants.forEach(async (variant) => {
      const variantSlug = variant.getSlug();
      const name = `${this.cursorTheme.getSlug()}${variantSlug ? '-' : ''}${variantSlug}`;
      const variantDirectory = path.join(directory, name);
      const cursorsDirectory = path.join(variantDirectory, 'cursors');
      await fs.ensureDir(cursorsDirectory);
      fs.writeFileSync(
        path.join(variantDirectory, 'index.theme'),
        `[Icon Theme]\nName=${name}\n${this.cursorTheme.comment ? `Comment=${this.cursorTheme.comment}\n` : ''}`,
      );
      variant.cursors.forEach(async (cursor) => {
        this.createCursor(cursor, cursorsDirectory);
      });
    });
  }
}

module.exports = XCursorThemeCreator;
