import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveDatabasePath } from "@/db/client";
import { assertFetchableHost, nextRedirectTarget } from "./egress";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HTML_BYTES = 256 * 1024;
const MAX_ICON_BYTES = 512 * 1024;
const TIMEOUT_MS = 4000;
const MAX_REDIRECTS = 3;
/** 取不到时也记一小会儿，别让匿名请求每次都去撞两轮外网。 */
const MISS_TTL_MS = 10 * 60 * 1000;

/**
 * 兜底的第三方图标服务，按顺序试，前一个拿不到就用下一个。
 * 这两个都实测过：从本机可达、认得的域名回真图（Google s2 与 DuckDuckGo 在部分网络下
 * 连不上，列上去只是每次白等一个超时）。只在前面的直连都失败时才用 ——
 * 代价是把域名给了第三方，所以留了开关：FAVICON_FALLBACK_SOURCES=false 可以关掉。
 */
const FALLBACK_SOURCES: ((host: string) => string)[] = [
  (host) => `https://favicon.im/${host}`,
  (host) => `https://icon.horse/icon/${host}`,
];

function fallbackEnabled(): boolean {
  return process.env.FAVICON_FALLBACK_SOURCES !== "false";
}

export interface IconPayload {
  body: Buffer;
  contentType: string;
}

function cacheDir(): string {
  return path.join(path.dirname(resolveDatabasePath()), "favicon-cache");
}

function cachePaths(origin: string): { body: string; meta: string } {
  const key = createHash("sha256").update(origin).digest("hex").slice(0, 32);
  const dir = cacheDir();
  return { body: path.join(dir, `${key}.bin`), meta: path.join(dir, `${key}.json`) };
}

function readCache(origin: string): IconPayload | null {
  const { body, meta } = cachePaths(origin);
  try {
    const stats = fs.statSync(body);
    if (Date.now() - stats.mtimeMs > CACHE_TTL_MS) return null;
    const parsed: unknown = JSON.parse(fs.readFileSync(meta, "utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const contentType = (parsed as { contentType?: unknown }).contentType;
    if (typeof contentType !== "string") return null;
    return { body: fs.readFileSync(body), contentType };
  } catch {
    return null;
  }
}

function writeCache(origin: string, payload: IconPayload): void {
  try {
    const { body, meta } = cachePaths(origin);
    fs.mkdirSync(cacheDir(), { recursive: true });
    fs.writeFileSync(body, payload.body);
    fs.writeFileSync(meta, JSON.stringify({ contentType: payload.contentType }));
  } catch {
    // 缓存写不进去不影响这次响应
  }
}

/**
 * 手动跟随跳转，每一跳都重新做内网检查。用 redirect: "follow" 的话，
 * 第二个请求的目标就由被访问站点的 Location 决定，等于把出口检查让给别人。
 */
async function fetchWithTimeout(url: string, accept: string): Promise<Response | null> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return null;
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    try {
      await assertFetchableHost(target.hostname);
      const response = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept, "user-agent": "ivy-nav/0.1 (+favicon)" },
      });

      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) return response;

      target = nextRedirectTarget(location, target);
    } catch {
      return null;
    }
  }

  return null;
}

/** 图标格式靠文件头判断，不信 Content-Type —— 很多站点把 .ico 报成 octet-stream。 */
function sniff(body: Buffer): string | null {
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

/** 从 <link rel="icon"> 里挑一个尽量大的尺寸；挑不到就退回 /favicon.ico。 */
export function pickIconHref(html: string, base: URL): string {
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

  if (best) {
    try {
      return new URL(best.href, base).toString();
    } catch {
      /* 落到下面的默认值 */
    }
  }

  return new URL("/favicon.ico", base.origin).toString();
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

/**
 * 从 HTML 里挑一个能当条目标题的字符串。
 * 优先 og:site_name（通常就是站点名）→ og:title → <title>：后两者常带一句副标题。
 */
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

/**
 * 取网页标题：新建条目时用户只输了网址，标题可以照网页自己填上。
 * 与取图标共用同一套出口检查与超时；拿不到就返回 null —— 这一层同样不抛错。
 */
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

/**
 * PWA 的 manifest 里声明的图标。有些站点（尤其是「装着当应用用」的那些）不在 HTML 里
 * 写 <link rel="icon">，图标只放在 manifest.json 里。
 */
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

    const contentType = sniff(buffer);
    if (contentType) return { body: buffer, contentType };
  }
  return null;
}

/**
 * 服务「查不到图标」时会回自己那张占位图：favicon.im 是一张固定的 SVG（不存在的域名与
 * example.com 都是同一份字节），icon.horse 是按首字母生成的字母图（两个乱造域名只要
 * 首字母相同，字节完全一致）。所以哨兵域名取「同一个首字母 + 必然不存在」，
 * 与它撞上就说明这不是真图标 —— 否则会把服务自己生成的图当成站点图标，比露首字母还糟。
 */
const SENTINEL_CACHE = new Map<string, Promise<string | null>>();

function sentinelFor(index: number, host: string): Promise<string | null> {
  const key = `${index}:${host.charAt(0).toLowerCase()}`;
  const cached = SENTINEL_CACHE.get(key);
  if (cached) return cached;

  const job = (async () => {
    const source = FALLBACK_SOURCES[index];
    if (!source) return null;
    const response = await fetchWithTimeout(
      source(`${host.charAt(0)}-ivy-nav-nonexistent.invalid`),
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

/** 直连都失败之后的兜底：按顺序问几个服务，只认「不是占位图」的那份。 */
async function downloadFromFallbackSources(host: string): Promise<IconPayload | null> {
  for (const [index, source] of FALLBACK_SOURCES.entries()) {
    const response = await fetchWithTimeout(source(host), "image/*,*/*;q=0.8");
    if (!response?.ok) continue;

    let buffer: Buffer;
    try {
      buffer = Buffer.from(await response.arrayBuffer());
    } catch {
      continue;
    }
    if (buffer.length === 0 || buffer.length > MAX_ICON_BYTES) continue;

    const digest = createHash("sha256").update(buffer).digest("hex");
    if (digest === (await sentinelFor(index, host))) continue;

    const contentType = sniff(buffer);
    if (contentType) return { body: buffer, contentType };
  }
  return null;
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
 * 取站点图标：先读页面里的 <link rel="icon">，失败再试 /favicon.ico。
 * 结果按 origin 落盘缓存，避免每次打开首页都对每个站点发一轮请求。
 */
export async function resolveFavicon(pageUrl: URL): Promise<IconPayload | null> {
  const origin = pageUrl.origin;

  const cached = readCache(origin);
  if (cached) return cached;
  if (recentlyMissed(origin, Date.now())) return null;

  const pending = inFlight.get(origin);
  if (pending) return pending;

  const job = (async (): Promise<IconPayload | null> => {
    const candidates: string[] = [];

    try {
      const page = await fetchWithTimeout(pageUrl.toString(), "text/html,*/*;q=0.8");
      if (page?.ok) {
        const html = (await page.text()).slice(0, MAX_HTML_BYTES);
        // 先看 HTML 里声明的图标，再看 manifest 里声明的，都没有才去碰 /favicon.ico
        candidates.push(pickIconHref(html, pageUrl));
        candidates.push(...(await manifestIconCandidates(html, pageUrl)));
      }
      candidates.push(new URL("/favicon.ico", origin).toString());

      let payload = await download(candidates);
      if (!payload && fallbackEnabled()) {
        payload = await downloadFromFallbackSources(pageUrl.hostname);
      }
      if (payload) {
        misses.delete(origin);
        writeCache(origin, payload);
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
