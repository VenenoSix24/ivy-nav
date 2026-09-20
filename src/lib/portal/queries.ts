import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, itemTags, items, tags } from "@/db/schema";
import { toDomain } from "@/lib/utils/url";
import { sortByOrder } from "@/lib/utils/sort";
import { privateCategoryIds, visibleCategories, visibleItems } from "@/lib/utils/visibility";
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

  const hiddenCategories = privateCategoryIds(categoryRows, options.includePrivate);
  const visible = visibleItems(itemRows, options.includePrivate, hiddenCategories);
  const shownCategories = visibleCategories(categoryRows, visible, options.includePrivate);
  // 匿名访问者的整个门户就是首页那一屏，没在首页显示的分类不必发过去
  const portalCategoriesSource = options.includePrivate
    ? shownCategories
    : shownCategories.filter((category) => category.visibleOnHomepage);

  const portalCategories: PortalCategory[] = portalCategoriesSource.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    visibleOnHomepage: category.visibleOnHomepage,
    visibility: category.visibility,
    layout: category.layout,
  }));

  // 条目按最终要发出去的分类过滤。只过滤分类名而不过滤条目，
  // 隐藏分类里的条目仍会出现在响应里 —— 浏览器拿到的东西必须和屏幕上的一致。
  const allowedCategoryIds = new Set(portalCategoriesSource.map((category) => category.id));

  const portalItems: PortalItem[] = visible
    .filter((item) => {
      if (!item.url) return false;
      // 未归档的条目（Inbox）只有管理员看得到，公开页面把它们留在原地
      if (item.categoryId === null) return options.includePrivate;
      return allowedCategoryIds.has(item.categoryId);
    })
    .map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      title: item.title,
      description: item.description,
      url: item.url,
      domain: toDomain(item.url) ?? item.url,
      iconType: item.iconType,
      iconValue: item.iconValue,
      iconPlate: item.iconPlate,
      iconMono: item.iconMono,
      tags: tagsByItem.get(item.id) ?? [],
      visibility: item.visibility,
      featured: item.featured,
    }));

  return { categories: portalCategories, items: portalItems };
}
