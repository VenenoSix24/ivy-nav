import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { iconSets, type IconSet } from "@/db/schema";
import { readCache, writeCache, type CachedBinary } from "@/lib/icons/cache";
import { fetchWithTimeout, readText } from "@/lib/net/fetch";
import { parseHttpUrl } from "@/lib/utils/url";
import {
  matchesAll,
  scoreMatch,
  SEARCH_LIMIT,
  type LibrarySource,
  type SearchOptions,
} from "./types";

/**
 * 自建图标集：一份 JSON（形如 `{name, description, icons: [{name, url}]}`），
 * 在设置页填个地址抓回来存进 `icon_sets`，之后搜索、预览、挑选都从本地那份走。
 *
 * 图标本体仍在原来的图床上（那份 wool_scripts 的图标有 1608 张、都在
 * raw.githubusercontent 上），所以照旧「搜到哪张取哪张」，只把挑中的那张下载到本地。
 */

const MAX_SET_BYTES = 4 * 1024 * 1024;
const MAX_ICONS = 20_000;
const ICON_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_NAMESPACE = "icon-set";

export interface SetIcon {
  name: string;
  url: string;
}

export interface SetPayload {
  name: string;
  description: string | null;
  /** 这份 JSON 的来源地址：留着是为了「重新抓一份」 */
  url: string;
  mirrored: boolean;
  icons: SetIcon[];
}

export class SetError extends Error {}

/**
 * GitHub 的 raw 域名在很多网络里连不上（本机实测直接超时），而同一份文件在
 * jsDelivr 上有镜像。这是「可选加速」而不是悄悄改写：导入时勾一下，
 * 存进 metadata 让用户随时知道这份集合走的是哪条路。
 */
