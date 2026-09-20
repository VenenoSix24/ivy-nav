"use client";

import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ItemMenu } from "@/components/editor/item-menu";
import { ItemView } from "@/components/portal/item-view";
import { cn } from "cn";
import type { PortalCategory, PortalItem } from "@/lib/portal/types";
import type { LayoutId } from "@/lib/settings/homepage";

interface SortableItemProps {
  item: PortalItem;
  layout: LayoutId;
  categories: PortalCategory[];
  onEdit: () => void;
  onDuplicate: () => void;
  onMove: (categoryId: number | null) => void;
  onToggleVisibility: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}

/** 把手的位置随形状变：一行与一块方块都很矮，左边距得自己去贴。 */
const HANDLE_POSITION: Record<LayoutId, string> = {
  card: "top-3.5 left-2",
  list: "top-1/2 left-1 -translate-y-1/2",
  compact: "top-0.5 left-0.5",
};

export function SortableItem({
  item,
  layout,
  categories,
  onEdit,
  onDuplicate,
  onMove,
  onToggleVisibility,
  onToggleFeatured,
  onDelete,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-20 opacity-70" : "relative"}
    >
      {/*
        把手是唯一的拖拽入口：手势与卡片里的链接、菜单不抢事件，
        attributes 与 listeners 都放在这里，键盘也能拖（设计文档 §30）。
      */}
      <button
        type="button"
        aria-label={`拖动调整「${item.title}」的顺序`}
        className={cn(
          "text-muted-foreground/70 hover:text-foreground focus-visible:outline-ring absolute z-10 cursor-grab touch-none rounded-md p-1.5 transition-colors focus-visible:outline-2 active:cursor-grabbing",
          HANDLE_POSITION[layout],
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <ItemView
        item={item}
        layout={layout}
        interactive={false}
        showState
        draggable
        onEdit={onEdit}
        cornerAction={
          <ItemMenu
            item={item}
            categories={categories}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onMove={onMove}
            onToggleVisibility={onToggleVisibility}
            onToggleFeatured={onToggleFeatured}
            onDelete={onDelete}
          />
        }
      />
    </div>
  );
}
