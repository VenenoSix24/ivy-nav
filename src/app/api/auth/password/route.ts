import { z } from "zod";
import { firstIssueMessage, jsonError, jsonOk, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { checkPasswordStrength, hashPassword, verifyPassword } from "@/lib/auth/password";
import { destroyOtherSessions } from "@/lib/auth/session";
import { findUserByName, updatePassword } from "@/db/users";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码。"),
  newPassword: z.string().min(1, "请输入新密码。"),
});

export async function POST(request: Request) {
  return withAdmin(async (session) => {
    const parsed = passwordSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

    const user = findUserByName(session.username);
    if (!user) return jsonError("账号不存在：请重新登录。", 401);

    const matches = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!matches) return jsonError("当前密码不正确：请重新输入。", 401);

    if (parsed.data.newPassword === parsed.data.currentPassword) {
      return jsonError("新密码与当前密码相同：请换一个。", 400);
    }

    const strength = checkPasswordStrength(parsed.data.newPassword);
    if (strength) return jsonError(strength, 400);

    updatePassword(user.id, await hashPassword(parsed.data.newPassword));
    // 改密后其它设备一起下线，当前设备保留，避免自己也被踢出去
    await destroyOtherSessions(user.id, session.sessionId);

    return jsonOk({ ok: true });
  });
}
