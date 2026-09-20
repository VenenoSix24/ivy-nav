import { describe, expect, it } from "vitest";
import { ICON_FITS, DEFAULT_ICON_FIT, isIconFitId, trimTransform, iconFitLabel } from "./fit";

/** 把 transform 作用在内容框上，看它是不是正好落在 [0,1] 里 —— 也就是「填满了」 */
function project(
  box: { x0: number; y0: number; x1: number; y1: number },
  aspect: number,
  transform: { scale: number; x: number; y: number },
) {
  const width = aspect >= 1 ? 1 : aspect;
  const height = aspect >= 1 ? 1 / aspect : 1;
  const originX = (1 - width) / 2;
  const originY = (1 - height) / 2;

  const map = (value: number) => {
    // 先平移再缩放，缩放绕元素中心（0.5）
    const moved = value + transform.x;
    return 0.5 + transform.scale * (moved - 0.5);
  };

  return {
    x0: map(originX + box.x0 * width),
    x1: map(originX + box.x1 * width),
    y0: map(originY + box.y0 * height),
    y1: map(originY + box.y1 * height),
  };
}

describe("ICON_FITS", () => {
  it("lists the four ways to place an icon and defaults to the untouched one", () => {
    expect(ICON_FITS.map((entry) => entry.id)).toEqual(["contain", "auto", "cover", "fill"]);
    expect(DEFAULT_ICON_FIT).toBe("contain");
    expect(isIconFitId("auto")).toBe(true);
    expect(isIconFitId("stretch")).toBe(false);
    expect(iconFitLabel("cover")).toBe("裁剪铺满");
  });
});

describe("trimTransform", () => {
  const square = { x0: 0.2, y0: 0.2, x1: 0.7, y1: 0.7 };

  it("scales a centred inset so the artwork fills the box", () => {
    // 中心在 0.45，放大两倍（再过扫 3%）之后还要向右下挪 0.05 才回到正中
    const transform = trimTransform(square, 1);
    expect(transform?.scale).toBeCloseTo(2.06);
    expect(transform?.x).toBeCloseTo(0.05);
    expect(transform?.y).toBeCloseTo(0.05);
    expect(transform?.x).toBeCloseTo(transform?.y ?? 0);

    // 过扫 3%：图案正好越过盒子一点点，多出来的由外层裁掉
    const box = project(square, 1, transform!);
    expect(box.x0).toBeLessThan(0);
    expect(box.x1).toBeGreaterThan(1);
    expect(box.y0).toBeLessThan(0);
    expect(box.y1).toBeGreaterThan(1);
  });

  it("keeps a centred inset centred", () => {
    const centred = { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 };
    const transform = trimTransform(centred, 1);
    expect(transform?.scale).toBeCloseTo(2.06);
    expect(transform?.x).toBeCloseTo(0);
    expect(transform?.y).toBeCloseTo(0);
  });

  it("shifts the artwork when the transparent margin is lopsided", () => {
    // 只留右边一大块空白：得先把它挪到中间再放大
    const lopsided = { x0: 0.1, y0: 0.1, x1: 0.6, y1: 0.6 };
    // 内容 0.5 见方、中心在 0.35：放大后要挪 0.15 才回到正中
    const transform = trimTransform(lopsided, 1);
    expect(transform?.scale).toBeCloseTo(2.06);
    expect(transform?.x).toBeCloseTo(0.15);
    expect(transform?.y).toBeCloseTo(0.15);

    const box = project(lopsided, 1, transform!);
    expect(box.x0).toBeLessThan(0);
    expect(box.x1).toBeGreaterThan(1);
  });

  it("accounts for the letterboxing of a non-square image", () => {
    // 2:1 的横图：在正方形元素里它左右顶满、上下各占四分之一
    expect(trimTransform({ x0: 0, y0: 0, x1: 1, y1: 1 }, 2)).toBeNull();

    // 四周各留一点：顶到长边（这里就是左右）为止，短的上下按比例留白，不能拉变形
    const inset = { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 };
    const transform = trimTransform(inset, 2);
    expect(transform?.scale).toBeCloseTo(2.06);

    // 过扫之后长边略微越过盒子，短边按比例留白（不能为了填满把图拉变形）
    const box = project(inset, 2, transform!);
    expect(box.x0).toBeLessThan(0);
    expect(box.x1).toBeGreaterThan(1);
    expect(box.y0).toBeCloseTo(0.2425);
    expect(box.y1).toBeCloseTo(0.7575);
  });

  it("leaves icons alone when they already fill the box", () => {
    expect(trimTransform({ x0: 0.005, y0: 0.005, x1: 0.995, y1: 0.995 }, 1)).toBeNull();
    expect(trimTransform({ x0: 0, y0: 0, x1: 1, y1: 1 }, 1)).toBeNull();
  });

  it("still trims a thin transparent margin, so the artwork reaches the edge", () => {
    // 九成七：留了一圈几个像素的透明边，正是「选了铺满却还差一圈」的那种
    const transform = trimTransform({ x0: 0.015, y0: 0.015, x1: 0.985, y1: 0.985 }, 1);
    expect(transform?.scale).toBeCloseTo(1.0619);
  });

  it("leaves icons alone when the measurement looks unreliable", () => {
    // 一个 1×1 的小点：多半是量错了，放大它只会变成一块马赛克
    expect(trimTransform({ x0: 0.5, y0: 0.5, x1: 0.51, y1: 0.51 }, 1)).toBeNull();
    expect(trimTransform(null, 1)).toBeNull();
    expect(trimTransform({ x0: 0, y0: 0, x1: 0, y1: 0 }, 1)).toBeNull();
    expect(trimTransform({ x0: 0.2, y0: 0.2, x1: 0.4, y1: 0.4 }, 0)).toBeNull();
  });

  it("never scales past 2×", () => {
    // 图案只占三成六：按算式要放 2.8 倍，截到上限
    const tiny = { x0: 0.32, y0: 0.32, x1: 0.68, y1: 0.68 };
    expect(trimTransform(tiny, 1)?.scale).toBeCloseTo(2.06);
  });
});
