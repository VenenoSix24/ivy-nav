import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { categories } from "@/db/schema";
import { DEFAULT_LAYOUT, GRID_CLASS, isLayoutId, LAYOUTS, layoutSchema } from "./homepage";

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

  it("数据库那一列的取值与这里的清单一致", () => {
    // schema 里的 enum 是数据库侧的真相，两边必须一致
    expect(categories.layout.enumValues).toEqual(LAYOUTS.map((entry) => entry.id));
    expect(layoutSchema.options).toEqual(LAYOUTS.map((entry) => entry.id));
  });

  it("网格参数与两个视图用的是同一份", () => {
    for (const file of [
      "src/components/editor/editable-grid.tsx",
      "src/components/portal/category-section.tsx",
    ]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source, `${file} 应该用 ItemGrid`).toContain("ItemGrid");
      expect(source, `${file} 不要自己写死列数`).not.toMatch(/grid-cols-\d/);
    }
  });
});
