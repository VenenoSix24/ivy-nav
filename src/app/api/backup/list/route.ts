import { jsonOk } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { listSnapshots } from "@/lib/backup/database";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async () => jsonOk({ snapshots: listSnapshots() }));
}
