import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { getDb, getSqlite, resolveDatabasePath, schema } from "@/db/client";
import { applyBackupDocument, buildBackupDocument } from "./document";

const SNAPSHOT_PATTERN = /^portal-\d{8}-\d{6}\.db$/;

export interface SnapshotInfo {
  name: string;
  size: number;
  createdAt: string;
}

export function backupsDir(): string {
  return path.join(path.dirname(resolveDatabasePath()), "..", "backups");
}

function snapshotPath(name: string): string | null {
  if (!SNAPSHOT_PATTERN.test(name)) return null;
  return path.join(backupsDir(), name);
}

function timestamp(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

/** VACUUM INTO 产出的是一致快照，开着 WAL 也不会有半个事务的状态。 */
export function createSnapshot(now = new Date()): SnapshotInfo {
  const dir = backupsDir();
  fs.mkdirSync(dir, { recursive: true });

  const name = `portal-${timestamp(now)}.db`;
  const target = path.join(dir, name);

  // VACUUM INTO 不接受参数绑定；文件名由本模块生成，仅需转义单引号
  getSqlite().exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);

  return { name, size: fs.statSync(target).size, createdAt: now.toISOString() };
}

export function listSnapshots(): SnapshotInfo[] {
  const dir = backupsDir();
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }

  return entries
    .filter((name) => SNAPSHOT_PATTERN.test(name))
    .map((name) => {
      const stats = fs.statSync(path.join(dir, name));
      return { name, size: stats.size, createdAt: stats.mtime.toISOString() };
    })
    .sort((left, right) => right.name.localeCompare(left.name));
}

export function readSnapshot(name: string): Buffer | null {
  const target = snapshotPath(name);
  if (!target) return null;
  try {
    return fs.readFileSync(target);
  } catch {
    return null;
  }
}

export class RestoreError extends Error {}

/**
 * 从快照恢复内容。快照里也有用户与会话，但恢复只覆盖内容表，
 * 不会因为恢复一份旧备份就把当前登录踢掉或把管理员换掉。
 */
export function restoreSnapshot(name: string): { categories: number; items: number } {
  const target = snapshotPath(name);
  if (!target) throw new RestoreError("备份文件名不合法：请从列表中选择。");
  if (!fs.existsSync(target)) throw new RestoreError("备份文件不存在：请刷新列表后重试。");

  const snapshot = new Database(target, { readonly: true });
  try {
    const snapshotDb = drizzle(snapshot, { schema });
    const document = buildBackupDocument(snapshotDb);
    return applyBackupDocument(getDb(), document);
  } catch {
    throw new RestoreError("备份文件无法读取：它可能不是本项目的数据库快照。");
  } finally {
    snapshot.close();
  }
}
