"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("ahf-store", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("ahf-store", onStoreChange);
  };
}

export function usePersisted<T>(key: string, fallback: T): [T, (update: T | ((prev: T) => T)) => void] {
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const value = useMemo(() => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }, [raw, fallback]);

  const setValue = useCallback(
    (update: T | ((prev: T) => T)) => {
      const current = (() => {
        try {
          const existing = window.localStorage.getItem(key);
          return existing ? (JSON.parse(existing) as T) : fallback;
        } catch {
          return fallback;
        }
      })();
      const next = typeof update === "function" ? (update as (prev: T) => T)(current) : update;
      window.localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("ahf-store"));
    },
    [fallback, key],
  );

  return [value, setValue];
}
