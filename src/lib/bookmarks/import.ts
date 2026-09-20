import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { categories, itemTags, items, tags } from "@/db/schema";
import { nextSortOrder } from "@/lib/utils/sort";
import type { BookmarkIndex, BookmarkPlan, DuplicatePolicy } from "./plan";

/** 预览时要知道「这个分类/标签/网址库里有没有」，一次取齐，别在循环里反复查。 */
export function readBookmarkIndex(db: Db): BookmarkIndex {
  return {
    categories: db
      .select({ name: categories.name })
      .from(categories)
      .all()
      .map((row) => row.name),
    tags: db
      .select({ name: tags.name })
      .from(tags)
      .all()
      .map((row) => row.name),
    items: db.select({ id: items.id, url: items.url }).from(items).all(),
  };
}

export interface BookmarkImportSummary {
  categories: number;
  tags: number;
  created: number;
  updated: number;
  skipped: number;
}

/**
 * 把计划写进库。整段一个事务：中途失败等于没导入。
 *
 * 只新增与更新，**不删除**任何东西 —— 与备份导入（整体替换）不同，书签导入是往现有
 * 内容里加东西，所以不需要那句「现有内容会被覆盖」的警告。
 */
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

    // 分类与标签都按名字匹配，且不区分大小写：库里已有「工具」，导入的「工具」就复用它，
    // 不再造一个看着一样的分类出来
    const categoryIdByKey = new Map(categoryRows.map((row) => [row.name.toLowerCase(), row.id]));
    const visibilityByKey = new Map(
      categoryRows.map((row) => [row.name.toLowerCase(), row.visibility]),
    );

    let nextCategoryOrder = nextSortOrder(categoryRows);
    let createdCategories = 0;

    for (const entry of plan.categories) {
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

    for (const entry of plan.tags) {
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

    // 新条目接在每个分类现有的最后一名之后，不打乱用户已经排好的顺序
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

        db.update(items)
          .set({
            title: entry.title,
            description: entry.description,
            categoryId,
            updatedAt: new Date(),
          })
          .where(eq(items.id, entry.existingItemId))
          .run();
        updated += 1;
        // 标签是并进去而不是换掉：用户自己在这条上打的标签不该被导入抹掉
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
          // 图标不在这里预取：几百条会把外网拉爆，让首页按需缓存
          iconType: "favicon",
          iconValue: null,
          // 条目可见性沿用所属分类的默认值，与手工新建一致（设计文档 §35）
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
