"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 是否已向下滚动。用于让顶栏在顶部时保持透明、滚动后才浮起来。
 * 走外部存储读法，不需要在 effect 里补状态。
 */
export function useScrolled(threshold = 8): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("scroll", onStoreChange, { passive: true });
    return () => window.removeEventListener("scroll", onStoreChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.scrollY > threshold,
    () => false,
  );
}
