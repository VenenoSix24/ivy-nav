"use client";

import { cn } from "cn";
import { ALL_CATEGORIES, type CategoryFilter, type PortalCategory } from "@/lib/portal/types";

interface CategoryNavProps {
  categories: PortalCategory[];
  active: CategoryFilter;
  onSelect: (filter: CategoryFilter) => void;
  className?: string;
}

/**
 * 分类导航：一条吸顶的条带，居中放分段控件。
 * 条带自带背衬与模糊，滚动时不会有卡片从控件两侧透出来；
 * 分类多了就在控件内部横向滚动。
 */
export function CategoryNav({ categories, active, onSelect, className }: CategoryNavProps) {
  if (categories.length === 0) return null;

  return (
    <nav
      aria-label="分类筛选"
      className={cn(
        "border-border/50 bg-background/80 sticky top-14 z-30 border-b backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto flex max-w-[1080px] justify-center px-4 py-2 sm:px-6">
        <div className="bg-secondary/70 inline-flex max-w-full rounded-full p-1">
          <ul className="no-scrollbar flex items-center gap-0.5 overflow-x-auto">
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
        </div>
      </div>
    </nav>
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
        aria-current={active ? "true" : undefined}
        className={cn(
          "focus-visible:outline-ring block rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2",
          active
            ? "bg-popover text-foreground font-medium shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
      </button>
    </li>
  );
}
