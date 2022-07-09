import { Variant } from "./variant";

export class CursorTheme {
  name: string;
  description: string;
  author: string;
  variants: Map<string, Variant>;

  constructor(
    name: string,
    description = "",
    author = "",
    variants: Variant[] = []
  ) {
    this.name = name;
    this.description = description;
    this.author = author;
    this.variants = new Map(variants.map((variant) => [variant.name, variant]));
  }
}
