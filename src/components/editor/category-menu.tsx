"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpToLine,
  Check,
  Eye,
  EyeOff,
  Grid3x3,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PortalCategory } from "@/lib/portal/types";
import { DEFAULT_LAYOUT, LAYOUTS, type LayoutId } from "@/lib/settings/homepage";

const LAYOUT_ICONS: Record<LayoutId, typeof List> = {
  card: LayoutGrid,
  list: List,
  compact: Grid3x3,
};

interface CategoryMenuProps {
  category: PortalCategory;
  /** 在首页的分区里排第几个、一共几个 */
  position: { index: number; total: number };
  onEdit: () => void;
  onLayout: (layout: LayoutId) => void;
  onShift: (direction: -1 | 1) => void;
  onPin: () => void;
  onToggleHomepage: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

/** 分区标题右边的「⋯」菜单：分类的名字、描述、布局、顺序与可见性 */
export function CategoryMenu({
  category,
  position,
  onEdit,
  onLayout,
  onShift,
  onPin,
  onToggleHomepage,
  onToggleVisibility,
  onDelete,
}: CategoryMenuProps) {
  const layout = category.layout ?? DEFAULT_LAYOUT;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`「${category.name}」分类的操作`}
        className="text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-ring inline-grid size-7 place-items-center rounded-full transition-colors focus-visible:outline-2"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          名称与描述
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <LayoutGrid />
            布局
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            {LAYOUTS.map((entry) => {
              const Icon = LAYOUT_ICONS[entry.id];
              return (
                <DropdownMenuItem key={entry.id} onClick={() => onLayout(entry.id)}>
                  <Icon />
                  <span className="flex-1">{entry.label}</span>
                  {layout === entry.id ? <Check className="size-3.5" /> : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled={position.index === 0} onClick={() => onShift(-1)}>
          <ArrowUp />
          上移
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={position.index === position.total - 1}
          onClick={() => onShift(1)}
        >
          <ArrowDown />
          下移
        </DropdownMenuItem>
        <DropdownMenuItem disabled={position.index === 0} onClick={onPin}>
          <ArrowUpToLine />
          移到最前
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onToggleHomepage}>
          {category.visibleOnHomepage ? <EyeOff /> : <Eye />}
          {category.visibleOnHomepage ? "从首页隐藏" : "放回首页"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleVisibility}>
          {category.visibility === "private" ? <Eye /> : <EyeOff />}
          {category.visibility === "private" ? "整类公开" : "整类隐藏"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          删除分类
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
