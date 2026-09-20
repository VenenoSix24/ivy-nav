import { describe, expect, it } from "vitest";
import { reorderWithin } from "./reorder";
import type { PortalItem } from "./types";

const item = (id: number): PortalItem => ({
  id,
  categoryId: id <= 3 ? 1 : 2,
  title: `t${id}`,
  description: null,
  url: `https://example.com/${id}`,
  domain: "example.com",
  iconType: "favicon",
  iconValue: null,
  iconPlate: true,
  iconMono: false,
  tags: [],
  visibility: "public",
  featured: false,
});

describe("拖拽后的本地顺序", () => {
  it("只重排给定的一批，其余原位不动", () => {
    // 1,2,3 属于分类 A，4,5 属于分类 B
    const items = [item(1), item(2), item(3), item(4), item(5)];
    const next = reorderWithin(items, [3, 1, 2]);
    expect(next.map((entry) => entry.id)).toEqual([3, 1, 2, 4, 5]);
  });

  it("换的是值不是位次：位置集合保持不变", () => {
    const items = [item(1), item(2), item(3), item(4)];
    const next = reorderWithin(items, [2, 1]);
    expect(next.map((entry) => entry.id)).toEqual([2, 1, 3, 4]);
    // 4 号仍在最后一位，说明没被卷进来
    expect(next[3]!.id).toBe(4);
  });

  it("顺序里出现不认识的编号时原样返回", () => {
    const items = [item(1), item(2)];
    expect(reorderWithin(items, [1, 99]).map((e) => e.id)).toEqual([1, 2]);
  });

  it("给的是子集时只在它们占着的位置之间重排，没提到的留在原位", () => {
    // 调用点给的一律是整个分区的完整顺序；这里把子集语义写下来，
    // 免得以后有人以为它是「未提到的也要跟着挪」
    const items = [item(1), item(2), item(3)];
    expect(reorderWithin(items, [3, 1]).map((e) => e.id)).toEqual([3, 2, 1]);
  });

  it("原地不动时结果相同", () => {
    const items = [item(1), item(2)];
    expect(reorderWithin(items, [1, 2]).map((e) => e.id)).toEqual([1, 2]);
  });

  it("空顺序不改动任何东西", () => {
    const items = [item(1), item(2)];
    expect(reorderWithin(items, []).map((e) => e.id)).toEqual([1, 2]);
  });
});
