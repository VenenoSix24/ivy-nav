export interface Ordered {
  id: number;
  sortOrder: number;
}

/** Stable ordering: explicit sortOrder first, then id. */
export function bySortOrder<T extends Ordered>(left: T, right: T): number {
  return left.sortOrder - right.sortOrder || left.id - right.id;
}

export function sortByOrder<T extends Ordered>(rows: T[]): T[] {
  return [...rows].sort(bySortOrder);
}

/** Moves one entry. */
export function moveEntry<T>(rows: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...rows];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) return next;
  next.splice(toIndex, 0, moved);
  return next;
}

/** Dense renumbering from zero. */
export function toSortOrderPayload(orderedIds: number[]): { id: number; sortOrder: number }[] {
  return orderedIds.map((id, index) => ({ id, sortOrder: index }));
}

/** 新条目排到最后一位，只需要现有最大序号 */
export function nextSortOrder(rows: { sortOrder: number }[]): number {
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}
