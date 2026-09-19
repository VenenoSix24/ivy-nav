import { describe, expect, it } from "vitest";
import { isSafeUrl, normalizeUrl, parseHttpUrl, toDomain } from "./url";

describe("parseHttpUrl", () => {
  it("accepts bare hosts and assumes https", () => {
    expect(parseHttpUrl("github.com")?.protocol).toBe("https:");
    expect(parseHttpUrl("  github.com/foo  ")?.pathname).toBe("/foo");
  });

  it("accepts http and https URLs", () => {
    expect(parseHttpUrl("http://example.com")?.protocol).toBe("http:");
    expect(parseHttpUrl("https://example.com/a/b?c=1#d")?.search).toBe("?c=1");
  });

  it("rejects dangerous protocols", () => {
    expect(parseHttpUrl("javascript:alert(1)")).toBeNull();
    expect(parseHttpUrl("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(parseHttpUrl("file:///etc/passwd")).toBeNull();
    expect(parseHttpUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("rejects empty and malformed input", () => {
    expect(parseHttpUrl("")).toBeNull();
    expect(parseHttpUrl("   ")).toBeNull();
    expect(parseHttpUrl("not a url")).toBeNull();
    expect(parseHttpUrl("http://")).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("round-trips a bare host into an absolute URL", () => {
    expect(normalizeUrl("github.com")).toBe("https://github.com/");
  });

  it("returns null for unsafe input", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("toDomain", () => {
  it("strips the leading www", () => {
    expect(toDomain("https://www.github.com/VenenoSix24")).toBe("github.com");
    expect(toDomain("www.github.com")).toBe("github.com");
  });

  it("returns null when the URL is unusable", () => {
    expect(toDomain("javascript:alert(1)")).toBeNull();
  });
});

describe("isSafeUrl", () => {
  it("is false for schemes that could execute", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("https://example.com")).toBe(true);
  });
});
