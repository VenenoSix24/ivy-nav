import type { Category, Item, Visibility } from "@/db/schema";

/**
 * 匿名访问者看不到的条目：条目自己是 Private 的，或者所在分类整类设成了 Private。
 *
 * 分类级 Private 是「整类隐藏」—— 一个分类整体不想给人看时，不必逐个条目去设
 * （设计文档 §35 的补充：分类设为 Private 时整类对匿名隐藏，条目级 Private 仍然
 * 只在公开分类里决定单个条目）。过滤只发生在服务端，匿名者拿到的响应里根本没有这些行。
 */
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

/**
 * Categories worth rendering: admins get everything, guests only get categories that
 * still have something to show, so an empty private category leaves no trace.
 */
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
