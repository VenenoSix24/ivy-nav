import { ArrowUpRight, Lock, Star } from "lucide-react";
import { cn } from "cn";
import { ItemIcon } from "@/components/portal/item-icon";
import type { PortalItem } from "@/lib/portal/types";

const MAX_VISIBLE_TAGS = 2;

interface ItemCardProps {
  item: PortalItem;
  index?: number;
  /** 公开视图整张卡片就是链接；编辑模式换成普通容器，避免与拖动抢手势 */
  interactive?: boolean;
  /** 管理视图里标出 Private 与置顶状态 */
  showState?: boolean;
  cornerAction?: React.ReactNode;
  dragHandle?: React.ReactNode;
  onEdit?: () => void;
}

export function ItemCard({
  item,
  index = 0,
  interactive = true,
  showState = false,
  cornerAction,
  dragHandle,
  onEdit,
}: ItemCardProps) {
  const visibleTags = item.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = item.tags.length - visibleTags.length;

  const className = cn(
    "surface surface-hover group flex h-full flex-col rounded-2xl p-5",
    interactive &&
      "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
  );
  const style = { animationDelay: `${Math.min(index * 30, 180)}ms` };

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <ItemIcon type={item.iconType} value={item.iconValue} title={item.title} url={item.url} />
        <div className="flex items-center gap-1">
          {showState && item.visibility === "private" ? (
            <span
              title="Private：只有登录后可见"
              className="text-muted-foreground bg-secondary inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] leading-none"
            >
              <Lock className="size-3" />
              Private
            </span>
          ) : null}
          {showState && item.featured ? (
            <span
              title="置顶"
              className="text-accent-foreground inline-grid size-6 place-items-center"
            >
              <Star className="size-3.5 fill-current" />
            </span>
          ) : null}
          {cornerAction}
        </div>
      </div>

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

        <div className="flex shrink-0 items-center gap-3">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-md text-[12px] font-medium transition-colors focus-visible:outline-2"
            >
              编辑
            </button>
          ) : null}

          {interactive ? (
            <span className="text-primary inline-flex items-center gap-0.5 text-[12px] font-semibold">
              Open
              <ArrowUpRight className="size-3.5" />
            </span>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary focus-visible:outline-ring inline-flex items-center gap-0.5 rounded-md text-[12px] font-semibold focus-visible:outline-2"
            >
              Open
              <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    </>
  );

  if (!interactive) {
    return (
      <div style={style} className={cn(className, "relative")}>
        {dragHandle}
        {body}
      </div>
    );
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      className={className}
    >
      {body}
    </a>
  );
}
