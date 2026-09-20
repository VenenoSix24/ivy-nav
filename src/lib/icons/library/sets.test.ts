import { describe, expect, it } from "vitest";
import { SetError, mirrorUrl, parseIconSet } from "./sets";

describe("mirrorUrl", () => {
  it("rewrites a raw.githubusercontent address onto jsDelivr", () => {
    expect(
      mirrorUrl("https://raw.githubusercontent.com/fmz200/wool_scripts/main/icons/app/x.png"),
    ).toBe("https://cdn.jsdelivr.net/gh/fmz200/wool_scripts@main/icons/app/x.png");
  });

  it("leaves anything else alone", () => {
    const url = "https://cdn.jsdelivr.net/gh/a/b@main/x.png";
    expect(mirrorUrl(url)).toBe(url);
    expect(mirrorUrl("https://example.com/x.png")).toBe("https://example.com/x.png");
  });
});

describe("parseIconSet", () => {
  it("reads the shape the wool_scripts set uses", () => {
    const raw = JSON.stringify({
      name: "fmz200の图标库",
      description: "收集一些自己常用的图标",
      icons: [
        { name: "ChatGPT", url: "https://raw.githubusercontent.com/a/b/main/chatgpt.png" },
        { name: "GitHub", url: "https://raw.githubusercontent.com/a/b/main/github.png" },
      ],
    });

    const parsed = parseIconSet(raw, true, "fallback");
    expect(parsed.name).toBe("fmz200の图标库");
    expect(parsed.description).toBe("收集一些自己常用的图标");
    expect(parsed.mirrored).toBe(true);
    expect(parsed.icons).toEqual([
      { name: "ChatGPT", url: "https://cdn.jsdelivr.net/gh/a/b@main/chatgpt.png" },
      { name: "GitHub", url: "https://cdn.jsdelivr.net/gh/a/b@main/github.png" },
    ]);
  });

  it("keeps the original addresses when the mirror is off", () => {
    const raw = JSON.stringify([
      { name: "a", url: "https://raw.githubusercontent.com/a/b/main/a.png" },
    ]);
    expect(parseIconSet(raw, false, "x").icons[0]?.url).toBe(
      "https://raw.githubusercontent.com/a/b/main/a.png",
    );
  });

  it("accepts a bare array and a name→url map", () => {
    const array = parseIconSet(
      JSON.stringify([{ name: "a", src: "https://example.com/a.png" }]),
      false,
      "数组名",
    );
    expect(array.name).toBe("数组名");
    expect(array.icons[0]).toEqual({ name: "a", url: "https://example.com/a.png" });

    const map = parseIconSet(
      JSON.stringify({ 知乎: "https://example.com/zhihu.png" }),
      false,
      "映射名",
    );
    expect(map.icons).toEqual([{ name: "知乎", url: "https://example.com/zhihu.png" }]);
  });

  it("names an entry after its file when the JSON gives no name", () => {
    const parsed = parseIconSet(JSON.stringify(["https://example.com/My%20Icon.png"]), false, "x");
    expect(parsed.icons[0]).toEqual({ name: "My Icon", url: "https://example.com/My%20Icon.png" });
  });

  it("skips entries without a usable http(s) address and duplicate names", () => {
    const raw = JSON.stringify([
      { name: "a", url: "https://example.com/a.png" },
      { name: "a", url: "https://example.com/a-2.png" },
      { name: "b", url: "javascript:alert(1)" },
      { name: "c" },
      { name: "d", url: "http://example.com/d.png" },
    ]);

    expect(parseIconSet(raw, false, "x").icons).toEqual([
      { name: "a", url: "https://example.com/a.png" },
      { name: "d", url: "http://example.com/d.png" },
    ]);
  });

  it("explains what is wrong instead of throwing something raw", () => {
    expect(() => parseIconSet("not json", false, "x")).toThrow(SetError);
    expect(() => parseIconSet(JSON.stringify({ name: "空" }), false, "x")).toThrow(SetError);
    expect(() =>
      parseIconSet(JSON.stringify([{ name: "b", url: "javascript:alert(1)" }]), false, "x"),
    ).toThrow(SetError);
  });
});
