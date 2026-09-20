import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT, GRID_CLASS, isLayoutId, LAYOUTS, layoutSchema } from "./homepage";
import { settingsPatchSchema } from "./schemas";

describe("首页布局", () => {
  it("每套布局都有网格参数，且没有多余的键", () => {
    expect(Object.keys(GRID_CLASS).sort()).toEqual(LAYOUTS.map((entry) => entry.id).sort());
  });

  it("网格参数都从 grid 起手，并给出了列数与间距", () => {
    for (const entry of LAYOUTS) {
      const classes = GRID_CLASS[entry.id];
      expect(classes, `${entry.id} 缺少 grid 容器`).toMatch(/^grid /);
      expect(classes, `${entry.id} 没有定列数`).toMatch(/grid-cols-\d/);
      expect(classes, `${entry.id} 没有定间距`).toMatch(/gap-\d/);
    }
  });

  it("列表布局只有一列", () => {
    expect(GRID_CLASS.list).toContain("grid-cols-1");
    expect(GRID_CLASS.list).not.toMatch(/grid-cols-[2-9]/);
  });

  it("默认布局是网格参数的键之一", () => {
    expect(GRID_CLASS[DEFAULT_LAYOUT]).toBeDefined();
  });

  it("isLayoutId 只认已知布局", () => {
    expect(isLayoutId("list")).toBe(true);
    expect(isLayoutId("masonry")).toBe(false);
    expect(isLayoutId(1)).toBe(false);
  });

  it("写接口的校验：至少要给一项，取值必须是已知的", () => {
    expect(settingsPatchSchema.safeParse({ layout: "compact" }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({ palette: "clay" }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({ palette: "clay", layout: "list" }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({}).success).toBe(false);
    expect(settingsPatchSchema.safeParse({ layout: "masonry" }).success).toBe(false);
    // 布局的取值来自 layoutSchema，改布局不该动到配色
    expect(layoutSchema.options).toEqual(LAYOUTS.map((entry) => entry.id));
  });

  it("网格参数与编辑视图用的是同一份", () => {
    // 这两个组件以前各自抄了一份 grid class，正是这条测试要防的漂移
    const editable = readFileSync(
      join(process.cwd(), "src/components/editor/editable-grid.tsx"),
      "utf8",
    );
    const section = readFileSync(
      join(process.cwd(), "src/components/portal/category-section.tsx"),
      "utf8",
    );
    for (const source of [editable, section]) {
      expect(source).toContain("ItemGrid");
      expect(source, "不要在这里再写死列数").not.toMatch(/grid-cols-\d/);
    }
  });
});
