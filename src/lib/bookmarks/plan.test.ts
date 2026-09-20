import { describe, expect, it } from "vitest";
import { parseBookmarksHtml } from "./parse";
import {
  INBOX_KEY,
  mergePreview,
  planBookmarkImport,
  toPreviewPayload,
  type BookmarkIndex,
} from "./plan";

const EMPTY: BookmarkIndex = { categories: [], tags: [], items: [] };

function plan(html: string, index: BookmarkIndex = EMPTY, selection?: string[] | null) {
  return planBookmarkImport(parseBookmarksHtml(html), index, selection);
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
    // 顶层目录排在前，散着的书签（Inbox）落在最后
    expect(result.items.map((entry) => [entry.title, entry.categoryName, entry.tags])).toEqual([
      ["Figma", "设计", []],
      ["少数派", "阅读", []],
      ["GitHub", null, []],
    ]);
    expect(result.preview.categories.map((category) => category.name)).toEqual(["设计", "阅读"]);
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
    expect(result.preview.tags).toEqual([
      { name: "灵感", count: 2, existing: false },
      { name: "配色", count: 1, existing: false },
    ]);
  });

  it("keeps a url that appears in two folders, once per category", () => {
    const result = plan(`<DL><p>
      <DT><H3>A</H3><DL><p><DT><A HREF="https://x.com">X</A></DL><p>
      <DT><H3>B</H3><DL><p>
        <DT><A HREF="https://x.com/">X again</A>
        <DT><A HREF="https://x.com/?q=1">X with query</A>
      </DL><p>
    </DL><p>`);

    // 同一份文件里的同一个网址，跨分类保留、同分类内只留第一次
    expect(result.items.map((entry) => [entry.categoryName, entry.url])).toEqual([
      ["A", "https://x.com/"],
      ["B", "https://x.com/"],
      ["B", "https://x.com/?q=1"],
    ]);
    expect(result.preview.repeatsInFile).toBe(0);
    expect(result.shared).toEqual({
      urls: 1,
      extra: 1,
      sample: [{ title: "X", url: "https://x.com/", categories: ["A", "B"] }],
    });
  });

  it("drops a repeat inside one category but says how many", () => {
    const result = plan(`<DL><p><DT><H3>A</H3><DL><p>
      <DT><A HREF="https://x.com">X</A>
      <DT><A HREF="https://x.com/">X 又一遍</A>
    </DL><p></DL><p>`);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("X");
    expect(result.preview.repeatsInFile).toBe(1);
    expect(result.shared.urls).toBe(0);
  });

  it("counts the url as an Inbox copy when it is only at the top level elsewhere", () => {
    const result = plan(`<DL><p>
      <DT><A HREF="https://x.com">散着的 X</A>
      <DT><H3>A</H3><DL><p><DT><A HREF="https://x.com">X</A></DL><p>
    </DL><p>`);

    expect(result.items.map((entry) => entry.categoryName)).toEqual(["A", null]);
    expect(result.shared.sample[0]?.categories).toEqual(["A", "未分类"]);
  });

  it("marks items whose category already holds the same url", () => {
    const index: BookmarkIndex = {
      categories: ["工具"],
      tags: ["灵感"],
      items: [{ id: 7, url: "https://github.com/", categoryName: "工具" }],
    };
    const result = plan(
      `<DL><p><DT><H3>工具</H3><DL><p>
        <DT><A HREF="https://github.com">GitHub</A>
        <DT><A HREF="https://新站点.com">新站点</A>
      </DL><p>
      <DT><H3>收藏夹</H3><DL><p><DT><A HREF="https://github.com">GitHub 再放一份</A></DL><p>
      </DL><p>`,
      index,
    );

    // 「工具」里已有，标记出来；「收藏夹」里没有，不算重复
    expect(result.items.find((entry) => entry.title === "GitHub")?.existingItemId).toBe(7);
    expect(
      result.items.find((entry) => entry.title === "GitHub 再放一份")?.existingItemId,
    ).toBeNull();
    expect(result.preview.existingDuplicates).toBe(1);
    expect(result.preview.categories).toEqual([{ name: "工具", count: 2, existing: true }]);
  });

  it("matches existing tags by name so they are reused, not re-created", () => {
    const index: BookmarkIndex = { categories: [], tags: ["灵感"], items: [] };
    const result = plan(
      `<DL><p><DT><H3>设计</H3><DL><p><DT><H3>灵感</H3><DL><p>
        <DT><A HREF="https://a.com">A</A>
      </DL><p></DL><p></DL><p>`,
      index,
    );

    expect(result.preview.tags).toEqual([{ name: "灵感", count: 1, existing: true }]);
  });

  it("drops rows whose url is not http(s) and says why", () => {
    const result = plan(`<DL><p>
      <DT><A HREF="javascript:alert(1)">危险</A>
      <DT><A HREF="">空的</A>
      <DT><A HREF="https://ok.com">可以</A>
    </DL><p>`);

    expect(result.items).toHaveLength(1);
    expect(result.preview.invalid).toEqual([
      { title: "危险", url: "javascript:alert(1)", reason: "只支持 http 与 https" },
      { title: "空的", url: "", reason: "没有网址" },
    ]);
    expect(result.total).toBe(3);
  });

  it("falls back to the domain for a bookmark without a title", () => {
    const result = plan(`<DL><p><DT><A HREF="https://www.example.com/x">   </A></DL><p>`);
    expect(result.items[0]?.title).toBe("example.com");
    expect(result.preview.derivedTitles).toBe(1);
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

    const entry = result.items[0];
    expect(entry?.title).toHaveLength(80);
    expect(entry?.description).toHaveLength(300);
    expect(entry?.tags).toHaveLength(12);
    expect(result.preview.truncatedTitles).toBe(1);
    expect(result.preview.truncatedDescriptions).toBe(1);
    expect(result.preview.truncatedTags).toBe(1);
  });

  it("treats a folder with a blank name as that level not existing", () => {
    const result = plan(
      `<DL><p><DT><H3>   </H3><DL><p><DT><A HREF="https://a.com">A</A></DL><p></DL><p>`,
    );
    expect(result.items[0]?.categoryName).toBeNull();
  });
});

