"use client";

import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ItemCard } from "@/components/portal/item-card";
import { ItemMenu } from "@/components/editor/item-menu";
import type { PortalCategory, PortalItem } from "@/lib/portal/types";

interface SortableItemProps {
  item: PortalItem;
  categories: PortalCategory[];
  onEdit: () => void;
  onDuplicate: () => void;
  onMove: (categoryId: number | null) => void;
  onToggleVisibility: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}

export function SortableItem({
  item,
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
        className="text-muted-foreground/70 hover:text-foreground focus-visible:outline-ring absolute top-3.5 left-2 z-10 cursor-grab touch-none rounded-md p-1.5 transition-colors focus-visible:outline-2 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <ItemCard
        item={item}
        interactive={false}
        showState
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
