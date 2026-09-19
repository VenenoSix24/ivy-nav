export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "ivy_session";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Sliding renewal kicks in once half the lifetime is spent, keeping the DB small. */
export const SESSION_RENEW_AFTER_MS = SESSION_TTL_MS / 2;

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
