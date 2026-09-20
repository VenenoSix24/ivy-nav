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

/** 按布局选形状 */
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
