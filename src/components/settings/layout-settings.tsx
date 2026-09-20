"use client";

import { useState } from "react";
import { LayoutGrid, List, Grid3x3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { SettingsSection } from "@/components/settings/settings-section";
import { LAYOUTS, type LayoutId } from "@/lib/settings/homepage";

const LAYOUT_ICONS: Record<LayoutId, typeof List> = {
  card: LayoutGrid,
  list: List,
  compact: Grid3x3,
};

interface LayoutSettingsProps {
  initialLayout: LayoutId;
}

export function LayoutSettings({ initialLayout }: LayoutSettingsProps) {
  const [layout, setLayout] = useState<LayoutId>(initialLayout);
  const [pending, setPending] = useState(false);

  async function pick(next: LayoutId) {
    if (next === layout || pending) return;
    const previous = layout;
    setLayout(next);
    setPending(true);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: next }),
    }).catch(() => null);
    setPending(false);

    if (!response?.ok) {
      setLayout(previous);
      toast.error("布局没能保存：请检查网络后重试。");
      return;
    }

    toast.success(`首页已换成「${LAYOUTS.find((entry) => entry.id === next)?.label}」布局`);
  }

  return (
    <SettingsSection
      title="首页布局"
      description="只影响首页条目的排布；分类、搜索与编辑模式都不受它影响。"
    >
      <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="首页布局">
        {LAYOUTS.map((entry) => {
          const Icon = LAYOUT_ICONS[entry.id];
          const active = entry.id === layout;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => void pick(entry.id)}
              aria-pressed={active}
              className={cn(
                "focus-visible:outline-ring flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                active ? "border-primary/40 bg-secondary" : "border-border hover:bg-secondary/50",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                <span
                  className={cn(
                    "text-[13px]",
                    active ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {entry.label}
                </span>
              </span>
              <span className="text-muted-foreground text-[12px] leading-snug">{entry.hint}</span>
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}
