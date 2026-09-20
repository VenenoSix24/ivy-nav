import { describe, expect, it } from "vitest";
import { simpleIconsSource } from "./simple-icons";

describe("simpleIconsSource", () => {
  it("searches by slug and by title, exact match first", async () => {
    const { hits, total } = await simpleIconsSource.search("github");
    expect(total).toBeGreaterThan(0);
    expect(hits[0]?.name).toBe("github");
    expect(hits[0]?.title).toBe("GitHub");
  });

  it("matches every word, so a spaced query still lands", async () => {
    // 名字里没有空格，整串匹配会搜不到；分词之后「google chrome」才命中
    const { hits } = await simpleIconsSource.search("google chrome");
    expect(hits.map((hit) => hit.name)).toContain("googlechrome");
  });

  it("gives a head batch when the query is empty, not the whole library", async () => {
    const { hits, total } = await simpleIconsSource.search("");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(60);
    // 库里三千多，一次只给头一批
    expect(total).toBeGreaterThan(1000);
  });

  it("carries the brand colour and the brand guidelines", async () => {
    const { hits } = await simpleIconsSource.search("github");
    expect(hits[0]?.color).toBe("#181717");
    expect(hits[0]?.guidelines).toBe("https://github.com/logos");
  });

  it("paints the official svg on the root element", async () => {
    const plain = await simpleIconsSource.fetchIcon("github", null);
    expect(plain?.contentType).toBe("image/svg+xml");
    expect(plain?.body.toString("utf8")).not.toContain('fill="#');

    const red = await simpleIconsSource.fetchIcon("github", "#ff0000");
    expect(red?.body.toString("utf8")).toContain('<svg fill="#ff0000"');
  });

  it("returns null for a name it does not have", async () => {
    await expect(simpleIconsSource.fetchIcon("no-such-icon-here", null)).resolves.toBeNull();
  });
});

describe("search order", () => {
  it("puts a prefix match above a mid-name match", async () => {
    const { hits } = await simpleIconsSource.search("git");
    const names = hits.map((hit) => hit.name);
    expect(names.indexOf("github")).toBeLessThan(names.indexOf("gitlab"));
    expect(names).toContain("githubactions");
  });
});
