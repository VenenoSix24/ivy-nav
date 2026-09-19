import { jsonOk } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { getAdminPortalData } from "@/lib/portal/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async () => jsonOk({ portal: getAdminPortalData() }));
}
