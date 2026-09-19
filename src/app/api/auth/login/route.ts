import { z } from "zod";
import { clientIp, firstIssueMessage, jsonError, jsonOk, readJson } from "@/lib/api/http";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { LOGIN_GLOBAL_KEY, loginGlobalLimiter, loginLimiter } from "@/lib/auth/rate-limit";
import { createSession, findUserByName, setSessionCookie } from "@/lib/auth/session";

const loginSchema = z.object({
  username: z.string().trim().min(1, "用户名不能为空：请填写后重试。"),
  password: z.string().min(1, "密码不能为空：请填写后重试。"),
});

let dummyHash: string | null = null;

/** 用户名不存在时也照样跑一次哈希校验，用耗时差异枚举用户名就行不通了。 */
async function timingDecoyHash(): Promise<string> {
  dummyHash ??= await hashPassword("decoy-password-for-timing");
  return dummyHash;
}

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

  // 限流按用户名与全局两个维度计。IP 不作为键：转发头由客户端自己写，
  // 每次换一个值就等于换一个新桶，那样的限流形同虚设。
  const userKey = `user:${parsed.data.username.toLowerCase()}`;
  const perUser = loginLimiter.check(userKey);
  const global = loginGlobalLimiter.check(LOGIN_GLOBAL_KEY);
  if (!perUser.allowed || !global.allowed) {
    const wait = Math.max(perUser.retryAfterSeconds, global.retryAfterSeconds);
    return jsonError(`尝试次数过多：请等待 ${wait} 秒后再试。`, 429);
  }

  const user = findUserByName(parsed.data.username);
  const storedHash = user?.passwordHash ?? (await timingDecoyHash());
  const passwordMatches = await verifyPassword(parsed.data.password, storedHash);

  if (!user || !passwordMatches) {
    loginLimiter.recordFailure(userKey);
    loginGlobalLimiter.recordFailure(LOGIN_GLOBAL_KEY);
    return jsonError("用户名或密码不正确：请检查后重试。", 401);
  }

  loginLimiter.reset(userKey);

  const { token, expiresAt } = createSession(user.id, {
    userAgent: request.headers.get("user-agent"),
    ip: clientIp(request),
  });
  await setSessionCookie(token, expiresAt);

  return jsonOk({ username: user.username });
}
