import { binaryBody, jsonError } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { resolveFavicon } from "@/lib/icons/favicon";
import { PLACEHOLDER_CACHE_SECONDS, TRANSPARENT_PNG } from "@/lib/icons/placeholder";
import { parseHttpUrl } from "@/lib/utils/url";

export const dynamic = "force-dynamic";

/** 图标选择器里预览还没保存的网址，只有管理员能用。 */
export async function GET(request: Request) {
  return withAdmin(async () => {
    const raw = new URL(request.url).searchParams.get("url") ?? "";
    const target = parseHttpUrl(raw);
    // 网址还空着不算「输入非法」，只是暂时没得预览：回占位图。
    // 之前一律回 400，选择器一打开控制台就多一条红线。填了但不合法才该报错。
    if (!target) {
      if (!raw.trim()) return placeholderResponse();
      return jsonError("网址只支持 http 与 https：请检查后重试。", 400);
    }

    const payload = await resolveFavicon(target);
    if (!payload) return placeholderResponse();

    return new Response(binaryBody(payload.body), {
      headers: {
        "content-type": payload.contentType,
        "cache-control": "private, max-age=604800",
        "x-content-type-options": "nosniff",
      },
    });
  });
}

function placeholderResponse() {
  return new Response(binaryBody(TRANSPARENT_PNG), {
    headers: {
      "content-type": "image/png",
      "cache-control": `private, max-age=${PLACEHOLDER_CACHE_SECONDS}`,
      "x-content-type-options": "nosniff",
    },
  });
}
