import { parseHttpUrl } from "@/lib/utils/url";

/** 搜索框的预填关键词：先取标题里的拉丁词，没有就用域名倒数第二段 */
export function seedQuery(title: string, url: string): string {
  const token = title
    .trim()
    .split(/[\s·|/\\–—()（）[\]【】,，:：]+/)
    .filter(Boolean)
    .find(Boolean);

  if (token && /^[a-z0-9][a-z0-9.+-]*$/i.test(token) && token.length >= 2) {
    return token.slice(0, 24);
  }

  const host = parseHttpUrl(url)?.hostname.replace(/^www\./, "") ?? "";
  const parts = host.split(".").filter(Boolean);
  const label = parts.length >= 2 ? parts[parts.length - 2] : parts[0];

  if (label && label.length >= 2) return label.slice(0, 24);
  return (token ?? "").slice(0, 24);
}

/** 落盘文件名里那段前缀：`simple-icons-github-181717_c3f1...svg` → `simple-icons-github-181717`。 */
export function preludeOf(value: string | null): string | null {
  if (!value) return null;
  return /^([a-z0-9-]{1,48})_[a-f0-9]{16}\.[a-z0-9]+$/.exec(value)?.[1] ?? null;
}

/** 这张图标是不是从图标库里挑的 */
export function isLibraryPick(value: string | null): boolean {
  return preludeOf(value) !== null;
}

/** 从落盘文件名的前缀里读回「这张图标是哪个库挑的」 */
export function libraryFromPrelude(value: string | null, known: string[]): string | null {
  const prelude = preludeOf(value);
  if (!prelude) return null;

  const setId = /^set-\d+/.exec(prelude)?.[0];
  if (setId) return setId.replace("set-", "set:");

  for (const id of known) {
    if (prelude === id || prelude.startsWith(`${id}-`)) return id;
  }
  return null;
}
