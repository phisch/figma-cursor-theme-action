const Sprite = require('./sprite');

class Cursor {
  /**
   * @param { string } name
   * @param { string[] } aliases
   * @param { Sprite[] } sprites
   */
  constructor(name, aliases = [], sprites = []) {
    /** @type { string } */
    this.name = name;
    /** @type { string[] } */
    this.aliases = aliases;
    /** @type { Map.<number, Sprite> } */
    this.sprites = new Map();
    sprites.forEach((sprite) => {
      this.sprites.set(sprite.size, sprite);
    });
  }

  /**
   * @returns { Sprite[] }
   */
  getSpriteArray() {
    return Array.from(this.sprites.values());
  }
}

module.exports = Cursor;
