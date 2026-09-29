"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconFitPicker } from "@/components/icons/icon-fit-picker";
import { SettingsSection } from "@/components/settings/settings-section";
import { ICON_FITS, type IconFitId } from "@/lib/icons/fit";

/** 条目图标的默认摆法 */
export function IconFitSettings({ initialFit }: { initialFit: IconFitId }) {
  const [fit, setFit] = useState<IconFitId>(initialFit);
  const [busy, setBusy] = useState(false);

  async function pick(next: IconFitId) {
    if (busy || next === fit) return;

    setBusy(true);
    const result = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iconFit: next }),
    })
      .then((response) => (response.ok ? { ok: true as const } : { ok: false as const }))
      .catch(() => ({ ok: false as const }));
    setBusy(false);

    if (!result.ok) {
      toast.error("保存失败：请重试。");
      return;
    }

    setFit(next);
    toast.success(`图标默认改用「${ICON_FITS.find((entry) => entry.id === next)?.label}」`);
  }

  return (
    <SettingsSection
      title="条目图标"
      description="统一取回图标的裁切方式；单个条目可在图标里单独改。"
    >
      <IconFitPicker value={fit} onChange={(next) => void pick(next)} disabled={busy} />
    </SettingsSection>
  );
}
