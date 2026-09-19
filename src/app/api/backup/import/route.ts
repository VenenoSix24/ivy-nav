import { jsonError, jsonOk } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { getDb } from "@/db/client";
import { applyBackupDocument } from "@/lib/backup/document";
import { parseBackupDocument } from "@/lib/backup/schema";

export async function POST(request: Request) {
  return withAdmin(async () => {
    const raw = await request.text();
    if (!raw.trim()) return jsonError("没有收到文件内容：请重新选择备份文件。", 400);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return jsonError("文件不是合法的 JSON：请选择本项导出的备份文件。", 400);
    }

    const result = parseBackupDocument(parsed);
    if (!result.ok || !result.document) {
      return jsonError(result.error ?? "备份文件无法解析：请确认文件来源。", 400);
    }

    const summary = applyBackupDocument(getDb(), result.document);
    return jsonOk({ imported: summary });
  });
}
