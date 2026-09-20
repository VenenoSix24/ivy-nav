import fs from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listFaviconCandidates, resolveFavicon, resolveIconSource } from "./favicon";

/** 文件头能过 sniff 的最短样本：三种格式各取一份，用来分辨「取到的到底是哪个来源的」。 */
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(8),
]);
const GIF = Buffer.from("GIF89a---------", "latin1");
const ICO = Buffer.concat([Buffer.from([0x00, 0x00, 0x01, 0x00]), Buffer.alloc(8)]);

/** 一个三个来源都有的站点：声明 png、manifest 里给 gif、/favicon.ico 是 ico。 */
function richSite(): Promise<{ server: Server; base: string }> {
  const server = createServer((request, response) => {
    switch (request.url) {
      case "/":
        response.writeHead(200, { "content-type": "text/html" });
        response.end(
          '<html><head><link rel="icon" href="/icon.png">' +
            '<link rel="manifest" href="/manifest.json"></head></html>',
        );
        return;
      case "/icon.png":
        response.writeHead(200, { "content-type": "image/png" });
        response.end(PNG);
        return;
      case "/manifest.json":
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ icons: [{ src: "/brand.gif", sizes: "512x512" }] }));
        return;
      case "/brand.gif":
        response.writeHead(200, { "content-type": "image/gif" });
        response.end(GIF);
        return;
      case "/favicon.ico":
        response.writeHead(200, { "content-type": "image/vnd.microsoft.icon" });
        response.end(ICO);
        return;
      default:
        response.writeHead(404);
        response.end();
    }
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

/**
 * 只有响应头到、正文读到一半连接就断。这是「图标接口 500」的真实形状：
 * `fetch` 已经成功返回，`AbortSignal` 的定时器还管着正文，读正文在这里抛。
 */
function brokenBodyServer(): Promise<{ server: Server; base: string }> {
  const server = createServer((request, response) => {
    if (request.url === "/") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end('<html><head><link rel="icon" href="/icon.png"></head></html>');
      return;
    }

    response.writeHead(200, { "content-type": "image/png", "content-length": 4096 });
    response.write(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    setTimeout(() => response.socket?.destroy(), 5);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

const running: Server[] = [];
let cacheDir: string;

beforeEach(() => {
  // 每条测试用一份自己的缓存目录：缓存是落盘的，串了就跑不出稳定的结果
  cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "ivy-nav-icons-"));
  process.env.DATABASE_PATH = path.join(cacheDir, "portal.db");
  process.env.FAVICON_ALLOW_PRIVATE_HOSTS = "true";
});

afterEach(async () => {
  delete process.env.FAVICON_ALLOW_PRIVATE_HOSTS;
  delete process.env.FAVICON_FALLBACK_SOURCES;
  delete process.env.DATABASE_PATH;
  fs.rmSync(cacheDir, { recursive: true, force: true });
  await Promise.all(running.splice(0).map((server) => new Promise((done) => server.close(done))));
});

describe("resolveFavicon", () => {
  it("returns null instead of throwing when a response body breaks off", async () => {
    const { server, base } = await brokenBodyServer();
    running.push(server);

    // 取图标是尽力而为：读正文失败应该落到「取不到」，让页面用首字母托底，
    // 而不是把异常抛给路由、在控制台留下一条 500
    await expect(resolveFavicon(new URL(base))).resolves.toBeNull();
  });

  it("honours the source the user picked instead of the chain order", async () => {
    process.env.FAVICON_FALLBACK_SOURCES = "false";
    const { server, base } = await richSite();
    running.push(server);

    // 自动链上「网站声明」排在前面，所以不指定时拿到的是 png
    await expect(resolveFavicon(new URL(base))).resolves.toMatchObject({
      contentType: "image/png",
    });
    // 用户点的是 /favicon.ico，就得给 ico —— 挑的是那张图，不是「随便来一张」
    await expect(resolveFavicon(new URL(base), "/favicon.ico")).resolves.toMatchObject({
      contentType: "image/x-icon",
    });
  });

  it("falls back to the auto chain when the picked source is gone", async () => {
    process.env.FAVICON_FALLBACK_SOURCES = "false";
    const { server, base } = await richSite();
    running.push(server);

    // 选过的来源这会儿取不到（favicon.im 被关掉了），不该让图标位空着
    await expect(resolveFavicon(new URL(base), "favicon.im")).resolves.toMatchObject({
      contentType: "image/png",
    });
  });
});

describe("listFaviconCandidates", () => {
  it("tries every source and reports each one separately", async () => {
    process.env.FAVICON_FALLBACK_SOURCES = "false";
    const { server, base } = await richSite();
    running.push(server);

    // 第三方兜底被关掉时，链子上就不该出现它们 —— 否则选择器会列出两个永远取不到的空位
    await expect(listFaviconCandidates(new URL(base))).resolves.toEqual([
      { source: "declared", label: "网站声明", status: "ok" },
      { source: "manifest", label: "PWA 清单", status: "ok" },
      { source: "/favicon.ico", label: "/favicon.ico", status: "ok" },
      { source: "favicon.im", label: "favicon.im", status: "miss" },
      { source: "icon.horse", label: "icon.horse", status: "miss" },
    ]);
  });

  it("reports a source that has nothing as a miss", async () => {
    process.env.FAVICON_FALLBACK_SOURCES = "false";
    const { server, base } = await brokenBodyServer();
    running.push(server);

    const candidates = await listFaviconCandidates(new URL(base));
    expect(candidates.find((entry) => entry.source === "declared")?.status).toBe("miss");
    expect(candidates.find((entry) => entry.source === "/favicon.ico")?.status).toBe("miss");
  });
});

describe("resolveIconSource", () => {
  it("takes only that source, with no falling back to another one", async () => {
    process.env.FAVICON_FALLBACK_SOURCES = "false";
    const { server, base } = await richSite();
    running.push(server);

    await expect(resolveIconSource(new URL(base), "declared")).resolves.toMatchObject({
      contentType: "image/png",
    });
    await expect(resolveIconSource(new URL(base), "manifest")).resolves.toMatchObject({
      contentType: "image/gif",
    });
    await expect(resolveIconSource(new URL(base), "/favicon.ico")).resolves.toMatchObject({
      contentType: "image/x-icon",
    });
    // 关掉的兜底来源一个请求都不该发
    await expect(resolveIconSource(new URL(base), "favicon.im")).resolves.toBeNull();
  });
});
