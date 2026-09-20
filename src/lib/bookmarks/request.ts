import type { DuplicatePolicy } from "./plan";
import { isDuplicatePolicy } from "./plan";

/** 4 MB 足够放几万条书签；再大就不像浏览器的导出文件了 */
export const BOOKMARK_FILE_MAX = 4 * 1024 * 1024;
/** 顶层目录最多这么多组，防止一个畸形文件把选择清单撑爆 */
export const BOOKMARK_GROUP_MAX = 500;

export type BookmarkBody =
  | { ok: true; html: string; duplicates: DuplicatePolicy; groups: string[] | null }
  | { ok: false; error: string };

/**
 * 预览与导入收的是同一份东西（文件正文 + 重复网址怎么处理 + 挑哪几个目录），
 * 检查也放在一处，免得两个接口对「什么算合法请求」有不同说法。
 *
 * `groups` 缺省表示「全要」；给空数组表示一个都不要（前端在勾选清单里可能全取消，
 * 这时导入 0 条是用户的明确意思，不是错误）。
 */
export function readBookmarkBody(input: unknown): BookmarkBody {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "没有收到文件内容：请重新选择浏览器导出的书签文件。" };
  }

  const { html, duplicates, groups } = input as {
    html?: unknown;
    duplicates?: unknown;
    groups?: unknown;
  };

  if (typeof html !== "string" || !html.trim()) {
    return { ok: false, error: "没有收到文件内容：请重新选择浏览器导出的书签文件。" };
  }
  if (html.length > BOOKMARK_FILE_MAX) {
    return { ok: false, error: "文件超过 4 MB：请确认选择的是浏览器的书签导出文件。" };
  }
  if (duplicates !== undefined && !isDuplicatePolicy(duplicates)) {
    return { ok: false, error: "重复网址的处理方式认不出来：请刷新页面后重试。" };
  }
  if (groups !== undefined) {
    if (
      !Array.isArray(groups) ||
      groups.length > BOOKMARK_GROUP_MAX ||
      groups.some((key) => typeof key !== "string")
    ) {
      return { ok: false, error: "要导入哪些目录这份清单读不出来：请重新选择文件。" };
    }
  }

  return {
    ok: true,
    html,
    duplicates: duplicates ?? "skip",
    groups: groups === undefined ? null : (groups as string[]),
  };
}
