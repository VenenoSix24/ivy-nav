import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, sessionCookieOptions } from "@/lib/auth/constants";

/**
 * 滑动续期。数据库侧的顺延在各接口里完成，这里只负责把浏览器上的 Cookie 到期时间
 * 一起推后，否则常来的用户在 30 天后仍会被登出（设计文档 §11）。
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      ...sessionCookieOptions(new Date(Date.now() + SESSION_TTL_MS)),
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
