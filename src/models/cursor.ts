import { Sprite } from "./sprite";

export class Cursor {
  name: string;
  sprites: Map<number, Sprite>;
  aliases: string[];

  constructor(name: string, sprites: Sprite[] = [], aliases: string[] = []) {
    this.name = name;
    this.sprites = new Map(sprites.map((sprite) => [sprite.size, sprite]));
    this.aliases = aliases;
  }
}
