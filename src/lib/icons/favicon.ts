import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveDatabasePath } from "@/db/client";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HTML_BYTES = 256 * 1024;
const MAX_ICON_BYTES = 512 * 1024;
const TIMEOUT_MS = 4000;

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

async function fetchWithTimeout(url: string, accept: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept, "user-agent": "ivy-nav/0.1 (+favicon)" },
    });
  } catch {
    return null;
  }
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

async function download(candidates: string[]): Promise<IconPayload | null> {
  for (const candidate of candidates) {
    const response = await fetchWithTimeout(candidate, "image/*,*/*;q=0.8");
    if (!response || !response.ok) continue;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_ICON_BYTES) continue;

    const contentType = sniff(buffer);
    if (contentType) return { body: buffer, contentType };
  }
  return null;
}

const inFlight = new Map<string, Promise<IconPayload | null>>();

/**
 * 取站点图标：先读页面里的 <link rel="icon">，失败再试 /favicon.ico。
 * 结果按 origin 落盘缓存，避免每次打开首页都对每个站点发一轮请求。
 */
export async function resolveFavicon(pageUrl: URL): Promise<IconPayload | null> {
  const origin = pageUrl.origin;

  const cached = readCache(origin);
  if (cached) return cached;

  const pending = inFlight.get(origin);
  if (pending) return pending;

  const job = (async () => {
    const candidates: string[] = [];

    const page = await fetchWithTimeout(pageUrl.toString(), "text/html,*/*;q=0.8");
    if (page?.ok) {
      const html = (await page.text()).slice(0, MAX_HTML_BYTES);
      candidates.push(pickIconHref(html, pageUrl));
    }
    candidates.push(new URL("/favicon.ico", origin).toString());

    const payload = await download(candidates);
    if (payload) writeCache(origin, payload);
    return payload;
  })().finally(() => inFlight.delete(origin));

  inFlight.set(origin, job);
  return job;
}
