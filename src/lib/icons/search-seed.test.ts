import { describe, expect, it } from "vitest";
import { isLibraryPick, libraryFromPrelude, preludeOf, seedQuery } from "./search-seed";

describe("seedQuery", () => {
  it("takes the latin word out of a title", () => {
    expect(seedQuery("GitHub", "https://github.com")).toBe("GitHub");
    expect(seedQuery("GitHub · Where software is built", "https://github.com")).toBe("GitHub");
    expect(seedQuery("Vercel – Frontend Cloud", "https://vercel.com")).toBe("Vercel");
  });

  it("falls back to the domain when the title carries no latin word", () => {
    // 中文标题在图标库里搜不到，域名才是可靠的那条线索
    expect(seedQuery("哔哩哔哩 (゜-゜)つロ 干杯~", "https://www.bilibili.com/")).toBe("bilibili");
    expect(seedQuery("", "https://zhihu.com")).toBe("zhihu");
  });

  it("takes the second-level label, not the subdomain", () => {
    // chat.openai.com 要搜 openai，而不是 chat
    expect(seedQuery("", "https://chat.openai.com/")).toBe("openai");
    expect(seedQuery("", "https://news.ycombinator.com/")).toBe("ycombinator");
  });

  it("stays empty when there is nothing to go on", () => {
    expect(seedQuery("", "")).toBe("");
    expect(seedQuery("  ", "not a url")).toBe("");
  });

  it("keeps it short", () => {
    expect(seedQuery("averyveryverylongbrandnamehere", "").length).toBeLessThanOrEqual(24);
  });
});

describe("preludeOf", () => {
  it("reads the readable head of a library pick", () => {
    expect(preludeOf("simple-icons-github-181717_c3f1a2b4d5e6f708.svg")).toBe(
      "simple-icons-github-181717",
    );
    // 手传上来的图没有那段前缀
    expect(preludeOf("c3f1a2b4d5e6f708.png")).toBeNull();
    expect(preludeOf(null)).toBeNull();
  });

  it("tells a library pick from a plain upload", () => {
    expect(isLibraryPick("iconify-mdi-home_0123456789abcdef.svg")).toBe(true);
    expect(isLibraryPick("0123456789abcdef.svg")).toBe(false);
  });
});

describe("libraryFromPrelude", () => {
  const known = ["simple-icons", "iconify"];

  it("points back at the library the icon came from", () => {
    expect(libraryFromPrelude("simple-icons-github_0123456789abcdef.svg", known)).toBe(
      "simple-icons",
    );
    expect(libraryFromPrelude("iconify-mdi-home_0123456789abcdef.svg", known)).toBe("iconify");
  });

  it("maps a custom set back to its set id", () => {
    // 前缀一律小写（readableName 会 lower 一遍）
    expect(libraryFromPrelude("set-3-chatgpt_0123456789abcdef.png", known)).toBe("set:3");
  });

  it("stays silent when it cannot tell", () => {
    expect(libraryFromPrelude("0123456789abcdef.png", known)).toBeNull();
    expect(libraryFromPrelude("nothing-like-it_0123456789abcdef.svg", known)).toBeNull();
  });
});
