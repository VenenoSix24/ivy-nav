import { cn } from "cn";
import { ItemIcon } from "@/components/portal/item-icon";
import { ItemStateCompact } from "@/components/portal/item-state";
import type { PortalItem } from "@/lib/portal/types";

interface ItemTileProps {
  item: PortalItem;
  index?: number;
  /** 公开视图整块就是链接 */
  interactive?: boolean;
  showState?: boolean;
  /** 编辑模式：拖动把手浮在左上角 */
  draggable?: boolean;
  cornerAction?: React.ReactNode;
}

/** 紧凑：一块只放图标与标题的小方块，像手机主屏 */
export function ItemTile({
  item,
  index = 0,
  interactive = true,
  showState = false,
  draggable = false,
  cornerAction,
}: ItemTileProps) {
  const className = cn(
    "surface surface-hover group relative flex h-full min-h-[74px] flex-col items-center justify-center gap-2 rounded-xl px-1.5 py-3 text-center",
    interactive &&
      "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
  );
  const style = { animationDelay: `${Math.min(index * 25, 150)}ms` };
  const hasTopStrip = draggable || showState;

  const body = (
    <>
      {hasTopStrip ? <span className="block h-4" aria-hidden /> : null}
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
        className="size-10"
      />
      <span className="w-full truncate text-[12px] leading-tight font-medium tracking-[-0.01em]">
        {item.title}
      </span>

      {showState ? (
        <ItemStateCompact visibility={item.visibility} featured={item.featured} />
      ) : null}

      {cornerAction ? (
        <span className="absolute top-0.5 right-0.5 z-10">{cornerAction}</span>
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <div style={style} className={className}>
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
