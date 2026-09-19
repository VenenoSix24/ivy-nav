import { jsonOk } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { createSnapshot, listSnapshots } from "@/lib/backup/database";

export async function POST() {
  return withAdmin(async () => {
    const created = createSnapshot();
    return jsonOk({ created, snapshots: listSnapshots() });
  });
}
