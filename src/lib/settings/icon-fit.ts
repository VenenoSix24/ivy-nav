import { cache } from "react";
import { DEFAULT_ICON_FIT, isIconFitId, type IconFitId } from "@/lib/icons/fit";
import { readSetting } from "./store";

export const ICON_FIT_SETTING_KEY = "icon_fit";

/**
 * 条目图标的默认摆法（设置页里选）。条目自己设过的以条目为准，没设的跟这里走。
 * 读不出来就退回默认：settings 表有问题不该把整个首页带下去。
 */
export const getDefaultIconFit = cache((): IconFitId => {
  try {
    const stored = readSetting<unknown>(ICON_FIT_SETTING_KEY);
    return isIconFitId(stored) ? stored : DEFAULT_ICON_FIT;
  } catch {
    return DEFAULT_ICON_FIT;
  }
});
