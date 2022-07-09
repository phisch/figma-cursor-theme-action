import axios from "axios";
import { Api, Component } from "figma-api";
import { GetFileResult, GetImageResult } from "figma-api/lib/api-types";
import { parse } from "toml";
import { Animation } from "../animator/svgdotjs";
import { Cursor } from "../models/cursor";
import { CursorTheme } from "../models/cursor-theme";
import { Sprite } from "../models/sprite";
import { Variant } from "../models/variant";
import { Provider } from "./provider";

type FigmaSprite = {
  properties: SpriteComponentProperties;
  data: ConfigurationData;
  svg: string;
};

type SpriteComponentProperties = {
  cursor: string;
  size: number;
  variant: string;
  parentVariant: string | "none";
};

type ConfigurationData = {
  flips: string;
  animations: Animation[];
};

export class FigmaProvider implements Provider {
  file: Promise<GetFileResult>;
  sprites: Map<[string, string], Sprite[]> = new Map();
  theme: CursorTheme;

  constructor(
    private api: Api,
    private fileId: string,
    themeName: string,
    themeDescription?: string,
    themeAuthor?: string
  ) {
    this.file = this.api.getFile(this.fileId);
    this.theme = new CursorTheme(themeName, themeDescription, themeAuthor);
  }

  private getVariant(name: string): Variant {
    const variant = this.theme.variants.get(name) ?? new Variant(name);
    this.theme.variants.set(name, variant);
    return variant;
  }

  async provide(): Promise<CursorTheme> {
    const spriteComponents = await this.getSpriteComponents();
    const images = await this.getImages(Array.from(spriteComponents.keys()));

    const figmaSprites: FigmaSprite[] = await Promise.all(
      Object.entries(images).map(async ([id, url]) => {
        const component = spriteComponents.get(id);
        if (!component) throw new Error(`Component ${id} not found`);
        return {
          properties: this.parseName(component.name),
          data: parse(component?.description ?? ""),
          svg: (await axios.get(url as string)).data,
        } as FigmaSprite;
      })
    );

    for (const sprite of figmaSprites) {
      const variant = this.getVariant(sprite.properties.variant);

      if (sprite.properties.parentVariant !== "none") {
        const parentVariant = this.getVariant(sprite.properties.parentVariant);
        if (!parentVariant.children.has(sprite.properties.variant)) {
          parentVariant.children.set(sprite.properties.variant, variant);
        }
      }

      const cursor =
        variant.cursors.get(sprite.properties.cursor) ??
        new Cursor(sprite.properties.cursor);
      variant.cursors.set(sprite.properties.cursor, cursor);

      cursor.sprites.set(
        sprite.properties.size,
        new Sprite(sprite.svg, sprite.data.animations, sprite.data.flips)
      );
    }

    return this.theme;
  }

  private async getImages(ids: string[]): Promise<GetImageResult["images"]> {
    const images = await this.api.getImage(this.fileId, {
      ids: ids.join(","),
      format: "svg",
      scale: 1,
      svg_include_id: true,
      svg_simplify_stroke: false,
      use_absolute_bounds: true,
    });
    return images.images;
  }

  private parseName(name: string): SpriteComponentProperties {
    return Object.fromEntries(
      name.split(", ").map((part) => part.split("="))
    ) as SpriteComponentProperties;
  }

  private async getSpriteComponents(): Promise<Map<string, Component>> {
    const spriteComponents: Map<string, Component> = new Map();

    for (const [id, component] of Object.entries(
      (await this.file).components
    )) {
      const name = component.name;
      if (name.includes("cursor=") && name.includes("variant=")) {
        spriteComponents.set(id, component);
      }
    }

    return spriteComponents;
  }
}
