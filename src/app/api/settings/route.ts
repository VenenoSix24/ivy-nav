import { firstIssueMessage, jsonError, jsonOk, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { PALETTE_SETTING_KEY } from "@/lib/settings/appearance";
import { settingsPatchSchema } from "@/lib/settings/schemas";
import { writeSetting } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

/**
 * 界面偏好。它不属于门户内容（不放进 PortalData），所以单独回一个最小的结果。
 * 响应同样禁止缓存：偏好跟会话走，共享缓存存下来会串到别人身上。
 */
export async function PATCH(request: Request) {
  return withAdmin(async () => {
    const parsed = settingsPatchSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

    const { palette } = parsed.data;
    writeSetting(PALETTE_SETTING_KEY, palette);

    return jsonOk({ palette });
  });
}
