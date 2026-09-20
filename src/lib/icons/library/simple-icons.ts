import * as simpleIcons from "simple-icons";
import type { CachedBinary } from "@/lib/icons/cache";
import {
  SEARCH_LIMIT,
  matchesAll,
  scoreMatch,
  type IconHit,
  type LibrarySearchResult,
  type LibrarySource,
  type SearchOptions,
} from "./types";

/**
 * Simple Icons：一个图标一枚品牌，数据随 npm 包（CC0）一起装在本地 —— 搜索与取图
 * 都不碰网络，这对一个常常被墙的部署环境是实打实的好处。
 *
 * 两条要守的规范（这也是它们在文档里反复强调的）：
 * - 图标是单色的，官方给的颜色是 `hex`（品牌色），要用颜色就用它，别自己编；
 * - 品牌标志的商标权属于各品牌，`guidelines` 是品牌自己的规范页，
 *   挑的时候把链接摆出来，让人知道去哪儿看能怎么用。
 */
interface SimpleIconEntry {
  title: string;
  slug: string;
  hex: string;
  svg: string;
  guidelines?: string;
}

const ALL: SimpleIconEntry[] = Object.values(
  simpleIcons as unknown as Record<string, SimpleIconEntry>,
);

function toHit(entry: SimpleIconEntry): IconHit {
  return {
    name: entry.slug,
    title: entry.title,
    color: `#${entry.hex}`,
    note: null,
    guidelines: entry.guidelines ?? null,
  };
}

const BY_SLUG = new Map(ALL.map((entry) => [entry.slug, entry]));

function search(query: string, options: SearchOptions = {}): LibrarySearchResult {
  const offset = Math.max(0, options.offset ?? 0);
  const limit = options.limit ?? SEARCH_LIMIT;
  const trimmed = query.trim();

  if (!trimmed) {
    // 空关键词不搬全库：按标题给个头一批，让人有个下手的地方
    const head = [...ALL].sort((a, b) => a.title.localeCompare(b.title));
    return { hits: head.slice(offset, offset + limit).map(toHit), total: head.length, offset };
  }

  const matched = ALL.filter((entry) => matchesAll(entry.slug, entry.title, trimmed)).map(
    (entry) => ({ entry, score: scoreMatch(entry.slug, entry.title, trimmed) }),
  );

  matched.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));

  return {
    hits: matched.slice(offset, offset + limit).map(({ entry }) => toHit(entry)),
    total: matched.length,
    offset,
  };
}

/** 官方 SVG 不带 fill（默认黑），要上色就在根节点写 fill —— CDN 也是这么干的。 */
function colorize(svg: string, color: string | null): string {
  if (!color) return svg;
  return svg.replace(/^<svg\b/, `<svg fill="${color}"`);
}

async function fetchIcon(name: string, color: string | null): Promise<CachedBinary | null> {
  const entry = BY_SLUG.get(name);
  if (!entry) return null;
  return {
    body: Buffer.from(colorize(entry.svg, color), "utf8"),
    contentType: "image/svg+xml",
  };
}

export const simpleIconsSource: LibrarySource = {
  id: "simple-icons",
  label: "Simple Icons",
  hint: `${ALL.length} 个品牌标志，单色，自带品牌色与品牌规范链接`,
  colorModes: ["brand", "mono"],
  search: (query, options) => Promise.resolve(search(query, options)),
  fetchIcon,
};
