import { firstIssueMessage, jsonError, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import {
  deleteCategory,
  findCategory,
  findCategoryByName,
  updateCategory,
} from "@/lib/portal/mutations";
import { categoryInputSchema } from "@/lib/portal/schemas";
import { portalResponse } from "@/lib/portal/respond";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(async () => {
    const id = parseId((await params).id);
    if (id === null) return jsonError("分类编号不合法：请刷新页面后重试。", 400);

    const parsed = categoryInputSchema.partial().safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

    if (parsed.data.name) {
      const clash = findCategoryByName(parsed.data.name);
      if (clash && clash.id !== id) {
        return jsonError(`分类「${parsed.data.name}」已存在：请换个名字。`, 409);
      }
    }

    const updated = updateCategory(id, parsed.data);
    if (!updated) return jsonError("分类不存在：可能已被删除，请刷新页面。", 404);

    return portalResponse();
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(async () => {
    const id = parseId((await params).id);
    if (id === null) return jsonError("分类编号不合法：请刷新页面后重试。", 400);

    const existing = findCategory(id);
    if (!existing) return jsonError("分类不存在：可能已被删除，请刷新页面。", 404);

    // 条目不会被一起删除，只是退回 Inbox，之后可以再归档
    deleteCategory(id);
    return portalResponse();
  });
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
