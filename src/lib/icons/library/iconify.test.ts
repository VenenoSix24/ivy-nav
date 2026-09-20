import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { iconifySource } from "./iconify";

/** 只挡在 fetch 上，解析、缓存、地址拼装还是真跑 */
function stubSearch(payload: unknown, ok = true) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push(url);
      return {
        ok,
        status: ok ? 200 : 502,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify(payload),
        arrayBuffer: async () => Buffer.from(JSON.stringify(payload)),
      } as unknown as Response;
    }),
  );
  return calls;
}

const PAYLOAD = {
  icons: ["mdi:home", "logos:github-icon", "not-a-key"],
  total: 3,
  collections: {
    mdi: { name: "Material Design Icons", license: { title: "Apache 2.0" }, palette: false },
    logos: { name: "SVG Logos", license: { title: "CC0 1.0" }, palette: true },
  },
};

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "ivy-nav-lib-"));
  process.env.DATABASE_PATH = path.join(dir, "portal.db");
  process.env.FAVICON_ALLOW_PRIVATE_HOSTS = "true";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DATABASE_PATH;
  delete process.env.FAVICON_ALLOW_PRIVATE_HOSTS;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("iconifySource.search", () => {
  it("turns the search response into hits with the set and its licence", async () => {
    const calls = stubSearch(PAYLOAD);
    const { hits, total } = await iconifySource.search("home");

    expect(total).toBe(3);
    expect(hits.map((hit) => hit.name)).toEqual(["mdi:home", "logos:github-icon"]);
    expect(hits[0]?.note).toBe("Material Design Icons · Apache 2.0");
    expect(hits[1]?.note).toBe("SVG Logos · CC0 1.0");
    expect(calls[0]).toContain("/search?query=home");

    // 第二次问同一个关键词吃缓存
    await iconifySource.search("home");
    expect(calls).toHaveLength(1);
  });

  it("asks for nothing when the query is empty", async () => {
    const calls = stubSearch(PAYLOAD);
    const { hits } = await iconifySource.search("   ");
    expect(hits).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("returns an empty result rather than throwing when the API is down", async () => {
    stubSearch({}, false);
    await expect(iconifySource.search("home")).resolves.toEqual({ hits: [], total: 0, offset: 0 });
  });
});

describe("iconifySource.fetchIcon", () => {
  it("builds the documented svg url and passes the colour through", async () => {
    const calls = stubSearch(PAYLOAD);
    await iconifySource.fetchIcon("mdi:home", "#ffffff");
    expect(calls[0]).toBe("https://api.iconify.design/mdi/home.svg?color=%23ffffff");
  });

  it("rejects a name that is not `prefix:name`", async () => {
    const calls = stubSearch(PAYLOAD);
    await expect(iconifySource.fetchIcon("../../etc/passwd", null)).resolves.toBeNull();
    expect(calls).toHaveLength(0);
  });
});
