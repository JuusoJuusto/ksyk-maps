/**
 * Recently-viewed rooms/buildings — up to 8 entries stored in localStorage.
 * Each entry carries enough data to re-render a search result row.
 */
import { useState, useCallback, useEffect } from "react";

export interface RecentEntry {
  id: string;
  kind: "room" | "building";
  name: string;
  subtitle?: string;
  floor?: number | null;
  viewedAt: number;
}

const KEY = "ksyk_recently_viewed";
const MAX = 8;

function load(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentEntry[];
  } catch { return []; }
}

function save(entries: RecentEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* ignore */ }
}

export function useRecentlyViewed() {
  const [entries, setEntries] = useState<RecentEntry[]>(load);

  const push = useCallback((entry: Omit<RecentEntry, "viewedAt">) => {
    setEntries((prev) => {
      const next = [
        { ...entry, viewedAt: Date.now() },
        ...prev.filter((e) => e.id !== entry.id),
      ].slice(0, MAX);
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    save([]);
    setEntries([]);
  }, []);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setEntries(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { entries, push, clear };
}
