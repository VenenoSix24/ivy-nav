"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "cn";
import { SettingsSection } from "@/components/settings/settings-section";
import { useMounted } from "@/hooks/use-mounted";
import { PALETTES, type PaletteId } from "@/lib/settings/appearance";

const MODES = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
] as const;

interface AppearanceSettingsProps {
  initialPalette: PaletteId;
}

export function AppearanceSettings({ initialPalette }: AppearanceSettingsProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const [palette, setPalette] = useState<PaletteId>(initialPalette);
  const [pending, setPending] = useState(false);

  const dark = mounted && resolvedTheme === "dark";

  async function pick(next: PaletteId) {
    if (next === palette || pending) return;
    const previous = palette;

    // 先把颜色换上去：配色是观感选择，值得即时反馈；写库失败再退回来
    // 用 setAttribute 而不是改 dataset：后者是三层成员赋值，会被 React Compiler 的
    // 不可变规则拦下（"Modifying a variable defined outside a component"）
    document.documentElement.setAttribute("data-palette", next);
    setPalette(next);
    setPending(true);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ palette: next }),
    }).catch(() => null);
    setPending(false);

    if (!response?.ok) {
      document.documentElement.setAttribute("data-palette", previous);
      setPalette(previous);
      toast.error("配色没能保存：请检查网络后重试。");
      return;
    }

    toast.success(`配色已换成「${PALETTES.find((entry) => entry.id === next)?.label}」`);
  }

  return (
    <>
      <SettingsSection title="外观" description="跟随系统时会随操作系统的浅色/深色自动切换。">
        <div
          className="bg-secondary inline-flex rounded-full p-1"
          role="group"
          aria-label="外观模式"
        >
          {MODES.map(({ value, label, Icon }) => {
            const active = mounted && (theme ?? "system") === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={active}
                className={cn(
                  "focus-visible:outline-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                  active
                    ? "bg-popover text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="配色"
        description="配色只更改强调色与背景光晕，中性色和卡面材质不变。"
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label="配色主题">
          {PALETTES.map((entry) => {
            const active = entry.id === palette;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => void pick(entry.id)}
                aria-pressed={active}
                className={cn(
                  "focus-visible:outline-ring flex items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                  active
                    ? "border-primary/40 bg-secondary text-foreground font-medium"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className="size-4 rounded-full"
                  style={{
                    background: entry.swatch[dark ? "dark" : "light"],
                  }}
                />
                {entry.label}
              </button>
            );
          })}
        </div>
      </SettingsSection>
    </>
  );
}
