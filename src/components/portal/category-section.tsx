import { cn } from "cn";
import { ItemCard } from "@/components/portal/item-card";
import type { PortalItem } from "@/lib/portal/types";

interface CategorySectionProps {
  id: string;
  title: string;
  description?: string | null;
  items: PortalItem[];
  action?: React.ReactNode;
  gridClassName?: string;
  children?: React.ReactNode;
}

export function CategorySection({
  id,
  title,
  description,
  items,
  action,
  gridClassName,
  children,
}: CategorySectionProps) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-4 flex items-center justify-between gap-4 px-0.5">
        <div className="flex items-baseline gap-2.5">
          <h2 id={id} className="text-[15px] font-semibold tracking-[-0.015em]">
            {title}
          </h2>
          <span className="text-muted-foreground text-[12px] tabular-nums">
            {items.length} items
          </span>
          {description ? (
            <span className="text-muted-foreground hidden text-[12px] sm:inline">
              {description}
            </span>
          ) : null}
        </div>
        {action}
      </div>

      {children ?? (
        <div className={cn("grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-3", gridClassName)}>
          {items.map((item, index) => (
            <ItemCard key={item.id} item={item} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
