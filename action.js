const core = require('@actions/core');
const fs = require('fs-extra');
const util = require('util');

const FigmaExporter = require('./src_old/figma-exporter');
const CursorTheme = require('./src_old/cursor-theme');
const XCursorThemeGenerator = require('./src_old/x-cursor-theme-creator');
const Sprite = require('./src_old/sprite');
const Cursor = require('./src_old/cursor');
const Variant = require('./src_old/variant');

const { SVG, registerWindow, Timeline, Runner } = require('@svgdotjs/svg.js');
const { createSVGWindow } = require('svgdom');

const window = createSVGWindow();
registerWindow(window, window.document);

(async () => {
  try {
    const scalesInput = core.getInput('scales');
    const scales = scalesInput ? scalesInput.split(',').map(
      (scale) => parseInt(scale, 10),
    ) : undefined;

    const cursorTheme = new CursorTheme('test', 'teriffic testing theme', scales, [
      new Variant('default', [
        new Cursor('progress', ['poogress', 'gresspro'], [
          // new Sprite(
          //   fs.readFileSync('./test/24.svg', 'utf8'),
          //   '"#spinner" animate(1000) ease(<>) rotate(360)',
          //   '',
          // ),
          new Sprite(
            fs.readFileSync('./test/32.svg', 'utf8'),
            '"#spinner" animate(500) ease(<>) rotate(360)',
            'svg > g, #cursor',
          ),
        ]),
      ]),
    ]);

    const xCursorThemeGenerator = new XCursorThemeGenerator(
      cursorTheme,
      core.getInput('theme_directory', { required: true }),
    );

    xCursorThemeGenerator.create(core.getInput('theme_directory', { required: true }));
    
    /*
    const cursorTheme = new CursorTheme(
      core.getInput('theme_name', { required: true }),
      core.getInput('theme_comment'),
    );

    const figmaExporter = new FigmaExporter(
      core.getInput('figma_access_token', { required: true }),
      core.getInput('figma_file_key', { required: true }),
    );

    cursorTheme.addSprites(await figmaExporter.getSprites());

    const xCursorThemeGenerator = new XCursorThemeGenerator(
      cursorTheme,
      core.getInput('theme_directory', { required: true }),
    );

    await xCursorThemeGenerator.create();
    */


    //const svg = await fs.readFile('./cursor_disco.svg', 'utf8');
    //console.log(svg);
    // const animator = new SvgAnimator(svg);

    // animator.applyAnimationSets('"#cursor" animate(1000) rotate(-360); "#spinner" animate(500 0 now) translate(0 -10) animate(500) translate(0 10); "#spinner" animate(1000 0 now) ease(-) rotate(360);');
    // animator.applyAnimationSets('"#spinner" animate(1500 0 now) ease(-) rotate(360);');
    // animator.applyAnimationSets("\"#spinner\" animate(500) dy(-10) animate(500) dy(10); \"#segments\" animate(1000) rotate(360); \"#foo\" animate(500) fill('#ff0000') animate(500) fill('#0000ff');");
    
    // const frames = await animator.createAnimatedCursor();
    // const encoder = new Encoder(frames);
    // fs.writeFileSync('left_ptr', Buffer.from(encoder.pack()));

    /*
    const generator = new FigmaCursorThemeGenerator(
      core.getInput('figma_access_token', { required: true }),
      core.getInput('figma_file_key', { required: true }),
    );

    // if export directory is set, download all exports
    const EXPORT_DIRECTORY = core.getInput('export_directory');
    if (EXPORT_DIRECTORY) {
      await generator.downloadFigmaExports(EXPORT_DIRECTORY);
    }

    // if asset directory is set, download all assets

    generator.generateCursorTheme(
      core.getInput('theme_directory', { required: true }),
      core.getInput('sprite_component_set_id', { required: true }),
    );
    */
  } catch (error) {
    core.setFailed(error.stack || error.message);
  }
})();
