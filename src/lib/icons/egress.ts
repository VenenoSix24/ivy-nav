import { lookup } from "node:dns/promises";

export class EgressError extends Error {}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isBlockedV4(address: string): boolean {
  const parts = address.split(".");
  if (parts.length !== 4) return true;

  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;

  const [first, second] = octets as [number, number, number, number];
  if (first === 0) return true; // 本网络
  if (first === 127) return true; // 回环
  if (first === 169 && second === 254) return true; // link-local
  if (first >= 224) return true; // 组播与保留段

  return false;
}

function isBlockedV6(address: string): boolean {
  const host = address.toLowerCase();

  // IPv4 映射地址按 IPv4 规则判断
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(host);
  if (mapped?.[1]) return isBlockedV4(mapped[1]);

  if (host === "::" || host === "::1") return true;

  const firstHextet = Number.parseInt(host.split(":")[0] || "0", 16);
  if (Number.isNaN(firstHextet)) return true;
  if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((firstHextet & 0xff00) === 0xff00) return true; // ff00::/8 组播

  return false;
}

/** 回环、link-local 与保留段一律拒绝 */
export function isBlockedIp(address: string): boolean {
  const host = (address.split("%")[0] ?? "").trim();
  if (!host) return true;
  return host.includes(":") ? isBlockedV6(host) : isBlockedV4(host);
}

/** 取图标前先确认目标不是内网地址；FAVICON_ALLOW_PRIVATE_HOSTS=true 可关掉 */
export async function assertFetchableHost(hostname: string): Promise<void> {
  if (process.env.FAVICON_ALLOW_PRIVATE_HOSTS === "true") return;

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new EgressError(`域名无法解析（${hostname}）：请检查网址是否正确。`);
  }

  if (addresses.length === 0) {
    throw new EgressError(`域名无法解析（${hostname}）：请检查网址是否正确。`);
  }

  for (const entry of addresses) {
    if (isBlockedIp(entry.address)) {
      throw new EgressError(`目标指向内网地址（${hostname} → ${entry.address}）：已拒绝请求。`);
    }
  }
}

/** 解析跳转目标并确认协议 */
export function nextRedirectTarget(location: string, base: URL): URL {
  let target: URL;
  try {
    target = new URL(location, base);
  } catch {
    throw new EgressError("跳转地址无法解析：已中止请求。");
  }
  if (!ALLOWED_PROTOCOLS.has(target.protocol)) {
    throw new EgressError("跳转到了非 http(s) 地址：已中止请求。");
  }
  return target;
}
