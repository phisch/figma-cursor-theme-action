import { Cursor } from "../models/cursor";
import { Frame } from "../models/frame";

export type XCursorImage = {
  type: number;

}

type ImageHeader = {

}

type Image = {
  length: 36;
  type: 4294770690;

}

export class X11CursorEncoder {
  static XCURSOR_FILE_HEADER_LENGTH = 4 * 4;
  static XCUR_SIGNATURE = [0x58, 0x63, 0x75, 0x72];

  private frameToImage(frame: Frame) {
    
  }

  encode(cursor: Cursor): Uint8Array {
    const scales = [1, 2, 4];

    Array.from(cursor.sprites.values()).map(sprite => {
      sprite.frames.map(frame => {
        //frame.
      });
    });

    // create a Uint8Array to hold the encoded cursor and add X11CursorEncoder.XCUR_SIGNATURE

    // size i need is 16 bytes for the header + the size of each image
    // an image uses 48 bytes for its description, and 4 bytes for each pixel
    
    const imagesBytes = Array.from(cursor.sprites).reduce(
      (acc, sprite) => acc + sprite.data.length,
      0
    );

    const encodedCursor = new Uint8Array(16);
    /*
    encodedCursor.set(X11CursorEncoder.XCUR_SIGNATURE);
    encodedCursor.set(this.integerToBytes(16), 4);
    encodedCursor.set(this.integerToBytes(1), 8);

    const count = Array.from(cursor.sprites.values()).reduce(
      (acc, sprite) => acc + sprite.frames.length,
      0
    );

    encodedCursor.set(this.integerToBytes(count), 12);

    //encodedCursor.set(this.integerToBytes(cursor.width), 12);
    */
    return encodedCursor;
  }

  integerToBytes(integer: number): Uint8Array {
    return new Uint8Array([
      integer >> 24,
      integer >> 16,
      integer >> 8,
      integer,
    ]);
  }
}
