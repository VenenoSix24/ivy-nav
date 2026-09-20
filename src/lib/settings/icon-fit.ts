import { cache } from "react";
import { DEFAULT_ICON_FIT, isIconFitId, type IconFitId } from "@/lib/icons/fit";
import { readSetting } from "./store";

export const ICON_FIT_SETTING_KEY = "icon_fit";

/** 条目图标的默认摆法，条目自己设过的以条目为准 */
export const getDefaultIconFit = cache((): IconFitId => {
  try {
    const stored = readSetting<unknown>(ICON_FIT_SETTING_KEY);
    return isIconFitId(stored) ? stored : DEFAULT_ICON_FIT;
  } catch {
    return DEFAULT_ICON_FIT;
  }
});
