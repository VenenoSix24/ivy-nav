export interface TagRows {
  /** 每行放几个标签（不含行末的「+N」） */
  rows: number[];
  /** 被收进「+N」的标签个数 */
  hidden: number;
}

/** 一行：放几个胶囊、这一行有多宽 */
interface Row {
  count: number;
  width: number;
}

/** 标签排版：行数不超过 `lines`，行与行之间尽量平均，放不下的从尾部收进「+N」 */
export function planTagRows(
  widths: number[],
  chipWidth: number,
  containerWidth: number,
  gap: number,
  lines: number,
): TagRows {
  if (widths.length === 0) return { rows: [], hidden: 0 };
  // 还没量到尺寸时不做判断
  if (containerWidth <= 0 || widths.some((width) => width <= 0)) {
    return { rows: [widths.length], hidden: 0 };
  }

  for (let shown = widths.length; shown >= 0; shown -= 1) {
    const items = widths.slice(0, shown);
    const folded = shown < widths.length;
    if (folded) items.push(chipWidth);

    const rows = layout(items, containerWidth, gap, lines);
    if (!rows) continue;

    // 「+N」永远挂在最后一行
    const counts = rows.map((row) => row.count);
    if (folded) counts[counts.length - 1] = counts[counts.length - 1]! - 1;
    return { rows: counts, hidden: widths.length - shown };
  }

  return { rows: [], hidden: widths.length };
}

/** 找出「行数不超过 lines」的排法；放不下返回 null */
function layout(items: number[], limit: number, gap: number, lines: number): Row[] | null {
  // 行数从少到多试
  for (let count = 1; count <= lines; count += 1) {
    const rows = balance(items, count, gap);
    if (rows && rows.every((row) => row.width <= limit)) return rows;
  }
  return null;
}

/** 把 items 顺序切成 count 段，让最宽的一段尽量窄 */
function balance(items: number[], count: number, gap: number): Row[] | null {
  const total = items.length;
  if (count > total) return null;

  const prefix = [0];
  for (const width of items) prefix.push(prefix[prefix.length - 1]! + width);
  const widthOf = (start: number, end: number) =>
    prefix[end]! - prefix[start]! + gap * Math.max(0, end - start - 1);

  // dp[i][j]：前 i 个放进 j 段时的「最宽段宽」最小值；from[i][j] 记这一段从哪切
  const dp: number[][] = Array.from({ length: total + 1 }, () =>
    new Array(count + 1).fill(Number.POSITIVE_INFINITY),
  );
  const from: number[][] = Array.from({ length: total + 1 }, () => new Array(count + 1).fill(-1));
  dp[0]![0] = 0;

  for (let row = 1; row <= count; row += 1) {
    for (let end = row; end <= total; end += 1) {
      for (let start = row - 1; start < end; start += 1) {
        const previous = dp[start]![row - 1]!;
        if (!Number.isFinite(previous)) continue;
        const candidate = Math.max(previous, widthOf(start, end));
        // 用 <= 而不是 <：同样宽时取「最后一行更短」的分法
        if (candidate <= dp[end]![row]!) {
          dp[end]![row] = candidate;
          from[end]![row] = start;
        }
      }
    }
  }

  if (!Number.isFinite(dp[total]![count]!)) return null;

  const rows: Row[] = [];
  let end = total;
  for (let row = count; row > 0; row -= 1) {
    const start = from[end]![row]!;
    rows.unshift({ count: end - start, width: widthOf(start, end) });
    end = start;
  }
  return rows;
}
