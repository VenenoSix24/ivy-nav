import { describe, expect, it } from "vitest";
import { visibleCategories, visibleItems } from "./visibility";

const items = [
  { id: 1, categoryId: 10, visibility: "private" as const },
  { id: 2, categoryId: 10, visibility: "public" as const },
  { id: 3, categoryId: 20, visibility: "private" as const },
];

describe("visibleItems", () => {
  it("gives guests only public items", () => {
    expect(visibleItems(items, false).map((item) => item.id)).toEqual([2]);
  });

  it("gives admins everything", () => {
    expect(visibleItems(items, true).map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("keeps a public item inside a private category visible to guests", () => {
    // 设计文档 §35: Item.visibility 优先于 Category.visibility
    const inPrivateCategory = [{ id: 7, categoryId: 30, visibility: "public" as const }];
    expect(visibleItems(inPrivateCategory, false)).toHaveLength(1);
  });
});

describe("visibleCategories", () => {
  const categories = [{ id: 10 }, { id: 20 }, { id: 30 }];

  it("hides categories that have nothing a guest may see", () => {
    const guestItems = visibleItems(items, false);
    expect(visibleCategories(categories, guestItems, false).map((c) => c.id)).toEqual([10]);
  });

  it("shows every category to an admin", () => {
    expect(visibleCategories(categories, items, true).map((c) => c.id)).toEqual([10, 20, 30]);
  });

  it("ignores items that are not filed under any category", () => {
    const inboxOnly = [{ id: 9, categoryId: null }];
    expect(visibleCategories(categories, inboxOnly, false)).toEqual([]);
  });
});
