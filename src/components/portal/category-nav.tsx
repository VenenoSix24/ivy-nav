"use client";

import { cn } from "cn";
import { ALL_CATEGORIES, type CategoryFilter, type PortalCategory } from "@/lib/portal/types";

interface CategoryNavProps {
  categories: PortalCategory[];
  active: CategoryFilter;
  onSelect: (filter: CategoryFilter) => void;
  counts: Map<number, number>;
  totalCount: number;
  className?: string;
}

/** 顶栏里的分类导航：横向滚动，移动端不撑破布局（设计文档 §32）。 */
export function CategoryNav({
  categories,
  active,
  onSelect,
  counts,
  totalCount,
  className,
}: CategoryNavProps) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="分类筛选" className={cn("no-scrollbar min-w-0 overflow-x-auto", className)}>
      <ul className="flex w-max items-center gap-0.5 sm:gap-1">
        <NavItem
          label="All"
          count={totalCount}
          active={active === ALL_CATEGORIES}
          onSelect={() => onSelect(ALL_CATEGORIES)}
        />
        {categories.map((category) => (
          <NavItem
            key={category.id}
            label={category.name}
            count={counts.get(category.id) ?? 0}
            active={active === category.id}
            onSelect={() => onSelect(category.id)}
          />
        ))}
      </ul>
    </nav>
  );
}

function NavItem({
  label,
  count,
  active,
  onSelect,
}: {
  label: string;
  count: number;
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
          "focus-visible:outline-ring flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-3",
          active
            ? "bg-secondary text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        {/* 手机上不给计数留位置，避免把分类名挤到看不见 */}
        <span
          className={cn(
            "hidden text-[11px] tabular-nums sm:inline",
            active ? "text-muted-foreground" : "opacity-60",
          )}
        >
          {count}
        </span>
      </button>
    </li>
  );
}
