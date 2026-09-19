import { binaryBody, jsonError } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { readSnapshot } from "@/lib/backup/database";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAdmin(async () => {
    const name = new URL(request.url).searchParams.get("name") ?? "";
    const body = readSnapshot(name);
    if (!body) return jsonError("备份文件不存在：请刷新列表后重试。", 404);

    return new Response(binaryBody(body), {
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${name}"`,
        "cache-control": "no-store",
      },
    });
  });
}
