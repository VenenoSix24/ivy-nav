export const EDIT_MODE_COOKIE = "ivy_edit";

/**
 * 编辑模式是一个界面偏好，存在普通 Cookie 里（不是 HttpOnly）：
 * 它是给浏览器读的，服务端渲染首页时也读同一个值，避免首屏闪一下再切过去。
 */
export function editModeCookie(maxAgeSeconds = 60 * 60 * 24 * 30): string {
  return `${EDIT_MODE_COOKIE}=1; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

export function clearEditModeCookie(): string {
  return `${EDIT_MODE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
