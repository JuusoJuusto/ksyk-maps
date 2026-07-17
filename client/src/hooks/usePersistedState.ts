/**
 * usePersistedState — useState with localStorage backing.
 *
 * Value is JSON-serialised. Reads on mount (SSR-safe: falls back to
 * `initial` when window is undefined). Writes on every state change,
 * silently swallowing quota / private-mode exceptions.
 *
 * Kept generic on purpose — for map UI state (selected floor, is3D,
 * layer visibility) so users don't lose their view across reloads.
 */
import { useEffect, useRef, useState } from "react";

export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  // Avoid writing on the initial render — it's identical to the read.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch { /* quota / private mode — silent */ }
  }, [key, value]);

  return [value, setValue];
}
