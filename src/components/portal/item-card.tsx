import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";
import { ItemIcon } from "@/components/portal/item-icon";
import { ItemState } from "@/components/portal/item-state";
import type { PortalItem } from "@/lib/portal/types";

// 右边有位置就该多显示几个，超过再折叠成 +N
const MAX_VISIBLE_TAGS = 4;

interface ItemCardProps {
  item: PortalItem;
  index?: number;
  /** 公开视图整张卡片就是链接；编辑模式换成普通容器，避免与拖动抢手势 */
  interactive?: boolean;
  /** 管理视图里标出 Private 与置顶状态 */
  showState?: boolean;
  /** 编辑模式：拖动把手浮在左上角，卡片左内边距要让出位置 */
  draggable?: boolean;
  cornerAction?: React.ReactNode;
  onEdit?: () => void;
}

export function ItemCard({
  item,
  index = 0,
  interactive = true,
  showState = false,
  draggable = false,
  cornerAction,
  onEdit,
}: ItemCardProps) {
  const visibleTags = item.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = item.tags.length - visibleTags.length;

  const className = cn(
    "surface surface-hover group flex h-full flex-col rounded-2xl p-4 sm:p-5",
    draggable && "pl-9 sm:pl-10",
    interactive &&
      "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
  );
  const style = { animationDelay: `${Math.min(index * 30, 180)}ms` };

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <ItemIcon
          spec={{ type: item.iconType, value: item.iconValue }}
          title={item.title}
          itemId={item.id}
          className="size-12 text-[24px] [--icon-glyph:1.75rem] sm:size-14 sm:text-[28px] sm:[--icon-glyph:2rem]"
        />
        <div className="flex items-center gap-1">
          {showState ? <ItemState visibility={item.visibility} featured={item.featured} /> : null}
          {cornerAction}
        </div>
      </div>

      <h3 className="mt-4 text-[14px] leading-snug font-semibold tracking-[-0.01em] sm:mt-6 sm:text-[15px]">
        {item.title}
      </h3>

      {item.description ? (
        <p className="text-muted-foreground mt-1.5 line-clamp-2 text-[12px] leading-relaxed sm:text-[13px]">
          {item.description}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col items-start gap-2 pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:pt-5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
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

        {/* 手机上这一行单独占一行，靠右放：整卡左对齐时「打开」会贴在左下角 */}
        <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
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
              打开
              <ArrowUpRight className="size-3.5" />
            </span>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary focus-visible:outline-ring inline-flex items-center gap-0.5 rounded-md text-[12px] font-semibold focus-visible:outline-2"
            >
              打开
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
