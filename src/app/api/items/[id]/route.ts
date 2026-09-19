import { firstIssueMessage, jsonError, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { deleteItem, findItem, updateItem } from "@/lib/portal/mutations";
import { itemInputSchema } from "@/lib/portal/schemas";
import { portalResponse } from "@/lib/portal/respond";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(async () => {
    const id = parseId((await params).id);
    if (id === null) return jsonError("条目编号不合法：请刷新页面后重试。", 400);

    const parsed = itemInputSchema.partial().safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

    const updated = updateItem(id, parsed.data);
    if (!updated) return jsonError("条目不存在：可能已被删除，请刷新页面。", 404);

    return portalResponse();
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(async () => {
    const id = parseId((await params).id);
    if (id === null) return jsonError("条目编号不合法：请刷新页面后重试。", 400);

    if (!findItem(id)) return jsonError("条目不存在：可能已被删除，请刷新页面。", 404);

    deleteItem(id);
    return portalResponse();
  });
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
