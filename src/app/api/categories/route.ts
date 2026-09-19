import { firstIssueMessage, jsonError, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { createCategory, findCategoryByName } from "@/lib/portal/mutations";
import { categoryInputSchema } from "@/lib/portal/schemas";
import { portalResponse } from "@/lib/portal/respond";

export async function POST(request: Request) {
  return withAdmin(async () => {
    const parsed = categoryInputSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

    if (findCategoryByName(parsed.data.name)) {
      return jsonError(`分类「${parsed.data.name}」已存在：请换个名字。`, 409);
    }

    const created = createCategory(parsed.data);
    if (!created) return jsonError("创建分类失败：数据库未返回结果，请重试。", 500);

    return portalResponse();
  });
}
