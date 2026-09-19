import type { PortalData } from "./types";

export type PortalResult = { ok: true; portal: PortalData } | { ok: false; error: string };

/**
 * 所有写操作都走这个出口：服务器校验通过后回最新全量数据，
 * 前端直接替换本地状态，不需要「先猜结果再等刷新」。
 */
export async function portalRequest(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<PortalResult> {
  try {
    const response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        error: readError(payload) ?? `请求失败（HTTP ${response.status}）：请重试。`,
      };
    }

    const portal = readPortal(payload);
    if (!portal) return { ok: false, error: "服务器返回的数据不完整：请刷新页面后重试。" };

    return { ok: true, portal };
  } catch {
    return { ok: false, error: "无法连接服务器：请检查网络后重试。" };
  }
}

function readError(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "error" in payload) {
    const { error } = payload as { error?: unknown };
    return typeof error === "string" ? error : null;
  }
  return null;
}

function readPortal(payload: unknown): PortalData | null {
  if (!payload || typeof payload !== "object" || !("portal" in payload)) return null;
  const { portal } = payload as { portal?: unknown };
  if (!portal || typeof portal !== "object") return null;
  const candidate = portal as Partial<PortalData>;
  if (!Array.isArray(candidate.categories) || !Array.isArray(candidate.items)) return null;
  return { categories: candidate.categories, items: candidate.items };
}
