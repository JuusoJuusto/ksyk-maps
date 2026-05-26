import { useCallback, useSyncExternalStore } from "react";
import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  saveAppSettings,
} from "@/lib/appSettings";

// Single source of truth — every `useAppSettings()` consumer reads the same
// object, so when the admin panel mutates a setting the homepage map sees
// the change instantly (no remount, no localStorage round-trip on every read).
let snapshot: AppSettings = loadAppSettings();
const listeners = new Set<() => void>();

function setSnapshot(next: AppSettings) {
  snapshot = next;
  saveAppSettings(next);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Cross-tab sync — if another browser tab updates settings, refresh here too.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === null || e.key === "ksyk_app_settings_v2") {
      snapshot = loadAppSettings();
      listeners.forEach((l) => l());
    }
  });
}

export function useAppSettings() {
  const settings = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);

  const setSettings = useCallback(
    (next: AppSettings | ((prev: AppSettings) => AppSettings)) => {
      const value = typeof next === "function" ? (next as (p: AppSettings) => AppSettings)(snapshot) : next;
      setSnapshot(value);
    },
    []
  );

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSnapshot({ ...snapshot, [key]: value });
  }, []);

  const reset = useCallback(() => {
    setSnapshot({ ...DEFAULT_APP_SETTINGS });
  }, []);

  return { settings, setSettings, update, reset };
}
