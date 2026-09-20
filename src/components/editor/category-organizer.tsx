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
  /** 每个分类有几个条目，摆在名字下面当参考 */
  counts: Map<number, number>;
  onReorder: (orderedIds: number[]) => void;
  onCreate: (name: string) => Promise<boolean>;
  onEdit: (category: PortalCategory) => void;
}

/**
 * 整理分类：**排序不再是一条竖着拖的长名单**。
 *
 * 分类一多，竖排里要挪一个到底部就得一路拖过整屏；这里改成两列的紧凑网格，
 * 一屏能摊下二十来个，拖到哪儿都只是一小段距离，顺带也看得见谁被隐藏了。
 * 改名字与描述还是走同一个对话框（点每行右边的铅笔）。
 */
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
          // 显式给 id：不给的话 dnd-kit 用递增计数器生成，而 StrictMode 在开发模式下
          // 渲染两遍，服务端与客户端算出来的不一样，控制台会报水合不一致
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
