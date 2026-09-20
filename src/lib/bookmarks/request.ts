import type { DuplicatePolicy } from "./plan";
import { isDuplicatePolicy } from "./plan";

/** 4 MB 足够放几万条书签；再大就不像浏览器的导出文件了 */
export const BOOKMARK_FILE_MAX = 4 * 1024 * 1024;

export type BookmarkBody =
  { ok: true; html: string; duplicates: DuplicatePolicy } | { ok: false; error: string };

/**
 * 预览与导入收的是同一份东西（文件正文 + 重复网址怎么处理），
 * 检查也放在一处，免得两个接口对「什么算合法请求」有不同说法。
 */
export function readBookmarkBody(input: unknown): BookmarkBody {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "没有收到文件内容：请重新选择浏览器导出的书签文件。" };
  }

  const { html, duplicates } = input as { html?: unknown; duplicates?: unknown };

  if (typeof html !== "string" || !html.trim()) {
    return { ok: false, error: "没有收到文件内容：请重新选择浏览器导出的书签文件。" };
  }
  if (html.length > BOOKMARK_FILE_MAX) {
    return { ok: false, error: "文件超过 4 MB：请确认选择的是浏览器的书签导出文件。" };
  }
  if (duplicates !== undefined && !isDuplicatePolicy(duplicates)) {
    return { ok: false, error: "重复网址的处理方式认不出来：请刷新页面后重试。" };
  }

  return { ok: true, html, duplicates: duplicates ?? "skip" };
}
