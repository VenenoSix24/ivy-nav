import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessions, users } from "@/db/schema";
import {
  SESSION_COOKIE_NAME,
  SESSION_RENEW_AFTER_MS,
  SESSION_TTL_MS,
  sessionCookieOptions,
} from "./constants";
import { createSessionToken, hashSessionToken } from "./token";

export interface AdminSession {
  sessionId: string;
  userId: number;
  username: string;
  expiresAt: Date;
}

export interface SessionMeta {
  userAgent?: string | null;
  ip?: string | null;
}

export function countAdminUsers(): number {
  const rows = getDb().select({ id: users.id }).from(users).all();
  return rows.length;
}

/** 首次部署时还没有管理员，登录页据此切换成创建账号。 */
export function needsSetup(): boolean {
  return countAdminUsers() === 0;
}

export function findUserByName(username: string) {
  return getDb().select().from(users).where(eq(users.username, username)).get() ?? null;
}

export function createSession(
  userId: number,
  meta: SessionMeta,
): { token: string; expiresAt: Date } {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  getDb()
    .insert(sessions)
    .values({
      id: hashSessionToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
    })
    .run();

  return { token, expiresAt };
}

/**
 * 校验 Cookie 里的令牌。数据库只存令牌摘要，所以拿到库文件也无法重放会话；
 * 活跃时顺延有效期，长时间不用则自然过期。
 */
export function readSession(token: string): AdminSession | null {
  const db = getDb();
  const id = hashSessionToken(token);
  const row = db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
      username: users.username,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .get();

  if (!row) return null;

  const now = Date.now();
  if (row.expiresAt.getTime() <= now) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }

  const remaining = row.expiresAt.getTime() - now;
  if (remaining < SESSION_RENEW_AFTER_MS) {
    const expiresAt = new Date(now + SESSION_TTL_MS);
    db.update(sessions).set({ expiresAt, lastUsedAt: new Date() }).where(eq(sessions.id, id)).run();
    return { ...row, expiresAt };
  }

  db.update(sessions).set({ lastUsedAt: new Date() }).where(eq(sessions.id, id)).run();
  return row;
}

/** 只读当前会话，供服务端组件使用（组件里不能写 Cookie）。 */
export async function getSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return readSession(token);
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(new Date(0)),
    maxAge: 0,
  });
}

export async function destroySession(token: string): Promise<void> {
  getDb()
    .delete(sessions)
    .where(eq(sessions.id, hashSessionToken(token)))
    .run();
}

export async function destroyAllSessions(userId: number): Promise<void> {
  getDb().delete(sessions).where(eq(sessions.userId, userId)).run();
}

/** 改密码后让其它设备失效，只保留当前这一台。 */
export async function destroyOtherSessions(userId: number, keepSessionId: string): Promise<void> {
  const db = getDb();
  for (const row of db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .all()) {
    if (row.id !== keepSessionId) db.delete(sessions).where(eq(sessions.id, row.id)).run();
  }
}

export async function readSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function updatePassword(userId: number, passwordHash: string): Promise<void> {
  getDb()
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .run();
}

export function createAdminUser(username: string, passwordHash: string) {
  return getDb().insert(users).values({ username, passwordHash }).returning({ id: users.id }).get();
}
