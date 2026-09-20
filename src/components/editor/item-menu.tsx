"use client";

import {
  Copy,
  Eye,
  EyeOff,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PortalCategory, PortalItem } from "@/lib/portal/types";

interface ItemMenuProps {
  item: PortalItem;
  categories: PortalCategory[];
  onEdit: () => void;
  onDuplicate: () => void;
  onMove: (categoryId: number | null) => void;
  onToggleVisibility: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}

export function ItemMenu({
  item,
  categories,
  onEdit,
  onDuplicate,
  onMove,
  onToggleVisibility,
  onToggleFeatured,
  onDelete,
}: ItemMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${item.title} 的操作`}
        onPointerDown={(event) => event.stopPropagation()}
        className="text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-ring inline-grid size-7 place-items-center rounded-full transition-colors focus-visible:outline-2"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          编辑
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy />
          复制
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleVisibility}>
          {item.visibility === "public" ? <EyeOff /> : <Eye />}
          {item.visibility === "public" ? "设为 Private" : "设为 Public"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleFeatured}>
          {item.featured ? <StarOff /> : <Star />}
          {item.featured ? "取消置顶" : "置顶"}
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderInput />
            移动分类
          </DropdownMenuSubTrigger>
          {/* Label 属于分组的一部分：直接放在菜单里会抛 Base UI error #31 并把整页打崩 */}
          {/* 上限给足一屏的六成：分类不多时根本不出现滚动条；真长了也照样能滚，
              滚动条本身藏起来，免得在一列菜单里特别扎眼 */}
          <DropdownMenuSubContent className="no-scrollbar max-h-[60vh] w-44 overflow-y-auto">
            <DropdownMenuGroup>
              <DropdownMenuLabel>移动到</DropdownMenuLabel>
              <DropdownMenuItem disabled={item.categoryId === null} onClick={() => onMove(null)}>
                未分类（Inbox）
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  disabled={item.categoryId === category.id}
                  onClick={() => onMove(category.id)}
                >
                  {category.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
