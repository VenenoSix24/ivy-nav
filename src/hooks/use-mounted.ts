"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * 主题、媒体查询这类只在客户端成立的事实，用外部存储读法拿到，
 * 服务端与首次客户端渲染保持一致，不必在 effect 里补状态。
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
