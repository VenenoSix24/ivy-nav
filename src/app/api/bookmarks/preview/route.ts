import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { toPreviewPayload } from "@/lib/bookmarks/plan";
import { readBookmarkBody } from "@/lib/bookmarks/request";
import { prepareBookmarkImport } from "@/lib/bookmarks/service";

/** 先算一遍给用户看：顶层目录、会新建哪些分类、哪些标签重名、哪些行进不来。 */
export async function POST(request: Request) {
  return withAdmin(async () => {
    const body = readBookmarkBody(await readJson(request));
    if (!body.ok) return jsonError(body.error, 400);

    const prepared = prepareBookmarkImport(body.html, body.groups);
    if (!prepared.ok) return jsonError(prepared.error, 400);

    return jsonOk({ preview: toPreviewPayload(prepared.plan) });
  });
}
