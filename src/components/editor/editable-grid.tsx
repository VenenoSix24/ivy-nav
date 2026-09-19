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
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/editor/sortable-item";
import { moveEntry } from "@/lib/utils/sort";
import type { PortalCategory, PortalItem } from "@/lib/portal/types";

interface EditableGridProps {
  items: PortalItem[];
  categories: PortalCategory[];
  /** 搜索状态下顺序只是一部分结果，禁止拖动，避免写回残缺的排序 */
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
      sensors={sortable ? sensors : []}
      collisionDetection={closestCenter}
      modifiers={[restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-3">
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              categories={categories}
              onEdit={() => onEdit(item)}
              onDuplicate={() => onDuplicate(item)}
              onMove={(categoryId) => onMove(item, categoryId)}
              onToggleVisibility={() => onToggleVisibility(item)}
              onToggleFeatured={() => onToggleFeatured(item)}
              onDelete={() => onDelete(item)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
