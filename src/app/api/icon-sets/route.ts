import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import {
  SetError,
  deleteIconSet,
  downloadIconSet,
  listIconSets,
  saveIconSet,
} from "@/lib/icons/library/sets";
import { parseHttpUrl } from "@/lib/utils/url";

export const dynamic = "force-dynamic";

/** 自建图标集：一份 JSON 一份集合，存在 `icon_sets` 里。 */
export async function GET() {
  return withAdmin(async () => jsonOk({ sets: listIconSets() }));
}

export async function POST(request: Request) {
  return withAdmin(async () => {
    const body = (await readJson(request)) as { url?: unknown; mirror?: unknown } | null;

    const target = parseHttpUrl(typeof body?.url === "string" ? body.url : "");
    if (!target) return jsonError("图标集地址只支持 http 与 https：请检查后重试。", 400);

    // 勾了镜像就照 jsDelivr 改写 raw.githubusercontent 的地址
    const mirror = body?.mirror === true;

    try {
      // 同名即覆盖，不会堆出两份
      const payload = await downloadIconSet(target, mirror);
      return jsonOk({
        id: saveIconSet(payload),
        name: payload.name,
        count: payload.icons.length,
      });
    } catch (error) {
      if (error instanceof SetError) return jsonError(error.message, 400);
      throw error;
    }
  });
}

export async function DELETE(request: Request) {
  return withAdmin(async () => {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) return jsonError("缺少图标集编号。", 400);
    if (!deleteIconSet(id)) return jsonError("这个图标集不存在：可能已经删过了。", 404);
    return jsonOk({ ok: true });
  });
}
