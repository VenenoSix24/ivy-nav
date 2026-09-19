"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "cn";
import { useMounted } from "@/hooks/use-mounted";

const MODES = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
] as const;

/** 只给图标：文字留给 title 与 aria-label，顶栏保持安静。 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(null), 1600);
    return () => clearTimeout(timer);
  }, [hint]);

  const activeIndex = MODES.findIndex((mode) => mode.value === theme);

  function cycle() {
    const next = MODES[(Math.max(activeIndex, 0) + 1) % MODES.length];
    if (next) {
      setTheme(next.value);
      // 没有文字标签时，用一次短暂提示说明切到了哪一档
      setHint(next.label);
    }
  }

  if (!mounted) {
    return <div aria-hidden className="size-9 rounded-full" />;
  }

  const current = MODES[activeIndex] ?? MODES[2];
  const { Icon } = current;

  return (
    <span className="relative">
      <button
        type="button"
        onClick={cycle}
        title={`外观：${current.label}（点击切换）`}
        aria-label={`外观：${current.label}，点击切换`}
        className={cn(
          "text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-ring inline-grid size-9 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
      >
        <Icon className="size-4" />
      </button>

      {hint ? (
        <span
          role="status"
          className="surface text-foreground pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 rounded-lg px-2.5 py-1 text-[12px] whitespace-nowrap"
        >
          {hint}
        </span>
      ) : null}
    </span>
  );
}
