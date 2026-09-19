import { ItemCard } from "@/components/portal/item-card";
import type { PortalCategory, PortalItem } from "@/lib/portal/types";

interface CategorySectionProps {
  category: PortalCategory;
  items: PortalItem[];
}

export function CategorySection({ category, items }: CategorySectionProps) {
  return (
    <section aria-labelledby={`category-${category.id}`}>
      <div className="mb-4 flex items-baseline justify-between gap-4 px-0.5">
        <h2
          id={`category-${category.id}`}
          className="text-[15px] font-semibold tracking-[-0.015em]"
        >
          {category.name}
        </h2>
        <span className="text-muted-foreground text-[12px] tabular-nums">{items.length} items</span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <ItemCard key={item.id} item={item} index={index} />
        ))}
      </div>
    </section>
  );
}
