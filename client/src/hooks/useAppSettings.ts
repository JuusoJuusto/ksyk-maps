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
  'matterportTourUrl',
  // Platform-specific overrides — nullable numbers on the server.
  'mobileCenterLat', 'mobileCenterLng', 'mobileDefaultZoom', 'mobileMinZoom',
  'mobileMaxZoom', 'mobileRotationDeg', 'mobilePitchDeg',
  'desktopCenterLat', 'desktopCenterLng', 'desktopDefaultZoom', 'desktopMinZoom',
  'desktopMaxZoom', 'desktopRotationDeg', 'desktopPitchDeg',
] as const;

const NUMERIC_MAP_KEYS = new Set<string>([
  "osmCenterLat", "osmCenterLng", "osmDefaultZoom", "osmMinZoom", "osmMaxZoom",
  "osmRotationDeg", "osmPitchDeg", "osmCampusSpanMeters",
  "osmMaxBoundsNorth", "osmMaxBoundsEast", "osmMaxBoundsSouth", "osmMaxBoundsWest",
]);

/** Numeric keys that ALSO accept `null` — the platform overrides. */
const NULLABLE_NUMERIC_MAP_KEYS = new Set<string>([
  "mobileCenterLat", "mobileCenterLng", "mobileDefaultZoom", "mobileMinZoom",
  "mobileMaxZoom", "mobileRotationDeg", "mobilePitchDeg",
  "desktopCenterLat", "desktopCenterLng", "desktopDefaultZoom", "desktopMinZoom",
  "desktopMaxZoom", "desktopRotationDeg", "desktopPitchDeg",
]);

/** Which platform variant is active for the current viewport. Uses a
 *  simple width breakpoint (Tailwind `md` = 768px). SSR-safe: defaults
 *  to "desktop" when `window` isn't available. */
export function currentPlatform(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  return window.innerWidth < 768 ? "mobile" : "desktop";
}

/** Resolve the effective initial camera for the current viewport.
 *  Falls back to the shared osm* values whenever a platform override
 *  is `null`. This is what CampusMap and the "Recenter" button should
 *  use — not the raw AppSettings values. */
export function pickPlatformMapDefaults(s: AppSettings): {
  lat: number; lng: number; zoom: number; minZoom: number; maxZoom: number;
  bearing: number; pitch: number;
} {
  const platform = currentPlatform();
  const p = platform === "mobile" ? "mobile" : "desktop";
  const lat  = firstFinite(s[`${p}CenterLat`  as keyof AppSettings] as number | null, s.osmCenterLat);
  const lng  = firstFinite(s[`${p}CenterLng`  as keyof AppSettings] as number | null, s.osmCenterLng);
  const zoom = firstFinite(s[`${p}DefaultZoom` as keyof AppSettings] as number | null, s.osmDefaultZoom);
  const minZ = firstFinite(s[`${p}MinZoom`    as keyof AppSettings] as number | null, s.osmMinZoom);
  const maxZ = firstFinite(s[`${p}MaxZoom`    as keyof AppSettings] as number | null, s.osmMaxZoom);
  const bear = firstFinite(s[`${p}RotationDeg` as keyof AppSettings] as number | null, s.osmRotationDeg ?? 0);
  const pit  = firstFinite(s[`${p}PitchDeg`   as keyof AppSettings] as number | null, s.osmPitchDeg ?? 0);
  return { lat, lng, zoom, minZoom: minZ, maxZoom: maxZ, bearing: bear, pitch: pit };
}

function firstFinite(a: number | null | undefined, b: number): number {
  return typeof a === "number" && Number.isFinite(a) ? a : b;
}

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
      if (data[k] === undefined) continue;
      if (NULLABLE_NUMERIC_MAP_KEYS.has(k)) {
        // null is a valid value here — it means "inherit shared default".
        if (data[k] === null) {
          (next as Record<string, unknown>)[k] = null;
          continue;
        }
        const n = Number(data[k]);
        if (!Number.isFinite(n)) continue;
        (next as Record<string, unknown>)[k] = n;
      } else if (NUMERIC_MAP_KEYS.has(k)) {
        const n = Number(data[k]);
        if (!Number.isFinite(n)) continue; // reject NaN/null/string values from server
        (next as Record<string, unknown>)[k] = n;
      } else {
        (next as Record<string, unknown>)[k] = data[k];
      }
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
