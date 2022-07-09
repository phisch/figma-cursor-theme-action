import * as core from "@actions/core";

import { registerWindow } from "@svgdotjs/svg.js";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore, https://github.com/svgdotjs/svgdom/issues/69
import { createSVGWindow } from "svgdom";
import { FigmaProvider } from "./provider/figma";
import { Api } from "figma-api";
import { CursorTheme } from "./models/cursor-theme";
import { Sprite } from "./models/sprite";
import { readFileSync } from "fs";
import { Cursor } from "./models/cursor";
import { X11CursorEncoder } from "./encoder/x11cursor";

const window = createSVGWindow();
registerWindow(window, window.document);

async function run(): Promise<void> {
  try {
    /*
    const figmaProvider = new FigmaProvider(
      new Api({ personalAccessToken: core.getInput("figma_access_token") }),
      core.getInput("figma_file_id"),
      core.getInput("cursor_theme_name"),
      core.getInput("cursor_theme_description"),
      core.getInput("cursor_theme_author")
    );

    const cursorTheme = await figmaProvider.provide();
    console.log(cursorTheme);
    */

    const cursor = new Cursor(
      "test",
      [
        new Sprite(
          readFileSync("test/24.svg", "utf8"),
          [
            {
              selector: "#spinner",
              instructions: [
                { name: "animate", arguments: ["1000"] },
                { name: "rotate", arguments: ["360"] },
              ],
            },
          ],
          ""
        ),
        new Sprite(
          readFileSync("test/32.svg", "utf8"),
          [
            {
              selector: "#cursor",
              instructions: [
                { name: "animate", arguments: ["500"] },
                { name: "dx", arguments: ["20"] },
                { name: "animate", arguments: ["500"] },
                { name: "dx", arguments: ["-20"] },
              ],
            },
          ],
          "svg"
        ),
      ],
      []
    );

    const encoder = new X11CursorEncoder();
    const encoded = encoder.encode(cursor);

    console.log(encoded);



    /*
    const svgFile = readFileSync("test/32.svg", "utf8");
    const sprite = new Sprite(
      svgFile,
      [
        {
          selector: "#foo",
          instructions: [
            { name: "animate", arguments: ["500"] },
            { name: "dx", arguments: ["20"] },
            { name: "animate", arguments: ["500"] },
            { name: "dx", arguments: ["-20"] },
          ],
        },
        {
          selector: "#segments",
          instructions: [
            { name: "animate", arguments: ["1000", "0", "now"] },
            { name: "rotate", arguments: ["-360"] },
          ],
        },
        {
          selector: "#hotspot",
          instructions: [
            { name: "animate", arguments: ["500", "0", "now"] },
            { name: "dy", arguments: ["20"] },
            { name: "animate", arguments: ["500"] },
            { name: "dy", arguments: ["-20"] },
          ],
        },
      ],
      "svg"
    );


    console.log(sprite.frames.length);
    console.log(sprite.leftHandedFrames.length);

    */
    /*

    const variantA = new Variant(sprite, "a");
    const variantB = new Variant(sprite, "b");
    const variants = new Map([["a", variantA], ["b", variantB]]);

    const cursorTheme = new CursorTheme(
      "phinger-cursors",
      "A really over engineered cursor theme.",
      []
    );


    console.log(sprite);
    */
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.stack || error.message);
  }
}

run();
