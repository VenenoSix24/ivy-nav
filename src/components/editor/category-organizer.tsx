"use client";

import { useState } from "react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeOff, GripVertical, Lock, Pencil, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { PortalCategory } from "@/lib/portal/types";
import { moveEntry } from "@/lib/utils/sort";

interface CategoryOrganizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PortalCategory[];
  /** 每个分类有几个条目 */
  counts: Map<number, number>;
  onReorder: (orderedIds: number[]) => void;
  onCreate: (name: string) => Promise<boolean>;
  onEdit: (category: PortalCategory) => void;
}

/** 整理分类：两列的紧凑网格，拖动排序 */
export function CategoryOrganizer({
  open,
  onOpenChange,
  categories,
  counts,
  onReorder,
  onCreate,
  onEdit,
}: CategoryOrganizerProps) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = categories.findIndex((category) => category.id === active.id);
    const to = categories.findIndex((category) => category.id === over.id);
    if (from < 0 || to < 0) return;

    onReorder(moveEntry(categories, from, to).map((category) => category.id));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>整理分类</DialogTitle>
          <DialogDescription>
            拖动每一行安排顺序 —— 顺序决定首页分区的先后，也决定顶部分类的顺序。
            被隐藏的分类也在里面，方便随时放回来。
          </DialogDescription>
        </DialogHeader>

        <DndContext
          // id 必须显式给：生成式 id 在 StrictMode 下服务端与客户端不一致，会报水合失败
          id="category-organizer"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={categories.map((category) => category.id)}
            strategy={rectSortingStrategy}
          >
            <ul className="grid max-h-[52vh] grid-cols-1 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2">
              {categories.map((category, index) => (
                <OrganizerRow
                  key={category.id}
                  category={category}
                  index={index}
                  count={counts.get(category.id) ?? 0}
                  onEdit={() => onEdit(category)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <form
          className="border-border flex gap-2 border-t pt-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const name = draft.trim();
            if (!name) return;
            setBusy(true);
            const ok = await onCreate(name);
            setBusy(false);
            if (ok) setDraft("");
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="新分类名"
            maxLength={40}
            className="h-9 rounded-xl text-[13px]"
          />
          <Button
            type="submit"
            disabled={busy || !draft.trim()}
            className="h-9 shrink-0 rounded-xl px-4 text-[13px]"
          >
            <Plus className="size-3.5" />
            新建
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface OrganizerRowProps {
  category: PortalCategory;
  index: number;
  count: number;
  onEdit: () => void;
}

function OrganizerRow({ category, index, count, onEdit }: OrganizerRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "surface flex items-center gap-2 rounded-xl px-2.5 py-2",
        isDragging && "z-10 shadow-lg",
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="text-muted-foreground size-4 shrink-0 cursor-grab active:cursor-grabbing" />

      <span className="text-muted-foreground w-5 shrink-0 text-[11px] tabular-nums">
        {index + 1}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium" title={category.name}>
          {category.name}
        </span>
        <span className="text-muted-foreground flex items-center gap-2 text-[11px]">
          <span className="tabular-nums">{count} 个</span>
          {category.visibleOnHomepage ? null : (
            <span className="inline-flex items-center gap-0.5">
              <EyeOff className="size-3" />
              不在首页
            </span>
          )}
          {category.visibility === "private" ? (
            <span className="inline-flex items-center gap-0.5">
              <Lock className="size-3" />
              整类隐藏
            </span>
          ) : null}
        </span>
      </span>

      <button
        type="button"
        aria-label={`编辑「${category.name}」的名称与描述`}
        onClick={onEdit}
        className="text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-ring inline-grid size-7 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-2"
      >
        <Pencil className="size-3.5" />
      </button>
    </li>
  );
}
