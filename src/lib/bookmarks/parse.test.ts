import { describe, expect, it } from "vitest";
import { countLinks, decodeEntities, parseBookmarksHtml } from "./parse";

/** Chrome（简体中文）导出的一小段 */
const CHROME = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1700000000" LAST_MODIFIED="1700000001" PERSONAL_TOOLBAR_FOLDER="true">书签栏</H3>
    <DL><p>
        <DT><H3 ADD_DATE="1700000002">设计</H3>
        <DL><p>
            <DT><H3 ADD_DATE="1700000003">灵感</H3>
            <DL><p>
                <DT><A HREF="https://www.dribbble.com/" ADD_DATE="1700000004" ICON="data:image/png;base64,iVBORw0KGgo=">Dribbble</A>
                <DT><A HREF="https://www.behance.net/">Behance &amp; more</A>
            </DL><p>
            <DT><A HREF="https://www.figma.com/">Figma</A>
            <DD>在线设计工具
        </DL><p>
        <DT><A HREF="https://github.com">GitHub</A>
    </DL><p>
    <DT><H3>其他书签</H3>
    <DL><p>
        <DT><A HREF="https://example.com/">Example</A>
    </DL><p>
</DL><p>
`;

describe("parseBookmarksHtml", () => {
  it("rebuilds the folder tree and keeps every link", () => {
    const tree = parseBookmarksHtml(CHROME);
    expect(countLinks(tree)).toBe(5);
    expect(tree.folders.map((folder) => folder.name)).toEqual(["书签栏", "其他书签"]);

    const bar = tree.folders[0];
    expect(bar?.links.map((link) => link.title)).toEqual(["GitHub"]);

    const design = bar?.folders[0];
    expect(design?.name).toBe("设计");
    expect(design?.links.map((link) => link.title)).toEqual(["Figma"]);
    expect(design?.folders[0]?.links.map((link) => link.title)).toEqual([
      "Dribbble",
      "Behance & more",
    ]);
  });

  it("reads the <DD> description onto the link just above it", () => {
    const tree = parseBookmarksHtml(CHROME);
    const figma = tree.folders[0]?.folders[0]?.links[0];
    expect(figma?.description).toBe("在线设计工具");
    // 没有 <DD> 的条目保持 null
    expect(tree.folders[0]?.links[0]?.description).toBeNull();
  });

  it("decodes entities in titles and attributes", () => {
    const tree = parseBookmarksHtml(CHROME);
    const behance = tree.folders[0]?.folders[0]?.folders[0]?.links[1];
    expect(behance?.title).toBe("Behance & more");
    expect(behance?.url).toBe("https://www.behance.net/");
  });

  it("keeps collecting text through inline tags inside a title", () => {
    const tree = parseBookmarksHtml(
      `<DL><p><DT><A HREF="https://a.com">前 <B>中</B> 后</A></DL><p>`,
    );
    expect(tree.links[0]?.title).toBe("前 中 后");
  });

  it("does not end a tag at a '>' inside a quoted attribute", () => {
    const tree = parseBookmarksHtml(
      `<DL><p><DT><A HREF="https://a.com/?q=1&r=2" TITLE="a>b">A</A></DL>`,
    );
    expect(tree.links[0]?.url).toBe("https://a.com/?q=1&r=2");
    expect(tree.links[0]?.title).toBe("A");
  });

  it("survives the unclosed <DL><p> pairs and a file with no wrapper folder", () => {
    const tree = parseBookmarksHtml(
      `<DL><p><DT><A HREF="https://a.com">A</A><DT><H3>B</H3><DL><p><DT><A HREF="https://b.com">B</A></DL><p></DL><p>`,
    );
    expect(tree.links.map((link) => link.title)).toEqual(["A"]);
    expect(tree.folders[0]?.name).toBe("B");
    expect(tree.folders[0]?.links[0]?.url).toBe("https://b.com");
  });

  it("returns an empty tree for a file that is not a bookmark export", () => {
    expect(countLinks(parseBookmarksHtml("<html><body>hello</body></html>"))).toBe(0);
    expect(countLinks(parseBookmarksHtml(""))).toBe(0);
  });
});

describe("decodeEntities", () => {
  it("handles named, decimal and hex entities", () => {
    expect(decodeEntities("a &amp; b &lt;c&gt; &#65; &#x4e2d;")).toBe("a & b <c> A 中");
  });

  it("leaves unknown entities alone", () => {
    expect(decodeEntities("100&fake; 200 &")).toBe("100&fake; 200 &");
  });
});
