import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { resolveFavicon } from "./favicon";

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

afterEach(async () => {
  delete process.env.FAVICON_ALLOW_PRIVATE_HOSTS;
  await Promise.all(running.splice(0).map((server) => new Promise((done) => server.close(done))));
});

describe("resolveFavicon", () => {
  it("returns null instead of throwing when a response body breaks off", async () => {
    process.env.FAVICON_ALLOW_PRIVATE_HOSTS = "true";
    const { server, base } = await brokenBodyServer();
    running.push(server);

    // 取图标是尽力而为：读正文失败应该落到「取不到」，让页面用首字母托底，
    // 而不是把异常抛给路由、在控制台留下一条 500
    await expect(resolveFavicon(new URL(base))).resolves.toBeNull();
  });
});
