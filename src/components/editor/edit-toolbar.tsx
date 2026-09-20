"use client";

import { Check, ListOrdered, Pencil, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

interface EditToolbarProps {
  onAddItem: () => void;
  /** 打开「整理分类」：改名字、描述、布局、顺序、隐藏都在首页做，不必回设置页 */
  onOrganize: () => void;
  onExit: () => void;
  /** 搜索时拖动会写回残缺的顺序，用提示把这件事说清楚 */
  searchActive: boolean;
  className?: string;
}

/**
 * 悬浮工具条：跟着页面走，与顶栏留出 20px 的距离（顶栏高 56px，所以停在 76px）。
 *
 * 它必须是 main 的直接子元素。sticky 的行程被限制在**父元素的高度**里：
 * 之前它裹在一层只包住自己的 `<div className="mt-4">` 里（实测那层只有 46px 高），
 * 于是可粘住的行程是 0，看起来就是跟着内容一起滚走了。
 */
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
