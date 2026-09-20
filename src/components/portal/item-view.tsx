import { ItemCard } from "@/components/portal/item-card";
import { ItemRow } from "@/components/portal/item-row";
import { ItemTile } from "@/components/portal/item-tile";
import type { PortalItem } from "@/lib/portal/types";
import type { LayoutId } from "@/lib/settings/homepage";

export interface ItemViewProps {
  item: PortalItem;
  layout: LayoutId;
  index?: number;
  interactive?: boolean;
  showState?: boolean;
  draggable?: boolean;
  cornerAction?: React.ReactNode;
  onEdit?: () => void;
}

/**
 * 按布局选形状。三种形状是各自独立的 DOM（一行、一块卡片、一块小方块没法只靠 class 互转），
 * 所以这里只做分发；图标兜底、Private 与置顶这些共用判断放在各自的形状里调同一份实现。
 *
 * 逐项传参而不是整包展开：紧凑布局没有「编辑」的位置（改它走右上角菜单），
 * 与其让它声明一个用不到的 prop，不如在分发表格上写清楚每种形状收什么。
 */
export function ItemView({
  item,
  layout,
  index,
  interactive,
  showState,
  draggable,
  cornerAction,
  onEdit,
}: ItemViewProps) {
  if (layout === "list") {
    return (
      <ItemRow
        item={item}
        index={index}
        interactive={interactive}
        showState={showState}
        draggable={draggable}
        cornerAction={cornerAction}
        onEdit={onEdit}
      />
    );
  }

  if (layout === "compact") {
    return (
      <ItemTile
        item={item}
        index={index}
        interactive={interactive}
        showState={showState}
        draggable={draggable}
        cornerAction={cornerAction}
      />
    );
  }

  return (
    <ItemCard
      item={item}
      index={index}
      interactive={interactive}
      showState={showState}
      draggable={draggable}
      cornerAction={cornerAction}
      onEdit={onEdit}
    />
  );
}
