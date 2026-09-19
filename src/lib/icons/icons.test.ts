import { describe, expect, it } from "vitest";
import { emojiCatalog, emojiGroups, searchEmoji } from "./emoji";
import { pickIconHref } from "./favicon";

const BASE = new URL("https://example.com/blog/post");

describe("pickIconHref", () => {
  it("falls back to /favicon.ico when nothing is declared", () => {
    expect(pickIconHref("<html><head></head></html>", BASE)).toBe(
      "https://example.com/favicon.ico",
    );
  });

  it("reads a plain icon link", () => {
    const html = '<link rel="icon" href="/static/icon.png">';
    expect(pickIconHref(html, BASE)).toBe("https://example.com/static/icon.png");
  });

  it("resolves relative hrefs against the page", () => {
    const html = '<link rel="shortcut icon" href="favicon-32.png">';
    expect(pickIconHref(html, BASE)).toBe("https://example.com/blog/favicon-32.png");
  });

  it("prefers the largest declared size", () => {
    const html = [
      '<link rel="icon" sizes="32x32" href="/small.png">',
      '<link rel="icon" sizes="192x192" href="/big.png">',
    ].join("");
    expect(pickIconHref(html, BASE)).toBe("https://example.com/big.png");
  });

  it("prefers apple-touch-icon over an unspecified icon", () => {
    const html = [
      '<link rel="icon" href="/a.png">',
      '<link rel="apple-touch-icon" href="/apple.png">',
    ].join("");
    expect(pickIconHref(html, BASE)).toBe("https://example.com/apple.png");
  });

  it("ignores links that are not icons", () => {
    const html = '<link rel="stylesheet" href="/app.css"><link rel="canonical" href="/x">';
    expect(pickIconHref(html, BASE)).toBe("https://example.com/favicon.ico");
  });

  it("still falls back when the href is unusable", () => {
    const html = '<link rel="icon" href="">';
    expect(pickIconHref(html, BASE)).toBe("https://example.com/favicon.ico");
  });
});

describe("searchEmoji", () => {
  it("returns everything for an empty query", () => {
    expect(searchEmoji("").length).toBe(emojiCatalog.length);
  });

  it("matches the character itself", () => {
    expect(searchEmoji("🚀").map((entry) => entry.char)).toContain("🚀");
  });

  it("matches English keywords", () => {
    expect(searchEmoji("deploy").map((entry) => entry.char)).toContain("🚀");
  });

  it("matches Chinese keywords", () => {
    expect(searchEmoji("部署").map((entry) => entry.char)).toContain("🚀");
    expect(searchEmoji("收藏").length).toBeGreaterThan(0);
  });

  it("narrows when several terms are given", () => {
    expect(searchEmoji("rocket deploy").map((entry) => entry.char)).toEqual(["🚀"]);
    expect(searchEmoji("rocket nothing-matches")).toHaveLength(0);
  });

  it("has a group for every entry and no duplicate characters", () => {
    const chars = emojiCatalog.map((entry) => entry.char);
    expect(new Set(chars).size).toBe(chars.length);
    for (const entry of emojiCatalog) expect(emojiGroups()).toContain(entry.group);
  });
});
