import { readCache, writeCache, type CachedBinary } from "@/lib/icons/cache";
import { fetchWithTimeout, readText } from "@/lib/net/fetch";
import {
  SEARCH_LIMIT,
  type IconHit,
  type LibrarySearchResult,
  type LibrarySource,
  type SearchOptions,
} from "./types";

/**
 * Iconify 是个聚合库（20 万+ 图标、上百套），也是少数几个真正提供搜索接口的：
 * 只能靠搜索驱动，一次一个关键词、一次一页，绝不能想着把库里搬回来。
 *
 * 接口用法照官方文档来：
 * - 搜索 `GET /search?query=&limit=`，回 `icons`（`prefix:name`）与 `collections`（含许可）
 * - 取图 `GET /{prefix}/{name}.svg`，单色套件可以带 `?color=` 改色
 * 官方还明确要求「别拿它当批量下载口、请缓存结果」—— 所以两层都落盘缓存。
 */
const API = "https://api.iconify.design";
const SEARCH_TTL_MS = 24 * 60 * 60 * 1000;
const ICON_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_NAMESPACE = "iconify";

interface CollectionInfo {
  name?: string;
  license?: { title?: string; spdx?: string };
  palette?: boolean;
}

interface SearchPayload {
  icons?: unknown;
  total?: unknown;
  collections?: unknown;
}

/** 「图标集名 · 许可」：许可随套件不同（MIT / Apache / CC-BY…），得跟着图标一起说明。 */
function noteFor(prefix: string, collections: Record<string, CollectionInfo>): string | null {
  const collection = collections[prefix];
  if (!collection) return prefix;
  const name = collection.name ?? prefix;
  const license = collection.license?.title ?? collection.license?.spdx;
  return [name, license].filter(Boolean).join(" · ");
}

function parseSearch(raw: string, limit: number, offset: number): LibrarySearchResult {
  const payload = JSON.parse(raw) as SearchPayload;
  const list = Array.isArray(payload.icons) ? payload.icons : [];
  const collections =
    payload.collections && typeof payload.collections === "object"
      ? (payload.collections as Record<string, CollectionInfo>)
      : {};

  const hits: IconHit[] = [];
  for (const entry of list) {
    if (typeof entry !== "string" || !entry.includes(":")) continue;
    const [prefix, name] = entry.split(":", 2) as [string, string];
    hits.push({
      name: entry,
      title: name,
      // 单色套件给个黑白任选；彩色套件（palette）改色无效，界面上就不摆了
      color: collections[prefix]?.palette ? null : "#000000",
      note: noteFor(prefix, collections),
      guidelines: null,
    });
    if (hits.length >= limit) break;
  }

  const total = typeof payload.total === "number" ? payload.total : hits.length;
  return { hits, total, offset };
}

async function searchQuery(
  query: string,
  options: SearchOptions,
): Promise<LibrarySearchResult | null> {
  const trimmed = query.trim();
  const offset = Math.max(0, options.offset ?? 0);
  const limit = options.limit ?? SEARCH_LIMIT;
  // Iconify 自己会用 total 截断 start，这里照它的规矩来
  if (!trimmed) return { hits: [], total: 0, offset };

  const key = `search\n${trimmed.toLowerCase()}\n${offset}\n${limit}`;
  const cached = readCache(CACHE_NAMESPACE, key, SEARCH_TTL_MS);
  if (cached) {
    try {
      return parseSearch(cached.body.toString("utf8"), limit, offset);
    } catch {
      /* 缓存坏了就重新问一次 */
    }
  }

  const url = `${API}/search?query=${encodeURIComponent(trimmed)}&limit=${limit}&start=${offset}`;
  const response = await fetchWithTimeout(url, "application/json");
  if (!response?.ok) return null;

  const text = await readText(response, 512 * 1024);
  if (!text) return null;

  try {
    const result = parseSearch(text, limit, offset);
    writeCache(CACHE_NAMESPACE, key, {
      body: Buffer.from(text, "utf8"),
      contentType: "application/json",
    });
    return result;
  } catch {
    return null;
  }
}

async function fetchIcon(name: string, color: string | null): Promise<CachedBinary | null> {
  if (!/^[a-z0-9-]+:[a-z0-9-]+$/i.test(name)) return null;

  const key = `svg\n${name}\n${color ?? ""}`;
  const cached = readCache(CACHE_NAMESPACE, key, ICON_TTL_MS);
  if (cached) return cached;

  const [prefix, icon] = name.split(":", 2) as [string, string];
  const url = `${API}/${prefix}/${icon}.svg${color ? `?color=${encodeURIComponent(color)}` : ""}`;
  const response = await fetchWithTimeout(url, "image/svg+xml,*/*;q=0.8");
  if (!response?.ok) return null;

  let body: Buffer;
  try {
    body = Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
  if (body.length === 0 || body.length > 512 * 1024) return null;

  const payload: CachedBinary = { body, contentType: "image/svg+xml" };
  writeCache(CACHE_NAMESPACE, key, payload);
  return payload;
}

export const iconifySource: LibrarySource = {
  id: "iconify",
  label: "Iconify",
  hint: "20 万+ 图标、上百套图标集，按关键词搜索（结果里标了图标集与许可）",
  colorModes: ["original", "mono"],
  search: async (query, options) =>
    (await searchQuery(query, options ?? {})) ?? { hits: [], total: 0, offset: 0 },
  fetchIcon,
};
