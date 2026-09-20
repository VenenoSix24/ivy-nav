import { firstIssueMessage, jsonError, jsonOk, readJson } from "@/lib/api/http";
import { withAdmin } from "@/lib/auth/guard";
import { PALETTE_SETTING_KEY } from "@/lib/settings/appearance";
import { ICON_FIT_SETTING_KEY } from "@/lib/settings/icon-fit";
import { settingsPatchSchema } from "@/lib/settings/schemas";
import { writeSetting } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

/** 界面偏好；响应禁止缓存。 */
export async function PATCH(request: Request) {
  return withAdmin(async () => {
    const parsed = settingsPatchSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstIssueMessage(parsed.error), 400);

    const { palette, iconFit } = parsed.data;
    if (palette !== undefined) writeSetting(PALETTE_SETTING_KEY, palette);
    if (iconFit !== undefined) writeSetting(ICON_FIT_SETTING_KEY, iconFit);

    return jsonOk({ palette, iconFit });
  });
}
