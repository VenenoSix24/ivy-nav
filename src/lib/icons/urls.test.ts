import { describe, expect, it } from "vitest";
import { itemFaviconSrc, libraryIconSrc, previewFaviconSrc } from "./urls";

describe("itemFaviconSrc", () => {
  it("carries the chosen source as a version stamp", () => {
    // 这个参数别删：URL 不变的话浏览器会拿 7 天前缓存的那张图
    expect(itemFaviconSrc(7)).toBe("/api/icons/favicon?item=7");
    expect(itemFaviconSrc(7, "favicon.im")).toBe("/api/icons/favicon?item=7&v=favicon.im");
  });

  it("ignores a blank stamp", () => {
    expect(itemFaviconSrc(7, "")).toBe("/api/icons/favicon?item=7");
    expect(itemFaviconSrc(7, "   ")).toBe("/api/icons/favicon?item=7");
    expect(itemFaviconSrc(7, null)).toBe("/api/icons/favicon?item=7");
  });
});

describe("previewFaviconSrc", () => {
  it("encodes the url and only adds a source when there is one", () => {
    expect(previewFaviconSrc("https://a.com/x?y=1")).toBe(
      "/api/icons/resolve?url=https%3A%2F%2Fa.com%2Fx%3Fy%3D1",
    );
    expect(previewFaviconSrc("https://a.com", "declared")).toBe(
      "/api/icons/resolve?url=https%3A%2F%2Fa.com&source=declared",
    );
  });
});

describe("libraryIconSrc", () => {
  it("passes the color through when there is one", () => {
    expect(libraryIconSrc("iconify", "mdi:home")).toBe(
      "/api/icons/library/icon?lib=iconify&name=mdi%3Ahome",
    );
    expect(libraryIconSrc("iconify", "mdi:home", "#ffffff")).toBe(
      "/api/icons/library/icon?lib=iconify&name=mdi%3Ahome&color=%23ffffff",
    );
  });
});
