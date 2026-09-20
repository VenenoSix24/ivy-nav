import type { DuplicatePolicy } from "./plan";
import { isDuplicatePolicy } from "./plan";

/** 文件大小上限 4 MB */
export const BOOKMARK_FILE_MAX = 4 * 1024 * 1024;
/** 顶层目录组数上限 */
export const BOOKMARK_GROUP_MAX = 500;

export type BookmarkBody =
  | { ok: true; html: string; duplicates: DuplicatePolicy; groups: string[] | null }
  | { ok: false; error: string };

/** 预览与导入共用的请求校验，groups 缺省表示全要 */
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
