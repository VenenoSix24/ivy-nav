/**
 * 把书签树映射成本站的内容。
 *
 * 规则（与用户商定）：**一级目录当分类，二级及更深的目录当标签**。
 * - 浏览器自带的那层壳（「书签栏」「其他书签」……）不算目录，直接下钻；
 * - 顶层散着的书签没有归属，落进 Inbox（无分类）；
 * - A/B/C 里的书签 → 分类 A + 标签 B、C；
 * - 同一份文件里出现两次的网址只留第一次（这一条不给选项，文件自身的重复没有取舍意义）。
 *
 * 这个模块是纯函数：不碰数据库、不碰网络，现有的分类/标签/条目由调用方以索引形式传入，
 * 所以预览与实际导入走的是同一段逻辑，两边不会算出不一样的结果。
 */

import { normalizeTagNames } from "@/lib/portal/schemas";
import { normalizeUrl, toDomain } from "@/lib/utils/url";
import { countLinks, type BookmarkFolder } from "./parse";

/** 与 portal/schemas.ts 里的上限保持一致，超出的在这里就截掉并记一笔 */
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 300;
const CATEGORY_MAX = 40;
const TAG_MAX = 30;
const TAGS_PER_ITEM = 12;

export const DUPLICATE_POLICIES = ["skip", "overwrite"] as const;
export type DuplicatePolicy = (typeof DUPLICATE_POLICIES)[number];

export function isDuplicatePolicy(value: unknown): value is DuplicatePolicy {
  return typeof value === "string" && (DUPLICATE_POLICIES as readonly string[]).includes(value);
}

/**
 * 浏览器自带的那几个顶层目录：它们是「书签存在哪儿」的容器，不是用户分的类。
 * 只在第一层认这几个名字 —— 用户自己建一个叫「收藏夹」的子目录是有可能的，
 * 那也是他想要的分类。
 */
const WRAPPER_ROOTS = [
  "书签栏",
  "书签工具栏",
  "书签菜单",
  "收藏夹栏",
  "收藏夹",
  "其他书签",
  "其他收藏",
  "移动设备书签",
  "移动书签",
  "bookmarks",
  "bookmarks bar",
  "bookmarks toolbar",
  "bookmarks menu",
  "favorites",
  "favorites bar",
  "other bookmarks",
  "mobile bookmarks",
];

function isWrapperRoot(name: string): boolean {
  return WRAPPER_ROOTS.includes(name.toLowerCase());
}

export interface BookmarkIndex {
  /** 现有分类名 */
  categories: string[];
  /** 现有标签名 */
  tags: string[];
  /** 现有条目：只用到编号与网址 */
  items: { id: number; url: string }[];
}

export interface PlannedItem {
  title: string;
  url: string;
  description: string | null;
  categoryName: string | null;
  tags: string[];
  /** 库里已经有同一个网址；「覆盖」策略下更新它，「跳过」策略下略过它 */
  existingItemId: number | null;
}

export interface PlannedCategory {
  name: string;
  count: number;
  /** 库里已有同名分类（大小写不敏感），导入时直接复用 */
  existing: boolean;
}

export interface PlannedTag {
  name: string;
  count: number;
  existing: boolean;
}

export interface InvalidRow {
  title: string;
  url: string;
  reason: string;
}

export interface BookmarkPlan {
  items: PlannedItem[];
  categories: PlannedCategory[];
  tags: PlannedTag[];
  ignoredRoots: string[];
  invalid: InvalidRow[];
  /** 文件里的书签总数，含重复与无效的 */
  total: number;
  duplicatesInFile: number;
  existingDuplicates: number;
  derivedTitles: number;
  truncatedTitles: number;
  truncatedDescriptions: number;
  truncatedTags: number;
}

export interface BookmarkPreview {
  total: number;
  importable: number;
  duplicatesInFile: number;
  existingDuplicates: number;
  invalidTotal: number;
  invalid: InvalidRow[];
  categories: PlannedCategory[];
  tags: PlannedTag[];
  tagTotal: number;
  ignoredRoots: string[];
  derivedTitles: number;
  truncatedTitles: number;
  truncatedDescriptions: number;
  truncatedTags: number;
  sample: { title: string; url: string; categoryName: string | null; tags: string[] }[];
}

const PREVIEW_INVALID_MAX = 50;
const PREVIEW_TAG_MAX = 100;
const PREVIEW_SAMPLE = 20;

