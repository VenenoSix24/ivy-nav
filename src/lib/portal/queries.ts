import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, itemTags, items, tags } from "@/db/schema";
import { toDomain } from "@/lib/utils/url";
import { sortByOrder } from "@/lib/utils/sort";
import { visibleCategories, visibleItems } from "@/lib/utils/visibility";
import type { PortalCategory, PortalData, PortalItem } from "./types";

/**
 * The only way portal content reaches a page. Filtering happens here, on the server, so a
 * guest's payload never contains private rows — hiding them in the browser would still
 * have shipped the URLs (设计文档 §10).
 */
export function getPortalData(options: { includePrivate: boolean }): PortalData {
  const db = getDb();

  const categoryRows = sortByOrder(db.select().from(categories).all());
  const itemRows = sortByOrder(db.select().from(items).all());

  const tagRows = db
    .select({ itemId: itemTags.itemId, name: tags.name })
    .from(itemTags)
    .innerJoin(tags, eq(tags.id, itemTags.tagId))
    .orderBy(asc(tags.name))
    .all();

  const tagsByItem = new Map<number, string[]>();
  for (const row of tagRows) {
    const list = tagsByItem.get(row.itemId);
    if (list) list.push(row.name);
    else tagsByItem.set(row.itemId, [row.name]);
  }

  const visible = visibleItems(itemRows, options.includePrivate);
  const shownCategoryIds = new Set(visible.map((item) => item.categoryId));
  const shownCategories = visibleCategories(categoryRows, visible, options.includePrivate);

  const portalCategories: PortalCategory[] = shownCategories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    visibleOnHomepage: category.visibleOnHomepage,
  }));

  const portalItems: PortalItem[] = visible
    .filter((item) => item.url && shownCategoryIds.has(item.categoryId))
    .map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      title: item.title,
      description: item.description,
      url: item.url,
      domain: toDomain(item.url) ?? item.url,
      iconType: item.iconType,
      iconValue: item.iconValue,
      tags: tagsByItem.get(item.id) ?? [],
      visibility: item.visibility,
      featured: item.featured,
    }));

  return { categories: portalCategories, items: portalItems };
}
