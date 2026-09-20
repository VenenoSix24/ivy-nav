"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ALL_CATEGORIES, type CategoryFilter, type PortalCategory } from "@/lib/portal/types";

/** 箭头一次挪多远：大约三枚胶囊 */
const SCROLL_STEP = 240;
/** 拖过这么多像素才算拖动，否则当成一次点击 */
const DRAG_THRESHOLD = 4;

interface CategoryNavProps {
  categories: PortalCategory[];
  active: CategoryFilter;
  onSelect: (filter: CategoryFilter) => void;
  className?: string;
}

/**
 * 分类导航：搜索栏下方的一排胶囊，不吸顶、不加底衬 —— 跟着内容走，
 * 需要筛选时它就在搜索栏下面。分类多了整排横向滚动。
 *
 * 桌面端没有触摸滑动，只靠 `overflow-x-auto` 会让人以为到头了：所以除了滚轮，
 * 还给了**鼠标按住拖**与**两端的箭头**。箭头只在鼠标扫到这一排时浮出来，
 * 并且只在那个方向真的还有内容被挡住时才有 —— 平时不占视线。
 */
export function CategoryNav({ categories, active, onSelect, className }: CategoryNavProps) {
  const scroller = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [hovering, setHovering] = useState(false);
  const drag = useRef({ active: false, from: 0, left: 0, moved: false });

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;

    const update = () => {
      const left = node.scrollLeft > 1;
      const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
      // 值没变就返回原对象，免得每次滚动都重渲染一遍
      setEdges((current) =>
        current.left === left && current.right === right ? current : { left, right },
      );
    };

    // ResizeObserver 挂上时自己会回调一次，初值不用在 effect 里同步再设一遍
    const observer = new ResizeObserver(update);
    observer.observe(node);
    node.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", update);
    };
  }, [categories.length]);

  const scrollable = edges.left || edges.right;

  function nudge(direction: -1 | 1) {
    scroller.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });
  }

  function onPointerDown(event: React.PointerEvent<HTMLUListElement>) {
    // 触屏交给浏览器自己的滑动手势，别去抢
    if (event.pointerType === "touch" || !scrollable) return;

    const node = scroller.current;
    if (!node) return;
    drag.current = {
      active: true,
      from: event.clientX,
      left: node.scrollLeft,
      moved: false,
    };
    node.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLUListElement>) {
    const node = scroller.current;
    if (!drag.current.active || !node) return;

    const delta = event.clientX - drag.current.from;
    if (Math.abs(delta) > DRAG_THRESHOLD) drag.current.moved = true;
    node.scrollLeft = drag.current.left - delta;
  }

  function onPointerUp(event: React.PointerEvent<HTMLUListElement>) {
    const node = scroller.current;
    if (node?.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
    drag.current.active = false;
  }

  if (categories.length === 0) return null;

  return (
    <div
      className={cn("relative", className)}
      // 箭头平时不占视线：鼠标扫到这一排才浮出来
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <nav
        aria-label="分类筛选"
        className={cn(
          "flex justify-center",
          edges.left && edges.right ? "fade-both" : edges.right && "fade-right",
        )}
      >
        <ul
          ref={scroller}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          // 拖完那一下不算点击，否则松手时会顺手切了分类
          onClickCapture={(event) => {
            if (!drag.current.moved) return;
            event.preventDefault();
            event.stopPropagation();
            drag.current.moved = false;
          }}
          className={cn(
            "no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto select-none",
            scrollable && "cursor-grab active:cursor-grabbing",
          )}
        >
          <Segment
            label="全部"
            active={active === ALL_CATEGORIES}
            onSelect={() => onSelect(ALL_CATEGORIES)}
          />
          {categories.map((category) => (
            <Segment
              key={category.id}
              label={category.name}
              active={active === category.id}
              onSelect={() => onSelect(category.id)}
            />
          ))}
        </ul>
      </nav>

      {hovering && edges.left ? <Arrow direction="left" onClick={() => nudge(-1)} /> : null}
      {hovering && edges.right ? <Arrow direction="right" onClick={() => nudge(1)} /> : null}
    </div>
  );
}

function Arrow({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <Button
      variant="glass"
      size="icon-sm"
      aria-label={direction === "left" ? "向左看更多分类" : "向右看更多分类"}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 hidden -translate-y-1/2 rounded-full sm:inline-grid",
        direction === "left" ? "left-0" : "right-0",
      )}
    >
      <Icon className="size-4" />
    </Button>
  );
}

function Segment({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          "focus-visible:outline-ring block rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          active
            ? "bg-secondary text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
        )}
      >
        {label}
      </button>
    </li>
  );
}
