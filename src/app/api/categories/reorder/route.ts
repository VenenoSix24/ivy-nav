import { firstIssueMessage, jsonError, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { reorderCategories } from "@/lib/portal/mutations";
import { reorderSchema } from "@/lib/portal/schemas";
import { portalResponse } from "@/lib/portal/respond";

export async function POST(request: Request) {
  return withAdmin(async () => {
    const parsed = reorderSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

    reorderCategories(parsed.data.orderedIds);
    return portalResponse();
  });
}
