import { z } from "zod";

/**
 * 配色主题：与浅色/深色正交的另一维偏好。每套配色只覆盖带色相的 token
 * （primary / accent / ring / ambient），中性色与材质共用一套 —— 否则六套配色
 * 会把 globals.css 撑成六份完整主题，改一处中性色要改六遍。
 *
 * swatch 是设置页那枚色点用的颜色，浅深各一：浅色下用浅色主题的 primary，
 * 深色下用深色主题的，否则色点在深色背景上会糊掉。
 */
export const PALETTES = [
  { id: "leaf", label: "一叶青", swatch: { light: "#0f6b5f", dark: "#4fd1b5" } },
  { id: "blue", label: "天青", swatch: { light: "#0066cc", dark: "#4fa3ff" } },
  { id: "violet", label: "紫罗兰", swatch: { light: "#5b3fbf", dark: "#a98fff" } },
  { id: "clay", label: "陶土", swatch: { light: "#9a4a12", dark: "#f0a868" } },
  { id: "rose", label: "玫红", swatch: { light: "#ab2a5a", dark: "#ff8fa8" } },
  { id: "graphite", label: "石墨", swatch: { light: "#3f3f46", dark: "#d4d4d8" } },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

/**
 * 默认给一叶青：与品牌标记同一色相，开箱即用的观感是自洽的。
 * 它由 globals.css 里 :root / .dark 的基础 token 承担，不另开 [data-palette] 块。
 */
export const DEFAULT_PALETTE: PaletteId = "leaf";

export const PALETTE_SETTING_KEY = "appearance.palette";

const paletteIds = PALETTES.map((entry) => entry.id) as [PaletteId, ...PaletteId[]];

export const paletteSchema = z.enum(paletteIds);

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === "string" && paletteIds.includes(value as PaletteId);
}
