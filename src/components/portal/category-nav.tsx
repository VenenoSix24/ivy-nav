"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ALL_CATEGORIES, type CategoryFilter, type PortalCategory } from "@/lib/portal/types";

/** 平铺几个分类，其余进「更多」。窄屏只留一个，免得和右侧按钮挤在一起。 */
const MAX_INLINE = 3;

interface CategoryNavProps {
  categories: PortalCategory[];
  active: CategoryFilter;
  onSelect: (filter: CategoryFilter) => void;
  className?: string;
}

/**
 * 顶栏分类导航：平铺前几个，其余进「更多」下拉。
 * 当前选中的分类一定出现在平铺区，否则用户看不见自己在筛什么；
 * 容器保持可裁剪可滚动，任何宽度下都不会盖到右侧的外观与设置按钮。
 */
export function CategoryNav({ categories, active, onSelect, className }: CategoryNavProps) {
  if (categories.length === 0) return null;

  const inline = categories.slice(0, MAX_INLINE);
  const overflow = categories.slice(MAX_INLINE);
  const activeCategory = categories.find((category) => category.id === active);
  const activeOutsideInline = activeCategory !== undefined && !inline.includes(activeCategory);

  return (
    <nav
      aria-label="分类筛选"
      className={cn("no-scrollbar fade-right -mr-1 overflow-x-auto pr-1", className)}
    >
      <ul className="flex w-max items-center gap-1">
        <NavItem
          label="全部"
          active={active === ALL_CATEGORIES}
          onSelect={() => onSelect(ALL_CATEGORIES)}
        />

        {inline.map((category, index) => (
          <NavItem
            key={category.id}
            // 手机上只平铺第一个，其余交给「更多」，避免把顶栏挤满
            className={index === 0 ? undefined : "hidden sm:block"}
            label={category.name}
            active={active === category.id}
            onSelect={() => onSelect(category.id)}
          />
        ))}

        {activeOutsideInline && activeCategory ? (
          <NavItem
            label={activeCategory.name}
            active
            onSelect={() => onSelect(activeCategory.id)}
          />
        ) : null}

        {overflow.length > 0 ? (
          <li>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="更多分类"
                className="text-muted-foreground hover:bg-secondary/60 hover:text-foreground focus-visible:outline-ring flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                更多
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuRadioGroup
                  value={String(active)}
                  onValueChange={(value) =>
                    onSelect(value === ALL_CATEGORIES ? ALL_CATEGORIES : Number(value))
                  }
                >
                  <DropdownMenuRadioItem value={ALL_CATEGORIES}>全部</DropdownMenuRadioItem>
                  {overflow.map((category) => (
                    <DropdownMenuRadioItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}

function NavItem({
  label,
  active,
  onSelect,
  className,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <li className={className}>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "focus-visible:outline-ring rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          active
            ? "bg-secondary text-foreground font-medium"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        )}
      >
        {label}
      </button>
    </li>
  );
}