export function mirrorUrl(url: string): string {
  const match = /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/.exec(
    url,
  );
  if (!match) return url;
  const [, owner, repo, ref, path] = match as unknown as [string, string, string, string, string];
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${ref}/${path}`;
}

function nameFromUrl(url: string): string {
  const file = url.split("/").pop() ?? url;
  return decodeURIComponent(file.replace(/\.[a-z0-9]+$/i, "")) || file;
}

function readIconEntry(entry: unknown, mirror: boolean): SetIcon | null {
  if (typeof entry === "string") {
    const url = parseHttpUrl(entry);
    if (!url) return null;
    const target = url.toString();
    return { name: nameFromUrl(target), url: mirror ? mirrorUrl(target) : target };
  }

  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;

  const rawUrl = ["url", "src", "href", "icon", "image"].find(
    (key) => typeof record[key] === "string",
  );
  if (!rawUrl) return null;
  const parsed = parseHttpUrl(String(record[rawUrl]));
  if (!parsed) return null;
  const target = parsed.toString();

  const rawName = ["name", "title", "key", "label"].find((key) => typeof record[key] === "string");
  const name = rawName
    ? String(record[rawName]).trim() || nameFromUrl(target)
    : nameFromUrl(target);

  return { name, url: mirror ? mirrorUrl(target) : target };
}

/**
 * 解析一份图标集 JSON。三种常见形状都收：
 * 官方那份是 `{name, description, icons: [{name, url}]}`，也有人直接给数组，
 * 还有人给 `{图标名: 地址}` 的映射 —— 都是「名字 + 图片地址」，不必为形状挑刺。
 */
export function parseIconSet(raw: string, mirror: boolean, fallbackName: string): SetPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SetError("这份 JSON 解析不了：请确认地址指向的是原始文件。");
  }

  let name = fallbackName;
  let description: string | null = null;
  let list: unknown[];

  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    if (typeof record.name === "string" && record.name.trim()) name = record.name.trim();
    if (typeof record.description === "string" && record.description.trim()) {
      description = record.description.trim();
    }

    if (Array.isArray(record.icons)) {
      list = record.icons;
    } else {
      // `{名字: 地址}` 这种映射：把键折回名字里
      list = Object.entries(record)
        .filter(([key]) => key !== "name" && key !== "description")
        .map(([key, value]) =>
          typeof value === "string"
            ? { name: key, url: value }
            : { ...(value as object), name: key },
        );
    }
  } else {
    throw new SetError("这份 JSON 里没有图标：期望一个数组或 `{icons: [...]}`。");
  }

  const icons: SetIcon[] = [];
  const seen = new Set<string>();
  for (const entry of list) {
    const icon = readIconEntry(entry, mirror);
    if (!icon) continue;
    // 同一份集合里重名的很多（wool_scripts 里光 fmz200 就有十几张），按名字去重
    if (seen.has(icon.name)) continue;
    seen.add(icon.name);
    icons.push(icon);
    if (icons.length >= MAX_ICONS) break;
  }

  if (icons.length === 0) {
    throw new SetError("这份 JSON 里没找到可用的图标地址（每项要有 url 或 src）。");
  }

  return { name, description, url: "", mirrored: mirror, icons };
}

export interface IconSetSummary {
  id: number;
  name: string;
  url: string;
  count: number;
  mirrored: boolean;
  createdAt: string;
}

function metadataOf(row: IconSet): SetPayload {
  const meta = (row.metadata ?? {}) as Partial<SetPayload>;
  return {
    name: row.name,
    description: meta.description ?? null,
    url: meta.url ?? "",
    mirrored: meta.mirrored === true,
    icons: Array.isArray(meta.icons) ? meta.icons : [],
  };
}

export function listIconSets(): IconSetSummary[] {
  return getDb()
    .select()
    .from(iconSets)
    .all()
    .map((row) => {
      const meta = metadataOf(row);
      return {
        id: row.id,
        name: row.name,
        url: meta.url,
        count: meta.icons.length,
        mirrored: meta.mirrored,
        createdAt: new Date(row.createdAt).toISOString(),
      };
    });
}

export function findIconSet(id: number): IconSet | null {
  return getDb().select().from(iconSets).where(eq(iconSets.id, id)).get() ?? null;
}

export function findIconSetByName(name: string): IconSet | null {
  return getDb().select().from(iconSets).where(eq(iconSets.name, name)).get() ?? null;
}

export function saveIconSet(payload: SetPayload): number {
  const db = getDb();
  const existing = findIconSetByName(payload.name);
  const metadata = {
    description: payload.description,
    url: payload.url,
    mirrored: payload.mirrored,
    icons: payload.icons,
  };

  if (existing) {
    db.update(iconSets).set({ metadata }).where(eq(iconSets.id, existing.id)).run();
    return existing.id;
  }

  const inserted = db
    .insert(iconSets)
    .values({ name: payload.name, source: "library", version: null, metadata })
    .run();
  return Number(inserted.lastInsertRowid);
}

export function deleteIconSet(id: number): boolean {
  const existing = findIconSet(id);
  if (!existing) return false;
  getDb().delete(iconSets).where(eq(iconSets.id, id)).run();
  return true;
}

/** 抓一份图标集 JSON。抓取走统一出口检查与超时，读正文失败也只当拿不到。 */
export async function downloadIconSet(url: URL, mirror: boolean): Promise<SetPayload> {
  const response = await fetchWithTimeout(
    url.toString(),
    "application/json,text/plain,*/*;q=0.8",
    15_000,
  );
  if (!response?.ok) {
    throw new SetError("这份图标集抓不到：请检查地址，或换一个镜像地址再试。");
  }

  const text = await readText(response, MAX_SET_BYTES);
  if (!text) throw new SetError("这份图标集太大了或读不出来：上限 4 MB。");

  const fallback =
    url.pathname
      .split("/")
      .pop()
      ?.replace(/\.[a-z0-9]+$/i, "") || "图标集";
  return { ...parseIconSet(text, mirror, fallback), url: url.toString() };
}

/** 自建集也当成一个来源：搜索在本地那份清单上做，取图才去外网。 */
export function setSource(row: IconSet, icons: SetIcon[]): LibrarySource {
  const byName = new Map(icons.map((icon) => [icon.name, icon]));

  return {
    id: `set:${row.id}`,
    label: row.name,
    hint: `${icons.length} 个图标（自建集${metadataOf(row).mirrored ? "，走 jsDelivr 镜像" : ""}）`,
    colorModes: ["original"],
    search: (query, options: SearchOptions = {}) => {
      const trimmed = query.trim();
      const offset = Math.max(0, options.offset ?? 0);
      const limit = options.limit ?? SEARCH_LIMIT;
      const matched: Array<{ icon: SetIcon; score: number }> = trimmed
        ? icons
            .map((icon) => ({ icon, score: scoreMatch(icon.name, icon.name, trimmed) }))
            .filter(
              (entry) => entry.score > 0 && matchesAll(entry.icon.name, entry.icon.name, trimmed),
            )
            .sort((a, b) => b.score - a.score || a.icon.name.localeCompare(b.icon.name))
        : icons.map((icon) => ({ icon, score: 1 }));

      return Promise.resolve({
        offset,
        hits: matched.slice(offset, offset + limit).map(({ icon }) => ({
          name: icon.name,
          title: icon.name,
          color: null,
          note: null,
          guidelines: null,
        })),
        total: matched.length,
      });
    },
    fetchIcon: async (name) => {
      const icon = byName.get(name);
      if (!icon) return null;

      const cached = readCache(CACHE_NAMESPACE, icon.url, ICON_TTL_MS);
      if (cached) return cached;

      const response = await fetchWithTimeout(icon.url, "image/*,*/*;q=0.8", 15_000);
      if (!response?.ok) return null;

      let body: Buffer;
      try {
        body = Buffer.from(await response.arrayBuffer());
      } catch {
        return null;
      }
      if (body.length === 0 || body.length > 512 * 1024) return null;

      const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
      const payload: CachedBinary = {
        body,
        contentType: contentType?.startsWith("image/") ? contentType : "image/png",
      };
      writeCache(CACHE_NAMESPACE, icon.url, payload);
      return payload;
    },
  };
}

export function iconSetSourceById(id: number): LibrarySource | null {
  const row = findIconSet(id);
  if (!row) return null;
  const meta = metadataOf(row);
  if (meta.icons.length === 0) return null;
  return setSource(row, meta.icons);
}
