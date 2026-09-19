"use client";

import { cn } from "cn";
import { ALL_CATEGORIES, type CategoryFilter, type PortalCategory } from "@/lib/portal/types";

interface CategoryTabsProps {
  categories: PortalCategory[];
  active: CategoryFilter;
  onChange: (filter: CategoryFilter) => void;
  counts: Map<number, number>;
  totalCount: number;
}

export function CategoryTabs({
  categories,
  active,
  onChange,
  counts,
  totalCount,
}: CategoryTabsProps) {
  if (categories.length <= 1) return null;

  return (
    <nav aria-label="分类筛选" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <ul className="flex w-max items-center gap-1 sm:w-auto sm:flex-wrap">
        <Tab
          label="All"
          count={totalCount}
          active={active === ALL_CATEGORIES}
          onClick={() => onChange(ALL_CATEGORIES)}
        />
        {categories.map((category) => (
          <Tab
            key={category.id}
            label={category.name}
            count={counts.get(category.id) ?? 0}
            active={active === category.id}
            onClick={() => onChange(category.id)}
          />
        ))}
      </ul>
    </nav>
  );
}

function Tab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "true" : undefined}
        className={cn(
          "focus-visible:outline-ring flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          active
            ? "bg-secondary text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <span
          className={cn(
            "text-[11px] tabular-nums",
            active ? "text-muted-foreground" : "opacity-60",
          )}
        >
          {count}
        </span>
      </button>
    </li>
  );
}
