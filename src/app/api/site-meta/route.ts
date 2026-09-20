import { jsonError, jsonOk } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { fetchSiteTitle } from "@/lib/icons/favicon";
import { parseHttpUrl } from "@/lib/utils/url";

export const dynamic = "force-dynamic";

/** 按网址猜条目信息：目前只有标题；取不到回 `{ title: null }`。 */
export async function GET(request: Request) {
  return withAdmin(async () => {
    const raw = new URL(request.url).searchParams.get("url") ?? "";
    const target = parseHttpUrl(raw);
    if (!target) return jsonError("网址只支持 http 与 https：请检查后重试。", 400);

    return jsonOk({ title: await fetchSiteTitle(target) });
  });
}
