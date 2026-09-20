/** 把书签树映射成本站的内容 */

import { normalizeTagNames } from "@/lib/portal/schemas";
import { normalizeUrl, toDomain } from "@/lib/utils/url";
import { countLinks, type BookmarkFolder } from "./parse";

/** 与 portal/schemas.ts 保持一致的上限 */
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 300;
const CATEGORY_MAX = 40;
const TAG_MAX = 30;
const TAGS_PER_ITEM = 12;

/** 预览里最多摆这么多条 */
const PREVIEW_INVALID_MAX = 50;
const PREVIEW_TAG_MAX = 100;
const PREVIEW_SAMPLE = 20;
/** 单个分组的样例条数 */
const GROUP_SAMPLE = 5;
const SHARED_SAMPLE = 5;

export const INBOX_KEY = "inbox";
export const INBOX_LABEL = "未分类";

export const DUPLICATE_POLICIES = ["skip", "overwrite"] as const;
export type DuplicatePolicy = (typeof DUPLICATE_POLICIES)[number];

export function isDuplicatePolicy(value: unknown): value is DuplicatePolicy {
  return typeof value === "string" && (DUPLICATE_POLICIES as readonly string[]).includes(value);
}

/** 浏览器自带的顶层目录 */
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
  /** 现有条目，按分类 + 网址比对 */
  items: { id: number; url: string; categoryName: string | null }[];
}

export interface PlannedItem {
  title: string;
  url: string;
  description: string | null;
  categoryName: string | null;
  tags: string[];
  /** 这一类里已有同一个网址时命中的条目 */
  existingItemId: number | null;
}

