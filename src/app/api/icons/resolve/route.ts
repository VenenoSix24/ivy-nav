import { binaryBody, jsonError } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { resolveFavicon, resolveIconSource } from "@/lib/icons/favicon";
import { PLACEHOLDER_CACHE_SECONDS, TRANSPARENT_PNG } from "@/lib/icons/placeholder";
import { isIconSourceId } from "@/lib/icons/sources";
import { parseHttpUrl } from "@/lib/utils/url";

export const dynamic = "force-dynamic";

/** 图标选择器里预览还没保存的网址；带 `source` 只看某一个方案，不带则走自动链。 */
export async function GET(request: Request) {
  return withAdmin(async () => {
    const params = new URL(request.url).searchParams;
    const raw = params.get("url") ?? "";
    const target = parseHttpUrl(raw);
    // 网址还空着不算「输入非法」，只是暂时没得预览：回占位图而不是 400
    if (!target) {
      if (!raw.trim()) return placeholderResponse();
      return jsonError("网址只支持 http 与 https：请检查后重试。", 400);
    }

    const source = params.get("source");
    if (source !== null && !isIconSourceId(source)) {
      return jsonError("图标来源不认识：请重新获取一次。", 400);
    }

    const payload = source ? await resolveIconSource(target, source) : await resolveFavicon(target);
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
