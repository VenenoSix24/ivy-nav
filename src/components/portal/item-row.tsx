import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";
import { ItemIcon } from "@/components/portal/item-icon";
import { ItemState } from "@/components/portal/item-state";
import { TagList } from "@/components/portal/tag-list";
import type { PortalItem } from "@/lib/portal/types";

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
 * 列表：一行一条，三行文字铺满整行宽度。
 *
 *   图标  标题  域名                        [角标] [菜单] 打开
 *         描述
 *         #标签 #标签 #标签
 *
 * 域名跟在标题后面、描述单独一行、标签排在描述下方 —— 都从左边排起。靠右会让中间
 * 空出一大片，而且它们会被误读成「跟打开按钮有关」。窄屏去掉域名，描述因此能独占
 * 一行读完整。
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
  const className = cn(
    "surface surface-hover group flex min-h-[5.5rem] items-center gap-3 rounded-xl py-3.5 pr-3.5",
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
        className="size-11 rounded-xl [--icon-glyph:1.75rem]"
      />

      <div className="min-w-0 flex-1 space-y-1">
        {/* 域名紧跟标题，不推到右边 —— 靠右会让中间空出一大片。
            按基线对齐：域名小一号，居中对齐会让它看起来浮在标题上方 */}
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="truncate text-[14px] leading-snug font-medium tracking-[-0.01em]">
            {item.title}
          </span>
          <span className="text-muted-foreground hidden shrink-0 text-[12px] sm:block">
            {item.domain}
          </span>
        </div>

        {item.description ? (
          <p className="text-muted-foreground truncate text-[12px]">{item.description}</p>
        ) : null}

        {/* 标签排在描述下方，自己占一行：一行放不下就折成 +N */}
        <TagList tags={item.tags} lines={1} />
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
