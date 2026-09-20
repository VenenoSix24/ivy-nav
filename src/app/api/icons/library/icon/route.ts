import { binaryBody, jsonError } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { findSource } from "@/lib/icons/library";
import { PLACEHOLDER_CACHE_SECONDS, TRANSPARENT_PNG } from "@/lib/icons/placeholder";

export const dynamic = "force-dynamic";

/** 搜索结果显示用的缩略图，也用于换颜色预览。 */
export async function GET(request: Request) {
  return withAdmin(async () => {
    const params = new URL(request.url).searchParams;
    const source = findSource(params.get("lib") ?? "");
    if (!source) return jsonError("图标库不存在：请重新选择。", 400);

    const name = params.get("name") ?? "";
    if (!name.trim()) return jsonError("没有指定图标：请重新选择。", 400);

    const raw = params.get("color");
    const color = raw && /^#[0-9a-f]{3,8}$/i.test(raw) ? raw : null;

    const payload = await source.fetchIcon(name, color);
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
