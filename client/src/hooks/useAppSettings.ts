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

// Map setting keys that can be persisted to / loaded from the server
const MAP_DEFAULT_KEYS = [
  'osmCenterLat', 'osmCenterLng', 'osmDefaultZoom', 'osmMinZoom',
  'osmMaxZoom', 'osmRotationDeg', 'osmPitchDeg', 'osmTileTheme',
  'osmCampusSpanMeters', 'osmMaxBoundsEnabled', 'osmMaxBoundsNorth',
  'osmMaxBoundsEast', 'osmMaxBoundsSouth', 'osmMaxBoundsWest',
] as const;

/** Load admin-set map defaults from the server and merge into the store.
 *  Called once on map mount so every user gets the admin-configured view. */
export async function loadMapDefaultsFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/map-defaults');
    if (!res.ok) return;
    const data = await res.json();
    if (!data || typeof data !== 'object') return;
    const next: Partial<AppSettings> = {};
    for (const k of MAP_DEFAULT_KEYS) {
      if (data[k] !== undefined) (next as Record<string, unknown>)[k] = data[k];
    }
    if (Object.keys(next).length > 0) {
      setSnapshot({ ...snapshot, ...next });
    }
  } catch {
    // silent — network errors should not break the map
  }
}

/** Save current map defaults to the server (admin only). */
export async function saveMapDefaultsToServer(settings: AppSettings): Promise<void> {
  const body: Partial<AppSettings> = {};
  for (const k of MAP_DEFAULT_KEYS) {
    (body as Record<string, unknown>)[k] = settings[k];
  }
  const res = await fetch('/api/map-defaults', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to save map defaults');
  }
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
