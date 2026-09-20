import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";
import { ItemIcon } from "@/components/portal/item-icon";
import { ItemState } from "@/components/portal/item-state";
import { TagList } from "@/components/portal/tag-list";
import type { PortalItem } from "@/lib/portal/types";

interface ItemCardProps {
  item: PortalItem;
  index?: number;
  /** 公开视图整张卡片就是链接 */
  interactive?: boolean;
  /** 管理视图里标出 Private 与置顶状态 */
  showState?: boolean;
  /** 编辑模式：拖动把手浮在左上角 */
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
          spec={{
            type: item.iconType,
            value: item.iconValue,
            plate: item.iconPlate,
            mono: item.iconMono,
            fit: item.iconFit,
          }}
          title={item.title}
          itemId={item.id}
          className="size-12 sm:size-14"
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

      <div className="mt-auto flex flex-col items-start gap-4 pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:pt-5">
        <TagList tags={item.tags} lines={2} className="flex-1" />

        <div className="flex shrink-0 items-center gap-3 self-start sm:ml-auto sm:self-auto">
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
