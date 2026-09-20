import { z } from "zod";

/** 配色主题：每套只覆盖带色相的 token，swatch 是设置页色点用的颜色（浅深各一） */
export const PALETTES = [
  { id: "leaf", label: "一叶青", swatch: { light: "#0f6b5f", dark: "#4fd1b5" } },
  { id: "blue", label: "天青", swatch: { light: "#0066cc", dark: "#4fa3ff" } },
  { id: "violet", label: "紫罗兰", swatch: { light: "#5b3fbf", dark: "#a98fff" } },
  { id: "clay", label: "陶土", swatch: { light: "#9a4a12", dark: "#f0a868" } },
  { id: "rose", label: "玫红", swatch: { light: "#ab2a5a", dark: "#ff8fa8" } },
  { id: "graphite", label: "石墨", swatch: { light: "#3f3f46", dark: "#d4d4d8" } },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

/** 默认配色，由 globals.css 里 :root / .dark 的基础 token 承担 */
export const DEFAULT_PALETTE: PaletteId = "leaf";

export const PALETTE_SETTING_KEY = "appearance.palette";

const paletteIds = PALETTES.map((entry) => entry.id) as [PaletteId, ...PaletteId[]];

export const paletteSchema = z.enum(paletteIds);

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === "string" && paletteIds.includes(value as PaletteId);
}
