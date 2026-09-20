import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";
import { ItemIcon } from "@/components/portal/item-icon";
import { ItemState } from "@/components/portal/item-state";
import type { PortalItem } from "@/lib/portal/types";

// 最多两个标签：窄屏还要给描述留出能读的一段（第二个标签窄屏隐藏，见下）
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
 *   图标  标题  域名                        [角标] [菜单] 打开
 *         描述  #标签 #标签
 *
 * 域名紧跟在标题后面、标签紧跟在描述后面，两行都从左边排起 —— 靠右会让中间空出
 * 一大片，而且它们会被误读成「跟打开按钮有关」。窄屏去掉域名，标签只留第一个，
 * 换描述能读出完整的一句。
 *
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
    "surface surface-hover group flex min-h-[4.75rem] items-center gap-3 rounded-xl py-3.5 pr-3.5",
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
        {/* 域名紧跟标题，不推到右边 —— 靠右会让中间空出一大片 */}
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate text-[14px] leading-snug font-medium tracking-[-0.01em]">
            {item.title}
          </span>
          <span className="text-muted-foreground hidden shrink-0 text-[12px] sm:block">
            {item.domain}
          </span>
        </div>

        <div className="flex min-h-[1.05rem] min-w-0 items-center gap-3">
          {item.description ? (
            <span className="text-muted-foreground truncate text-[12px]">{item.description}</span>
          ) : null}
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] leading-none">
            {visibleTags.map((tag, index) => (
              <span
                key={tag}
                // 窄屏只留第一个标签：390px 下两个标签会把描述挤成「本…」这种残句
                className={cn(
                  "bg-accent text-accent-foreground rounded-full px-2 py-[3px]",
                  index > 0 && "hidden sm:inline-block",
                )}
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
