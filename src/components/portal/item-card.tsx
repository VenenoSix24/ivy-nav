import { ArrowUpRight } from "lucide-react";
import { ItemIcon } from "@/components/portal/item-icon";
import type { PortalItem } from "@/lib/portal/types";

const MAX_VISIBLE_TAGS = 2;

interface ItemCardProps {
  item: PortalItem;
  index?: number;
}

export function ItemCard({ item, index = 0 }: ItemCardProps) {
  const visibleTags = item.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = item.tags.length - visibleTags.length;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ animationDelay: `${Math.min(index * 30, 180)}ms` }}
      className="surface surface-hover animate-rise group focus-visible:outline-ring flex flex-col rounded-2xl p-5 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <ItemIcon type={item.iconType} value={item.iconValue} title={item.title} url={item.url} />

      <h3 className="mt-6 text-[15px] leading-snug font-semibold tracking-[-0.01em]">
        {item.title}
      </h3>

      {item.description ? (
        <p className="text-muted-foreground mt-1.5 line-clamp-2 text-[13px] leading-relaxed">
          {item.description}
        </p>
      ) : null}

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="bg-accent text-accent-foreground rounded-full px-2 py-[3px] text-[11px] leading-none"
            >
              {tag}
            </span>
          ))}
          {hiddenTagCount > 0 ? (
            <span className="text-muted-foreground text-[11px] leading-none">
              +{hiddenTagCount}
            </span>
          ) : null}
        </div>

        <span className="text-primary inline-flex shrink-0 items-center gap-0.5 text-[12px] font-semibold">
          Open
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
    </a>
  );
}
