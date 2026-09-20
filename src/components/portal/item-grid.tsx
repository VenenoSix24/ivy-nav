import { cn } from "cn";
import { GRID_CLASS, type LayoutId } from "@/lib/settings/homepage";

interface ItemGridProps {
  layout: LayoutId;
  className?: string;
  children: React.ReactNode;
}

/** 条目网格。公开视图与编辑视图都走这里，网格参数只有 GRID_CLASS 一处。 */
export function ItemGrid({ layout, className, children }: ItemGridProps) {
  return <div className={cn(GRID_CLASS[layout], className)}>{children}</div>;
}
