import { describe, expect, it } from "vitest";
import { emojiInkBox, emojiTransform, type EmojiMetrics } from "./emoji-ink";

/** 一份「字体比 1em 高一点、墨迹居中」的常见度量 */
const centred: EmojiMetrics = {
  advance: 1,
  ascent: 0.9,
  descent: 0.25,
  inkAscent: 0.4,
  inkDescent: 0.1,
  inkLeft: 0.5,
  inkRight: 0.5,
};

describe("emojiInkBox", () => {
  it("puts a centred glyph at the centre of the em box", () => {
    const box = emojiInkBox(centred);
    // 基线 = (1 + 0.9 - 0.25) / 2 = 0.825；墨迹上沿 0.425、下沿 0.925
    expect(box?.y0).toBeCloseTo(0.425);
    expect(box?.y1).toBeCloseTo(0.925);
    expect(box?.x0).toBeCloseTo(0);
    expect(box?.x1).toBeCloseTo(1);
  });

  it("reports the vertical offset of a glyph drawn low in its box", () => {
    // 键盘那种：墨迹整体压在字框下半部分
    const low = emojiInkBox({ ...centred, inkAscent: 0.2, inkDescent: 0.45 });
    expect(low?.y0).toBeCloseTo(0.625);
    expect(low?.y1).toBeCloseTo(1);
    // 墨迹本来就撑满宽度，所以不再放大，但**仍然要居中**：往上挪
    const transform = emojiTransform(low);
    expect(transform?.scale).toBeCloseTo(0.9);
    expect(transform?.y).toBeLessThan(0);
  });

  it("clips to the em box when the ink runs over it", () => {
    const over = emojiInkBox({ ...centred, inkAscent: 1.2, inkDescent: 0.5 });
    expect(over?.y0).toBe(0);
    expect(over?.y1).toBe(1);
  });

  it("gives up on missing or broken metrics", () => {
    expect(emojiInkBox(null)).toBeNull();
    expect(emojiInkBox({ ...centred, inkAscent: Number.NaN })).toBeNull();
    expect(emojiInkBox({ ...centred, inkLeft: 0, inkRight: 0 })).toBeNull();
  });
});

describe("emojiTransform", () => {
  it("scales a small glyph up, keeping a tenth of room", () => {
    const small = emojiInkBox({
      ...centred,
      inkAscent: 0.25,
      inkDescent: 0.05,
      inkLeft: 0.35,
      inkRight: 0.35,
    });
    const transform = emojiTransform(small);
    // 墨迹 0.7 宽 × 0.3 高（取长边）：放 1/0.7 ≈ 1.43 倍，再留一成 → 1.2857
    expect(transform?.scale).toBeCloseTo(1.2857);
    // 纵向中心在 0.725，要挪到 0.5
    expect(transform?.y).toBeCloseTo(-0.225);
  });

  it("centres a glyph that is already full width without scaling it up", () => {
    const wide = emojiInkBox({
      ...centred,
      inkAscent: 0.3,
      inkDescent: 0.3,
      inkLeft: 0.5,
      inkRight: 0.5,
    });
    const transform = emojiTransform(wide);
    // 墨迹横向已经占满 0..1（下沿越出字框，被截到 1）
    expect(transform?.scale).toBeCloseTo(0.9);
    expect(transform?.x).toBeCloseTo(0);
    expect(transform?.y).toBeCloseTo(-0.2625);
  });

  it("gives up when there is nothing to measure", () => {
    expect(emojiTransform(null)).toBeNull();
  });
});
