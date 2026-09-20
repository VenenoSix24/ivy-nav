import { z } from "zod";

/**
 * 图标在底板里怎么摆。
 *
 * 麻烦出在「取回来的图标大小不由我们定」：有的图把画布填满，有的四周留一大圈透明边。
 * 同样摆在同一个底板里，前者顶格、后者缩在中间，看着就成了大圆套小圆。
 *
 * - `contain` 照原样放进去（默认，也是改之前的行为），也是唯一留一圈呼吸位的
 * - `auto`    量出四周的透明边距裁掉，让图案自己填满 —— 见 `trimTransform`
 * - `cover`   放大到铺满、超出裁掉（图标本身是满幅方图时正合适）
 * - `fill`    拉伸到和底板一样大（不是正方形会被压扁，留给特殊图标）
 */
export const ICON_FITS = [
  { id: "contain", label: "原样", hint: "整张图按比例放进去，四周留一圈呼吸位（默认）" },
  { id: "auto", label: "自动裁边", hint: "裁掉四周的透明边距，让图案顶到板边" },
  { id: "cover", label: "裁剪铺满", hint: "放大到铺满底板，超出的部分裁掉" },
  { id: "fill", label: "拉伸铺满", hint: "拉到和底板一样大，不是正方形会被压扁" },
] as const;

export type IconFitId = (typeof ICON_FITS)[number]["id"];

export const DEFAULT_ICON_FIT: IconFitId = "contain";

const fitIds = ICON_FITS.map((entry) => entry.id) as [IconFitId, ...IconFitId[]];

export const iconFitSchema = z.enum(fitIds);

export function isIconFitId(value: unknown): value is IconFitId {
  return typeof value === "string" && fitIds.includes(value as IconFitId);
}

export function iconFitLabel(id: IconFitId): string {
  return ICON_FITS.find((entry) => entry.id === id)?.label ?? id;
}

/** 一张图里不透明像素的范围，坐标是图片自身的 0..1 */
export interface AlphaBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface FitTransform {
  scale: number;
  /** 平移量，按元素自身宽高的比例给（CSS 的 translate 百分比正好是这个意思） */
  x: number;
  y: number;
}

/**
 * 最大放大倍数。取回来的图标里，图案占画布一半到七成是常事（那要放大约 1.4–2 倍），
 * 所以上限给到 2；再大就说明量出来的范围小得可疑，或者把一颗小小的水印当成了主体，
 * 宁可不动它 —— 放大两倍以上的位图已经开始糊了。
 */
const MAX_SCALE = 2;
/** 已经占了九成四以上：本来就没留白，不动它 */
const FULL_ENOUGH = 0.94;
/** 不到三成：多半量错了（比如整张图只有一个小点），宁可不动 */
const TOO_SMALL = 0.34;

/**
 * 把「透明边距」换算成一次 transform：缩放 + 平移，让图案的最长边正好填满底板。
 *
 * 元素是正方形、图片用 `object-contain` 居中摆着，所以图片自身坐标要先映射到元素坐标
 * （横图左右顶满、竖图上下顶满），再算缩放。返回 null 表示这张图不用动。
 *
 * 公式：`transform: scale(k) translate(x, y)`，`transform-origin` 是元素中心。
 * 先平移再缩放，缩放是绕中心的，所以内容中心 c 只要先挪到中心即可 ——
 * `x = 0.5 - c`，与 k 无关。
 */
export function trimTransform(box: AlphaBox | null, aspect: number): FitTransform | null {
  if (!box || !Number.isFinite(aspect) || aspect <= 0) return null;

  // 图片在正方形里的「contain」矩形
  const width = aspect >= 1 ? 1 : aspect;
  const height = aspect >= 1 ? 1 / aspect : 1;
  const originX = (1 - width) / 2;
  const originY = (1 - height) / 2;

  const x0 = originX + box.x0 * width;
  const x1 = originX + box.x1 * width;
  const y0 = originY + box.y0 * height;
  const y1 = originY + box.y1 * height;

  const contentWidth = x1 - x0;
  const contentHeight = y1 - y0;
  if (contentWidth <= 0 || contentHeight <= 0) return null;

  // 按最长边算：正方形填满，长条图形至少把长的那一边顶到边
  const extent = Math.max(contentWidth, contentHeight);
  if (extent > FULL_ENOUGH || extent < TOO_SMALL) return null;

  const scale = Math.min(1 / extent, MAX_SCALE);
  return {
    scale,
    x: 0.5 - (x0 + x1) / 2,
    y: 0.5 - (y0 + y1) / 2,
  };
}
