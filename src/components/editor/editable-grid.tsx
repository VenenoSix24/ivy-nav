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
      // 显式给 id：不给的话 dnd-kit 用递增计数器生成 `DndDescribedBy-N`，而 StrictMode
      // 在开发模式下把渲染跑两遍 —— 服务端 1、2、3，客户端成了 2、4、6，拖动把手的
      // aria-describedby 因此每次都在控制台报水合不一致
      id={`section-${items[0]?.categoryId ?? "inbox"}`}
      // 传感器数组的长度必须恒定：dnd-kit 内部拿它当 deps 用，搜索时换成空数组会让
      // React 报「useEffect 的依赖数组长度在两次渲染之间变了」。不可拖动改用
      // useSortable 的 disabled，见 SortableItem
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        // 一列排开的列表要按纵向而非矩形算落点，否则跨行判定会偏
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
