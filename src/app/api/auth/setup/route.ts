import { z } from "zod";
import { clientIp, firstIssueMessage, jsonError, jsonOk, readJson } from "@/lib/api/http";
import { checkPasswordStrength, hashPassword } from "@/lib/auth/password";
import {
  createFirstAdminUser,
  createSession,
  needsSetup,
  setSessionCookie,
} from "@/lib/auth/session";

const setupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "用户名不能为空：请填写后重试。")
    .max(64, "用户名过长：上限 64 个字符。"),
  password: z.string().min(1, "密码不能为空：请填写后重试。"),
});

export async function POST(request: Request) {
  if (!needsSetup()) {
    return jsonError("管理员账号已存在：请直接登录，或先删除数据后重来。", 403);
  }

  const parsed = setupSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

  const strength = checkPasswordStrength(parsed.data.password);
  if (strength) return jsonError(strength, 400);

  const passwordHash = await hashPassword(parsed.data.password);
  const user = createFirstAdminUser(parsed.data.username, passwordHash);
  if (!user) return jsonError("管理员账号已被创建：请直接用该账号登录。", 403);

  const { token, expiresAt } = createSession(user.id, {
    userAgent: request.headers.get("user-agent"),
    ip: clientIp(request),
  });
  await setSessionCookie(token, expiresAt);

  return jsonOk({ username: parsed.data.username });
}
