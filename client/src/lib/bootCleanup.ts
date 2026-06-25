/**
 * Boot-time localStorage cleanup.
 *
 * Runs BEFORE any module reads `ksyk_app_settings_v2` or
 * `ksyk_security_settings_v1`, so corrupt numeric values can never become
 * NaN at the Leaflet edge. Cheaper to delete one bad key than to wrap
 * every flyTo / setView in try/catch.
 *
 * Idempotent — safe to call on every page load.
 */

const APP_SETTINGS_KEY = "ksyk_app_settings_v2";
const SECURITY_SETTINGS_KEY = "ksyk_security_settings_v1";

const APP_NUMERIC_KEYS = [
  "osmCenterLat", "osmCenterLng", "osmDefaultZoom", "osmMinZoom", "osmMaxZoom",
  "osmRotationDeg", "osmPitchDeg", "osmCampusSpanMeters", "mapZoomSpeed",
  "osmMaxBoundsNorth", "osmMaxBoundsEast", "osmMaxBoundsSouth", "osmMaxBoundsWest",
];

function isNumericFieldValid(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n);
}

function purgeObject(key: string, numericFields: string[]): void {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    let mutated = false;
    for (const f of numericFields) {
      if (f in parsed && !isNumericFieldValid(parsed[f])) {
        delete parsed[f];
        mutated = true;
      }
    }
    if (mutated) {
      localStorage.setItem(key, JSON.stringify(parsed));
      // eslint-disable-next-line no-console
      console.info(`[ksyk] purged corrupt numeric fields from ${key}`);
    }
  } catch (err) {
    // If JSON.parse threw, the entire blob is corrupt. Delete it so the
    // module that owns this key recreates from defaults.
    localStorage.removeItem(key);
    // eslint-disable-next-line no-console
    console.warn(`[ksyk] removed unreadable localStorage key ${key}`, err);
  }
}

export function runBootCleanup(): void {
  if (typeof localStorage === "undefined") return;
  purgeObject(APP_SETTINGS_KEY, APP_NUMERIC_KEYS);
  // Security settings have no numeric leaves we care about — the rules
  // engine validates each input at runtime — but if the doc isn't JSON,
  // drop it so the defaults reload.
  try {
    const raw = localStorage.getItem(SECURITY_SETTINGS_KEY);
    if (raw) JSON.parse(raw);
  } catch {
    localStorage.removeItem(SECURITY_SETTINGS_KEY);
    // eslint-disable-next-line no-console
    console.warn(`[ksyk] removed unreadable ${SECURITY_SETTINGS_KEY}`);
  }
}
