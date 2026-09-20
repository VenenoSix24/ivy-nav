import { describe, expect, it } from "vitest";
import { BACKUP_FORMAT, BACKUP_VERSION, parseBackupDocument } from "./schema";

const valid = {
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  exportedAt: "2026-09-19T00:00:00.000Z",
  categories: [{ name: "Tools", sortOrder: 0, visibleOnHomepage: true, visibility: "public" }],
  items: [
    {
      title: "GitHub",
      url: "https://github.com",
      categoryName: "Tools",
      tags: ["Dev"],
      iconType: "favicon",
      visibility: "private",
    },
  ],
};

describe("parseBackupDocument", () => {
  it("accepts a document this project produced", () => {
    const result = parseBackupDocument(valid);
    expect(result.ok).toBe(true);
    expect(result.document?.items).toHaveLength(1);
  });

  it("rejects a document missing the format marker", () => {
    const result = parseBackupDocument({ ...valid, format: "something-else" });
    expect(result.ok).toBe(false);
  });

  it("explains a version mismatch instead of listing field errors", () => {
    const result = parseBackupDocument({ ...valid, version: 99 });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("version");
  });

  it("names the offending field", () => {
    const result = parseBackupDocument({ ...valid, items: [{ title: "", url: "https://a.com" }] });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("items.0.title");
  });

  it("refuses URLs that a strict protocol check would have blocked", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd"]) {
      const result = parseBackupDocument({ ...valid, items: [{ title: "x", url }] });
      expect(result.ok).toBe(false);
    }
  });

  it("rejects non-objects and null", () => {
    expect(parseBackupDocument(null).ok).toBe(false);
    expect(parseBackupDocument("{}").ok).toBe(false);
    expect(parseBackupDocument([]).ok).toBe(false);
  });

  it("strips unknown keys so a newer export cannot smuggle fields in", () => {
    const result = parseBackupDocument({ ...valid, unexpected: "value" });
    expect(result.ok).toBe(true);
    expect(result.document).not.toHaveProperty("unexpected");
  });

  it("takes the icon flags when it has them and defaults them when it does not", () => {
    // 旧备份里没有这两项：图标遮罩默认开、单色默认关，导入后与新建条目一致
    const withFlags = parseBackupDocument({
      ...valid,
      items: [{ ...valid.items[0], iconPlate: false, iconMono: true }],
    });
    expect(withFlags.document?.items[0]?.iconPlate).toBe(false);
    expect(withFlags.document?.items[0]?.iconMono).toBe(true);

    const withoutFlags = parseBackupDocument(valid);
    expect(withoutFlags.ok).toBe(true);
    expect(withoutFlags.document?.items[0]?.iconPlate).toBeUndefined();
  });

  it("allows the optional collections to be absent", () => {
    const result = parseBackupDocument({ ...valid });
    expect(result.ok).toBe(true);
    expect(result.document?.tags).toBeUndefined();
    expect(result.document?.settings).toBeUndefined();
  });

  it("caps how much a single file may carry", () => {
    const items = Array.from({ length: 5001 }, (_, index) => ({
      title: `item ${index}`,
      url: "https://example.com",
    }));
    expect(parseBackupDocument({ ...valid, items }).ok).toBe(false);
  });
});
