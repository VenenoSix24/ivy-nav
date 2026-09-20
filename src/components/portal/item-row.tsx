import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";
import { ItemIcon } from "@/components/portal/item-icon";
import { ItemState } from "@/components/portal/item-state";
import type { PortalItem } from "@/lib/portal/types";

// 列表是扫视用的：标签在窄屏上会把域名挤掉，所以只在宽屏出现，最多三个
const MAX_VISIBLE_TAGS = 3;

interface ItemRowProps {
  item: PortalItem;
  index?: number;
  /** 公开视图整行就是链接；编辑模式换成普通容器，避免与拖动抢手势 */
  interactive?: boolean;
  showState?: boolean;
  /** 编辑模式：拖动把手浮在行首，行首内边距要让出位置 */
  draggable?: boolean;
  cornerAction?: React.ReactNode;
  onEdit?: () => void;
}

/**
 * 列表：一行一条。两行文字 —— 上行标题（宽屏补描述），下行域名（宽屏补标签）。
 * 窄屏只留「标题 + 域名 + 打开」，这是列表在手机上比两列卡片更好用的原因：
 * 横向空间不够时，纵向排开能表达的信息反而更多。
 */
export function ItemRow({
  item,
  index = 0,
  interactive = true,
  showState = false,
  draggable = false,
  cornerAction,
  onEdit,
}: ItemRowProps) {
  const visibleTags = item.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = item.tags.length - visibleTags.length;

  const className = cn(
    "surface surface-hover group flex h-full items-center gap-3 rounded-xl py-2.5 pr-3.5",
    draggable ? "pl-9" : "pl-3.5",
    interactive &&
      "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
  );
  const style = { animationDelay: `${Math.min(index * 30, 180)}ms` };

  const body = (
    <>
      <ItemIcon
        spec={{ type: item.iconType, value: item.iconValue }}
        title={item.title}
        itemId={item.id}
        className="size-8 rounded-md text-[16px]"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[14px] leading-snug font-medium tracking-[-0.01em]">
            {item.title}
          </span>
          {item.description ? (
            <span className="text-muted-foreground hidden truncate text-[12px] md:inline">
              {item.description}
            </span>
          ) : null}
        </div>

        <div className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-none">
          <span className="truncate">{item.domain}</span>
          <span className="hidden shrink-0 items-center gap-1.5 lg:flex">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="bg-accent text-accent-foreground rounded-full px-2 py-[3px]"
              >
                {tag}
              </span>
            ))}
            {hiddenTagCount > 0 ? <span>+{hiddenTagCount}</span> : null}
          </span>
        </div>
      </div>

      {showState ? <ItemState visibility={item.visibility} featured={item.featured} /> : null}
      {cornerAction}

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
