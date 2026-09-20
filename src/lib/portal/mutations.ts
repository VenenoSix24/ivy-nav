import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, itemTags, items, tags } from "@/db/schema";
import { nextSortOrder, toSortOrderPayload } from "@/lib/utils/sort";
import { normalizeTagNames, type CategoryInput, type ItemInput } from "./schemas";

export function findItem(id: number) {
  return getDb().select().from(items).where(eq(items.id, id)).get() ?? null;
}

export function findCategory(id: number) {
  return getDb().select().from(categories).where(eq(categories.id, id)).get() ?? null;
}

export function findCategoryByName(name: string) {
  return getDb().select().from(categories).where(eq(categories.name, name)).get() ?? null;
}

export function listTags() {
  return getDb().select().from(tags).all();
}

function currentItems(categoryId: number | null) {
  const db = getDb();
  const rows = db.select().from(items).all();
  return categoryId === null
    ? rows.filter((row) => row.categoryId === null)
    : rows.filter((row) => row.categoryId === categoryId);
}

export function createItem(input: ItemInput) {
  const db = getDb();
  const categoryId = input.categoryId ?? null;
  const sortOrder = nextSortOrder(currentItems(categoryId));

  // 条目的可见性以自身为准；没给的时候沿用所属分类的默认值（设计文档 §35）
  const visibility =
    input.visibility ??
    (categoryId === null ? "public" : (findCategory(categoryId)?.visibility ?? "public"));

  const created = db
    .insert(items)
    .values({
      title: input.title,
      url: input.url,
      description: input.description?.trim() ? input.description.trim() : null,
      categoryId,
      iconType: input.iconType ?? "favicon",
      iconValue: input.iconValue ?? null,
      visibility,
      featured: input.featured ?? false,
      sortOrder,
    })
    .returning()
    .get();

  if (created && input.tagNames) syncItemTags(created.id, input.tagNames);
  return created ?? null;
}

export function updateItem(id: number, input: Partial<ItemInput>) {
  const db = getDb();
  const existing = findItem(id);
  if (!existing) return null;

  const movingCategory =
    input.categoryId !== undefined && (input.categoryId ?? null) !== existing.categoryId;

  db.update(items)
    .set({
      title: input.title ?? existing.title,
      url: input.url ?? existing.url,
      description:
        input.description === undefined
          ? existing.description
          : input.description?.trim()
            ? input.description.trim()
            : null,
      categoryId: input.categoryId === undefined ? existing.categoryId : (input.categoryId ?? null),
      iconType: input.iconType ?? existing.iconType,
      iconValue: input.iconValue === undefined ? existing.iconValue : input.iconValue,
      visibility: input.visibility ?? existing.visibility,
      featured: input.featured ?? existing.featured,
      // 换分类后落到目标分类末尾，避免沿用原分类里的位置造成顺序错乱
      sortOrder: movingCategory
        ? nextSortOrder(currentItems(input.categoryId ?? null))
        : existing.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(items.id, id))
    .run();

  if (input.tagNames) syncItemTags(id, input.tagNames);
  return findItem(id);
}

export function deleteItem(id: number) {
  getDb().delete(items).where(eq(items.id, id)).run();
}

export function reorderItems(orderedIds: number[]) {
  const db = getDb();
  for (const { id, sortOrder } of toSortOrderPayload(orderedIds)) {
    db.update(items).set({ sortOrder, updatedAt: new Date() }).where(eq(items.id, id)).run();
  }
}

export function createCategory(input: CategoryInput) {
  const db = getDb();
  const existing = db.select({ sortOrder: categories.sortOrder }).from(categories).all();

  return (
    db
      .insert(categories)
      .values({
        name: input.name,
        description: input.description?.trim() ? input.description.trim() : null,
        visibleOnHomepage: input.visibleOnHomepage ?? true,
        visibility: input.visibility ?? "public",
        sortOrder: nextSortOrder(existing),
      })
      .returning()
      .get() ?? null
  );
}

export function updateCategory(id: number, input: Partial<CategoryInput>) {
  const db = getDb();
  const existing = findCategory(id);
  if (!existing) return null;

  db.update(categories)
    .set({
      name: input.name ?? existing.name,
      description:
        input.description === undefined
          ? existing.description
          : input.description?.trim()
            ? input.description.trim()
            : null,
      visibleOnHomepage: input.visibleOnHomepage ?? existing.visibleOnHomepage,
      visibility: input.visibility ?? existing.visibility,
      layout: input.layout === undefined ? existing.layout : input.layout,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .run();

  return findCategory(id);
}

/** 分类删掉后，里面的条目落到 Inbox（categoryId 置空），不会被一起删掉。 */
export function deleteCategory(id: number) {
  getDb().delete(categories).where(eq(categories.id, id)).run();
}

export function reorderCategories(orderedIds: number[]) {
  const db = getDb();
  for (const { id, sortOrder } of toSortOrderPayload(orderedIds)) {
    db.update(categories)
      .set({ sortOrder, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .run();
  }
}

function syncItemTags(itemId: number, tagNames: string[]) {
  const db = getDb();
  db.delete(itemTags).where(eq(itemTags.itemId, itemId)).run();

  const names = normalizeTagNames(tagNames);
  if (names.length === 0) return;

  db.insert(tags)
    .values(names.map((name) => ({ name })))
    .onConflictDoNothing()
    .run();

  const rows = db.select({ id: tags.id }).from(tags).where(inArray(tags.name, names)).all();
  if (rows.length === 0) return;

  db.insert(itemTags)
    .values(rows.map((row) => ({ itemId, tagId: row.id })))
    .onConflictDoNothing()
    .run();
}
