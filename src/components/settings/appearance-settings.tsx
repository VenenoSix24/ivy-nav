"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "cn";
import { SettingsSection } from "@/components/settings/settings-section";
import { useMounted } from "@/hooks/use-mounted";

const MODES = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
] as const;

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <SettingsSection title="外观" description="跟随系统时会随操作系统的浅色/深色自动切换。">
      <div className="bg-secondary inline-flex rounded-full p-1" role="group" aria-label="外观模式">
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
  );
}
