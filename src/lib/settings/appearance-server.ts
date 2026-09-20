import { cache } from "react";
import { DEFAULT_PALETTE, isPaletteId, PALETTE_SETTING_KEY, type PaletteId } from "./appearance";
import { readSetting } from "./store";

/**
 * 配色要在首屏就定下来，所以服务端读、直接写进 <html data-palette>，不会闪一下再切。
 * 读不出来就退回默认：settings 表有问题不该把登录页一起带下去。
 * 用 cache 让一次请求里布局与设置页只读一次库。
 */
export const getPreferredPalette = cache((): PaletteId => {
  try {
    const stored = readSetting<unknown>(PALETTE_SETTING_KEY);
    return isPaletteId(stored) ? stored : DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
});
