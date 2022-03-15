const { SVG, registerWindow, Timeline, Runner } = require('@svgdotjs/svg.js');
const { createSVGWindow } = require('svgdom');
const SpriteFrame = require('./frame');

const window = createSVGWindow();
registerWindow(window, window.document);

class Sprite {
  /** @type { SpriteFrame[] } */
  framesRightHanded = [];

  /** @type { SpriteFrame[] } */
  framesLeftHanded = [];

  /**
   * @param { string } svg
   * @param { string } animation
   * @param { string } name
   */
  constructor(svg, animation, leftHandedFlips = '') {
    this.image = SVG(svg);
    if (this.image.width() !== this.image.height()) {
      throw new Error(`The sprite must be square. Current dimensions: ${this.image.width()}x${this.image.height()}`);
    }
    this.leftHandedFlips = leftHandedFlips;
    this.#applyAnimation(animation);
    //this.#createFrames();
  }

  /**
   * @returns { import('@svgdotjs/svg.js').NumberAlias}
   */
  getSize() {
    return this.image.width();
  }

  #hasAnimation() {
    return this.timeline.getEndTime() > 0;
  }

  async createFrames() {
    if (this.timeline.getEndTime() > 0) {
      const fps = 30;
      const frameDuration = 1000 / fps;
      const frameCount = Math.ceil(
        (this.timeline.getEndTime() / 1000) * fps,
      );
      console.log(fps, frameDuration, frameCount);

      for (let i = 0; i < frameCount; i += 1) {
        this.timeline.time(i * frameDuration);
        await new Promise((resolve) => {
          window.requestAnimationFrame(resolve);
        });
        this.createFrame(frameDuration);
      }
    } else {
      this.createFrame();
    }
  }

  createFrame(duration = 0) {
    const temp = SVG(this.image.svg());
    const hotspot = temp.findOne('#hotspot');
    hotspot.remove();
    const x = hotspot ? Math.ceil(hotspot.width() / 2 + hotspot.x()) : 0;
    const y = hotspot ? Math.ceil(hotspot.height() / 2 + hotspot.y()) : 0;
    this.framesRightHanded.push(new SpriteFrame(temp.svg(), duration, x, y));
    if (this.leftHandedFlips) {
      const flips = temp.find(this.leftHandedFlips);
      //console.log(flips);
      flips.forEach((element) => element.flip('x'));
      this.framesLeftHanded.push(new SpriteFrame(temp.svg(), duration, temp.width() - x, y));
    }
  }

  async getFrames() {
    if (!this.frames) {
      this.frames = this.timeline.getEndTime() > 0
        ? this.getAnimationFrames() : [new SpriteFrame(this.image.svg(), 0)];
    }
    return this.frames;
  }

  #applyAnimation(animation) {
    /** @type { Timeline } */
    this.timeline = new Timeline();
    this.timeline.pause();

    const animationSets = Sprite.#parseAnimationSets(animation);
    animationSets.forEach((animationSet) => {
      const elements = this.image.find(animationSet.selector);
      elements.timeline(this.timeline);
      let lastRunner = null;
      /** @type { Runner[] } */
      this.runners = [];
      animationSet.instructions.forEach((instruction) => {
        if (instruction.name === 'animate') {
          lastRunner = elements[instruction.name](...instruction.args);
          this.runners.push(lastRunner);
        } else {
          lastRunner[instruction.name](...instruction.args);
        }
      });
    });
  }

  static #parseAnimationSets(animationSets) {
    return animationSets.split(';').filter(
      (animationSet) => animationSet.trim(),
    ).map(
      (animationSet) => this.#parseAnimationSet(animationSet),
    );
  }

  static #parseAnimationSet(animationSet) {
    const [, selector, instructions] = animationSet.split('"');
    return { selector, instructions: this.#parseInstructions(instructions) };
  }

  static #parseInstructions(instructions) {
    return instructions.trim().split(/\s(?![^(]*\))/).map(
      (instruction) => this.#parseInstruction(instruction),
    );
  }

  static #parseInstruction(instruction) {
    const [name, ...args] = instruction.split('(');
    args[args.length - 1] = args[args.length - 1].slice(0, -1);
    const argsArray = args.join('').split(' ').map((arg) => {
      if (Number.isNaN(Number(arg))) {
        return arg;
      }
      return Number(arg);
    });
    return { name, args: argsArray };
  }
}

module.exports = Sprite;
