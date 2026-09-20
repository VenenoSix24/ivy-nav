import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";
import { ItemIcon } from "@/components/portal/item-icon";
import { ItemState } from "@/components/portal/item-state";
import type { PortalItem } from "@/lib/portal/types";

// 标签与描述共用右侧那条位置，最多两个，再多就把描述挤没了
const MAX_VISIBLE_TAGS = 2;

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
 * 列表：一行一条，两行文字铺满整行宽度。
 *
 *   图标  标题                                    域名        [角标] [菜单] 打开
 *         描述                              #标签 #标签
 *
 * 域名与标题同一行、标签与描述同一行，并各自靠右 —— 之前把它们串在标题后面、
 * 整行左边挤成一团、右边空着一大片，一行的高度也没被用上。
 *
 * 窄屏去掉域名（那里没有它的位置，标题与描述更重要），描述与标签保留。
 * 行高定死，因此有没有描述、有几个标签都排得整齐。
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
    "surface surface-hover group flex min-h-[4.25rem] items-center gap-3 rounded-xl py-2.5 pr-3.5",
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
        className="size-9 rounded-lg text-[17px]"
      />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-3">
          <span className="truncate text-[14px] leading-snug font-medium tracking-[-0.01em]">
            {item.title}
          </span>
          <span className="text-muted-foreground ml-auto hidden shrink-0 text-[12px] sm:block">
            {item.domain}
          </span>
        </div>

        {/* 窄屏上描述与标签各自占一行：390px 时两个标签就要吃掉一大半宽度，
            并排的结果是描述被截成「本…」这种没用的残句 */}
        <div className="flex min-h-[1.05rem] flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
          {item.description ? (
            <span className="text-muted-foreground w-full truncate text-[12px] sm:w-auto">
              {item.description}
            </span>
          ) : null}
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] leading-none sm:ml-auto">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="bg-accent text-accent-foreground rounded-full px-2 py-[3px]"
              >
                {tag}
              </span>
            ))}
            {hiddenTagCount > 0 ? (
              <span className="text-muted-foreground">+{hiddenTagCount}</span>
            ) : null}
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
            className="text-muted-foreground hover:text-foreground focus-visible:outline-ring hidden rounded-md text-[12px] font-medium transition-colors focus-visible:outline-2 sm:inline-block"
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
