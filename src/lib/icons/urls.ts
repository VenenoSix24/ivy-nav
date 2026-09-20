import type { IconSourceId } from "./sources";

/** 图标接口的地址集中在这里 */

/** `v` 是变更标记，接口不看它，但浏览器按整条 URL 缓存图片，少了它会一直拿旧图 */
export function itemFaviconSrc(itemId: number, version?: string | null): string {
  const stamp = version?.trim();
  return `/api/icons/favicon?item=${itemId}${stamp ? `&v=${encodeURIComponent(stamp)}` : ""}`;
}

/** `source` 有值时只看那个方案给的那张 */
export function previewFaviconSrc(url: string, source?: IconSourceId | null): string {
  const base = `/api/icons/resolve?url=${encodeURIComponent(url)}`;
  return source ? `${base}&source=${encodeURIComponent(source)}` : base;
}

/** 图标库里那张缩略图。`color` 为空就是图标自带的颜色。 */
export function libraryIconSrc(library: string, name: string, color?: string | null): string {
  const base = `/api/icons/library/icon?lib=${encodeURIComponent(library)}&name=${encodeURIComponent(name)}`;
  return color ? `${base}&color=${encodeURIComponent(color)}` : base;
}
