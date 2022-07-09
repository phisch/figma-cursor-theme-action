import { CursorTheme } from "../models/cursor-theme";

export interface Generator {
  generate(theme: CursorTheme, directory: string): void;
}
