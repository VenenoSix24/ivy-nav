import { binaryBody, jsonError } from "@/lib/api/http";
import { getSession } from "@/lib/auth/session";
import { findItem } from "@/lib/portal/mutations";
import { resolveFavicon } from "@/lib/icons/favicon";
import { parseHttpUrl } from "@/lib/utils/url";

export const dynamic = "force-dynamic";

/**
 * 公开站点图标。只按条目编号取，不接受任意 URL：
 * 未登录的人因此没法把这个接口当成扫描内网的代理。
 */
export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("item"));
  if (!Number.isInteger(id) || id <= 0) {
    return jsonError("缺少条目编号：请从列表点击图标。", 400);
  }

  const item = findItem(id);
  if (!item) return jsonError("条目不存在：可能已被删除，请刷新页面。", 404);

  // Private 条目的图标也要登录后才能取，否则等于把它暴露出去
  const session = await getSession();
  if (item.visibility === "private" && !session) {
    return jsonError("需要管理员身份才能取该条目的图标。", 401);
  }

  const target = parseHttpUrl(item.url);
  if (!target) return jsonError("条目网址不合法：请修正后再试。", 400);

  const payload = await resolveFavicon(target);
  if (!payload) return jsonError("没有取到站点图标：可以在编辑里改用 Emoji 或上传。", 404);

  return new Response(binaryBody(payload.body), {
    headers: {
      "content-type": payload.contentType,
      "cache-control": session ? "private, max-age=604800" : "public, max-age=604800",
      "x-content-type-options": "nosniff",
    },
  });
}
