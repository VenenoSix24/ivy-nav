export interface TagRows {
  /** 每行放几个标签（不含行末的「+N」），从第一行到最后一行 */
  rows: number[];
  /** 被收进「+N」的标签个数 */
  hidden: number;
}

/** 一行：放几个胶囊、这一行有多宽 */
interface Row {
  count: number;
  width: number;
}

/**
 * 标签排版：行数不超过 `lines`，每行都得放得下，行与行之间尽量平均。
 *
 * 不能只按「填满一行再换行」：五个标签里前四个塞满第一行、第五个孤零零占第二行，
 * 看着就是第一行挤、第二行空。同样是两行，宁可 3 + 2 也不要 4 + 1 —— 这里把能放下的
 * 标签尽量均分到各行（最小化「最宽那一行」），放不下的才从尾部收进「+N」。
 *
 * @param widths 每个标签的宽度（含内边距）
 * @param chipWidth 行末「+N」的宽度；没有「+N」时传 0
 * @param containerWidth 可用宽度
 * @param gap 同一行里两个胶囊之间的间距
 * @param lines 允许的行数上限
 */
export function planTagRows(
  widths: number[],
  chipWidth: number,
  containerWidth: number,
  gap: number,
  lines: number,
): TagRows {
  if (widths.length === 0) return { rows: [], hidden: 0 };
  // 还没量到尺寸（首屏、或被隐藏）时不做判断：先交给浏览器自己换行
  if (containerWidth <= 0 || widths.some((width) => width <= 0)) {
    return { rows: [widths.length], hidden: 0 };
  }

  for (let shown = widths.length; shown >= 0; shown -= 1) {
    const items = widths.slice(0, shown);
    const folded = shown < widths.length;
    if (folded) items.push(chipWidth);

    const rows = layout(items, containerWidth, gap, lines);
    if (!rows) continue;

    // 「+N」永远挂在最后一行，所以只有最后一行要少算一个标签
    const counts = rows.map((row) => row.count);
    if (folded) counts[counts.length - 1] = counts[counts.length - 1]! - 1;
    return { rows: counts, hidden: widths.length - shown };
  }

  return { rows: [], hidden: widths.length };
}

/** 找出「行数不超过 lines」的排法；放不下返回 null */
function layout(items: number[], limit: number, gap: number, lines: number): Row[] | null {
  // 行数从少到多试：一行放得下就不排两行
  for (let count = 1; count <= lines; count += 1) {
    const rows = balance(items, count, gap);
    if (rows && rows.every((row) => row.width <= limit)) return rows;
  }
  return null;
}

/**
 * 把 items 顺序切成 count 段，让最宽的一段尽量窄（最小化最大值）。
 * 段内顺序不能变 —— 标签的先后是用户自己排的。
 */
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
        // 用 <= 而不是 <：同样宽时取「最后一行更短」的那种分法 —— 上面一行放满一点，
        // 观感上比拖着一个小尾巴稳
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
