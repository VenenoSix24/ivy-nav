export const EDIT_MODE_COOKIE = "ivy_edit";

/** 编辑模式是界面偏好，存在普通 Cookie 里（不是 HttpOnly），浏览器与服务端都读它 */
export function editModeCookie(maxAgeSeconds = 60 * 60 * 24 * 30): string {
  return `${EDIT_MODE_COOKIE}=1; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

export function clearEditModeCookie(): string {
  return `${EDIT_MODE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
