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

/** Simple Icons：数据随 npm 包装在本地，搜索与取图都不碰网络 */
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
    // 空关键词按标题给头一批，不搬全库
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

/** 官方 SVG 不带 fill，要上色就在根节点写 fill */
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
