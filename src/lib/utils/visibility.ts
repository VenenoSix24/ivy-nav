import type { Category, Item, Visibility } from "@/db/schema";

/**
 * Item.visibility wins over Category.visibility (设计文档 §35): a public item inside a
 * private category is still publicly reachable. Guests therefore see exactly the items
 * marked public, and never receive the others from the server at all.
 */
export function visibleItems<T extends Pick<Item, "visibility">>(
  items: T[],
  isAdmin: boolean,
): T[] {
  return isAdmin ? items : items.filter((item) => item.visibility === "public");
}

/**
 * Categories worth rendering: admins get everything, guests only get categories that
 * still have something to show, so an empty private category leaves no trace.
 */
export function visibleCategories<
  C extends Pick<Category, "id">,
  I extends { categoryId: number | null },
>(categories: C[], items: I[], isAdmin: boolean): C[] {
  if (isAdmin) return categories;
  const populated = new Set(items.map((item) => item.categoryId));
  return categories.filter((category) => populated.has(category.id));
}

export function isPublic(visibility: Visibility): boolean {
  return visibility === "public";
}

export function visibilityLabel(visibility: Visibility): string {
  return visibility === "public" ? "Public" : "Private";
}
