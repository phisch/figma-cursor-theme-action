const sharp = require('sharp');

class SpriteFrame {
  /**
   * @param { string } svg
   * @param { number } duration
   * @param { number } x hotspot on x axis
   * @param { number } y hotspot on y axis
   */
  constructor(svg, duration, x, y) {
    this.svg = svg;
    this.duration = duration;
    this.x = x;
    this.y = y;
  }

  /**
   * @param { integer } scale
   * @returns { Promise<Buffer> }
   */
  async render(scale) {
    const image = sharp(
      Buffer.from(this.svg),
      { density: 72 * scale },
    );
    return image.raw().toBuffer();
  }
}

module.exports = SpriteFrame;
