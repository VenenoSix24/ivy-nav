import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { RestoreError, restoreSnapshot } from "@/lib/backup/database";

export async function POST(request: Request) {
  return withAdmin(async () => {
    const payload = await readJson(request);
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const name = typeof body.name === "string" ? body.name : "";

    // 恢复会覆盖现有内容，必须带 confirm
    if (body.confirm !== true) {
      return jsonError("恢复需要再次确认：请在弹窗中确认后重试。", 400);
    }
    if (!name) return jsonError("没有指定要恢复的备份：请从列表中选择。", 400);

    try {
      const summary = restoreSnapshot(name);
      return jsonOk({ restored: summary, name });
    } catch (error) {
      if (error instanceof RestoreError) return jsonError(error.message, 400);
      throw error;
    }
  });
}
