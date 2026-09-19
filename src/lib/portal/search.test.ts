import { describe, expect, it } from "vitest";
import { matchesQuery, type SearchSubject } from "./search";

const github: SearchSubject = {
  title: "GitHub",
  description: "代码托管与协作。",
  url: "https://github.com",
  domain: "github.com",
  tags: ["Dev"],
  categoryName: "Frequently Used",
};

describe("matchesQuery", () => {
  it("matches everything when the query is empty", () => {
    expect(matchesQuery(github, "")).toBe(true);
    expect(matchesQuery(github, "   ")).toBe(true);
  });

  it("ignores case", () => {
    expect(matchesQuery(github, "GITHUB")).toBe(true);
  });

  it("looks through title, domain, tags and category", () => {
    expect(matchesQuery(github, "github")).toBe(true);
    expect(matchesQuery(github, "dev")).toBe(true);
    expect(matchesQuery(github, "frequently")).toBe(true);
    expect(matchesQuery(github, "托管")).toBe(true);
  });

  it("requires every term to match", () => {
    expect(matchesQuery(github, "github dev")).toBe(true);
    expect(matchesQuery(github, "github figma")).toBe(false);
  });

  it("rejects unrelated queries", () => {
    expect(matchesQuery(github, "bilibili")).toBe(false);
  });

  it("handles a missing description and category", () => {
    const bare: SearchSubject = {
      title: "Flux",
      description: null,
      url: "https://example.com",
      domain: "example.com",
      tags: [],
      categoryName: null,
    };
    expect(matchesQuery(bare, "flux")).toBe(true);
    expect(matchesQuery(bare, "example")).toBe(true);
  });
});
