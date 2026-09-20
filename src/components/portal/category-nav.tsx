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
 * 分类导航：搜索栏下方的一排胶囊，不吸顶、不加底衬 —— 跟着内容走，
 * 需要筛选时它就在搜索栏下面。分类多了整排横向滚动。
 *
 * 右缘渐隐加在外层的 nav 上而不是滚动条本身：分类装得下时整排是居中的，
 * 渐隐区就落在容器右侧的空白里，不会误伤最后一枚胶囊。内容宽度恰好卡在距右缘
 * 28px 以内的那一小段视口宽度里，末枚胶囊的右边缘会被压掉一点（实测那一档只有
 * 7px 落在渐变区内），为了这点差别去用 JS 量溢出并不划算。
 */
export function CategoryNav({ categories, active, onSelect, className }: CategoryNavProps) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="分类筛选" className={cn("fade-right flex justify-center", className)}>
      <ul className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto">
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
