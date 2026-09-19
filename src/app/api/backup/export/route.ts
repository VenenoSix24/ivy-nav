import { withAdmin } from "@/lib/auth/guard";
import { getDb } from "@/db/client";
import { buildBackupDocument, exportFileName } from "@/lib/backup/document";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async () => {
    const document = buildBackupDocument(getDb());

    return new Response(JSON.stringify(document, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${exportFileName()}"`,
        "cache-control": "no-store",
      },
    });
  });
}
