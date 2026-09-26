import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { tags } from "@/db/schema";
import { createItem, updateItem } from "./mutations";

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
