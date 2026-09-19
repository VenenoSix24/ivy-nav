import { firstIssueMessage, jsonError, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { createItem } from "@/lib/portal/mutations";
import { itemInputSchema } from "@/lib/portal/schemas";
import { portalResponse } from "@/lib/portal/respond";

export async function POST(request: Request) {
  return withAdmin(async () => {
    const parsed = itemInputSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

    const created = createItem(parsed.data);
    if (!created) return jsonError("保存失败：数据库未返回新条目，请重试。", 500);

    return portalResponse();
  });
}