export function planBookmarkImport(tree: BookmarkFolder, index: BookmarkIndex): BookmarkPlan {
  const existingCategories = new Set(index.categories.map((name) => name.toLowerCase()));
  const existingTags = new Set(index.tags.map((name) => name.toLowerCase()));
  const existingItems = new Map(index.items.map((item) => [item.url, item.id]));

  const items: PlannedItem[] = [];
  const invalid: InvalidRow[] = [];
  const ignoredRoots = new Set<string>();
  const seenUrls = new Set<string>();
  const categoryCounts = new Map<string, { name: string; count: number }>();
  const tagCounts = new Map<string, { name: string; count: number }>();

  let duplicatesInFile = 0;
  let existingDuplicates = 0;
  let derivedTitles = 0;
  let truncatedTitles = 0;
  let truncatedDescriptions = 0;
  let truncatedTags = 0;

  function addLink(link: BookmarkLinkInput, categoryName: string | null, tags: string[]) {
    const url = normalizeUrl(link.url);
    if (!url) {
      invalid.push({
        title: clip(link.title, TITLE_MAX).value,
        url: link.url,
        reason: link.url.trim() ? "只支持 http 与 https" : "没有网址",
      });
      return;
    }

    if (seenUrls.has(url)) {
      duplicatesInFile += 1;
      return;
    }
    seenUrls.add(url);

    let title = clip(link.title, TITLE_MAX);
    if (!title.value) {
      // 没标题的书签本身是有效的，用域名顶上比整条丢掉有用
      title = { value: toDomain(url) ?? url, truncated: false };
      derivedTitles += 1;
    }
    if (title.truncated) truncatedTitles += 1;

    const description = link.description ? clip(link.description, DESCRIPTION_MAX) : null;
    if (description?.truncated) truncatedDescriptions += 1;

    const names = normalizeTagNames(tags.map((tag) => clip(tag, TAG_MAX).value));
    if (names.length > TAGS_PER_ITEM) truncatedTags += 1;

    const existingItemId = existingItems.get(url) ?? null;
    if (existingItemId !== null) existingDuplicates += 1;

    items.push({
      title: title.value,
      url,
      description: description?.value || null,
      categoryName,
      tags: names.slice(0, TAGS_PER_ITEM),
      existingItemId,
    });

    if (categoryName) {
      const entry = categoryCounts.get(categoryName);
      if (entry) entry.count += 1;
      else categoryCounts.set(categoryName, { name: categoryName, count: 1 });
    }
    for (const name of names.slice(0, TAGS_PER_ITEM)) {
      const key = name.toLowerCase();
      const entry = tagCounts.get(key);
      if (entry) entry.count += 1;
      else tagCounts.set(key, { name, count: 1 });
    }
  }

  function visit(
    folder: BookmarkFolder,
    depth: number,
    categoryName: string | null,
    tags: string[],
  ) {
    for (const link of folder.links) addLink(link, categoryName, tags);

    for (const child of folder.folders) {
      const name = child.name.trim();

      if (!name) {
        visit(child, depth, categoryName, tags);
        continue;
      }
      if (depth === 0 && isWrapperRoot(name)) {
        ignoredRoots.add(name);
        visit(child, 0, null, []);
        continue;
      }
      if (depth === 0) visit(child, 1, clip(name, CATEGORY_MAX).value, []);
      else visit(child, depth + 1, categoryName, [...tags, name]);
    }
  }

  visit(tree, 0, null, []);

  return {
    items,
    categories: [...categoryCounts.values()].map((entry) => ({
      name: entry.name,
      count: entry.count,
      existing: existingCategories.has(entry.name.toLowerCase()),
    })),
    tags: [...tagCounts.values()].map((entry) => ({
      name: entry.name,
      count: entry.count,
      existing: existingTags.has(entry.name.toLowerCase()),
    })),
    ignoredRoots: [...ignoredRoots],
    invalid,
    total: countLinks(tree),
    duplicatesInFile,
    existingDuplicates,
    derivedTitles,
    truncatedTitles,
    truncatedDescriptions,
    truncatedTags,
  };
}

/** 预览页需要的部分：条目明细留在服务端，导入时重新算一遍，省得把整份计划发来发去。 */
export function toPreview(plan: BookmarkPlan): BookmarkPreview {
  return {
    total: plan.total,
    importable: plan.items.length,
    duplicatesInFile: plan.duplicatesInFile,
    existingDuplicates: plan.existingDuplicates,
    invalidTotal: plan.invalid.length,
    invalid: plan.invalid.slice(0, PREVIEW_INVALID_MAX),
    categories: plan.categories,
    tags: plan.tags.slice(0, PREVIEW_TAG_MAX),
    tagTotal: plan.tags.length,
    ignoredRoots: plan.ignoredRoots,
    derivedTitles: plan.derivedTitles,
    truncatedTitles: plan.truncatedTitles,
    truncatedDescriptions: plan.truncatedDescriptions,
    truncatedTags: plan.truncatedTags,
    sample: plan.items.slice(0, PREVIEW_SAMPLE).map((item) => ({
      title: item.title,
      url: item.url,
      categoryName: item.categoryName,
      tags: item.tags,
    })),
  };
}

type BookmarkLinkInput = { title: string; url: string; description: string | null };

function clip(value: string, max: number): { value: string; truncated: boolean } {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return { value: trimmed, truncated: false };
  return { value: trimmed.slice(0, max), truncated: true };
}
