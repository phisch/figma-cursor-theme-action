const Cursor = require('./cursor');

class Variant {
  /**
   * @param { string } name
   * @param { Cursor[] } cursor
   */
  constructor(name, cursors = []) {
    /** @type { string } */
    this.name = name;
    /** @type { Map.<string, Cursor> } */
    this.cursors = new Map();
    cursors.forEach((cursor) => {
      this.cursors.set(cursor.name, cursor);
    });
  }

  getSlug() {
    return this.name === 'default' ? '' : this.name.toLowerCase().replace(/\s/g, '');
  }
}

module.exports = Variant;
