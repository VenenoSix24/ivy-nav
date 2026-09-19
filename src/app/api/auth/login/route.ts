import { z } from "zod";
import { clientIp, firstIssueMessage, jsonError, jsonOk, readJson } from "@/lib/api/http";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loginLimiter } from "@/lib/auth/rate-limit";
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
  const ip = clientIp(request);
  const limit = loginLimiter.check(ip);
  if (!limit.allowed) {
    return jsonError(`尝试次数过多：请等待 ${limit.retryAfterSeconds} 秒后再试。`, 429);
  }

  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

  const user = findUserByName(parsed.data.username);
  const storedHash = user?.passwordHash ?? (await timingDecoyHash());
  const passwordMatches = await verifyPassword(parsed.data.password, storedHash);

  if (!user || !passwordMatches) {
    loginLimiter.recordFailure(ip);
    return jsonError("用户名或密码不正确：请检查后重试。", 401);
  }

  loginLimiter.reset(ip);

  const { token, expiresAt } = createSession(user.id, {
    userAgent: request.headers.get("user-agent"),
    ip,
  });
  await setSessionCookie(token, expiresAt);

  return jsonOk({ username: user.username });
}
