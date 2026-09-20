import type { CachedBinary } from "@/lib/icons/cache";

/**
 * 图标库这一层的公共形状。三件事分开：
 * 搜（只给名字与元信息，不搬图标本体）、取（要哪张取哪张）、记（挑中的那张落成本地文件）。
 *
 * 「不搬图标本体」是这一层的硬约束：Simple Icons 三千多、Iconify 二十万，
 * 一次全取回来只会把页面和服务器都拖死（设计文档 §40 的第二阶段要求）。
 */

/** 一条搜索结果。颜色只有品牌类图标库才有（Simple Icons 每个图标自带一个 hex）。 */
export interface IconHit {
  /** 库内唯一名：simple-icons 是 slug，Iconify 是 `prefix:name`，自建集是 JSON 里的名字 */
  name: string;
  /** 给人看的名字 */
  title: string;
  /** 品牌色，形如 `#181717`；没有就是 null */
  color: string | null;
  /** 补一句来源：Iconify 用来标图标集与许可，自建集标镜像 */
  note: string | null;
  /** 品牌规范链接（Simple Icons 自带 guidelines），挑的时候给用户一个去看的地方 */
  guidelines: string | null;
}

export interface LibrarySearchResult {
  hits: IconHit[];
  /** 库里匹配到的总数（可能远多于 hits.length） */
  total: number;
  /** 这一页从第几条开始 */
  offset: number;
}

/** 颜色可选值：品牌色 / 原色 / 黑白单色。按库给，不硬凑。 */
export type ColorMode = "brand" | "original" | "mono";

export interface SearchOptions {
  /** 从第几条开始：一页看不完时接着往下要 */
  offset?: number;
  limit?: number;
}

export interface LibrarySource {
  id: string;
  label: string;
  /** 一句话说明 */
  hint: string;
  /** 这个库认哪些颜色选项（Simple Icons 有品牌色，Iconify 有原色，自建集只认原色） */
  colorModes: ColorMode[];
  search(query: string, options?: SearchOptions): Promise<LibrarySearchResult>;
  fetchIcon(name: string, color: string | null): Promise<CachedBinary | null>;
}

/** 一页给多少：6 列网格正好 10 行，再多就该用「显示更多」了 */
export const SEARCH_LIMIT = 60;

/** 关键词打分：整名相等 > 名字前缀 > 标题前缀 > 名字包含 > 标题包含。 */
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

/**
 * 空白分词，词与词之间是「与」：`google chrome` 要两个词都命中，
 * 光靠整串匹配会搜不到（名字里没有空格）。
 */
export function matchesAll(name: string, title: string, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = `${name} ${title}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
