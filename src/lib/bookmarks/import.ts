import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { categories, itemTags, items, tags } from "@/db/schema";
import { nextSortOrder } from "@/lib/utils/sort";
import type { BookmarkIndex, BookmarkPlan, DuplicatePolicy } from "./plan";

/** 一次取齐分类、标签与条目，供预览比对 */
export function readBookmarkIndex(db: Db): BookmarkIndex {
  const categoryRows = db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .all();
  const categoryNameById = new Map(categoryRows.map((row) => [row.id, row.name]));

  return {
    categories: categoryRows.map((row) => row.name),
    tags: db
      .select({ name: tags.name })
      .from(tags)
      .all()
      .map((row) => row.name),
    // 条目带上分类名
    items: db
      .select({ id: items.id, url: items.url, categoryId: items.categoryId })
      .from(items)
      .all()
      .map((row) => ({
        id: row.id,
        url: row.url,
        categoryName:
          row.categoryId === null ? null : (categoryNameById.get(row.categoryId) ?? null),
      })),
  };
}

export interface BookmarkImportSummary {
  categories: number;
  tags: number;
  created: number;
  updated: number;
  skipped: number;
}

/** 把计划写进库：只新增与更新，整段一个事务 */
export function applyBookmarkImport(
  db: Db,
  plan: BookmarkPlan,
  policy: DuplicatePolicy,
): BookmarkImportSummary {
  return db.transaction(() => {
    const categoryRows = db
      .select({
        id: categories.id,
        name: categories.name,
        sortOrder: categories.sortOrder,
        visibility: categories.visibility,
      })
      .from(categories)
      .all();

    // 分类与标签按名字匹配，不区分大小写
    const categoryIdByKey = new Map(categoryRows.map((row) => [row.name.toLowerCase(), row.id]));
    const visibilityByKey = new Map(
      categoryRows.map((row) => [row.name.toLowerCase(), row.visibility]),
    );

    let nextCategoryOrder = nextSortOrder(categoryRows);
    let createdCategories = 0;

    for (const entry of plan.preview.categories) {
      const key = entry.name.toLowerCase();
      if (categoryIdByKey.has(key)) continue;

      const [row] = db
        .insert(categories)
        .values({
          name: entry.name,
          sortOrder: nextCategoryOrder,
          visibleOnHomepage: true,
          visibility: "public",
        })
        .returning({ id: categories.id })
        .all();
      nextCategoryOrder += 1;

      if (row) {
        categoryIdByKey.set(key, row.id);
        visibilityByKey.set(key, "public");
        createdCategories += 1;
      }
    }

    const tagIdByKey = new Map(
      db
        .select({ id: tags.id, name: tags.name })
        .from(tags)
        .all()
        .map((row) => [row.name.toLowerCase(), row.id]),
    );

    let createdTags = 0;

    for (const entry of plan.preview.tags) {
      const key = entry.name.toLowerCase();
      if (tagIdByKey.has(key)) continue;

      const [row] = db
        .insert(tags)
        .values({ name: entry.name })
        .onConflictDoNothing()
        .returning({ id: tags.id })
        .all();

      if (row) {
        tagIdByKey.set(key, row.id);
        createdTags += 1;
      }
    }

    // 新条目接在每个分类现有最后一名之后
    const maxOrder = new Map<number | null, number>();
    for (const row of db
      .select({ categoryId: items.categoryId, sortOrder: items.sortOrder })
      .from(items)
      .all()) {
      maxOrder.set(row.categoryId, Math.max(maxOrder.get(row.categoryId) ?? -1, row.sortOrder));
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const entry of plan.items) {
      const key = entry.categoryName?.toLowerCase();
      const categoryId = key === undefined ? null : (categoryIdByKey.get(key) ?? null);

      if (entry.existingItemId !== null) {
        if (policy === "skip") {
          skipped += 1;
          continue;
        }

        // 命中已有条目时只改标题与描述，标签是并进去而不是换掉
        db.update(items)
          .set({
            title: entry.title,
            description: entry.description,
            updatedAt: new Date(),
          })
          .where(eq(items.id, entry.existingItemId))
          .run();
        updated += 1;
        linkTags(entry.existingItemId, entry.tags);
        continue;
      }

      const next = (maxOrder.get(categoryId) ?? -1) + 1;
      maxOrder.set(categoryId, next);

      const [row] = db
        .insert(items)
        .values({
          title: entry.title,
          url: entry.url,
          description: entry.description,
          categoryId,
          // 图标不在这里预取
          iconType: "favicon",
          iconValue: null,
          // 条目可见性沿用所属分类的默认值
          visibility: key === undefined ? "public" : (visibilityByKey.get(key) ?? "public"),
          sortOrder: next,
        })
        .returning({ id: items.id })
        .all();

      if (!row) continue;
      created += 1;
      linkTags(row.id, entry.tags);
    }

    return {
      categories: createdCategories,
      tags: createdTags,
      created,
      updated,
      skipped,
    };

    function linkTags(itemId: number, names: string[]) {
      for (const name of names) {
        const tagId = tagIdByKey.get(name.toLowerCase());
        if (tagId === undefined) continue;
        db.insert(itemTags).values({ itemId, tagId }).onConflictDoNothing().run();
      }
    }
  });
}
