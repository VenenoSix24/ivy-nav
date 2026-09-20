"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "cn";
import { planTagRows } from "@/lib/portal/tags";

/** 胶囊高度 = 11px 字号 + 上下各 3px 内边距；行间距 gap-y-1.5、行内间距 gap-x-1.5 */
const CHIP_HEIGHT = 17;
const CHIP_GAP = 6;
const ITEM_GAP = 6;

const PILL =
  "bg-accent text-accent-foreground shrink-0 rounded-full px-2 py-[3px] text-[11px] leading-none";
const PILL_MUTED =
  "bg-secondary text-muted-foreground shrink-0 rounded-full px-2 py-[3px] text-[11px] leading-none tabular-nums";

/** 首屏只能把标签全渲染出来，改就得在同一帧内改完：用 layout effect，
 *  算好的分行在绘制前就位，看不到中间态。 */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface TagListProps {
  tags: string[];
  /** 最多占几行；放不下的从尾部收成行末一个「+N」，绝不溢出到这个行数之外 */
  lines: number;
  className?: string;
}

/**
 * 标签铺满至多 `lines` 行，行与行尽量平均（宁可 3 + 2 也不要 4 + 1），放不下的收成行末「+N」。
 * 显示几个不能按固定个数切：先在一层不可见的量尺里量出每个胶囊的真实宽度（量尺里永远是全部
 * 标签），再交给 `planTagRows` 算分行，没有「渲染 → 收敛 → 再渲染」的来回。
 */
export function TagList({ tags, lines, className }: TagListProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const widthRef = useRef(0);
  const tagsKey = tags.join("\u0000");
  // 首屏（含服务端渲染）先全渲染，量完再收敛：两边 HTML 一致，不会水合不匹配
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

    // 宽度变了就重算（窗口缩放、卡片换列数）。只认宽度：收起标签会让容器变矮，
    // 盯着高度等于自己触发自己
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

  // 还没量出结果时当成一行：交给浏览器自己换行，超出部分由容器高度裁掉，不会先长高再收回来
  const settled = plan?.key === tagsKey ? plan : null;
  const rows = settled ? settled.rows : [tags.length];
  const hidden = settled ? settled.hidden : 0;

  // 先把每行的标签切出来，再渲染：在 map 回调里累加位置，规则上属于「渲染后再改值」
  const rowTags: string[][] = [];
  let cursor = 0;
  for (const count of rows) {
    rowTags.push(tags.slice(cursor, cursor + count));
    cursor += count;
  }

  return (
    // w-full：宽度必须来自槽位，不能由内容撑出来 —— 一旦由内容决定，收起标签会让容器变窄、
    // 变窄又让分行算得更少，自己追着自己收缩。量尺与显示层都在这个宽度里排。
    <span ref={containerRef} className={cn("relative block w-full min-w-0", className)}>
      {/* 量尺层：绝对定位、不可见，里面永远是全部标签加一个最宽的「+N」，
          量到的宽度因此不受「当前显示几个」影响 */}
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
