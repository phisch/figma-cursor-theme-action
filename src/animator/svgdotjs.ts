import { Element, Matrix, Runner, SVG, Timeline } from "@svgdotjs/svg.js";

export type Instruction = {
  name: string;
  arguments: string[];
};

export type Animation = {
  selector: string;
  instructions: Instruction[];
};

export type AnimationFrame = {
  svg: string;
  duration: number;
};

export class SvgDotJsAnimator {
  element: Element;
  runners: Runner[] = [];
  animatedElements: Element[] = [];
  timeline: Timeline = new Timeline();

  constructor(svg: string, animations: Animation[] = []) {
    this.timeline.stop();
    this.element = SVG(svg);
    this.element.timeline(this.timeline);
    this.applyAnimations(animations);
  }

  animate(): AnimationFrame[] {
    const duration = this.timeline.getEndTime();
    if (duration === 0) {
      return [{ svg: this.element.svg(), duration: 0 }];
    }

    const frames: AnimationFrame[] = [];
    const fps = 30;
    const targetFrameDuration = 1000 / fps;

    while (frames.length < duration / targetFrameDuration) {
      const frameDuration = Math.min(
        targetFrameDuration,
        duration - targetFrameDuration * frames.length
      );
      this.timeline.time(frameDuration * frames.length);
      for (const element of this.animatedElements) {
        mergeTransforms.call(element);
      }
      frames.push({ svg: this.element.svg(), duration: frameDuration });
    }
    return frames;
  }

  private applyAnimations(animations: Animation[]): void {
    for (const animation of animations) {
      this.applyAnimation(animation);
    }
  }

  private applyAnimation(animation: Animation): void {
    const elements = this.element.find(animation.selector);
    const runners = elements.flatMap((element) => {
      element.timeline(this.timeline);

      if (!this.animatedElements.includes(element)) {
        this.animatedElements.push(element);
      }

      //this.setAnimated(element);
      const elementRunners: Runner[] = [];
      for (const instruction of animation.instructions) {
        const args = this.parseArguments(instruction.arguments);
        if (instruction.name === "animate") {
          if (!elementRunners.length) {
            elementRunners.push(element.animate(...args));
          } else {
            const last = elementRunners[elementRunners.length - 1];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            elementRunners.push((last as any).animate(...args));
          }
        } else {
          const last = elementRunners[elementRunners.length - 1];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (last as any)[instruction.name](...args);
        }
      }
      return elementRunners;
    });
    this.runners.push(...runners);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseArguments(args: string[]): any[] {
    return args.map((argument) => {
      const number = parseFloat(argument);
      if (Number.isNaN(number)) {
        return argument;
      }
      return number;
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lmultiply = (last: any, curr: any): any => last.lmultiplyO(curr);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getRunnerTransform = (runner: any): any => runner.transforms;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeTransforms(this: any): void {
  // eslint-disable-next-line no-invalid-this
  const runners = this._transformationRunners.runners;
  const netTransform = runners
    .map(getRunnerTransform)
    .reduce(lmultiply, new Matrix());

  // eslint-disable-next-line no-invalid-this
  this.transform(netTransform);

  // eslint-disable-next-line no-invalid-this
  this._transformationRunners.merge();

  // eslint-disable-next-line no-invalid-this
  if (this._transformationRunners.length() === 1) {
    // eslint-disable-next-line no-invalid-this
    this._frameId = null;
  }
}
