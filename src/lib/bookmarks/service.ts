import { getDb } from "@/db/client";
import { readBookmarkIndex } from "./import";
import { countLinks, parseBookmarksHtml } from "./parse";
import { planBookmarkImport, type BookmarkPlan } from "./plan";

/** 与备份导入同一档上限：再多就不像一份个人书签了，真导进来首页也打不开 */
export const BOOKMARK_ITEM_MAX = 5000;

export type PreparedImport = { ok: true; plan: BookmarkPlan } | { ok: false; error: string };

/**
 * 预览与导入共用的前半段：解析 → 数一遍 → 对着库里的现状排计划。
 * 两个接口各调一次，因此预览里说的与实际写下去的必然是同一份计划。
 */
export function prepareBookmarkImport(html: string): PreparedImport {
  const tree = parseBookmarksHtml(html);

  if (countLinks(tree) === 0) {
    return { ok: false, error: "这份文件里没读到书签：请选择浏览器「导出书签」生成的 HTML 文件。" };
  }

  const plan = planBookmarkImport(tree, readBookmarkIndex(getDb()));
  if (plan.items.length > BOOKMARK_ITEM_MAX) {
    return {
      ok: false,
      error: `文件里有 ${plan.items.length} 条可导入的书签，超过 ${BOOKMARK_ITEM_MAX} 条的上限：请分几份导入。`,
    };
  }

  return { ok: true, plan };
}
