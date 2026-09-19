import { jsonOk } from "@/lib/api/http";
import { clearSessionCookie, destroyAllSessions } from "@/lib/auth/session";
import { withAdmin } from "@/lib/auth/guard";

export async function POST() {
  return withAdmin(async (session) => {
    await destroyAllSessions(session.userId);
    await clearSessionCookie();
    return jsonOk({ ok: true });
  });
}
