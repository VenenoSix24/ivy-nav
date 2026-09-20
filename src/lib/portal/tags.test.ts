import { describe, expect, it } from "vitest";
import { planTagRows } from "./tags";

/** 一组等宽标签 */
function equal(count: number, width: number): number[] {
  return new Array(count).fill(width);
}

describe("planTagRows", () => {
  it("keeps everything on one row while it fits", () => {
    // 三个 60px 的标签 + 两条 6px 间距 = 192，容器 200 放得下
    expect(planTagRows(equal(3, 60), 0, 200, 6, 2)).toEqual({ rows: [3], hidden: 0 });
  });

  it("splits evenly instead of filling the first row", () => {
    // 五个 45px：填满第一行能放四个（195），第五个孤零零占第二行 —— 那是原来那个毛病。
    // 均分后是 3 + 2，最宽的一行 145，比 195 舒服
    expect(planTagRows(equal(5, 45), 0, 200, 6, 2)).toEqual({ rows: [3, 2], hidden: 0 });
  });

  it("uses the fewest rows that fit", () => {
    // 四个 40px 一行放得下（178），不该分成两行
    expect(planTagRows(equal(4, 40), 0, 200, 6, 2)).toEqual({ rows: [4], hidden: 0 });
  });

  it("moves the last tags into +N when even two rows are not enough", () => {
    // 八个 45px 正好两行放下（4 + 4 各 198），不加「+N」；
    // 第九个塞不进来，于是收到七个，末行是三个标签加那个胶囊
    expect(planTagRows(equal(8, 45), 30, 200, 6, 2)).toEqual({ rows: [4, 4], hidden: 0 });
    expect(planTagRows(equal(9, 45), 30, 200, 6, 2)).toEqual({ rows: [4, 3], hidden: 2 });
  });

  it("keeps a single row within the limit when folding is not needed", () => {
    // 列表布局：一行放得下几个算几个，剩下的收进「+N」
    expect(planTagRows(equal(6, 45), 30, 200, 6, 1)).toEqual({ rows: [3], hidden: 3 });
  });

  it("works with mixed widths and keeps the order", () => {
    // 宽窄混杂时也按「最宽那行尽量窄」分：80+40+80+12 = 212 塞得下 220，
    // 而填满式的 80+40+80+40+18 = 258 塞不下
    expect(planTagRows([80, 40, 80, 40, 80], 0, 220, 6, 2)).toEqual({ rows: [3, 2], hidden: 0 });
  });

  it("gives everything back when nothing can be measured yet", () => {
    expect(planTagRows([], 0, 200, 6, 2)).toEqual({ rows: [], hidden: 0 });
    expect(planTagRows(equal(3, 0), 0, 200, 6, 2)).toEqual({ rows: [3], hidden: 0 });
    expect(planTagRows(equal(3, 60), 0, 0, 6, 2)).toEqual({ rows: [3], hidden: 0 });
  });

  it("falls back to just the +N when even one tag cannot fit", () => {
    // 一个标签比容器还宽：一个都不显示，只留「+N」，不会渲染出一行超出去的东西
    expect(planTagRows([300], 30, 100, 6, 2)).toEqual({ rows: [0], hidden: 1 });
  });
});
