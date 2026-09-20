import { createHash } from "node:crypto";
import { UploadError, saveUpload } from "@/lib/icons/uploads";
import { sniffImageType } from "@/lib/icons/favicon";
import { findSource } from "./index";

/**
 * 把「图标库里挑中的那一张」落成本地文件。
 *
 * 为什么不是只记一个名字、显示时再去取：那样每张卡片都要去外网、离线就全空，
 * 而且库一改版名字就失效。挑的时候下载一次，之后就是一张本地上传的图 ——
 * 与手动上传走的是同一条路（清洗、体积上限、`/api/icons/file/<名字>`）。
 *
 * 这也顺带解决了许可问题：图标本体不进我们的仓库，只落在用户自己的数据目录里。
 */

/** 允许存下来的格式与上传一致；库里偶尔会混进 ico / gif，那些直接说明存不了。 */
const STORABLE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export class PickError extends Error {}

/** `simple-icons-github-181717` 这样的名字：人能一眼看出这张图的来路。 */
function readableName(library: string, name: string, color: string | null): string {
  const parts = [library, name, color?.replace("#", "") ?? ""]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return parts.slice(0, 48).replace(/-$/, "");
}

export interface PickResult {
  filename: string;
}

export async function pickLibraryIcon(
  library: string,
  name: string,
  color: string | null,
): Promise<PickResult> {
  const source = findSource(library);
  if (!source) throw new PickError("图标库不存在：请重新选择。");

  const payload = await source.fetchIcon(name, color);
  if (!payload) throw new PickError("这张图标取不到：换一张，或稍后再试。");

  const contentType = sniffImageType(payload.body);
  if (!contentType || !STORABLE[contentType]) {
    throw new PickError("这张图标的格式（不是 PNG / JPG / WEBP / SVG）存不下来：换一张试试。");
  }

  const digest = createHash("sha256")
    .update(`${library}|${name}|${color ?? ""}`)
    .digest("hex")
    .slice(0, 16);
  const extension = STORABLE[contentType]!;

  try {
    const filename = saveUpload(
      payload.body,
      contentType,
      `${readableName(library, name, color)}_${digest}.${extension}`,
    );
    return { filename };
  } catch (error) {
    if (error instanceof UploadError) throw new PickError(error.message);
    throw error;
  }
}
