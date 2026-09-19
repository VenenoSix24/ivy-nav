import { jsonOk } from "@/lib/api/http";
import { getAdminPortalData } from "./admin";

/**
 * 写接口统一回最新全量数据：前端拿到的就是权威结果，不必乐观更新后再猜什么时候刷新。
 * 个人门户的数据量很小，一次响应装得下。
 */
export function portalResponse() {
  return jsonOk({ portal: getAdminPortalData() });
}
