import { z } from "zod";

export const LAYOUTS = [
  { id: "card", label: "卡片", hint: "图标在上、描述两行，条目少时看得细" },
  { id: "list", label: "列表", hint: "一行一条，靠标题与域名快速扫视" },
  { id: "compact", label: "紧凑", hint: "小方块只留图标与标题，像手机主屏" },
] as const;

export type LayoutId = (typeof LAYOUTS)[number]["id"];

export const DEFAULT_LAYOUT: LayoutId = "card";

/** 三套形状的网格参数，公开视图与编辑视图共用；按断点写死，别改成 auto-fill 算列数 */
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
