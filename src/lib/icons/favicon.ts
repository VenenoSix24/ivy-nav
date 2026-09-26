import { createHash } from "node:crypto";
import { readCache as readCached, writeCache as writeCached } from "./cache";
import { fetchWithTimeout, readBody, readText } from "@/lib/net/fetch";
import {
  ICON_SOURCES,
  type IconCandidate,
  type IconCandidateStatus,
  type IconSourceId,
  normalizeIconSource,
} from "./sources";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HTML_BYTES = 256 * 1024;
const MAX_ICON_BYTES = 512 * 1024;
/** 取不到时也记一小会儿 */
const MISS_TTL_MS = 10 * 60 * 1000;

const CACHE_NAMESPACE = "favicon";

/** 兜底的第三方图标服务，前一个拿不到就用下一个 */
const FALLBACK_URLS: Partial<Record<IconSourceId, (host: string) => string>> = {
  "favicon.im": (host) => `https://favicon.im/${host}`,
  "icon.horse": (host) => `https://icon.horse/icon/${host}`,
};

function isFallback(source: IconSourceId): boolean {
  return source in FALLBACK_URLS;
}

function fallbackEnabled(): boolean {
  return process.env.FAVICON_FALLBACK_SOURCES !== "false";
}

/** 按顺序问这些来源 */
function sourcesInOrder(): IconSourceId[] {
  return ICON_SOURCES.filter((entry) => !isFallback(entry.id) || fallbackEnabled()).map(
    (entry) => entry.id,
  );
}

export interface IconPayload {
  body: Buffer;
  contentType: string;
}

/** 缓存按来源分开存；`auto` 是自动链最终选中的那一份 */
type CacheKey = IconSourceId | "auto";

function readCache(origin: string, source: CacheKey): IconPayload | null {
  return readCached(CACHE_NAMESPACE, `${source}\n${origin}`, CACHE_TTL_MS);
}

function writeCache(origin: string, source: CacheKey, payload: IconPayload): void {
  writeCached(CACHE_NAMESPACE, `${source}\n${origin}`, payload);
}

/** 图标格式靠文件头判断，不看 Content-Type */
export function sniffImageType(body: Buffer): string | null {
  const head = body.subarray(0, 16);
  if (body.length < 4) return null;
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47)
    return "image/png";
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head.subarray(0, 4).toString("latin1") === "GIF8") return "image/gif";
  if (
    head.subarray(0, 4).toString("latin1") === "RIFF" &&
    body.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }
  if (head[0] === 0x00 && head[1] === 0x00 && (head[2] === 0x01 || head[2] === 0x02)) {
    return "image/x-icon";
  }
  const text = body.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  if (text.startsWith("<svg") || (text.startsWith("<?xml") && text.includes("<svg"))) {
    return "image/svg+xml";
  }
  return null;
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "i"));
  if (!match?.[1]) return null;
  return match[1].replace(/^["']|["']$/g, "");
}

/** 取某个 rel 的第一个 <link> 目标（已绝对化） */
function linkHref(html: string, rel: string, base: URL): string | null {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const value = (attribute(tag, "rel") ?? "").toLowerCase().split(/\s+/);
    if (!value.includes(rel)) continue;
    const href = attribute(tag, "href");
    if (!href) continue;
    try {
      return new URL(href, base).toString();
    } catch {
      /* 换下一个 */
    }
  }
  return null;
}

/** 从 <link rel="icon"> 里挑一个尽量大的尺寸 */
function declaredIconHref(html: string, base: URL): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  let best: { href: string; score: number } | null = null;

  for (const tag of tags) {
    const rel = (attribute(tag, "rel") ?? "").toLowerCase();
    if (!rel.includes("icon")) continue;

    const href = attribute(tag, "href");
    if (!href) continue;

    const sizes = attribute(tag, "sizes") ?? "";
    let score = 1;
    if (rel.includes("apple-touch")) score = 4;
    if (sizes.includes("180") || sizes.includes("192")) score = 5;
    else if (sizes.includes("64")) score = 3;
    else if (sizes.includes("32")) score = 2;

    if (!best || score > best.score) best = { href, score };
  }

  if (!best) return null;
  try {
    return new URL(best.href, base).toString();
  } catch {
    return null;
  }
}

/** 声明里挑不到就退回 /favicon.ico */
export function pickIconHref(html: string, base: URL): string {
  return declaredIconHref(html, base) ?? new URL("/favicon.ico", base.origin).toString();
}

/** HTML 实体只认最常见的几个 */
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, name: string) => {
    const key = name.toLowerCase();
    if (key.startsWith("#x")) {
      const code = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    if (key.startsWith("#")) {
      const code = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[key] ?? whole;
  });
}

