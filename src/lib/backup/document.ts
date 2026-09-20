import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { categories, iconSets, itemTags, items, settings, tags } from "@/db/schema";
import { normalizeTagNames } from "@/lib/portal/schemas";
import { normalizeUrl } from "@/lib/utils/url";
import { BACKUP_FORMAT, BACKUP_VERSION, type BackupDocument } from "./schema";

/** 导出的是内容而不是数据库文件，条目按分类名与标签名关联 */
export function buildBackupDocument(db: Db): BackupDocument {
  const categoryRows = db.select().from(categories).orderBy(asc(categories.sortOrder)).all();
  const itemRows = db.select().from(items).orderBy(asc(items.sortOrder)).all();
  const tagRows = db.select().from(tags).orderBy(asc(tags.name)).all();
  const linkRows = db.select().from(itemTags).all();
  const settingRows = db.select().from(settings).all();
  const iconSetRows = db.select().from(iconSets).all();

  const nameById = new Map(categoryRows.map((row) => [row.id, row.name]));
  const tagNameById = new Map(tagRows.map((row) => [row.id, row.name]));
  const tagsByItem = new Map<number, string[]>();

  for (const link of linkRows) {
    const name = tagNameById.get(link.tagId);
    if (!name) continue;
    const list = tagsByItem.get(link.itemId);
    if (list) list.push(name);
    else tagsByItem.set(link.itemId, [name]);
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    categories: categoryRows.map((row) => ({
      name: row.name,
      description: row.description,
      sortOrder: row.sortOrder,
      visibleOnHomepage: row.visibleOnHomepage,
      visibility: row.visibility,
      layout: row.layout,
    })),
    items: itemRows.map((row) => ({
      title: row.title,
      url: row.url,
      description: row.description,
      iconType: row.iconType,
      iconValue: row.iconValue,
      iconPlate: row.iconPlate,
      iconMono: row.iconMono,
      iconFit: row.iconFit,
      visibility: row.visibility,
      sortOrder: row.sortOrder,
      featured: row.featured,
      categoryName: row.categoryId === null ? null : (nameById.get(row.categoryId) ?? null),
      tags: (tagsByItem.get(row.id) ?? []).sort(),
    })),
    tags: tagRows.map((row) => ({ name: row.name })),
    settings: settingRows.map((row) => ({ key: row.key, value: row.value })),
    iconSets: iconSetRows.map((row) => ({
      name: row.name,
      source: row.source,
      version: row.version,
      metadata: row.metadata,
    })),
  };
}

export interface ImportSummary {
  categories: number;
  items: number;
}

/** 用备份内容替换现有内容，整段一个事务；users 与 sessions 不动 */
export function applyBackupDocument(db: Db, document: BackupDocument): ImportSummary {
  return db.transaction(() => {
    db.delete(itemTags).run();
    db.delete(items).run();
    db.delete(categories).run();
    db.delete(tags).run();
    db.delete(settings).run();
    db.delete(iconSets).run();

    const categoryIdByName = new Map<string, number>();

    document.categories.forEach((entry, index) => {
      const [row] = db
        .insert(categories)
        .values({
          name: entry.name,
          description: entry.description ?? null,
          sortOrder: entry.sortOrder ?? index,
          visibleOnHomepage: entry.visibleOnHomepage ?? true,
          visibility: entry.visibility ?? "public",
          layout: entry.layout ?? null,
        })
        .returning({ id: categories.id })
        .all();
      if (row) categoryIdByName.set(entry.name, row.id);
    });

    const tagIdByName = new Map<string, number>();
    for (const entry of document.tags ?? []) {
      const [row] = db
        .insert(tags)
        .values({ name: entry.name })
        .onConflictDoNothing()
        .returning({ id: tags.id })
        .all();
      if (row) tagIdByName.set(entry.name, row.id);
    }

    const perCategoryOrder = new Map<string, number>();

    for (const entry of document.items) {
      const categoryName = entry.categoryName ?? null;
      const categoryId =
        categoryName === null ? null : (categoryIdByName.get(categoryName) ?? null);

      const groupKey = categoryName ?? "__inbox__";
      const fallbackOrder = perCategoryOrder.get(groupKey) ?? 0;
      perCategoryOrder.set(groupKey, fallbackOrder + 1);

      const [item] = db
        .insert(items)
        .values({
          categoryId,
          title: entry.title,
          url: normalizeUrl(entry.url) ?? entry.url,
          description: entry.description ?? null,
          iconType: entry.iconType ?? "favicon",
          iconValue: entry.iconValue ?? null,
          // 旧备份里没有这两项，取默认值
          iconPlate: entry.iconPlate ?? true,
          iconMono: entry.iconMono ?? false,
          iconFit: entry.iconFit ?? null,
          visibility: entry.visibility ?? "public",
          sortOrder: entry.sortOrder ?? fallbackOrder,
          featured: entry.featured ?? false,
        })
        .returning({ id: items.id })
        .all();

      if (!item) continue;

      for (const name of normalizeTagNames(entry.tags ?? [])) {
        let tagId = tagIdByName.get(name);
        if (tagId === undefined) {
          db.insert(tags).values({ name }).onConflictDoNothing().run();
          const row = db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).get();
          if (!row) continue;
          tagId = row.id;
          tagIdByName.set(name, tagId);
        }
        db.insert(itemTags).values({ itemId: item.id, tagId }).onConflictDoNothing().run();
      }
    }

    for (const entry of document.settings ?? []) {
      db.insert(settings)
        .values({ key: entry.key, value: entry.value })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: entry.value, updatedAt: new Date() },
        })
        .run();
    }

    for (const entry of document.iconSets ?? []) {
      db.insert(iconSets)
        .values({
          name: entry.name,
          source: entry.source,
          version: entry.version ?? null,
          metadata: entry.metadata ?? null,
        })
        .onConflictDoNothing()
        .run();
    }

    return { categories: categoryIdByName.size, items: document.items.length };
  });
}

export function exportFileName(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `ivy-nav-export-${stamp}.json`;
}
