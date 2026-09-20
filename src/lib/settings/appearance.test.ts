import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_PALETTE, isPaletteId, PALETTES } from "./appearance";

// 配色的取值写在 CSS 里，这里直接对着文件检查两边不会走散
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

const LIGHT_BACKGROUND = "#f5f5f7";
const DARK_BACKGROUND = "#000000";
const VALUE_TOKENS = [
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--ring",
  "--ambient-a",
  "--ambient-b",
] as const;

function blockOf(selector: string): string {
  const start = css.indexOf(selector);
  expect(start, `globals.css 里找不到 ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

function declaration(block: string, token: string): string {
  const match = new RegExp(`${token}:\\s*([^;]+);`).exec(block);
  expect(match, `缺少 ${token}`).not.toBeNull();
  return (match as RegExpExecArray)[1]!.trim();
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const channel = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light! + 0.05) / (dark! + 0.05);
}

const AA = 4.5;

describe("配色主题", () => {
  it("每套非默认配色都有浅色与深色两组取值", () => {
    for (const entry of PALETTES) {
      if (entry.id === DEFAULT_PALETTE) continue;
      expect(css, `${entry.id} 缺浅色`).toContain(`:root[data-palette="${entry.id}"]`);
      expect(css, `${entry.id} 缺深色`).toContain(`.dark[data-palette="${entry.id}"]`);
    }
  });

  it("默认配色由基础 token 承担，不另开 data-palette 块", () => {
    expect(css).not.toContain(`[data-palette="${DEFAULT_PALETTE}"]`);
  });

  it("每组取值都给全了带色相的 token", () => {
    for (const entry of PALETTES) {
      if (entry.id === DEFAULT_PALETTE) continue;
      for (const selector of [
        `:root[data-palette="${entry.id}"]`,
        `.dark[data-palette="${entry.id}"]`,
      ]) {
        const block = blockOf(selector);
        for (const token of VALUE_TOKENS) {
          expect(block, `${selector} 缺 ${token}`).toContain(`${token}:`);
        }
      }
    }
  });

  it("强调色、强调色上的文字都过 AA", () => {
    // 默认配色的取值在 :root / .dark 里，其它配色在各自的 data-palette 块里
    const groups = [
      { name: DEFAULT_PALETTE, light: ":root {", dark: ".dark {" },
      ...PALETTES.filter((entry) => entry.id !== DEFAULT_PALETTE).map((entry) => ({
        name: entry.id,
        light: `:root[data-palette="${entry.id}"]`,
        dark: `.dark[data-palette="${entry.id}"]`,
      })),
    ];

    for (const group of groups) {
      const light = blockOf(group.light);
      const dark = blockOf(group.dark);
      const lightPrimary = declaration(light, "--primary");
      const darkPrimary = declaration(dark, "--primary");

      expect(
        contrast(lightPrimary, LIGHT_BACKGROUND),
        `${group.name} 浅色正文`,
      ).toBeGreaterThanOrEqual(AA);
      expect(
        contrast(darkPrimary, DARK_BACKGROUND),
        `${group.name} 深色正文`,
      ).toBeGreaterThanOrEqual(AA);
      expect(
        contrast(declaration(light, "--primary-foreground"), lightPrimary),
        `${group.name} 浅色填充上的文字`,
      ).toBeGreaterThanOrEqual(AA);
      expect(
        contrast(declaration(dark, "--primary-foreground"), darkPrimary),
        `${group.name} 深色填充上的文字`,
      ).toBeGreaterThanOrEqual(AA);
      expect(
        contrast(declaration(light, "--accent-foreground"), LIGHT_BACKGROUND),
        `${group.name} 浅色标签文字`,
      ).toBeGreaterThanOrEqual(AA);
      expect(
        contrast(declaration(dark, "--accent-foreground"), DARK_BACKGROUND),
        `${group.name} 深色标签文字`,
      ).toBeGreaterThanOrEqual(AA);
    }
  });

  it("isPaletteId 只认已知配色", () => {
    expect(isPaletteId("leaf")).toBe(true);
    expect(isPaletteId("graphite")).toBe(true);
    expect(isPaletteId("neon")).toBe(false);
    expect(isPaletteId(null)).toBe(false);
    expect(isPaletteId({ palette: "leaf" })).toBe(false);
  });
});