/** 标题优先 og:site_name、og:title、`<title>` */
export function pickSiteTitle(html: string): string | null {
  const meta = (key: string): string | null => {
    const tag = html.match(
      new RegExp(`<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${key}["'][^>]*>`, "i"),
    )?.[0];
    return tag ? attribute(tag, "content") : null;
  };

  const candidates = [
    meta("og:site_name"),
    meta("og:title"),
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null,
  ];

  for (const candidate of candidates) {
    const title = decodeEntities(candidate ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (title) return title.slice(0, 80);
  }
  return null;
}

/** 取网页标题，拿不到返回 null */
export async function fetchSiteTitle(pageUrl: URL): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(pageUrl.toString(), "text/html,*/*;q=0.8");
    if (!response?.ok) return null;
    const html = await readText(response, MAX_HTML_BYTES);
    return html === null ? null : pickSiteTitle(html);
  } catch {
    return null;
  }
}

/** 从 PWA manifest 里取图标候选 */
async function manifestIconCandidates(html: string, base: URL): Promise<string[]> {
  const href = linkHref(html, "manifest", base);
  if (!href) return [];

  const response = await fetchWithTimeout(href, "application/json,*/*;q=0.8");
  if (!response?.ok) return [];

  const raw = await readText(response, MAX_HTML_BYTES);
  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const icons = (parsed as { icons?: unknown } | null)?.icons;
  if (!Array.isArray(icons)) return [];

  return icons
    .map((entry) => {
      const icon = entry as { src?: unknown; sizes?: unknown; type?: unknown };
      if (typeof icon.src !== "string") return null;
      // 尺寸写 "512x512" 的取较大边，其它当成中等
      const size = /(\d+)\s*x\s*(\d+)/i.exec(typeof icon.sizes === "string" ? icon.sizes : "");
      const score = size ? Math.max(Number(size[1]), Number(size[2])) : 64;
      try {
        return { url: new URL(icon.src, href).toString(), score };
      } catch {
        return null;
      }
    })
    .filter((entry): entry is { url: string; score: number } => entry !== null)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.url);
}

async function download(candidates: string[]): Promise<IconPayload | null> {
  for (const candidate of candidates) {
    const response = await fetchWithTimeout(candidate, "image/*,*/*;q=0.8");
    if (!response || !response.ok) continue;

    // 读 body 在这里也会抛，读不到就跳过这个候选
    const buffer = await readBody(response, MAX_ICON_BYTES);
    if (!buffer) continue;

    const contentType = sniffImageType(buffer);
    if (contentType) return { body: buffer, contentType };
  }
  return null;
}

/** 第三方服务查不到时回的那张占位图的字节缓存 */
const SENTINEL_CACHE = new Map<string, Promise<string | null>>();

function sentinelFor(source: IconSourceId, host: string): Promise<string | null> {
  const key = `${source}:${host.charAt(0).toLowerCase()}`;
  const cached = SENTINEL_CACHE.get(key);
  if (cached) return cached;

  const job = (async () => {
    const build = FALLBACK_URLS[source];
    if (!build) return null;
    const response = await fetchWithTimeout(
      build(`${host.charAt(0)}-ivy-nav-nonexistent.invalid`),
      "image/*,*/*;q=0.8",
    );
    if (!response?.ok) return null;
    const body = await readBody(response, MAX_ICON_BYTES);
    return body ? createHash("sha256").update(body).digest("hex") : null;
  })();

  SENTINEL_CACHE.set(key, job);
  return job;
}

/** 一次来源尝试的结果 */
interface SourceResult {
  payload: IconPayload | null;
  /** 走到了第三方服务、拿到的却是它自己生成的占位图 */
  placeholder: boolean;
}

const MISS: SourceResult = { payload: null, placeholder: false };

async function fetchFallback(source: IconSourceId, host: string): Promise<SourceResult> {
  const build = FALLBACK_URLS[source];
  if (!build || !fallbackEnabled()) return MISS;

  const response = await fetchWithTimeout(build(host), "image/*,*/*;q=0.8");
  if (!response?.ok) return MISS;

  const buffer = await readBody(response, MAX_ICON_BYTES);
  if (!buffer) return MISS;

  const digest = createHash("sha256").update(buffer).digest("hex");
  if (digest === (await sentinelFor(source, host))) return { payload: null, placeholder: true };

  const contentType = sniffImageType(buffer);
  if (!contentType) return MISS;
  return { payload: { body: buffer, contentType }, placeholder: false };
}

/** 这两条来源需要先有 HTML */
function needsPageHtml(source: IconSourceId): boolean {
  return source === "declared" || source === "manifest";
}

