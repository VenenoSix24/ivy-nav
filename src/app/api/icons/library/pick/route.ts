import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { PickError, pickLibraryIcon } from "@/lib/icons/library/pick";

export const dynamic = "force-dynamic";

/** 挑中一张：下载到本地上传目录，条目之后按上传图标渲染，不再依赖那个图标库。 */
export async function POST(request: Request) {
  return withAdmin(async () => {
    const body = (await readJson(request)) as {
      library?: unknown;
      name?: unknown;
      color?: unknown;
    } | null;

    const library = typeof body?.library === "string" ? body.library : "";
    const name = typeof body?.name === "string" ? body.name : "";
    if (!library || !name.trim()) return jsonError("没有指定图标：请重新选择。", 400);

    const color =
      typeof body?.color === "string" && /^#[0-9a-f]{3,8}$/i.test(body.color) ? body.color : null;

    try {
      return jsonOk(await pickLibraryIcon(library, name, color));
    } catch (error) {
      if (error instanceof PickError) return jsonError(error.message, 400);
      throw error;
    }
  });
}
