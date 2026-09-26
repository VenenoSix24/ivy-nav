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

/** 每个命名空间最多留这么多份，超了按最旧的删 */
const MAX_ENTRIES = 400;

function prune(namespace: string): void {
  const dir = cacheDir(namespace);
  let bodies: string[];
  try {
    bodies = fs.readdirSync(dir).filter((name) => name.endsWith(".bin"));
  } catch {
    return;
  }
  if (bodies.length <= MAX_ENTRIES) return;

  const byAge = bodies
    .map((name) => {
      const file = path.join(dir, name);
      try {
        return { file, at: fs.statSync(file).mtimeMs };
      } catch {
        return { file, at: 0 };
      }
    })
    .sort((a, b) => a.at - b.at);

  for (const entry of byAge.slice(0, bodies.length - MAX_ENTRIES)) {
    try {
      fs.rmSync(entry.file, { force: true });
      fs.rmSync(entry.file.replace(/\.bin$/, ".json"), { force: true });
    } catch {}
  }
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
    prune(namespace);
  } catch {}
}
