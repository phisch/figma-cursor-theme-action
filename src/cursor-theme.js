const fs = require('fs-extra');
const Sprite = require('./sprite');
const Variant = require('./variant');

class CursorTheme {
  /**
   * @param { string } name
   * @param { string } comment
   * @param { integer[] } scales
   * @param { Variant[] } variants
   */
  constructor(name, comment = '', scales = [1, 2, 4], variants = []) {
    this.name = name;
    this.comment = comment;
    this.scales = scales;
    /** @type { Map.<string, Variant> } */
    this.variants = new Map();
    variants.forEach((variant) => {
      this.variants.set(variant.name, variant);
    });
  }

  /**
   * @returns { string }
   */
  getSlug() {
    return this.name.toLowerCase().replace(/\s/g, '');
  }

  /**
   * @param { Sprite } sprite
   */
  addSprite(sprite) {
    const variant = this.variants.get(sprite.variant) || new Variant(sprite.variant);
    
    //const variant = this.getVariant(sprite.variant);
    const cursor = variant.getCursor(sprite.cursor);
    cursor.addSprite(sprite);
  }

  /** @param { Sprite[] } sprites */
  addSprites(sprites) {
    sprites.forEach((sprite) => this.addSprite(sprite));
  }

  async createXcursorTheme(directory) {
    Object.entries(this.variants).map(
      async ([variantName, variant]) => {
        // create variant diractory and all parent directories
        const variantDir = path.join(directory, variantName);
        if (!fs.existsSync(variantDir)) {
          fs.mkdirSync(variantDir);
        }
      },
    );
  }
}

module.exports = CursorTheme;
