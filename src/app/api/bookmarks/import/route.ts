import { getDb } from "@/db/client";
import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { applyBookmarkImport } from "@/lib/bookmarks/import";
import { readBookmarkBody } from "@/lib/bookmarks/request";
import { prepareBookmarkImport } from "@/lib/bookmarks/service";

/** 按「文件 + 挑中的目录 + 重复网址怎么处理」重新算一遍计划再落库。 */
export async function POST(request: Request) {
  return withAdmin(async () => {
    const body = readBookmarkBody(await readJson(request));
    if (!body.ok) return jsonError(body.error, 400);

    const prepared = prepareBookmarkImport(body.html, body.groups);
    if (!prepared.ok) return jsonError(prepared.error, 400);

    const imported = applyBookmarkImport(getDb(), prepared.plan, body.duplicates);
    return jsonOk({ imported });
  });
}
