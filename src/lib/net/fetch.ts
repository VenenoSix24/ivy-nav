import { assertFetchableHost, nextRedirectTarget } from "@/lib/icons/egress";

const MAX_REDIRECTS = 3;
export const DEFAULT_TIMEOUT_MS = 4000;

/** 手动跟随跳转，每一跳都重新做内网检查；返回值的 body 还没读 */
export async function fetchWithTimeout(
  url: string,
  accept: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response | null> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return null;
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    try {
      await assertFetchableHost(target.hostname);
      const response = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept, "user-agent": "ivy-nav/0.1 (+favicon)" },
      });

      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) return response;

      target = nextRedirectTarget(location, target);
    } catch {
      return null;
    }
  }

  return null;
}

/** 声明就超上限的，不必读 */
function tooLargeByDeclaration(response: Response, maxBytes: number): boolean {
  const declared = Number(response.headers.get("content-length") ?? Number.NaN);
  return Number.isFinite(declared) && declared > maxBytes;
}

/** 没有可读流的响应（测试里的替身）退回整块读 */
async function readWholeBody(response: Response, maxBytes: number): Promise<Buffer | null> {
  if (tooLargeByDeclaration(response, maxBytes)) return null;
  try {
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.length === 0 || buffer.length > maxBytes ? null : buffer;
  } catch {
    return null;
  }
}

/** 读二进制正文，边读边算，超上限就中止；读到一半出错或空正文都收成 null */
export async function readBody(response: Response, maxBytes: number): Promise<Buffer | null> {
  const reader = response.body?.getReader();
  if (!reader) return readWholeBody(response, maxBytes);

  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(value));
    }
  } catch {
    return null;
  }

  return total === 0 ? null : Buffer.concat(chunks);
}

/** 读文本正文，超过上限的部分丢掉；出错收成 null */
export async function readText(response: Response, maxBytes: number): Promise<string | null> {
  const reader = response.body?.getReader();
  if (!reader) {
    try {
      return (await response.text()).slice(0, maxBytes);
    } catch {
      return null;
    }
  }

  const decoder = new TextDecoder();
  let text = "";
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      text += decoder.decode(value, { stream: true });
      if (total >= maxBytes) {
        void reader.cancel();
        break;
      }
    }
  } catch {
    return null;
  }

  return text.slice(0, maxBytes);
}
