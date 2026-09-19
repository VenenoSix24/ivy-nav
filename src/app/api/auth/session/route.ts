import { jsonOk } from "@/lib/api/http";
import { getSession } from "@/lib/auth/session";
import { needsSetup } from "@/db/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  return jsonOk({
    authenticated: session !== null,
    username: session?.username ?? null,
    expiresAt: session?.expiresAt.toISOString() ?? null,
    needsSetup: needsSetup(),
  });
}
