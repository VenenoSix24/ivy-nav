import { z } from "zod";

export const LAYOUTS = [
  { id: "card", label: "卡片", hint: "图标在上、描述两行，条目少时看得细" },
  { id: "list", label: "列表", hint: "一行一条，靠标题与域名快速扫视" },
  { id: "compact", label: "紧凑", hint: "小方块只留图标与标题，像手机主屏" },
] as const;

export type LayoutId = (typeof LAYOUTS)[number]["id"];

export const DEFAULT_LAYOUT: LayoutId = "card";

/**
 * 三套形状的网格参数。公开视图与编辑视图共用同一份：那串 grid class 以前在两个组件里
 * 各抄了一遍，改一处忘一处就会漂。
 *
 * 没有走 auto-fill + --cell-min 去算列数：2 列在窄屏要吃掉约 340px 内容宽，手机只有
 * 358px，格子再小就只剩 1 列，而卡片布局现在是手机两列、≥1024px 三列。换算法会动到这套
 * 已经验收过的行为，所以按断点写死，直白且可预测。
 */
export const GRID_CLASS: Record<LayoutId, string> = {
  card: "grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-3",
  list: "grid grid-cols-1 gap-2",
  compact: "grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6",
};

const layoutIds = LAYOUTS.map((entry) => entry.id) as [LayoutId, ...LayoutId[]];

export const layoutSchema = z.enum(layoutIds);

export function isLayoutId(value: unknown): value is LayoutId {
  return typeof value === "string" && layoutIds.includes(value as LayoutId);
}
