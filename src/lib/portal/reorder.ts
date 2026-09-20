import type { PortalItem } from "./types";

/**
 * 把 `items` 里属于 `orderedIds` 的那几个换上新顺序，其余原位不动。
 *
 * 只换值、不动位次：拖拽只发生在同一个分区内，那几个条目在数组里本来就是连续的一小段，
 * 把新顺序填回它们占着的位置即可 —— 不必知道它们属于哪个分类，也不会打乱别的分区。
 *
 * 这一步是为了让拖动**立刻**生效。等服务器回包再改，卡片会先弹回原位、再跳一次
 * （dnd-kit 拖拽期间用 transform 顶着，松手后状态没变，transform 一撤就回去了）。
 *
 * 调用点给的是整个分区的完整顺序；给子集也是良定义的 —— 只在子集占着的位置之间重排。
 */
export function reorderWithin(items: PortalItem[], orderedIds: number[]): PortalItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = orderedIds.map((id) => byId.get(id)).filter((item) => item !== undefined);
  // 顺序对不上（条目被删了、或列表正被搜索过滤）就原样返回，别把半个顺序写进去
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
