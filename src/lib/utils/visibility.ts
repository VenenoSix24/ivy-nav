import type { Category, Item, Visibility } from "@/db/schema";

/** 匿名访问者看不到的分类编号：整类设成 Private 的那些 */
export function privateCategoryIds<C extends Pick<Category, "id" | "visibility">>(
  categories: C[],
  isAdmin: boolean,
): Set<number> {
  if (isAdmin) return new Set();
  return new Set(
    categories
      .filter((category) => category.visibility === "private")
      .map((category) => category.id),
  );
}

export function visibleItems<T extends Pick<Item, "visibility" | "categoryId">>(
  items: T[],
  isAdmin: boolean,
  hiddenCategories: Set<number> = new Set(),
): T[] {
  if (isAdmin) return items;
  return items.filter(
    (item) =>
      item.visibility === "public" &&
      (item.categoryId === null || !hiddenCategories.has(item.categoryId)),
  );
}

/** Categories worth rendering: admins get everything, guests only non-private ones with items. */
export function visibleCategories<
  C extends Pick<Category, "id" | "visibility">,
  I extends { categoryId: number | null },
>(categories: C[], items: I[], isAdmin: boolean): C[] {
  if (isAdmin) return categories;
  const populated = new Set(items.map((item) => item.categoryId));
  return categories.filter(
    (category) => category.visibility !== "private" && populated.has(category.id),
  );
}

export function isPublic(visibility: Visibility): boolean {
  return visibility === "public";
}

export function visibilityLabel(visibility: Visibility): string {
  return visibility === "public" ? "Public" : "Private";
}
