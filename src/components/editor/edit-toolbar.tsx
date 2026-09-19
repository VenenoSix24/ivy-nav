"use client";

import Link from "next/link";
import { Check, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditToolbarProps {
  onAddItem: () => void;
  onExit: () => void;
  /** 搜索时拖动会写回残缺的顺序，用提示把这件事说清楚 */
  searchActive: boolean;
}

export function EditToolbar({ onAddItem, onExit, searchActive }: EditToolbarProps) {
  return (
    <div className="sticky top-[4.25rem] z-30 flex justify-center">
      <div className="surface flex flex-wrap items-center justify-center gap-1.5 rounded-2xl px-2 py-1.5 sm:rounded-full">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 px-2 text-[12px] font-medium">
          <Pencil className="size-3.5" />
          编辑模式
        </span>

        <Button onClick={onAddItem} className="h-8 rounded-full px-3 text-[12px]">
          <Plus className="size-3.5" />
          新建项目
        </Button>

        <Link
          href="/settings"
          className="text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-ring inline-flex h-8 items-center rounded-full px-3 text-[12px] transition-colors focus-visible:outline-2"
        >
          分类设置
        </Link>

        {searchActive ? (
          <span className="text-muted-foreground px-2 text-[12px]">搜索中不可拖动排序</span>
        ) : null}

        <Button variant="ghost" onClick={onExit} className="h-8 rounded-full px-3 text-[12px]">
          <Check className="size-3.5" />
          完成
        </Button>
      </div>
    </div>
  );
}
