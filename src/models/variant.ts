import { Cursor } from "./cursor";

export class Variant {
  name: string;
  cursors: Map<string, Cursor>;
  children: Map<string, Variant>;

  constructor(name: string, cursors: Cursor[] = [], children: Variant[] = []) {
    this.name = name;
    this.cursors = new Map(cursors.map((cursor) => [cursor.name, cursor]));
    this.children = new Map(children.map((variant) => [variant.name, variant]));
  }
}
