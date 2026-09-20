"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "cn";
import { planTagRows } from "@/lib/portal/tags";

/** 胶囊高度（11px 字号 + 上下各 3px 内边距） */
const CHIP_HEIGHT = 17;
const CHIP_GAP = 6;
const ITEM_GAP = 6;

const PILL =
  "bg-accent text-accent-foreground shrink-0 rounded-full px-2 py-[3px] text-[11px] leading-none";
const PILL_MUTED =
  "bg-secondary text-muted-foreground shrink-0 rounded-full px-2 py-[3px] text-[11px] leading-none tabular-nums";

/** 需要在同一帧内改完的 layout effect */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface TagListProps {
  tags: string[];
  /** 最多占几行，放不下的从尾部收成行末「+N」 */
  lines: number;
  className?: string;
}

/** 标签铺满至多 lines 行，放不下的收成行末「+N」 */
export function TagList({ tags, lines, className }: TagListProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const widthRef = useRef(0);
  const tagsKey = tags.join("\u0000");
  const [plan, setPlan] = useState<{ key: string; rows: number[]; hidden: number } | null>(null);

  useIsomorphicLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const measure = () => {
      const ruler = node.querySelector<HTMLElement>("[data-ruler]");
      if (!ruler) return;
      const pills = [...ruler.querySelectorAll<HTMLElement>('[data-tag="tag"]')];
      if (pills.length === 0) return;

      const chip = ruler.querySelector<HTMLElement>('[data-tag="chip"]');
      const widths = pills.map((pill) => pill.offsetWidth);
      const chipWidth = chip ? chip.offsetWidth : 0;
      const containerWidth = node.clientWidth;
      if (containerWidth <= 0) return;

      const next = planTagRows(widths, chipWidth, containerWidth, ITEM_GAP, lines);
      setPlan((current) =>
        current &&
        current.key === tagsKey &&
        current.hidden === next.hidden &&
        current.rows.join() === next.rows.join()
          ? current
          : { key: tagsKey, rows: next.rows, hidden: next.hidden },
      );
    };

    measure();

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(width - widthRef.current) < 1) return;
      widthRef.current = width;
      measure();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [tagsKey, lines, plan]);

  if (tags.length === 0) return null;

  const settled = plan?.key === tagsKey ? plan : null;
  const rows = settled ? settled.rows : [tags.length];
  const hidden = settled ? settled.hidden : 0;

  const rowTags: string[][] = [];
  let cursor = 0;
  for (const count of rows) {
    rowTags.push(tags.slice(cursor, cursor + count));
    cursor += count;
  }

  return (
    <span ref={containerRef} className={cn("relative block w-full min-w-0", className)}>
      <span
        aria-hidden
        data-ruler
        className="pointer-events-none invisible absolute inset-x-0 top-0 flex flex-wrap items-center gap-x-1.5 gap-y-1.5"
      >
        {tags.map((tag) => (
          <span key={tag} data-tag="tag" className={PILL}>
            {tag}
          </span>
        ))}
        <span data-tag="chip" className={PILL_MUTED}>
          +{tags.length}
        </span>
      </span>

      <span
        className={cn("flex flex-col gap-y-1.5", settled ? undefined : "overflow-hidden")}
        style={
          settled
            ? undefined
            : { maxHeight: `calc(${lines} * ${CHIP_HEIGHT}px + ${lines - 1} * ${CHIP_GAP}px)` }
        }
      >
        {rowTags.map((row, index) => (
          <span key={index} className="flex flex-wrap items-center gap-x-1.5">
            {row.map((tag) => (
              <span key={tag} className={PILL}>
                {tag}
              </span>
            ))}
            {index === rowTags.length - 1 && hidden > 0 ? (
              <span className={PILL_MUTED}>+{hidden}</span>
            ) : null}
          </span>
        ))}
      </span>
    </span>
  );
}
