/**
 * @ksyk/shared/geo — pure geometry helpers.
 *
 * Everything here is a pure function: no DOM, no side effects, no
 * globals. Same input → same output. Safe to import from server, web
 * worker, renderer, or router.
 */
import type { LatLng, Polygon, BBox } from "../types";

/** Haversine distance in metres between two lat/lng points. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000; // Earth mean radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Axis-aligned bounding box of a polygon. */
export function polygonBounds(poly: Polygon): BBox | null {
  if (!poly || poly.length === 0) return null;
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  for (const p of poly) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { minLat, minLng, maxLat, maxLng };
}

/** Geometric centroid of a polygon. Simple average — fine for small
 *  campus-scale polygons where the difference from a true area-weighted
 *  centroid is sub-metre. */
export function polygonCentroid(poly: Polygon): LatLng | null {
  if (!poly || poly.length === 0) return null;
  let sLat = 0;
  let sLng = 0;
  for (const p of poly) {
    sLat += p.lat;
    sLng += p.lng;
  }
  return { lat: sLat / poly.length, lng: sLng / poly.length };
}

/** Point-in-polygon test using ray casting. Assumes the polygon is
 *  closed implicitly (first point ≠ last point). */
export function pointInPolygon(pt: LatLng, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng;
    const yi = poly[i].lat;
    const xj = poly[j].lng;
    const yj = poly[j].lat;
    const intersect =
      yi > pt.lat !== yj > pt.lat &&
      pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Does bbox `a` overlap bbox `b`? */
export function bboxOverlaps(a: BBox, b: BBox): boolean {
  return (
    a.minLng <= b.maxLng &&
    a.maxLng >= b.minLng &&
    a.minLat <= b.maxLat &&
    a.maxLat >= b.minLat
  );
}

/** Expand a bbox by a delta in degrees (roughly = delta * 111,320 metres
 *  at the equator). */
export function bboxExpand(b: BBox, delta: number): BBox {
  return {
    minLat: b.minLat - delta,
    minLng: b.minLng - delta,
    maxLat: b.maxLat + delta,
    maxLng: b.maxLng + delta,
  };
}
