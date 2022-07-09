import { CursorTheme } from "../models/cursor-theme";

export interface Provider {
  provide(): Promise<CursorTheme>;
}
