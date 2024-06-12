import sharp from "sharp";

export type Hotspot = {
  x: number;
  y: number;
};

export type Dimensions = {
  width: number;
  height: number;
};

export class Frame {
  svg: string;
  duration: number;
  hotspot: Hotspot;
  dimensions: Dimensions;

  constructor(svg: string, duration: number, hotspot: Hotspot, dimensions: Dimensions) {
    this.svg = svg;
    this.duration = duration;
    this.hotspot = hotspot;
    this.dimensions = dimensions;
  }

  async render(scale = 1): Promise<Buffer> {
    const image = sharp(Buffer.from(this.svg), { density: 72 * scale });
    return await image.toBuffer();
  }
}
