import type { PortalItem } from "./types";

/** 把 `items` 里属于 `orderedIds` 的那几个换上新顺序，其余原位不动（只换值、不动位次） */
export function reorderWithin(items: PortalItem[], orderedIds: number[]): PortalItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = orderedIds.map((id) => byId.get(id)).filter((item) => item !== undefined);
  // 顺序对不上就原样返回
  if (ordered.length !== orderedIds.length) return items;

  const moved = new Set(orderedIds);
  const slots = items.reduce<number[]>((acc, item, index) => {
    if (moved.has(item.id)) acc.push(index);
    return acc;
  }, []);

  const next = [...items];
  slots.forEach((slot, index) => {
    next[slot] = ordered[index]!;
  });
  return next;
}
