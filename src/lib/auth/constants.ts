export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "ivy_session";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** 用到一半寿命时顺延 */
export const SESSION_RENEW_AFTER_MS = SESSION_TTL_MS / 2;

/** 生产环境默认要求 HTTPS 才回传 Cookie；SESSION_COOKIE_SECURE 可覆盖 */
function cookieSecure(): boolean {
  const override = process.env.SESSION_COOKIE_SECURE;
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
