import { describe, expect, it } from "vitest";
import {
  categoryInputSchema,
  itemInputSchema,
  normalizeTagNames,
  parseTagInput,
  reorderSchema,
} from "./schemas";

describe("itemInputSchema", () => {
  it("normalises a bare host into an https URL", () => {
    const parsed = itemInputSchema.parse({ title: "GitHub", url: "github.com" });
    expect(parsed.url).toBe("https://github.com/");
  });

  it("trims the title and rejects an empty one", () => {
    expect(itemInputSchema.parse({ title: "  GitHub  ", url: "github.com" }).title).toBe("GitHub");
    expect(itemInputSchema.safeParse({ title: "   ", url: "github.com" }).success).toBe(false);
  });

  it("rejects dangerous URL schemes", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,<script>", "file:///etc/passwd"]) {
      expect(itemInputSchema.safeParse({ title: "x", url }).success).toBe(false);
    }
  });

  it("explains why a URL was rejected", () => {
    const result = itemInputSchema.safeParse({ title: "x", url: "javascript:alert(1)" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("http");
    }
  });

  it("defaults nothing it was not given", () => {
    const parsed = itemInputSchema.parse({ title: "x", url: "https://example.com" });
    expect(parsed.visibility).toBeUndefined();
    expect(parsed.categoryId).toBeUndefined();
    expect(parsed.tagNames).toBeUndefined();
  });

  it("rejects an over-long tag list", () => {
    const tagNames = Array.from({ length: 13 }, (_, index) => `tag-${index}`);
    expect(itemInputSchema.safeParse({ title: "x", url: "example.com", tagNames }).success).toBe(
      false,
    );
  });
});

describe("categoryInputSchema", () => {
  it("requires a name", () => {
    expect(categoryInputSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(categoryInputSchema.parse({ name: " Tools " }).name).toBe("Tools");
  });
});

describe("reorderSchema", () => {
  it("requires at least one id", () => {
    expect(reorderSchema.safeParse({ orderedIds: [] }).success).toBe(false);
    expect(reorderSchema.parse({ orderedIds: [3, 1] }).orderedIds).toEqual([3, 1]);
  });
});

describe("normalizeTagNames", () => {
  it("drops duplicates regardless of case and strips leading hashes", () => {
    expect(normalizeTagNames(["#Git", "git", " GIT ", "", "AI"])).toEqual(["Git", "AI"]);
  });
});

describe("parseTagInput", () => {
  it("splits on spaces and both comma styles", () => {
    expect(parseTagInput("Git, AI，Dev  Self-hosted")).toEqual(["Git", "AI", "Dev", "Self-hosted"]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseTagInput("   ")).toEqual([]);
  });
});
