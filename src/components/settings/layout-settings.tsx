"use client";

import { useState } from "react";
import { LayoutGrid, List, Grid3x3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { SettingsSection } from "@/components/settings/settings-section";
import { portalRequest } from "@/lib/portal/client";
import type { PortalCategory, PortalData } from "@/lib/portal/types";
import { DEFAULT_LAYOUT, LAYOUTS, type LayoutId } from "@/lib/settings/homepage";

const LAYOUT_ICONS: Record<LayoutId, typeof List> = {
  card: LayoutGrid,
  list: List,
  compact: Grid3x3,
};

interface LayoutSettingsProps {
  initialPortal: PortalData;
}

/**
 * 首页布局按分类各选一套：一个分类常常是另一种用法 ——
 * 项目适合摊开看描述，工具适合紧凑当入口，资料多则适合列表扫。
 */
export function LayoutSettings({ initialPortal }: LayoutSettingsProps) {
  const [portal, setPortal] = useState(initialPortal);
  const [busy, setBusy] = useState(false);

  async function pick(category: PortalCategory, next: LayoutId) {
    if (busy || (category.layout ?? DEFAULT_LAYOUT) === next) return;

    setBusy(true);
    const result = await portalRequest(`/api/categories/${category.id}`, { layout: next }, "PATCH");
    setBusy(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setPortal(result.portal);
    toast.success(
      `「${category.name}」改用${LAYOUTS.find((entry) => entry.id === next)?.label}布局`,
    );
  }

  return (
    <SettingsSection
      title="首页布局"
      description="每个分类各自选一套排布，只影响首页。没设置过的分类按卡片排。"
    >
      {portal.categories.length === 0 ? (
        <p className="text-muted-foreground text-[13px]">
          还没有分类：先到下面的「首页分类」新建一个。
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {portal.categories.map((category) => {
            const current = category.layout ?? DEFAULT_LAYOUT;
            return (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                  {category.name}
                </span>

                <div
                  role="group"
                  aria-label={`「${category.name}」的首页布局`}
                  className="bg-secondary inline-flex shrink-0 rounded-full p-0.5"
                >
                  {LAYOUTS.map((entry) => {
                    const Icon = LAYOUT_ICONS[entry.id];
                    const active = current === entry.id;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        disabled={busy}
                        onClick={() => void pick(category, entry.id)}
                        aria-pressed={active}
                        title={`${entry.label}：${entry.hint}`}
                        className={cn(
                          "focus-visible:outline-ring inline-grid size-7 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                          active
                            ? "bg-popover text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="size-3.5" />
                        <span className="sr-only">{entry.label}</span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SettingsSection>
  );
}
