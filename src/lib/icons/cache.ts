import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveDatabasePath } from "@/db/client";

export interface CachedBinary {
  body: Buffer;
  contentType: string;
}

/** 缓存目录与数据库同级 */
export function cacheDir(namespace: string): string {
  return path.join(path.dirname(resolveDatabasePath()), `${namespace}-cache`);
}

function cachePaths(namespace: string, key: string): { body: string; meta: string } {
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 32);
  const dir = cacheDir(namespace);
  return { body: path.join(dir, `${hash}.bin`), meta: path.join(dir, `${hash}.json`) };
}

export function readCache(namespace: string, key: string, ttlMs: number): CachedBinary | null {
  const { body, meta } = cachePaths(namespace, key);
  try {
    const stats = fs.statSync(body);
    if (Date.now() - stats.mtimeMs > ttlMs) return null;
    const parsed: unknown = JSON.parse(fs.readFileSync(meta, "utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const contentType = (parsed as { contentType?: unknown }).contentType;
    if (typeof contentType !== "string") return null;
    return { body: fs.readFileSync(body), contentType };
  } catch {
    return null;
  }
}

export function writeCache(namespace: string, key: string, payload: CachedBinary): void {
  try {
    const { body, meta } = cachePaths(namespace, key);
    fs.mkdirSync(cacheDir(namespace), { recursive: true });
    fs.writeFileSync(body, payload.body);
    fs.writeFileSync(meta, JSON.stringify({ contentType: payload.contentType }));
  } catch {}
}
