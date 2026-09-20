import { createHash } from "node:crypto";
import { readCache as readCached, writeCache as writeCached } from "./cache";
import { fetchWithTimeout } from "@/lib/net/fetch";
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
/** 取不到时也记一小会儿，别让匿名请求每次都去撞两轮外网。 */
const MISS_TTL_MS = 10 * 60 * 1000;

const CACHE_NAMESPACE = "favicon";

/**
 * 兜底的第三方图标服务，前一个拿不到就用下一个：只在前面的直连都失败时才轮到它们。
 * 代价是把域名给了第三方，所以留了开关 FAVICON_FALLBACK_SOURCES=false。
 */
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

/** 按顺序问这些来源；第三方服务被关掉时就不出现在链子上。 */
function sourcesInOrder(): IconSourceId[] {
  return ICON_SOURCES.filter((entry) => !isFallback(entry.id) || fallbackEnabled()).map(
    (entry) => entry.id,
  );
}

export interface IconPayload {
  body: Buffer;
  contentType: string;
}

/** 缓存按来源分开存：选择器要一次列出每个方案各拿到什么。`auto` 是自动链最终选中的那一份。 */
type CacheKey = IconSourceId | "auto";

function readCache(origin: string, source: CacheKey): IconPayload | null {
  return readCached(CACHE_NAMESPACE, `${source}\n${origin}`, CACHE_TTL_MS);
}

function writeCache(origin: string, source: CacheKey, payload: IconPayload): void {
  writeCached(CACHE_NAMESPACE, `${source}\n${origin}`, payload);
}

/** 图标格式靠文件头判断，不信 Content-Type —— 很多站点把 .ico 报成 octet-stream。 */
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

/** 取某个 rel 的第一个 <link> 目标（绝对化之后）。 */
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

/** 从 <link rel="icon"> 里挑一个尽量大的尺寸；页面里什么都没写就返回 null。 */
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

/** 声明里挑不到就退回 /favicon.ico：自动链上这一条必然有得试。 */
export function pickIconHref(html: string, base: URL): string {
  return declaredIconHref(html, base) ?? new URL("/favicon.ico", base.origin).toString();
}

/** HTML 实体只认最常见的几个：标题里主要是 &amp; &#39; 这类，不值得引一个解析器。 */
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

/** 标题优先 og:site_name → og:title → `<title>`：后两者常带一句副标题。 */
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

/** 取网页标题：与取图标共用同一套出口检查与超时，拿不到就返回 null（这一层不抛错）。 */
export async function fetchSiteTitle(pageUrl: URL): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(pageUrl.toString(), "text/html,*/*;q=0.8");
    if (!response?.ok) return null;
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    return pickSiteTitle(html);
  } catch {
    return null;
  }
}

/** 有些站点不在 HTML 里写 `<link rel="icon">`，图标只放在 PWA manifest 里。 */
async function manifestIconCandidates(html: string, base: URL): Promise<string[]> {
  const href = linkHref(html, "manifest", base);
  if (!href) return [];

  const response = await fetchWithTimeout(href, "application/json,*/*;q=0.8");
  if (!response?.ok) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse((await response.text()).slice(0, MAX_HTML_BYTES));
  } catch {
    return [];
  }

  const icons = (parsed as { icons?: unknown } | null)?.icons;
  if (!Array.isArray(icons)) return [];

  return icons
    .map((entry) => {
      const icon = entry as { src?: unknown; sizes?: unknown; type?: unknown };
      if (typeof icon.src !== "string") return null;
      // 尺寸写 "512x512" 的取较大边；写 "any" 或没写的当成中等
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

    let buffer: Buffer;
    try {
      buffer = Buffer.from(await response.arrayBuffer());
    } catch {
      // 读 body 不在 fetch 的 try 里：对端中途断流、或响应头到了而正文拖过超时，
      // 都会在这里抛（AbortSignal 的定时器管到正文读完为止）。放它出去整条路由就是 500。
      continue;
    }
    if (buffer.length === 0 || buffer.length > MAX_ICON_BYTES) continue;

    const contentType = sniffImageType(buffer);
    if (contentType) return { body: buffer, contentType };
  }
  return null;
}

/**
 * 服务「查不到图标」时会回自己那张占位图：favicon.im 固定一份 SVG，icon.horse 按首字母生成。
 * 哨兵域名取「同一个首字母 + 必然不存在」，字节撞上就说明这不是真图标 ——
 * 否则会把服务自己生成的图当成站点图标，比露首字母还糟。
 */
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
    let body: Buffer;
    try {
      body = Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
    return body.length > 0 ? createHash("sha256").update(body).digest("hex") : null;
  })();

  SENTINEL_CACHE.set(key, job);
  return job;
}

/** 一次来源尝试的结果。「服务活着但只回占位图」与「压根没取到」对用户是两件事。 */
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

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await response.arrayBuffer());
  } catch {
    return MISS;
  }
  if (buffer.length === 0 || buffer.length > MAX_ICON_BYTES) return MISS;

  const digest = createHash("sha256").update(buffer).digest("hex");
  if (digest === (await sentinelFor(source, host))) return { payload: null, placeholder: true };

  const contentType = sniffImageType(buffer);
  if (!contentType) return MISS;
  return { payload: { body: buffer, contentType }, placeholder: false };
}

/** 只有「读页面里声明的东西」这两条来源需要先有 HTML。 */
function needsPageHtml(source: IconSourceId): boolean {
  return source === "declared" || source === "manifest";
}

/**
 * 朝某一个来源要一次图标。`html` 由调用方给：一次列出全部方案时页面只抓一遍，
 * 声明与 manifest 两条都从这份 HTML 里读。
 */
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

/** 抓一次页面 HTML。读正文同样会抛（对端断流、正文拖过超时），这里一律当拿不到。 */
async function pageHtml(pageUrl: URL): Promise<string | null> {
  const response = await fetchWithTimeout(pageUrl.toString(), "text/html,*/*;q=0.8");
  if (!response?.ok) return null;
  try {
    return (await response.text()).slice(0, MAX_HTML_BYTES);
  } catch {
    return null;
  }
}

/** 把每个方案都真问一遍，让用户在选择器里看着挑；各方案并行，页面 HTML 只抓一遍。 */
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

/** 取某一个来源的图标，不做退让：缩略图要的就是「这个方案给的是哪张」。 */
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

function recentlyMissed(origin: string, now: number): boolean {
  const at = misses.get(origin);
  if (at === undefined) return false;
  if (now - at > MISS_TTL_MS) {
    misses.delete(origin);
    return false;
  }
  return true;
}

/**
 * 取站点图标：按方案顺序问，第一个拿到的就是它，结果按 origin 落盘。
 * `preferred` 是用户在选择器里点过的那一个方案：先只问它，取不到再回到自动链。
 */
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
    /** 页面 HTML 按需抓：选择器刚把每个方案都取过一遍，缓存命中时一个请求都不该多发。 */
    let page: string | null | undefined;

    try {
      for (const source of sourcesInOrder()) {
        // 单来源的缓存先看：命中了就不用再问一次外网，也不用为了它去抓页面
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
      // 取图标是尽力而为：网络中断、读正文超时、跳转目标不合法，都退回首字母托底。
      // 这一层的约定就是「拿不到返回 null」，不该把异常抛给路由变成 500 —— 页面上
      // 只是少一个图标，控制台却会多一条红线，那是用户看到的那条报错。
    }

    misses.set(origin, Date.now());
    return null;
  })().finally(() => inFlight.delete(origin));

  inFlight.set(origin, job);
  return job;
}
