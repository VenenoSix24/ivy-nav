import { jsonError } from "@/lib/api/http";
import { getSession, type AdminSession } from "./session";

export class UnauthorizedError extends Error {
  constructor() {
    super("需要管理员身份");
    this.name = "UnauthorizedError";
  }
}

/** 每个写接口都必须先过这里 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

export async function withAdmin(
  handler: (session: AdminSession) => Promise<Response>,
): Promise<Response> {
  try {
    return await handler(await requireAdmin());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError("未登录或会话已过期：请先登录管理员账号。", 401);
    }
    throw error;
  }
}
