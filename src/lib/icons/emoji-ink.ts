import type { AlphaBox, FitTransform } from "./fit";

/** 放大到字框的九成就停：emoji 是彩色图案，顶到边会显得挤 */
const EMOJI_FILL = 0.9;
/** 与图标裁边同一个上限 */
const MAX_SCALE = 2;

/**
 * Emoji 的字形在字框里既不一定居中、也不一样大 —— Apple 的键盘、显示器那几个都偏下，
 * 而 🌱 这种又偏小。CSS 没有「按墨迹对齐」这种能力，所以量一遍再自己挪：
 *
 * 1. 用与页面**同一个字体栈**在 canvas 上量这个字符，取回字体与墨迹的度量（见 `measureEmoji`）；
 * 2. 按 CSS 行内布局的模型（半行距 + 基线）算出墨迹在 1em 方框里的 0..1 坐标（`emojiInkBox`）；
 * 3. 交给 `trimTransform` 换算成缩放与平移 —— 与图标裁边同一套数学。
 */
export interface EmojiMetrics {
  /** 前进宽度（em） */
  advance: number;
  /** 字体自身的上/下伸（em），CSS 的 content area 就用这两个值 */
  ascent: number;
  descent: number;
  /** 墨迹相对基线与对齐点的四边（em）：正数分别表示向上、向下、向左、向右 */
  inkAscent: number;
  inkDescent: number;
  inkLeft: number;
  inkRight: number;
}

/**
 * 墨迹在「1em 见方、line-height: 1em、文字居中」的盒子里的范围。
 * 纯函数：度量由调用方量好传进来，这里只管算，单测直接喂数。
 */
export function emojiInkBox(metrics: EmojiMetrics | null): AlphaBox | null {
  if (!metrics) return null;

  const { advance, ascent, descent, inkAscent, inkDescent, inkLeft, inkRight } = metrics;
  if (![ascent, descent, inkAscent, inkDescent, inkLeft, inkRight].every(Number.isFinite)) {
    return null;
  }

  // 基线落在 (1 + ascent - descent) / 2 处：行盒 1em，内容区 ascent+descent，
  // 上下各分一半行距（字体比 1em 高时这个值是负的，正是键盘那种偏下的来源之一）
  const baseline = (1 + ascent - descent) / 2;
  // 前进宽度在 1em 里居中（text-align: center），所以对齐点就在 0.5em
  const x0 = 0.5 - inkLeft;
  const x1 = 0.5 + inkRight;
  const y0 = baseline - inkAscent;
  const y1 = baseline + inkDescent;

  if (!(x1 > x0) || !(y1 > y0)) return null;
  if (!Number.isFinite(advance)) return null;

  return {
    x0: Math.max(0, x0),
    y0: Math.max(0, y0),
    x1: Math.min(1, x1),
    y1: Math.min(1, y1),
  };
}

/**
 * 墨迹 → 缩放与平移。与 `trimTransform` 的差别只在两处：**不管墨迹多大都要居中**
 * （偏下正是要治的那个毛病，而图标那边「已经顶格就不动」是对的），以及放大留一成余量。
 */
export function emojiTransform(box: AlphaBox | null): FitTransform | null {
  if (!box) return null;

  const width = box.x1 - box.x0;
  const height = box.y1 - box.y0;
  if (!(width > 0) || !(height > 0)) return null;

  const extent = Math.max(width, height);
  return {
    scale: Math.min(1 / extent, MAX_SCALE) * EMOJI_FILL,
    x: 0.5 - (box.x0 + box.x1) / 2,
    y: 0.5 - (box.y0 + box.y1) / 2,
  };
}

interface CanvasTextMetrics {
  width: number;
  fontBoundingBoxAscent: number;
  fontBoundingBoxDescent: number;
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
  actualBoundingBoxLeft: number;
  actualBoundingBoxRight: number;
}

/**
 * 用页面上那个字体栈量一次这个字符。`font` 直接取自计算样式（`font-size` + `font-family`），
 * 免得 canvas 里用的字体与实际渲染的不是一个 —— 那量出来的形状就不作数了。
 */
export function measureEmoji(value: string, font: string): EmojiMetrics | null {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.font = font;
  const size = Number.parseFloat(context.font);
  if (!Number.isFinite(size) || size <= 0) return null;

  const metrics = context.measureText(value) as CanvasTextMetrics;
  const scale = 1 / size;

  return {
    advance: metrics.width * scale,
    ascent: metrics.fontBoundingBoxAscent * scale,
    descent: metrics.fontBoundingBoxDescent * scale,
    inkAscent: metrics.actualBoundingBoxAscent * scale,
    inkDescent: metrics.actualBoundingBoxDescent * scale,
    inkLeft: metrics.actualBoundingBoxLeft * scale,
    inkRight: metrics.actualBoundingBoxRight * scale,
  };
}
