"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { SettingsSection } from "@/components/settings/settings-section";
import { ICON_FITS, type IconFitId } from "@/lib/icons/fit";

/**
 * 条目图标的默认摆法。单个条目可以在图标选择器里自己改，这里的值只负责没设过的那些。
 * 与配色不同，它不影响首屏结构，所以改完不必刷新页面。
 */
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
      description="取回来的图标大小不一：有的把画布填满，有的四周留一大圈透明边，同一个图标遮罩下就显得一大一小。这里设置默认裁切样式，单个条目可以在图标选择器里改。"
    >
      <ul className="space-y-1.5">
        {ICON_FITS.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              aria-pressed={fit === entry.id}
              disabled={busy}
              onClick={() => void pick(entry.id)}
              className={cn(
                "focus-visible:outline-ring flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2",
                fit === entry.id ? "bg-accent" : "hover:bg-secondary",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{entry.label}</span>
                <span className="text-muted-foreground mt-0.5 block text-[12px] leading-relaxed">
                  {entry.hint}
                </span>
              </span>
              {fit === entry.id ? <Check className="text-primary mt-0.5 size-4 shrink-0" /> : null}
            </button>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
