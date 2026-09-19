import { describe, expect, it } from "vitest";
import { looksLikeSvg, sanitizeSvg } from "./svg";

const BENIGN = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="currentColor"/></svg>';

describe("sanitizeSvg", () => {
  it("leaves a plain icon untouched", () => {
    expect(sanitizeSvg(BENIGN)).toBe(BENIGN);
  });

  it("removes script elements with their content", () => {
    const dirty = `<svg>${BENIGN}<script>alert(1)</script></svg>`;
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("alert");
  });

  it("removes self-closing script and foreignObject", () => {
    const dirty =
      '<svg><script src="//evil.test/x.js"/><foreignObject><body>x</body></foreignObject></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean.toLowerCase()).not.toContain("script");
    expect(clean.toLowerCase()).not.toContain("foreignobject");
    expect(clean).not.toContain("evil.test");
  });

  it("strips event handler attributes whatever the quoting", () => {
    const clean = sanitizeSvg(
      '<svg onload="alert(1)"><rect onclick=\'alert(2)\' onmouseover=alert(3) width="4"/></svg>',
    );
    expect(clean).not.toContain("onload");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("onmouseover");
    expect(clean).toContain("<rect");
  });

  it("drops javascript and data targets", () => {
    const clean = sanitizeSvg(
      '<svg><a href="javascript:alert(1)"><image xlink:href="data:image/svg+xml;base64,PHN2Zz4="/></a></svg>',
    );
    expect(clean).not.toContain("javascript:");
    expect(clean).not.toContain("data:image");
  });

  it("drops remote references", () => {
    const clean = sanitizeSvg(
      '<svg><use href="https://evil.test/sprite.svg#icon"/><image src="//evil.test/a.png"/></svg>',
    );
    expect(clean).not.toContain("evil.test");
    expect(clean).not.toContain("//evil");
  });

  it("keeps fragment and relative references", () => {
    const clean = sanitizeSvg('<svg><use href="#sym"/><image xlink:href="./a.png"/></svg>');
    expect(clean).toContain('href="#sym"');
    expect(clean).toContain('xlink:href="./a.png"');
  });

  it("is idempotent", () => {
    const once = sanitizeSvg('<svg><script>x</script><rect onload="x"/></svg>');
    expect(sanitizeSvg(once)).toBe(once);
  });
});

describe("looksLikeSvg", () => {
  it("accepts an svg root with or without an xml prologue", () => {
    expect(looksLikeSvg(BENIGN)).toBe(true);
    expect(looksLikeSvg('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>')).toBe(
      true,
    );
    expect(looksLikeSvg("  <SVG></SVG>")).toBe(true);
  });

  it("rejects anything else, including html pretending to be svg", () => {
    expect(looksLikeSvg("<html><body>hi</body></html>")).toBe(false);
    expect(looksLikeSvg('<?xml version="1.0"?><html/>')).toBe(false);
    expect(looksLikeSvg("")).toBe(false);
  });
});
