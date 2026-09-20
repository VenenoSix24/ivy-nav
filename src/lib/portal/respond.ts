import { jsonOk } from "@/lib/api/http";
import { getAdminPortalData } from "./admin";

/** 写接口统一回最新全量数据 */
export function portalResponse() {
  return jsonOk({ portal: getAdminPortalData() });
}
