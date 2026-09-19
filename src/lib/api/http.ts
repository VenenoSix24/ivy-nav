import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
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

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
