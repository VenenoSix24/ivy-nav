import { jsonError, jsonOk } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { findSource } from "@/lib/icons/library";

export const dynamic = "force-dynamic";

/**
 * 在一个图标库里搜索。只回名字与元信息，图标本体另走 `/api/icons/library/icon` ——
 * 一次把整个库搬回来（Simple Icons 三千多、Iconify 二十万）是这一层最该避免的事。
 */
export async function GET(request: Request) {
  return withAdmin(async () => {
    const params = new URL(request.url).searchParams;
    const id = params.get("lib") ?? "";
    const query = params.get("q") ?? "";

    const source = findSource(id);
    if (!source) return jsonError("图标库不存在：请重新选择。", 400);

    const raw = Number(params.get("offset") ?? 0);
    const offset = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;

    const result = await source.search(query, { offset });
    return jsonOk({ library: id, ...result });
  });
}