export interface PlannedCategory {
  name: string;
  count: number;
  /** 库里已有同名分类（大小写不敏感） */
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

/** 一份计划的统计 */
export interface BookmarkPreview {
  total: number;
  importable: number;
  /** 同一个分类里重复出现的网址数 */
  repeatsInFile: number;
  /** 同一个分类里库里已经有这个网址的条数 */
  existingDuplicates: number;
  invalidTotal: number;
  invalid: InvalidRow[];
  categories: PlannedCategory[];
  tags: PlannedTag[];
  tagTotal: number;
  derivedTitles: number;
  truncatedTitles: number;
  truncatedDescriptions: number;
  truncatedTags: number;
  sample: { title: string; url: string; categoryName: string | null; tags: string[] }[];
}

/** 预览里的一行：一个顶层目录或未分类 */
export interface PlannedGroup {
  key: string;
  name: string;
  /** 这一组归到哪个分类；「未分类」是 null */
  categoryName: string | null;
  /** 这一组可导入的条目数 */
  count: number;
  preview: BookmarkPreview;
}

/** 同一个网址出现在多个分类的情况 */
export interface SharedSummary {
  urls: number;
  /** 比「一个网址一条」多出来的条目数 */
  extra: number;
  sample: { title: string; url: string; categories: string[] }[];
}

export interface BookmarkPlan {
  groups: PlannedGroup[];
  /** 选中范围内的待办条目 */
  items: PlannedItem[];
  /** 选中范围的合计 */
  preview: BookmarkPreview;
  /** 整份文件的跨分类情况 */
  shared: SharedSummary;
  ignoredRoots: string[];
  /** 文件里的书签总数，含重复与无效的 */
  total: number;
}

/** 发给前端的预览数据 */
export interface BookmarkPreviewPayload {
  total: number;
  groups: PlannedGroup[];
  /** 「全部选中」时的合计 */
  merged: BookmarkPreview;
  shared: SharedSummary;
  ignoredRoots: string[];
}

/** 去重的依据：同一个分类里的同一个网址 */
export function itemKey(categoryName: string | null, url: string): string {
  return `${categoryName?.toLowerCase() ?? ""}\n${url}`;
}

interface LinkEntry {
  title: string;
  url: string;
  description: string | null;
}

interface Seed {
  key: string;
  name: string;
  categoryName: string | null;
  links: { link: LinkEntry; tags: string[] }[];
}

export function planBookmarkImport(
  tree: BookmarkFolder,
  index: BookmarkIndex,
  selection?: string[] | null,
): BookmarkPlan {
  const existingCategories = new Set(index.categories.map((name) => name.toLowerCase()));
  const existingTags = new Set(index.tags.map((name) => name.toLowerCase()));
  const existingItems = new Map(
    index.items.map((item) => [itemKey(item.categoryName, item.url), item.id]),
  );

  const ignoredRoots = new Set<string>();
  /** 分类 + 网址，已出现过的键 */
  const seen = new Set<string>();
  /** 网址对应它落在哪些分类里 */
  const byUrl = new Map<string, { title: string; url: string; categories: string[] }>();

  const seeds: Seed[] = [];
  const inbox: Seed = { key: INBOX_KEY, name: INBOX_LABEL, categoryName: null, links: [] };
  let folderCount = 0;

  function visit(
    folder: BookmarkFolder,
    depth: number,
    group: Seed,
    categoryName: string | null,
    tags: string[],
  ) {
    for (const link of folder.links) group.links.push({ link, tags });

    for (const child of folder.folders) {
      const name = child.name.trim();

      if (!name) {
        visit(child, depth, group, categoryName, tags);
        continue;
      }
      if (depth === 0 && isWrapperRoot(name)) {
        ignoredRoots.add(name);
        visit(child, 0, group, categoryName, tags);
        continue;
      }
      if (depth === 0) {
        const created: Seed = {
          key: `f${folderCount}`,
          name,
          categoryName: clip(name, CATEGORY_MAX).value,
          links: [],
        };
        folderCount += 1;
        seeds.push(created);
        visit(child, 1, created, created.categoryName, []);
        continue;
      }
      visit(child, depth + 1, group, categoryName, [...tags, name]);
    }
  }

  visit(tree, 0, inbox, null, []);

  const groups: PlannedGroup[] = [];
  const itemsByKey = new Map<string, PlannedItem[]>();

  for (const seed of [...seeds, ...(inbox.links.length > 0 ? [inbox] : [])]) {
    const items: PlannedItem[] = [];
    const invalid: InvalidRow[] = [];
    const categoryCounts = new Map<string, { name: string; count: number }>();
    const tagCounts = new Map<string, { name: string; count: number }>();

    let repeatsInFile = 0;
    let existingDuplicates = 0;
    let derivedTitles = 0;
    let truncatedTitles = 0;
    let truncatedDescriptions = 0;
    let truncatedTags = 0;

    for (const { link, tags } of seed.links) {
      const url = normalizeUrl(link.url);
      if (!url) {
        invalid.push({
          title: clip(link.title, TITLE_MAX).value,
          url: link.url,
          reason: link.url.trim() ? "只支持 http 与 https" : "没有网址",
        });
        continue;
      }

      const key = itemKey(seed.categoryName, url);
      if (seen.has(key)) {
        repeatsInFile += 1;
        continue;
      }
      seen.add(key);

      let title = clip(link.title, TITLE_MAX);
      if (!title.value) {
        title = { value: toDomain(url) ?? url, truncated: false };
        derivedTitles += 1;
      }
      if (title.truncated) truncatedTitles += 1;

      const description = link.description ? clip(link.description, DESCRIPTION_MAX) : null;
      if (description?.truncated) truncatedDescriptions += 1;

      const allTags = normalizeTagNames(tags.map((tag) => clip(tag, TAG_MAX).value));
      if (allTags.length > TAGS_PER_ITEM) truncatedTags += 1;
      const names = allTags.slice(0, TAGS_PER_ITEM);

      const existingItemId = existingItems.get(key) ?? null;
      if (existingItemId !== null) existingDuplicates += 1;

      items.push({
        title: title.value,
        url,
        description: description?.value || null,
        categoryName: seed.categoryName,
        tags: names,
        existingItemId,
      });

      if (seed.categoryName) {
        const entry = categoryCounts.get(seed.categoryName);
        if (entry) entry.count += 1;
        else categoryCounts.set(seed.categoryName, { name: seed.categoryName, count: 1 });
      }
      for (const name of names) {
        const tagKey = name.toLowerCase();
        const entry = tagCounts.get(tagKey);
        if (entry) entry.count += 1;
        else tagCounts.set(tagKey, { name, count: 1 });
      }

      const label = seed.categoryName ?? INBOX_LABEL;
      const shared = byUrl.get(url);
      if (shared) {
        if (!shared.categories.includes(label)) shared.categories.push(label);
      } else {
        byUrl.set(url, { title: title.value, url, categories: [label] });
      }
    }

    itemsByKey.set(seed.key, items);
    groups.push({
      key: seed.key,
      name: seed.name,
      categoryName: seed.categoryName,
      count: items.length,
      preview: {
        total: seed.links.length,
        importable: items.length,
        repeatsInFile,
        existingDuplicates,
        invalidTotal: invalid.length,
        invalid: invalid.slice(0, PREVIEW_INVALID_MAX),
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
        tagTotal: tagCounts.size,
        derivedTitles,
        truncatedTitles,
        truncatedDescriptions,
        truncatedTags,
        sample: items.slice(0, GROUP_SAMPLE).map((item) => ({
          title: item.title,
          url: item.url,
          categoryName: item.categoryName,
          tags: item.tags,
        })),
      },
    });
  }

  const selected = selection === undefined || selection === null ? null : new Set(selection);
  const chosen = groups.filter((group) => selected === null || selected.has(group.key));
  const sharedEntries = [...byUrl.values()].filter((entry) => entry.categories.length > 1);

  return {
    groups,
    items: chosen.flatMap((group) => itemsByKey.get(group.key) ?? []),
    preview: mergePreview(chosen.map((group) => group.preview)),
    shared: {
      urls: sharedEntries.length,
      extra: sharedEntries.reduce((sum, entry) => sum + entry.categories.length - 1, 0),
      sample: sharedEntries.slice(0, SHARED_SAMPLE),
    },
    ignoredRoots: [...ignoredRoots],
    total: countLinks(tree),
  };
}

export function toPreviewPayload(plan: BookmarkPlan): BookmarkPreviewPayload {
  return {
    total: plan.total,
    groups: plan.groups,
    merged: plan.preview,
    shared: plan.shared,
    ignoredRoots: plan.ignoredRoots,
  };
}

/** 把几组统计加起来 */
export function mergePreview(previews: BookmarkPreview[]): BookmarkPreview {
  const categories = new Map<string, PlannedCategory>();
  const tags = new Map<string, PlannedTag>();
  const invalid: InvalidRow[] = [];
  const sample: BookmarkPreview["sample"] = [];

  const sums = {
    total: 0,
    importable: 0,
    repeatsInFile: 0,
    existingDuplicates: 0,
    invalidTotal: 0,
    derivedTitles: 0,
    truncatedTitles: 0,
    truncatedDescriptions: 0,
    truncatedTags: 0,
  };

  for (const preview of previews) {
    sums.total += preview.total;
    sums.importable += preview.importable;
    sums.repeatsInFile += preview.repeatsInFile;
    sums.existingDuplicates += preview.existingDuplicates;
    sums.invalidTotal += preview.invalidTotal;
    sums.derivedTitles += preview.derivedTitles;
    sums.truncatedTitles += preview.truncatedTitles;
    sums.truncatedDescriptions += preview.truncatedDescriptions;
    sums.truncatedTags += preview.truncatedTags;
    invalid.push(...preview.invalid);
    sample.push(...preview.sample);

    for (const entry of preview.categories) {
      const key = entry.name.toLowerCase();
      const found = categories.get(key);
      if (found) found.count += entry.count;
      else categories.set(key, { ...entry });
    }
    for (const entry of preview.tags) {
      const key = entry.name.toLowerCase();
      const found = tags.get(key);
      if (found) found.count += entry.count;
      else tags.set(key, { ...entry });
    }
  }

  return {
    ...sums,
    invalid: invalid.slice(0, PREVIEW_INVALID_MAX),
    categories: [...categories.values()],
    tags: [...tags.values()].slice(0, PREVIEW_TAG_MAX),
    tagTotal: tags.size,
    sample: sample.slice(0, PREVIEW_SAMPLE),
  };
}

function clip(value: string, max: number): { value: string; truncated: boolean } {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return { value: trimmed, truncated: false };
  return { value: trimmed.slice(0, max), truncated: true };
}
