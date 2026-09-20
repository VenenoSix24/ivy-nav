import { cn } from "cn";
import { GRID_CLASS, type LayoutId } from "@/lib/settings/homepage";

interface ItemGridProps {
  layout: LayoutId;
  className?: string;
  children: React.ReactNode;
}

export function ItemGrid({ layout, className, children }: ItemGridProps) {
  return <div className={cn(GRID_CLASS[layout], className)}>{children}</div>;
}
