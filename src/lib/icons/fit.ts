import { z } from "zod";

/** 图标在图标遮罩里怎么摆，四种取法都只影响摆法，不改图片本身 */
export const ICON_FITS = [
  { id: "contain", label: "默认原样", hint: "“整张图按比例放进去”" },
  { id: "auto", label: "自动裁边", hint: "“裁掉四周的透明边距”" },
  { id: "cover", label: "裁剪铺满", hint: "“放大到铺满图标遮罩”" },
  { id: "fill", label: "拉伸铺满", hint: "“拉伸到图标遮罩的尺寸”" },
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
  /** 平移量，按元素自身宽高的比例给 */
  x: number;
  y: number;
}

/** 最大放大倍数 */
const MAX_SCALE = 2;
/** 已经占了九成八以上就不动它 */
const FULL_ENOUGH = 0.98;
/** 不到三成就不动它 */
const TOO_SMALL = 0.34;
/** 过扫：裁完再往外多铺百分之三 */
const OVERSCAN = 1.03;

/** 把透明边距换算成一次 transform：缩放 + 平移；返回 null 表示不用动 */
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

  // 按最长边算
  const extent = Math.max(contentWidth, contentHeight);
  if (extent > FULL_ENOUGH || extent < TOO_SMALL) return null;

  const scale = Math.min(1 / extent, MAX_SCALE) * OVERSCAN;
  return {
    scale,
    x: 0.5 - (x0 + x1) / 2,
    y: 0.5 - (y0 + y1) / 2,
  };
}
