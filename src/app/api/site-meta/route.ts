import { jsonError, jsonOk } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { fetchSiteTitle } from "@/lib/icons/favicon";
import { parseHttpUrl } from "@/lib/utils/url";

export const dynamic = "force-dynamic";

/**
 * 按网址猜条目信息：目前只有标题。新建条目时用户往往先填网址，
 * 标题可以照网页的 og:site_name / <title> 填上，省得拦在「标题必填」那一步。
 *
 * 取不到不是错误：回 `{ title: null }`，前端提示手动填写并照常允许保存。
 * 只有网址本身不合法才算错（那说明调用方有问题）。
 */
export async function GET(request: Request) {
  return withAdmin(async () => {
    const raw = new URL(request.url).searchParams.get("url") ?? "";
    const target = parseHttpUrl(raw);
    if (!target) return jsonError("网址只支持 http 与 https：请检查后重试。", 400);

    return jsonOk({ title: await fetchSiteTitle(target) });
  });
}
