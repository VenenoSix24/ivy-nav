import { jsonOk } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { listTags } from "@/lib/portal/mutations";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async () => jsonOk({ tags: listTags() }));
}
