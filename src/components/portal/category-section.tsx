import { Lock } from "lucide-react";
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
  /** 整类对匿名隐藏 */
  hidden?: boolean;
  action?: React.ReactNode;
  /** 编辑模式传入已包好拖动能力的网格，此时不再自己渲染条目 */
  children?: React.ReactNode;
}

export function CategorySection({
  id,
  title,
  description,
  items,
  layout,
  hidden,
  action,
  children,
}: CategorySectionProps) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-4 flex items-center gap-3 px-0.5">
        <div className="flex min-w-0 items-baseline gap-x-2.5">
          <h2 id={id} className="text-[15px] font-semibold tracking-[-0.015em]">
            {title}
          </h2>
          <span className="text-muted-foreground text-[12px] tabular-nums">{items.length} 个</span>
          {hidden ? (
            <span
              title="整类隐藏：这个分类里的条目对匿名访客都不显示"
              className="text-muted-foreground bg-secondary inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] leading-none"
            >
              <Lock className="size-3" />
              整类 Private
            </span>
          ) : null}
        </div>
        {description ? (
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-right text-[12px]">
            {description}
          </span>
        ) : (
          <span className="flex-1" />
        )}
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
