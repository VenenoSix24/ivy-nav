import { cache } from "react";
import { DEFAULT_PALETTE, isPaletteId, PALETTE_SETTING_KEY, type PaletteId } from "./appearance";
import { readSetting } from "./store";

/** 配色在服务端读，写进 <html data-palette>；读不出来就退回默认 */
export const getPreferredPalette = cache((): PaletteId => {
  try {
    const stored = readSetting<unknown>(PALETTE_SETTING_KEY);
    return isPaletteId(stored) ? stored : DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
});
