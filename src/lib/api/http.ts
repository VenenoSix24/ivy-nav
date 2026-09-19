import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/**
 * 接口返回的都是随会话变化的数据（/api/portal 含 Private 条目），
 * 必须显式禁止任何中间缓存保存，否则共享缓存可能把管理数据发给别人。
 */
export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "cache-control": "private, no-store", ...init?.headers },
  });
}

/** 错误信息写清原因与怎么修，前端直接展示（开发规范 §2.3）。 */
export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function firstIssueMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "请求参数不合法，请检查后重试。";
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * 把 Buffer 变成可以直接当响应体的 ArrayBuffer。必须复制：
 * Buffer 常常是共享内存池上的视图，直接交出 .buffer 会带上相邻数据。
 */
export function binaryBody(bytes: Buffer): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer as ArrayBuffer;
}

/**
 * 只在显式声明「我前面有可信代理」时读转发头。默认返回 unknown：
 * 客户端可以随意伪造 X-Forwarded-For，拿它做限流键或审计记录都不可靠。
 */
export function clientIp(request: Request): string {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return "unknown";

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
