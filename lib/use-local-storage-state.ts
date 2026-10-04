"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const initialSnapshot = useMemo(() => JSON.stringify(initialValue), [initialValue]);
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener("storage", notify);
    window.addEventListener("merryland-storage", notify);
    return () => {
      window.removeEventListener("storage", notify);
      window.removeEventListener("merryland-storage", notify);
    };
  }, []);
  const getSnapshot = useCallback(
    () => window.localStorage.getItem(key) ?? initialSnapshot,
    [initialSnapshot, key],
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => initialSnapshot);
  const value = useMemo(() => {
    try {
      return JSON.parse(snapshot) as T;
    } catch (error) {
      console.error(`Could not read saved ${key}`, error);
      return JSON.parse(initialSnapshot) as T;
    }
  }, [initialSnapshot, key, snapshot]);
  const setValue = useCallback(
    (nextValue: T | ((currentValue: T) => T)) => {
      const currentSnapshot = window.localStorage.getItem(key) ?? initialSnapshot;
      let currentValue: T;
      try {
        currentValue = JSON.parse(currentSnapshot) as T;
      } catch (error) {
        console.error(`Could not read saved ${key} before updating it`, error);
        currentValue = JSON.parse(initialSnapshot) as T;
      }
      const resolvedValue =
        typeof nextValue === "function"
          ? (nextValue as (currentValue: T) => T)(currentValue)
          : nextValue;
      window.localStorage.setItem(key, JSON.stringify(resolvedValue));
      window.dispatchEvent(new Event("merryland-storage"));
    },
    [initialSnapshot, key],
  );

  return [value, setValue] as const;
}
