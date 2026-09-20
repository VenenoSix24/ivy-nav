/** 1×1 透明 PNG；占位图必须恰好 1×1，图标位以「宽高大于 1」判断取没取到 */
export const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=",
  "base64",
);

/** 占位图的缓存时间 */
export const PLACEHOLDER_CACHE_SECONDS = 600;
