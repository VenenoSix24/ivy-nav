import { asc, count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, itemTags, items, tags } from "@/db/schema";
import { getDefaultIconFit } from "@/lib/settings/icon-fit";
import { toDomain } from "@/lib/utils/url";
import { sortByOrder } from "@/lib/utils/sort";
import {
  isItemVisibleToGuest,
  privateCategoryIds,
  visibleCategories,
  visibleItems,
} from "@/lib/utils/visibility";
import type { PortalCategory, PortalData, PortalItem, TagSummary } from "./types";

/** The only way portal content reaches a page; filtering happens here, on the server. */
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
  // 匿名访问者只拿首页显示的分类
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

  // 条目按最终要发出去的分类过滤
  const allowedCategoryIds = new Set(portalCategoriesSource.map((category) => category.id));
  // 条目自己设过就听它的，没设过跟随设置页里的默认
  const defaultIconFit = getDefaultIconFit();

  const portalItems: PortalItem[] = visible
    .filter((item) => {
      if (!item.url) return false;
      // 未归档的条目（Inbox）只有管理员看得到
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
      iconFit: item.iconFit ?? defaultIconFit,
      iconFitOwn: item.iconFit,
      tags: tagsByItem.get(item.id) ?? [],
      visibility: item.visibility,
      featured: item.featured,
    }));

  return { categories: portalCategories, items: portalItems, defaultIconFit };
}

/** 有没有匿名看得见的条目在用这份图标文件 */
export function hasGuestVisibleIcon(name: string): boolean {
  const db = getDb();
  const holders = db
    .select({ categoryId: items.categoryId, visibility: items.visibility })
    .from(items)
    .where(eq(items.iconValue, name))
    .all();
  if (holders.length === 0) return false;

  const byId = new Map(
    db
      .select()
      .from(categories)
      .all()
      .map((row) => [row.id, row]),
  );
  return holders.some((holder) =>
    isItemVisibleToGuest(
      holder,
      holder.categoryId === null ? null : (byId.get(holder.categoryId) ?? null),
    ),
  );
}

/** 标签与用它的条目数，按名字排（设置页的「标签」一节用） */
export function listTagsWithCounts(): TagSummary[] {
  const db = getDb();
  const counts = db
    .select({ tagId: itemTags.tagId, itemCount: count() })
    .from(itemTags)
    .groupBy(itemTags.tagId)
    .all();
  const byTag = new Map(counts.map((row) => [row.tagId, row.itemCount]));

  return db
    .select()
    .from(tags)
    .all()
    .map((tag) => ({ id: tag.id, name: tag.name, itemCount: byTag.get(tag.id) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
