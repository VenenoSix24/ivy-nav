/**
 * 1×1 透明 PNG。站点没有可用图标时返回它，而不是 404：
 * 404 会让浏览器在控制台报一条红色错误，图标位还会留一个破图；
 * 透明像素则让底下那层首字母标记自然露出来。
 *
 * 尺寸是这条回退链的关键：图标位把「宽高大于 1」当作「真的取到了图标」，
 * 所以占位图必须恰好是 1×1，不能换成更大的透明图，否则首字母会被压掉。
 */
export const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=",
  "base64",
);

/** 占位图只缓存很短时间：站点以后补上图标了，用户不用等太久。 */
export const PLACEHOLDER_CACHE_SECONDS = 600;
