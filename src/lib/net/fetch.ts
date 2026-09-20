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

/** 读正文，异常收成 null */
export async function readBody(response: Response, maxBytes: number): Promise<Buffer | null> {
  try {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > maxBytes) return null;
    return buffer;
  } catch {
    return null;
  }
}

/** 读文本正文，异常收成 null */
export async function readText(response: Response, maxBytes: number): Promise<string | null> {
  try {
    return (await response.text()).slice(0, maxBytes);
  } catch {
    return null;
  }
}
