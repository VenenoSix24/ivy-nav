import { describe, expect, it } from "vitest";
import { privateCategoryIds, visibleCategories, visibleItems } from "./visibility";

const items = [
  { id: 1, categoryId: 10, visibility: "private" as const },
  { id: 2, categoryId: 10, visibility: "public" as const },
  { id: 3, categoryId: 20, visibility: "private" as const },
];

const categories = [
  { id: 10, visibility: "public" as const },
  { id: 20, visibility: "public" as const },
  { id: 30, visibility: "private" as const },
];

describe("privateCategoryIds", () => {
  it("collects the categories marked private, for guests only", () => {
    expect([...privateCategoryIds(categories, false)]).toEqual([30]);
    expect([...privateCategoryIds(categories, true)]).toEqual([]);
  });
});

describe("visibleItems", () => {
  it("gives guests only public items", () => {
    expect(visibleItems(items, false).map((item) => item.id)).toEqual([2]);
  });

  it("gives admins everything", () => {
    expect(visibleItems(items, true).map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("hides every item of a category that is hidden as a whole", () => {
    // 整类隐藏：分类设成 Private 之后，里面的公开条目对匿名也不可见
    const hidden = new Set([30]);
    const rows = [
      { id: 7, categoryId: 30, visibility: "public" as const },
      { id: 8, categoryId: 10, visibility: "public" as const },
      { id: 9, categoryId: null, visibility: "public" as const },
    ];
    expect(visibleItems(rows, false, hidden).map((item) => item.id)).toEqual([8, 9]);
  });

  it("still gives the admin the items of a hidden category", () => {
    const rows = [{ id: 7, categoryId: 30, visibility: "public" as const }];
    expect(visibleItems(rows, true, new Set([30])).map((item) => item.id)).toEqual([7]);
  });

  it("keeps item visibility meaningful inside a public category", () => {
    expect(visibleItems(items, false, new Set([30])).map((item) => item.id)).toEqual([2]);
  });
});

describe("visibleCategories", () => {
  it("hides categories that have nothing a guest may see", () => {
    const guestItems = visibleItems(items, false);
    expect(visibleCategories(categories, guestItems, false).map((c) => c.id)).toEqual([10]);
  });

  it("hides a category that is private even when it still has items", () => {
    const rows = [{ id: 7, categoryId: 30 }];
    expect(visibleCategories(categories, rows, false).map((c) => c.id)).toEqual([]);
  });

  it("shows every category to an admin", () => {
    expect(visibleCategories(categories, items, true).map((c) => c.id)).toEqual([10, 20, 30]);
  });

  it("ignores items that are not filed under any category", () => {
    const inboxOnly = [{ id: 9, categoryId: null }];
    expect(visibleCategories(categories, inboxOnly, false)).toEqual([]);
  });
});
