"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "cn";
import { useMounted } from "@/hooks/use-mounted";

const MODES = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const activeIndex = MODES.findIndex((mode) => mode.value === theme);

  function cycle() {
    const next = MODES[(Math.max(activeIndex, 0) + 1) % MODES.length];
    if (next) setTheme(next.value);
  }

  if (!mounted) {
    return <div aria-hidden className="size-9 rounded-full" />;
  }

  const current = MODES[activeIndex] ?? MODES[2];
  const { Icon } = current;

  return (
    <button
      type="button"
      onClick={cycle}
      title={`外观：${current.label}`}
      aria-label={`外观：${current.label}，点击切换`}
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-ring inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
      )}
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{current.label}</span>
    </button>
  );
}
