import { binaryBody, jsonError } from "@/lib/api/http";
import { getSession } from "@/lib/auth/session";
import { findItem } from "@/lib/portal/mutations";
import { resolveFavicon } from "@/lib/icons/favicon";
import { PLACEHOLDER_CACHE_SECONDS, TRANSPARENT_PNG } from "@/lib/icons/placeholder";
import { parseHttpUrl } from "@/lib/utils/url";

export const dynamic = "force-dynamic";

function placeholderResponse(isAdmin: boolean) {
  return new Response(binaryBody(TRANSPARENT_PNG), {
    headers: {
      "content-type": "image/png",
      "cache-control": isAdmin
        ? `private, max-age=${PLACEHOLDER_CACHE_SECONDS}`
        : `public, max-age=${PLACEHOLDER_CACHE_SECONDS}`,
      "x-content-type-options": "nosniff",
    },
  });
}

/** 公开站点图标；只按条目编号取，不接受任意 URL。 */
export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("item"));
  if (!Number.isInteger(id) || id <= 0) {
    return jsonError("缺少条目编号：请从列表点击图标。", 400);
  }

  const item = findItem(id);
  if (!item) return jsonError("条目不存在：可能已被删除，请刷新页面。", 404);

  // Private 条目也回 404，不用状态码暴露它存在
  const session = await getSession();
  if (item.visibility === "private" && !session) {
    return jsonError("条目不存在：可能已被删除，请刷新页面。", 404);
  }

  const target = parseHttpUrl(item.url);
  if (!target) return jsonError("条目网址不合法：请修正后再试。", 400);

  // iconValue 记着在选择器里挑中的那个方案（为空即按顺序自己挑）
  const payload = await resolveFavicon(target, item.iconValue);
  // 取不到不是错误：回一张透明占位图
  if (!payload) return placeholderResponse(session !== null);

  return new Response(binaryBody(payload.body), {
    headers: {
      "content-type": payload.contentType,
      "cache-control": session ? "private, max-age=604800" : "public, max-age=604800",
      "x-content-type-options": "nosniff",
    },
  });
}
