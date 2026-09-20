import { cache } from "react";
import { DEFAULT_LAYOUT, isLayoutId, LAYOUT_SETTING_KEY, type LayoutId } from "./homepage";
import { readSetting } from "./store";

/** 与配色同一套做法：服务端读，首屏就是最终布局，不会先渲染成卡片再跳成列表。 */
export const getPreferredLayout = cache((): LayoutId => {
  try {
    const stored = readSetting<unknown>(LAYOUT_SETTING_KEY);
    return isLayoutId(stored) ? stored : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
});
