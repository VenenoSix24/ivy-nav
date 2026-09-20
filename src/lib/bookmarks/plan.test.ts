import { describe, expect, it } from "vitest";
import { parseBookmarksHtml } from "./parse";
import { planBookmarkImport, toPreview, type BookmarkIndex } from "./plan";

const EMPTY: BookmarkIndex = { categories: [], tags: [], items: [] };

function plan(html: string, index: BookmarkIndex = EMPTY) {
  return planBookmarkImport(parseBookmarksHtml(html), index);
}

describe("planBookmarkImport", () => {
  it("skips the browser's own top-level folders and files their children as categories", () => {
    const result = plan(`<DL><p>
      <DT><H3>书签栏</H3>
      <DL><p>
        <DT><A HREF="https://github.com">GitHub</A>
        <DT><H3>设计</H3><DL><p><DT><A HREF="https://figma.com">Figma</A></DL><p>
      </DL><p>
      <DT><H3>其他书签</H3>
      <DL><p><DT><H3>阅读</H3><DL><p><DT><A HREF="https://sspai.com">少数派</A></DL><p></DL><p>
    </DL><p>`);

    expect(result.ignoredRoots).toEqual(["书签栏", "其他书签"]);
    expect(result.items.map((item) => [item.title, item.categoryName, item.tags])).toEqual([
      ["GitHub", null, []],
      ["Figma", "设计", []],
      ["少数派", "阅读", []],
    ]);
    expect(result.categories.map((category) => category.name)).toEqual(["设计", "阅读"]);
  });

  it("turns the second level into a tag and every deeper level into its own tag", () => {
    const result = plan(`<DL><p><DT><H3>设计</H3><DL><p>
      <DT><H3>灵感</H3><DL><p>
        <DT><A HREF="https://b.com">B</A>
        <DT><H3>配色</H3><DL><p><DT><A HREF="https://a.com">A</A></DL><p>
      </DL><p>
    </DL><p></DL><p>`);

    // 一个目录自己的书签排在它的子目录前面
    expect(result.items).toEqual([
      {
        title: "B",
        url: "https://b.com/",
        description: null,
        categoryName: "设计",
        tags: ["灵感"],
        existingItemId: null,
      },
      {
        title: "A",
        url: "https://a.com/",
        description: null,
        categoryName: "设计",
        tags: ["灵感", "配色"],
        existingItemId: null,
      },
    ]);
    expect(result.tags).toEqual([
      { name: "灵感", count: 2, existing: false },
      { name: "配色", count: 1, existing: false },
    ]);
  });

  it("keeps the first copy of a url and counts the rest", () => {
    const result = plan(`<DL><p>
      <DT><H3>A</H3><DL><p><DT><A HREF="https://x.com">X</A></DL><p>
      <DT><H3>B</H3><DL><p>
        <DT><A HREF="https://x.com/">X again</A>
        <DT><A HREF="https://x.com/?q=1">X with query</A>
      </DL><p>
    </DL><p>`);

    expect(result.duplicatesInFile).toBe(1);
    expect(result.items.map((item) => item.url)).toEqual(["https://x.com/", "https://x.com/?q=1"]);
    expect(result.total).toBe(3);
  });

  it("marks already-imported urls so the caller can skip or update them", () => {
    const index: BookmarkIndex = {
      categories: ["工具"],
      tags: ["灵感"],
      items: [{ id: 7, url: "https://github.com/" }],
    };
    const result = plan(
      `<DL><p><DT><H3>工具</H3><DL><p>
        <DT><A HREF="https://github.com">GitHub</A>
        <DT><H3>灵感</H3><DL><p><DT><A HREF="https://新站点.com">新站点</A></DL><p>
      </DL><p></DL><p>`,
      index,
    );

    expect(result.existingDuplicates).toBe(1);
    expect(result.items[0]?.existingItemId).toBe(7);
    expect(result.items[1]?.existingItemId).toBeNull();
    // 分类与标签按名字复用，不区分大小写
    expect(result.categories).toEqual([{ name: "工具", count: 2, existing: true }]);
    expect(result.tags).toEqual([{ name: "灵感", count: 1, existing: true }]);
  });

  it("drops rows whose url is not http(s) and says why", () => {
    const result = plan(`<DL><p>
      <DT><A HREF="javascript:alert(1)">危险</A>
      <DT><A HREF="">空的</A>
      <DT><A HREF="https://ok.com">可以</A>
    </DL><p>`);

    expect(result.items).toHaveLength(1);
    expect(result.invalid).toEqual([
      { title: "危险", url: "javascript:alert(1)", reason: "只支持 http 与 https" },
      { title: "空的", url: "", reason: "没有网址" },
    ]);
    expect(result.total).toBe(3);
  });

  it("falls back to the domain for a bookmark without a title", () => {
    const result = plan(`<DL><p><DT><A HREF="https://www.example.com/x">   </A></DL><p>`);
    expect(result.items[0]?.title).toBe("example.com");
    expect(result.derivedTitles).toBe(1);
  });

  it("clips titles, descriptions and tag lists to the portal's limits", () => {
    const long = "标".repeat(90);
    const manyFolders = Array.from(
      { length: 14 },
      (_, index) => `<DT><H3>标签${index}</H3><DL><p>`,
    ).join("");
    const closing = "</DL><p>".repeat(14);

    const result = plan(
      `<DL><p><DT><H3>分类</H3><DL><p>${manyFolders}
        <DT><A HREF="https://a.com">${long}</A><DD>${"说".repeat(320)}
      ${closing}</DL><p></DL><p>`,
    );

    const item = result.items[0];
    expect(item?.title).toHaveLength(80);
    expect(item?.description).toHaveLength(300);
    expect(item?.tags).toHaveLength(12);
    expect(result.truncatedTitles).toBe(1);
    expect(result.truncatedDescriptions).toBe(1);
    expect(result.truncatedTags).toBe(1);
  });

  it("treats a folder with a blank name as that level not existing", () => {
    const result = plan(
      `<DL><p><DT><H3>   </H3><DL><p><DT><A HREF="https://a.com">A</A></DL><p></DL><p>`,
    );
    expect(result.items[0]?.categoryName).toBeNull();
  });
});

describe("toPreview", () => {
  it("ships the counts and a sample, not the whole plan", () => {
    const links = Array.from(
      { length: 30 },
      (_, index) => `<DT><A HREF="https://site${index}.com">站点 ${index}</A>`,
    ).join("");
    const result = plan(`<DL><p>${links}</DL><p>`);
    const preview = toPreview(result);

    expect(preview.total).toBe(30);
    expect(preview.importable).toBe(30);
    expect(preview.sample).toHaveLength(20);
    expect(preview.categories).toEqual([]);
    expect(preview.invalid).toEqual([]);
  });

  it("caps the long lists but keeps their totals", () => {
    const links = Array.from(
      { length: 60 },
      (_, index) => `<DT><A HREF="javascript:x${index}">坏 ${index}</A>`,
    ).join("");
    const preview = toPreview(plan(`<DL><p>${links}</DL><p>`));

    expect(preview.invalid).toHaveLength(50);
    expect(preview.invalidTotal).toBe(60);
    expect(preview.importable).toBe(0);
  });
});
