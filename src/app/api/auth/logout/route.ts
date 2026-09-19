import { jsonOk } from "@/lib/api/http";
import { clearSessionCookie, destroySession, readSessionToken } from "@/lib/auth/session";

export async function POST() {
  const token = await readSessionToken();
  if (token) await destroySession(token);
  await clearSessionCookie();
  return jsonOk({ ok: true });
}
