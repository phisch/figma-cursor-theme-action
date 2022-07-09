import { Element, SVG } from "@svgdotjs/svg.js";
import { Animation, SvgDotJsAnimator } from "../animator/svgdotjs";
import { Frame, Hotspot } from "./frame";

export class Sprite {
  frames: Frame[] = [];
  leftHandedFrames: Frame[] = [];
  size: number;

  constructor(svg: string, animations: Animation[] = [], flips = "") {
    this.size = SVG(svg).width() as number;
    const animator = new SvgDotJsAnimator(svg, animations);

    for (const frame of animator.animate()) {
      this.frames.push(this.buildFrame(frame.svg, frame.duration, flips));
      if (flips !== "") {
        this.leftHandedFrames.push(
          this.buildFrame(frame.svg, frame.duration, flips)
        );
      }
    }
  }

  private buildFrame(svg: string, duration: number, flips = ""): Frame {
    const image = SVG(svg);
    if (flips !== "") {
      image.find(flips).each((element) => element.flip());
    }
    return new Frame(image.svg(), duration, this.removeAndReturnHotspot(image));
  }

  private removeAndReturnHotspot(element: Element): Hotspot {
    const hotspot = element.findOne("#hotspot") as Element;
    if (hotspot) {
      hotspot.remove();
      const x = hotspot.x() as number;
      const y = hotspot.y() as number;
      const width = hotspot.width() as number;
      const height = hotspot.height() as number;
      return { x: x + Math.ceil(width / 2), y: y + Math.ceil(height / 2) };
    }
    return { x: 0, y: 0 };
  }
}
