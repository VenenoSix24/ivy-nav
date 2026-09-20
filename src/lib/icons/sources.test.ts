import { describe, expect, it } from "vitest";
import { ICON_SOURCES, iconSource, isIconSourceId, normalizeIconSource } from "./sources";

describe("icon sources", () => {
  it("keeps the third-party ones last in the chain", () => {
    // 前面几条都是站点自己给的
    const ids = ICON_SOURCES.map((entry) => entry.id);
    const firstThirdParty = ICON_SOURCES.findIndex((entry) => entry.thirdParty);
    expect(firstThirdParty).toBeGreaterThan(0);
    expect(ids.slice(firstThirdParty).every((id) => iconSource(id)?.thirdParty)).toBe(true);
  });

  it("recognizes only the sources it ships", () => {
    expect(isIconSourceId("declared")).toBe(true);
    expect(isIconSourceId("icon.horse")).toBe(true);
    expect(isIconSourceId("google")).toBe(false);
    expect(isIconSourceId(null)).toBe(false);
    expect(isIconSourceId(3)).toBe(false);
  });

  it("treats anything else as 'pick one for me'", () => {
    // 认不出来的值都退回自动链
    expect(normalizeIconSource(null)).toBeNull();
    expect(normalizeIconSource("")).toBeNull();
    expect(normalizeIconSource("https://example.com/a.png")).toBeNull();
    expect(normalizeIconSource("manifest")).toBe("manifest");
  });
});
