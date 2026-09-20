import { jsonError, jsonOk } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { listFaviconCandidates } from "@/lib/icons/favicon";
import { parseHttpUrl } from "@/lib/utils/url";

export const dynamic = "force-dynamic";

/** 列出「这个网站能从哪几个方案取到图标」，各方案真去取一次。 */
export async function GET(request: Request) {
  return withAdmin(async () => {
    const raw = new URL(request.url).searchParams.get("url") ?? "";
    const target = parseHttpUrl(raw);
    // 网址还没填完不算错：一条候选都没有
    if (!target) {
      if (!raw.trim()) return jsonOk({ candidates: [] });
      return jsonError("网址只支持 http 与 https：请检查后重试。", 400);
    }

    return jsonOk({ candidates: await listFaviconCandidates(target) });
  });
}
