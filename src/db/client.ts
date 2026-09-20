import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

export function resolveDatabasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "portal.db");
}

export function resolveMigrationsPath(): string {
  return process.env.MIGRATIONS_PATH ?? path.join(process.cwd(), "src", "db", "migrations");
}

// 连接句柄挂在 globalThis 上：dev 下模块会被反复加载
const globalForDb = globalThis as unknown as {
  __ivyNavDb?: Db;
  __ivyNavSqlite?: Database.Database;
};

/** 懒开数据库，首次访问时跑迁移。 */
export function getDb(): Db {
  if (globalForDb.__ivyNavDb) return globalForDb.__ivyNavDb;

  const file = resolveDatabasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolveMigrationsPath() });

  globalForDb.__ivyNavDb = db;
  globalForDb.__ivyNavSqlite = sqlite;
  return db;
}

/** 直接拿 better-sqlite3 句柄（目前只有 VACUUM INTO 用）。 */
export function getSqlite(): Database.Database {
  getDb();
  const sqlite = globalForDb.__ivyNavSqlite;
  if (!sqlite) throw new Error("数据库尚未初始化");
  return sqlite;
}

export { schema };
