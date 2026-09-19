/**
 * 1×1 透明 PNG。站点没有可用图标时返回它，而不是 404：
 * 404 会让浏览器在控制台报一条红色错误，图标位还会留一个破图；
 * 透明像素则让底下那层首字母标记自然露出来。
 */
export const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

/** 占位图只缓存很短时间：站点以后补上图标了，用户不用等太久。 */
export const PLACEHOLDER_CACHE_SECONDS = 600;
