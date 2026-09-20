"use client";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/editor/sortable-item";
import { ItemGrid } from "@/components/portal/item-grid";
import { moveEntry } from "@/lib/utils/sort";
import type { PortalCategory, PortalItem } from "@/lib/portal/types";
import type { LayoutId } from "@/lib/settings/homepage";

interface EditableGridProps {
  items: PortalItem[];
  layout: LayoutId;
  categories: PortalCategory[];
  /** 搜索中禁止拖动 */
  sortable: boolean;
  onReorder: (orderedIds: number[]) => void;
  onEdit: (item: PortalItem) => void;
  onDuplicate: (item: PortalItem) => void;
  onMove: (item: PortalItem, categoryId: number | null) => void;
  onToggleVisibility: (item: PortalItem) => void;
  onToggleFeatured: (item: PortalItem) => void;
  onDelete: (item: PortalItem) => void;
}

export function EditableGrid({
  items,
  layout,
  categories,
  sortable,
  onReorder,
  onEdit,
  onDuplicate,
  onMove,
  onToggleVisibility,
  onToggleFeatured,
  onDelete,
}: EditableGridProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;

    onReorder(moveEntry(items, from, to).map((item) => item.id));
  }

  return (
    <DndContext
      // id 必须显式给：生成式 id 在 StrictMode 下服务端与客户端不一致，会报水合失败
      id={`section-${items[0]?.categoryId ?? "inbox"}`}
      // sensors 数组长度必须恒定：dnd-kit 拿它当 deps，长度一变 React 就报错。
      // 不可拖动改用 useSortable 的 disabled，见 SortableItem
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={layout === "list" ? verticalListSortingStrategy : rectSortingStrategy}
      >
        <ItemGrid layout={layout}>
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              layout={layout}
              sortable={sortable}
              categories={categories}
              onEdit={() => onEdit(item)}
              onDuplicate={() => onDuplicate(item)}
              onMove={(categoryId) => onMove(item, categoryId)}
              onToggleVisibility={() => onToggleVisibility(item)}
              onToggleFeatured={() => onToggleFeatured(item)}
              onDelete={() => onDelete(item)}
            />
          ))}
        </ItemGrid>
      </SortableContext>
    </DndContext>
  );
}
