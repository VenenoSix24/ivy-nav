import { getPortalData } from "./queries";
import type { PortalData } from "./types";

/**
 * 管理端视图：Private 条目、未归档条目与全部分类都在里面。
 * 只能在 withAdmin 里调用 —— 这就是「Private 数据不出服务器」的边界。
 */
export function getAdminPortalData(): PortalData {
  return getPortalData({ includePrivate: true });
}
