"use client";

import { Check, ListOrdered, Pencil, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

interface EditToolbarProps {
  onAddItem: () => void;
  /** 打开「整理分类」 */
  onOrganize: () => void;
  onExit: () => void;
  /** 是否正在搜索 */
  searchActive: boolean;
  className?: string;
}

/** 悬浮工具条：必须是 main 的直接子元素，sticky 行程受父元素高度限制 */
export function EditToolbar({
  onAddItem,
  onOrganize,
  onExit,
  searchActive,
  className,
}: EditToolbarProps) {
  return (
    <div className={cn("sticky top-[4.75rem] z-30 flex justify-center", className)}>
      <div className="surface flex flex-wrap items-center justify-center gap-1.5 rounded-2xl px-2 py-1.5 sm:rounded-full">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 px-2 text-[12px] font-medium">
          <Pencil className="size-3.5" />
          编辑模式
        </span>

        <Button
          variant="glass"
          onClick={onAddItem}
          className="text-primary h-8 rounded-full px-3 text-[12px]"
        >
          <Plus className="size-3.5" />
          新建项目
        </Button>

        <Button
          variant="ghost"
          onClick={onOrganize}
          className="text-muted-foreground h-8 rounded-full px-3 text-[12px]"
        >
          <ListOrdered className="size-3.5" />
          整理分类
        </Button>

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
