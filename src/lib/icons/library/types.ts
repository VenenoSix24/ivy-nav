import type { CachedBinary } from "@/lib/icons/cache";

/** 图标库这一层的公共形状：搜、取、记 */

/** 一条搜索结果 */
export interface IconHit {
  /** 库内唯一名 */
  name: string;
  /** 给人看的名字 */
  title: string;
  /** 品牌色，形如 `#181717`；没有就是 null */
  color: string | null;
  /** 补一句来源 */
  note: string | null;
  /** 品牌规范链接 */
  guidelines: string | null;
}

export interface LibrarySearchResult {
  hits: IconHit[];
  /** 库里匹配到的总数 */
  total: number;
  /** 这一页从第几条开始 */
  offset: number;
}

/** 颜色可选值：品牌色 / 原色 / 黑白单色 */
export type ColorMode = "brand" | "original" | "mono";

export interface SearchOptions {
  /** 从第几条开始 */
  offset?: number;
  limit?: number;
}

export interface LibrarySource {
  id: string;
  label: string;
  /** 一句话说明 */
  hint: string;
  /** 这个库认哪些颜色选项 */
  colorModes: ColorMode[];
  search(query: string, options?: SearchOptions): Promise<LibrarySearchResult>;
  fetchIcon(name: string, color: string | null): Promise<CachedBinary | null>;
}

/** 一页给多少 */
export const SEARCH_LIMIT = 60;

/** 关键词打分 */
export function scoreMatch(name: string, title: string, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  const slug = name.toLowerCase();
  const label = title.toLowerCase();
  if (slug === q || label === q) return 100;
  if (slug.startsWith(q)) return 80;
  if (label.startsWith(q)) return 60;
  if (slug.includes(q)) return 40;
  if (label.includes(q)) return 20;
  return 0;
}

/** 空白分词，词与词之间是「与」 */
export function matchesAll(name: string, title: string, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = `${name} ${title}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