const FOLDERS = `<DL><p>
  <DT><H3>设计</H3><DL><p>
    <DT><A HREF="https://figma.com">Figma</A>
    <DT><H3>灵感</H3><DL><p><DT><A HREF="https://dribbble.com">Dribbble</A></DL><p>
  </DL><p>
  <DT><H3>开发</H3><DL><p>
    <DT><A HREF="https://github.com">GitHub</A>
    <DT><A HREF="javascript:x">坏的</A>
  </DL><p>
  <DT><A HREF="https://sspai.com">少数派</A>
</DL><p>`;

describe("planBookmarkImport 的目录分组", () => {
  it("gives every top-level folder its own row, plus one for the loose links", () => {
    const result = plan(FOLDERS);

    expect(result.groups.map((group) => [group.key, group.name, group.count])).toEqual([
      ["f0", "设计", 2],
      ["f1", "开发", 1],
      [INBOX_KEY, "未分类", 1],
    ]);
    expect(result.groups[0]?.preview.tags).toEqual([{ name: "灵感", count: 1, existing: false }]);
    expect(result.groups[1]?.preview.invalidTotal).toBe(1);
  });

  it("leaves a group out of the plan when it is not selected", () => {
    const all = plan(FOLDERS);
    const onlyDesign = plan(FOLDERS, EMPTY, ["f0"]);

    expect(all.items).toHaveLength(4);
    expect(onlyDesign.items.map((entry) => entry.title)).toEqual(["Figma", "Dribbble"]);
    expect(onlyDesign.preview.categories).toEqual([{ name: "设计", count: 2, existing: false }]);
    // 分组清单始终是完整的，勾选只影响要导入哪些
    expect(onlyDesign.groups).toHaveLength(3);
  });

  it("imports nothing when nothing is selected", () => {
    const result = plan(FOLDERS, EMPTY, []);
    expect(result.items).toEqual([]);
    expect(result.preview.importable).toBe(0);
    expect(result.preview.categories).toEqual([]);
  });

  it("still reports the whole file's cross-category repeats whatever is selected", () => {
    const html = `<DL><p>
      <DT><H3>A</H3><DL><p><DT><A HREF="https://x.com">X</A></DL><p>
      <DT><H3>B</H3><DL><p><DT><A HREF="https://x.com">X</A></DL><p>
    </DL><p>`;
    const result = plan(html, EMPTY, ["f0"]);
    expect(result.shared.urls).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});

describe("mergePreview", () => {
  it("adds the numbers and unions the names", () => {
    const result = plan(FOLDERS);
    const merged = mergePreview(result.groups.map((group) => group.preview));

    expect(merged.total).toBe(5);
    expect(merged.importable).toBe(4);
    expect(merged.invalidTotal).toBe(1);
    expect(merged.categories.map((category) => category.name)).toEqual(["设计", "开发"]);
    expect(merged.tags.map((tag) => tag.name)).toEqual(["灵感"]);
    // 与「全部选中」那份合计一致
    expect(merged).toEqual(result.preview);
  });

  it("adds up counts for a name that two groups both use", () => {
    const html = `<DL><p>
      <DT><H3>A</H3><DL><p><DT><H3>工具</H3><DL><p><DT><A HREF="https://a.com">A</A></DL><p></DL><p>
      <DT><H3>B</H3><DL><p><DT><H3>工具</H3><DL><p>
        <DT><A HREF="https://b.com">B</A><DT><A HREF="https://c.com">C</A>
      </DL><p></DL><p>
    </DL><p>`;
    const result = plan(html);
    const merged = mergePreview(result.groups.map((group) => group.preview));

    expect(merged.tags).toEqual([{ name: "工具", count: 3, existing: false }]);
  });
});

describe("toPreviewPayload", () => {
  it("ships the groups and the totals, not the items", () => {
    const payload = toPreviewPayload(plan(FOLDERS));

    expect(payload.groups).toHaveLength(3);
    expect(payload.merged.importable).toBe(4);
    expect(payload.total).toBe(5);
    expect("items" in payload).toBe(false);
  });

  it("caps the long lists but keeps their totals", () => {
    const links = Array.from(
      { length: 60 },
      (_, index) => `<DT><A HREF="javascript:x${index}">坏 ${index}</A>`,
    ).join("");
    const preview = toPreviewPayload(plan(`<DL><p>${links}</DL><p>`)).merged;

    expect(preview.invalid).toHaveLength(50);
    expect(preview.invalidTotal).toBe(60);
    expect(preview.importable).toBe(0);
  });
});
