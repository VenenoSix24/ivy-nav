"use client";

import { useCallback, useSyncExternalStore } from "react";

/** 页面是否已向下滚动超过阈值。 */
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
