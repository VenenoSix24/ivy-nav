import { getDb } from "@/db/client";
import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { applyBookmarkImport } from "@/lib/bookmarks/import";
import { readBookmarkBody } from "@/lib/bookmarks/request";
import { prepareBookmarkImport } from "@/lib/bookmarks/service";

/**
 * 导入按「文件 + 处理方式」重新算一遍计划再落库，服务端不保存预览状态 ——
 * 预览与实际写入因此必然一致，也不需要为一次导入引入临时存储。
 */
export async function POST(request: Request) {
  return withAdmin(async () => {
    const body = readBookmarkBody(await readJson(request));
    if (!body.ok) return jsonError(body.error, 400);

    const prepared = prepareBookmarkImport(body.html);
    if (!prepared.ok) return jsonError(prepared.error, 400);

    const imported = applyBookmarkImport(getDb(), prepared.plan, body.duplicates);
    return jsonOk({ imported });
  });
}