/** 朝某一个来源要一次图标 */
async function fetchFromSource(
  source: IconSourceId,
  pageUrl: URL,
  html: string | null,
): Promise<SourceResult> {
  if (source === "declared") {
    const href = html ? declaredIconHref(html, pageUrl) : null;
    return { payload: href ? await download([href]) : null, placeholder: false };
  }

  if (source === "manifest") {
    if (!html) return MISS;
    return {
      payload: await download(await manifestIconCandidates(html, pageUrl)),
      placeholder: false,
    };
  }

  if (source === "/favicon.ico") {
    const href = new URL("/favicon.ico", pageUrl.origin).toString();
    return { payload: await download([href]), placeholder: false };
  }

  return fetchFallback(source, pageUrl.hostname);
}

/** 抓一次页面 HTML，拿不到返回 null */
async function pageHtml(pageUrl: URL): Promise<string | null> {
  const response = await fetchWithTimeout(pageUrl.toString(), "text/html,*/*;q=0.8");
  if (!response?.ok) return null;
  return readText(response, MAX_HTML_BYTES);
}

/** 把每个方案都真问一遍，供选择器展示 */
export async function listFaviconCandidates(pageUrl: URL): Promise<IconCandidate[]> {
  const html = await pageHtml(pageUrl);

  return Promise.all(
    ICON_SOURCES.map(async (entry) => {
      if (isFallback(entry.id) && !fallbackEnabled()) {
        return { source: entry.id, label: entry.label, status: "miss" as const };
      }

      let result: SourceResult;
      try {
        result = await fetchFromSource(entry.id, pageUrl, html);
      } catch {
        result = MISS;
      }

      if (result.payload) writeCache(pageUrl.origin, entry.id, result.payload);

      const status: IconCandidateStatus = result.payload
        ? "ok"
        : result.placeholder
          ? "placeholder"
          : "miss";
      return { source: entry.id, label: entry.label, status };
    }),
  );
}

/** 取某一个来源的图标，不做退让 */
export async function resolveIconSource(
  pageUrl: URL,
  source: IconSourceId,
): Promise<IconPayload | null> {
  const cached = readCache(pageUrl.origin, source);
  if (cached) return cached;

  let result: SourceResult;
  try {
    result = await fetchFromSource(source, pageUrl, await pageHtml(pageUrl));
  } catch {
    return null;
  }
  if (!result.payload) return null;

  writeCache(pageUrl.origin, source, result.payload);
  return result.payload;
}

const inFlight = new Map<string, Promise<IconPayload | null>>();
const misses = new Map<string, number>();

/** 失败记录的上限；超了先清过期的，再按最旧的丢 */
const MAX_MISSES = 500;

function sweepMisses(now: number): void {
  if (misses.size <= MAX_MISSES) return;
  for (const [origin, at] of misses) {
    if (now - at > MISS_TTL_MS) misses.delete(origin);
  }
  if (misses.size <= MAX_MISSES) return;

  const byAge = [...misses.entries()].sort((a, b) => a[1] - b[1]);
  for (const [origin] of byAge.slice(0, misses.size - MAX_MISSES)) misses.delete(origin);
}

function recentlyMissed(origin: string, now: number): boolean {
  sweepMisses(now);

  const at = misses.get(origin);
  if (at === undefined) return false;
  if (now - at > MISS_TTL_MS) {
    misses.delete(origin);
    return false;
  }
  return true;
}

/** 取站点图标，按方案顺序问，结果按 origin 落盘 */
export async function resolveFavicon(
  pageUrl: URL,
  preferred?: string | null,
): Promise<IconPayload | null> {
  const origin = pageUrl.origin;
  const picked = normalizeIconSource(preferred);

  if (picked) {
    const chosen = await resolveIconSource(pageUrl, picked);
    if (chosen) return chosen;
  }

  const cached = readCache(origin, "auto");
  if (cached) return cached;
  if (recentlyMissed(origin, Date.now())) return null;

  const pending = inFlight.get(origin);
  if (pending) return pending;

  const job = (async (): Promise<IconPayload | null> => {
    /** 页面 HTML 按需抓 */
    let page: string | null | undefined;

    try {
      for (const source of sourcesInOrder()) {
        // 先看单来源的缓存
        let payload = readCache(origin, source);
        if (!payload) {
          if (needsPageHtml(source) && page === undefined) page = await pageHtml(pageUrl);
          payload = (await fetchFromSource(source, pageUrl, page ?? null)).payload;
        }
        if (!payload) continue;

        misses.delete(origin);
        writeCache(origin, source, payload);
        writeCache(origin, "auto", payload);
        return payload;
      }
    } catch {
      // 拿不到一律返回 null，不把异常抛给路由
    }

    misses.set(origin, Date.now());
    return null;
  })().finally(() => inFlight.delete(origin));

  inFlight.set(origin, job);
  return job;
}
