import { ItemGrid } from "@/components/portal/item-grid";
import { ItemView } from "@/components/portal/item-view";
import type { PortalItem } from "@/lib/portal/types";
import type { LayoutId } from "@/lib/settings/homepage";

interface CategorySectionProps {
  id: string;
  title: string;
  description?: string | null;
  items: PortalItem[];
  layout: LayoutId;
  action?: React.ReactNode;
  /** 编辑模式传入已经包好拖动能力的网格，此时不再自己渲染条目 */
  children?: React.ReactNode;
}

export function CategorySection({
  id,
  title,
  description,
  items,
  layout,
  action,
  children,
}: CategorySectionProps) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-4 flex items-center justify-between gap-4 px-0.5">
        <div className="flex items-baseline gap-2.5">
          <h2 id={id} className="text-[15px] font-semibold tracking-[-0.015em]">
            {title}
          </h2>
          <span className="text-muted-foreground text-[12px] tabular-nums">{items.length} 个</span>
          {description ? (
            <span className="text-muted-foreground hidden text-[12px] sm:inline">
              {description}
            </span>
          ) : null}
        </div>
        {action}
      </div>

      {children ?? (
        <ItemGrid layout={layout}>
          {items.map((item, index) => (
            <ItemView key={item.id} item={item} layout={layout} index={index} />
          ))}
        </ItemGrid>
      )}
    </section>
  );
}
