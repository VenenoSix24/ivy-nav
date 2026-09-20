import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, sessionCookieOptions } from "@/lib/auth/constants";

/** 会话滑动续期：把浏览器上的 Cookie 到期时间一起推后。 */
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
