import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveDatabasePath } from "@/db/client";
import { looksLikeSvg, sanitizeSvg } from "./svg";

export const MAX_UPLOAD_BYTES = 512 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const SERVABLE = new Set(["png", "jpg", "jpeg", "webp", "svg"]);

export const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export function uploadDir(): string {
  return path.join(path.dirname(resolveDatabasePath()), "uploads");
}

export class UploadError extends Error {}

/** 文件头要和声明的类型对得上，改扩展名绕过检查这条路也就堵住了。 */
function sniffMatches(bytes: Buffer, contentType: string): boolean {
  if (contentType === "image/png") {
    return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e;
  }
  if (contentType === "image/jpeg") {
    return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/webp") {
    return (
      bytes.length > 12 &&
      bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
      bytes.subarray(8, 12).toString("latin1") === "WEBP"
    );
  }
  if (contentType === "image/svg+xml") {
    return looksLikeSvg(bytes.toString("utf8"));
  }
  return false;
}

/**
 * 存一份图标。`preferred` 可选：图标库挑来的那张要一个**确定的名字**（同一个库、同一个名字、
 * 同一个颜色算出来总是同一个），同一张挑两次不会在目录里堆两份；不合规的名字一律换随机名。
 */
export function saveUpload(bytes: Buffer, contentType: string, preferred?: string): string {
  const extension = EXTENSIONS[contentType];
  if (!extension) {
    throw new UploadError("只支持 PNG、JPG、WEBP、SVG：请转换格式后重试。");
  }
  if (bytes.length === 0) {
    throw new UploadError("文件是空的：请重新选择。");
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new UploadError("文件超过 512 KB：请压缩后重试。");
  }
  if (!sniffMatches(bytes, contentType)) {
    throw new UploadError("文件内容与格式不符：请确认没有改过扩展名。");
  }

  const payload = extension === "svg" ? Buffer.from(sanitizeSvg(bytes.toString("utf8"))) : bytes;
  const filename =
    preferred && isServableName(preferred) && preferred.endsWith(`.${extension}`)
      ? preferred
      : `${randomBytes(8).toString("hex")}.${extension}`;

  fs.mkdirSync(uploadDir(), { recursive: true });
  fs.writeFileSync(path.join(uploadDir(), filename), payload);

  return filename;
}

/**
 * 只接受本模块生成的文件名，杜绝 ../ 之类的路径穿越。
 * 前缀只是给人看的（图标库里挑来的那张写成了 `simple-icons-github_<hash>.svg`），
 * 字符集里没有 `.` 也没有 `/`，拼不出别的路径；结尾仍是那 16 位十六进制。
 */
export function isServableName(name: string): boolean {
  const match = /^(?:[a-z0-9-]{1,48}_)?[a-f0-9]{16}\.([a-z0-9]+)$/.exec(name);
  return match !== null && SERVABLE.has(match[1]!);
}

export function readUpload(name: string): Buffer | null {
  if (!isServableName(name)) return null;
  try {
    return fs.readFileSync(path.join(uploadDir(), name));
  } catch {
    return null;
  }
}

export function uploadContentType(name: string): string {
  const extension = name.split(".").pop() ?? "";
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}
