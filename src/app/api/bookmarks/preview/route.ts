import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { toPreviewPayload } from "@/lib/bookmarks/plan";
import { readBookmarkBody } from "@/lib/bookmarks/request";
import { prepareBookmarkImport } from "@/lib/bookmarks/service";

/**
 * 先算一遍给用户看：有哪些顶层目录（各自多少条）、会新建哪些分类、哪些标签重名、
 * 哪些行进不来、哪些网址落在多个分类里。确认后再走 import。
 *
 * 返回的是**每个目录各自的那份统计**，前端勾掉某个目录时自己相加即可，
 * 不必为一个勾选框再跑一趟。
 */
export async function POST(request: Request) {
  return withAdmin(async () => {
    const body = readBookmarkBody(await readJson(request));
    if (!body.ok) return jsonError(body.error, 400);

    const prepared = prepareBookmarkImport(body.html, body.groups);
    if (!prepared.ok) return jsonError(prepared.error, 400);

    return jsonOk({ preview: toPreviewPayload(prepared.plan) });
  });
}
