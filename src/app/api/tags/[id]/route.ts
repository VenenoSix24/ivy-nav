import { firstIssueMessage, jsonError, jsonOk, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { renameTag } from "@/lib/portal/mutations";
import { listTagsWithCounts } from "@/lib/portal/queries";
import { tagRenameSchema } from "@/lib/portal/schemas";

export const dynamic = "force-dynamic";

/** 标签改名；目标名字已经存在就并过去 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(async () => {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) {
      return jsonError("标签编号不对：请刷新页面后重试。", 400);
    }

    const parsed = tagRenameSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

    const result = renameTag(id, parsed.data.name);
    if (!result) return jsonError("标签不存在：可能已被清掉，请刷新页面。", 404);

    return jsonOk({ tags: listTagsWithCounts(), merged: result.merged });
  });
}
