import { CursorTheme } from "../models/cursor-theme";
import { Generator } from "./generator";

export class XCursorTheme implements Generator {
  constructor() {
    
  }

  generate(theme: CursorTheme, directory: string): void {
    throw new Error("Method not implemented.");
  }

}
