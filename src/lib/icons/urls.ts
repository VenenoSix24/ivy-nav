import type { IconSourceId } from "./sources";

/**
 * 图标接口的地址集中在这里：它们是「同一张图什么时候算变过」的判据，
 * 散在各个组件里最容易改漏一个。
 */

/**
 * `v` 只是个变更标记：接口按条目里存的来源取图，不看这个参数。
 * 但浏览器的图片缓存按整条 URL 算 —— 那张图的 max-age 有 7 天，
 * 换了来源而 URL 不变的话，浏览器会一直拿旧图，看起来就像「保存了没生效」。
 */
export function itemFaviconSrc(itemId: number, version?: string | null): string {
  const stamp = version?.trim();
  return `/api/icons/favicon?item=${itemId}${stamp ? `&v=${encodeURIComponent(stamp)}` : ""}`;
}

/** `source` 有值时只看那个方案给的那张：选择器里挑了哪一个，预览就得照哪一个显示。 */
export function previewFaviconSrc(url: string, source?: IconSourceId | null): string {
  const base = `/api/icons/resolve?url=${encodeURIComponent(url)}`;
  return source ? `${base}&source=${encodeURIComponent(source)}` : base;
}

/** 图标库里那张缩略图。`color` 为空就是图标自带的颜色。 */
export function libraryIconSrc(library: string, name: string, color?: string | null): string {
  const base = `/api/icons/library/icon?lib=${encodeURIComponent(library)}&name=${encodeURIComponent(name)}`;
  return color ? `${base}&color=${encodeURIComponent(color)}` : base;
}
