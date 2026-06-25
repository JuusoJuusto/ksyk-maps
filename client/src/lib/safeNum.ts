/**
 * Defensive numeric helpers — used everywhere we touch Leaflet, since
 * `flyTo([NaN, NaN])` throws a hard "Invalid LatLng" error that crashes the
 * whole React tree and renders the error boundary. A NaN can sneak in from
 * localStorage, the server, an unset env var, or an arithmetic underflow,
 * so every entry point passes through here.
 */

/** Returns the number if finite, otherwise the fallback. */
export function safeNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** KSYK Helsinki default centre — used as the hard fallback. */
export const KSYK_FALLBACK_LAT = 60.187;
export const KSYK_FALLBACK_LNG = 25.006;
export const KSYK_FALLBACK_ZOOM = 19;

/** Build a valid [lat, lng] tuple with KSYK defaults if either is NaN. */
export function safeLatLng(lat: unknown, lng: unknown): [number, number] {
  return [safeNum(lat, KSYK_FALLBACK_LAT), safeNum(lng, KSYK_FALLBACK_LNG)];
}

/** Clamps + sanitises a zoom value. */
export function safeZoom(z: unknown, fallback = KSYK_FALLBACK_ZOOM): number {
  const n = safeNum(z, fallback);
  return Math.max(0, Math.min(22, n));
}
