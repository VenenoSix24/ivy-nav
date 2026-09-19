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

// Next.js dev reloads modules per request; a module-level handle would leak connections.
const globalForDb = globalThis as unknown as {
  __ivyNavDb?: Db;
  __ivyNavSqlite?: Database.Database;
};

/**
 * Lazily opens the database and brings the schema up to date. Migrations run on first
 * access so a fresh self-hosted deployment needs no separate migration step.
 */
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

/** 需要执行 drizzle 不覆盖的语句时用（目前只有 VACUUM INTO）。 */
export function getSqlite(): Database.Database {
  getDb();
  const sqlite = globalForDb.__ivyNavSqlite;
  if (!sqlite) throw new Error("数据库尚未初始化");
  return sqlite;
}

export { schema };
