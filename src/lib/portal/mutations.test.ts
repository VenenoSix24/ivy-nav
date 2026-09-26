import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { itemTags, tags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createItem, renameTag, updateItem } from "./mutations";

// 连接挂在 globalThis 上，全文件共用一个临时库，所以各用例用不同的标签名
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ivy-nav-mutations-"));
process.env.DATABASE_PATH = path.join(dir, "portal.db");

function tagNames(): string[] {
  return getDb()
    .select()
    .from(tags)
    .all()
    .map((row) => row.name);
}

afterAll(() => {
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("item tags", () => {
  it("keeps the tags an item uses", () => {
    createItem({ title: "A", url: "https://a.example/", tagNames: ["设计", "工具"] });
    expect(tagNames()).toContain("设计");
    expect(tagNames()).toContain("工具");
  });

  it("drops a tag as soon as no item references it", () => {
    const created = createItem({ title: "B", url: "https://b.example/", tagNames: ["临时甲"] });
    expect(tagNames()).toContain("临时甲");

    updateItem(created!.id, { tagNames: [] });
    expect(tagNames()).not.toContain("临时甲");
  });

  it("keeps a tag another item still references", () => {
    const first = createItem({ title: "C", url: "https://c.example/", tagNames: ["共享乙"] });
    createItem({ title: "D", url: "https://d.example/", tagNames: ["共享乙"] });

    updateItem(first!.id, { tagNames: [] });
    expect(tagNames()).toContain("共享乙");
  });
});

describe("renameTag", () => {
  function findTag(name: string) {
    return getDb()
      .select()
      .from(tags)
      .all()
      .find((row) => row.name === name)!;
  }

  function linksOf(itemId: number): string[] {
    return getDb()
      .select({ name: tags.name })
      .from(itemTags)
      .innerJoin(tags, eq(tags.id, itemTags.tagId))
      .where(eq(itemTags.itemId, itemId))
      .all()
      .map((row) => row.name);
  }

  it("renames the tag and keeps it on its items", () => {
    const item = createItem({ title: "E", url: "https://e.example/", tagNames: ["旧名丙"] });

    const result = renameTag(findTag("旧名丙").id, "新名丙");
    expect(result?.merged).toBe(false);
    expect(tagNames()).not.toContain("旧名丙");
    expect(tagNames()).toContain("新名丙");
    expect(linksOf(item!.id)).toContain("新名丙");
  });

  it("merges into the target when that name already exists", () => {
    const moved = createItem({ title: "F", url: "https://f.example/", tagNames: ["待并丁"] });
    const kept = createItem({ title: "G", url: "https://g.example/", tagNames: ["已存在丁"] });

    const result = renameTag(findTag("待并丁").id, "已存在丁");
    expect(result?.merged).toBe(true);
    // 旧名字没了，两个条目都挂在留下的那个标签上
    expect(tagNames()).not.toContain("待并丁");
    expect(linksOf(moved!.id)).toContain("已存在丁");
    expect(linksOf(kept!.id)).toContain("已存在丁");
  });

  it("treats a case-only change as a rename, not a merge", () => {
    const item = createItem({ title: "H", url: "https://h.example/", tagNames: ["CaseTag"] });

    const result = renameTag(findTag("CaseTag").id, "casetag");
    expect(result?.merged).toBe(false);
    expect(tagNames()).toContain("casetag");
    expect(linksOf(item!.id)).toContain("casetag");
  });

  it("returns null for a tag that is gone", () => {
    expect(renameTag(999999, "随便")).toBeNull();
  });
});
