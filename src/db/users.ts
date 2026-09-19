import { eq } from "drizzle-orm";
import { getDb, getSqlite } from "./client";
import { users } from "./schema";

export function listAdminUsers() {
  return getDb().select().from(users).all();
}

export function countAdminUsers(): number {
  return listAdminUsers().length;
}

/** 首次部署还没有管理员时，登录页据此给出提示（建号在服务器上做）。 */
export function needsSetup(): boolean {
  return countAdminUsers() === 0;
}

export function findUserByName(username: string) {
  return getDb().select().from(users).where(eq(users.username, username)).get() ?? null;
}

/**
 * 只在还没有任何用户时插入，判断与写入是同一条语句，SQLite 串行化写入保证
 * 并发请求里只有一个能成功。分成「先查再写」的话，同时提交就会建出多个管理员。
 */
export function createFirstAdminUser(
  username: string,
  passwordHash: string,
): { id: number } | null {
  const result = getSqlite()
    .prepare(
      `INSERT INTO users (username, password_hash, created_at, updated_at)
       SELECT ?, ?, unixepoch(), unixepoch()
       WHERE NOT EXISTS (SELECT 1 FROM users)`,
    )
    .run(username, passwordHash);

  if (result.changes === 0) return null;
  return { id: Number(result.lastInsertRowid) };
}

export function updatePassword(userId: number, passwordHash: string): void {
  getDb()
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .run();
}

/** 重置密码时把现有管理员一起改掉：单管理员项目里通常只有一行。 */
export function resetAllPasswords(passwordHash: string): number {
  const rows = listAdminUsers();
  for (const row of rows) updatePassword(row.id, passwordHash);
  return rows.length;
}
