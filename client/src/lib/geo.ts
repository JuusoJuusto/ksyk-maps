/**
 * Real-world geometry for the builder and the map.
 *
 * Every length, area and offset in the app goes through here so a number you
 * type, a number a label shows and the real distance on the ground are the
 * same number. Scale comes from the WGS84 ellipsoid at the point's own
 * latitude. At the campus (Kulosaari, 60.19 N) a degree of longitude is
 * 55 485 m (a spherical Earth says 55 283 m, the old flat constant 55 345 m)
 * and a degree of latitude is 111 416 m (sphere 111 195 m, old 111 320 m).
 * Mixing those three made a typed 100 m show as 99.89 m on a label while the
 * shape was really 100.25 m long.
 *
 * Distances are measured on the local tangent plane at the midpoint
 * latitude: millimetre-accurate over a campus, within ~1e-5 relative at
 * 10 km. Beyond 20 km it falls back to the great-circle distance.
 */

export interface LatLng { lat: number; lng: number }
export interface Meters { x: number; y: number }

const A = 6378137;                    // WGS84 semi-major axis (m)
const F = 1 / 298.257223563;          // WGS84 flattening
const E2 = F * (2 - F);               // first eccentricity squared
const RAD = Math.PI / 180;
const MEAN_R = 6371008.8;             // for the long-distance fallback only
const TANGENT_PLANE_LIMIT_M = 20_000;

/** Metres per degree of latitude and of longitude at `latDeg` (WGS84). */
export function metersPerDegree(latDeg: number): { lat: number; lng: number } {
  const phi = latDeg * RAD;
  const s = Math.sin(phi);
  const w = 1 - E2 * s * s;
  const sw = Math.sqrt(w);
  const meridional = (A * (1 - E2)) / (w * sw); // radius of curvature along a meridian
  const primeVertical = A / sw;                 // radius of curvature across it
  return { lat: meridional * RAD, lng: primeVertical * Math.cos(phi) * RAD };
}

function wrapLng(d: number): number {
  if (d > 180) return d - 360;
  if (d < -180) return d + 360;
  return d;
}

function greatCircle(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = wrapLng(b.lng - a.lng) * RAD;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * MEAN_R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Ground distance in metres between two points. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const m = metersPerDegree((a.lat + b.lat) / 2);
  const d = Math.hypot((b.lat - a.lat) * m.lat, wrapLng(b.lng - a.lng) * m.lng);
  return d > TANGENT_PLANE_LIMIT_M ? greatCircle(a, b) : d;
}

/** Same, for GeoJSON-style [lng, lat] pairs. */
export function distanceLngLat(a: [number, number] | number[], b: [number, number] | number[]): number {
  return distanceMeters({ lat: a[1], lng: a[0] }, { lat: b[1], lng: b[0] });
}

/** Point `p` as east/north metres from `origin`. */
export function toLocalMeters(origin: LatLng, p: LatLng): Meters {
  const m = metersPerDegree(origin.lat);
  return { x: wrapLng(p.lng - origin.lng) * m.lng, y: (p.lat - origin.lat) * m.lat };
}

/** Inverse of {@link toLocalMeters}. */
export function fromLocalMeters(origin: LatLng, x: number, y: number): LatLng {
  const m = metersPerDegree(origin.lat);
  return { lat: origin.lat + y / m.lat, lng: origin.lng + x / m.lng };
}

/** `origin` moved `east` / `north` metres. */
export function offsetMeters(origin: LatLng, east: number, north: number): LatLng {
  return fromLocalMeters(origin, east, north);
}

/** Initial bearing in degrees, 0 = north, clockwise. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const { x, y } = toLocalMeters(a, b);
  return (Math.atan2(x, y) / RAD + 360) % 360;
}

function meanLatLng(pts: LatLng[]): LatLng {
  let lat = 0, lng = 0;
  for (const p of pts) { lat += p.lat; lng += p.lng; }
  return { lat: lat / pts.length, lng: lng / pts.length };
}

/** Mean of the polygon's vertices (a closing point that repeats the first is ignored). */
export function polygonCenter(pts: LatLng[]): LatLng {
  const ring = dropClosingPoint(pts);
  return ring.length ? meanLatLng(ring) : { lat: 0, lng: 0 };
}

/** Length of an open polyline in metres. */
export function polylineLengthM(pts: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += distanceMeters(pts[i - 1], pts[i]);
  return total;
}

/** Perimeter of a polygon (closing edge included). Accepts a ring that repeats its first point. */
export function polygonPerimeterM(pts: LatLng[]): number {
  const ring = dropClosingPoint(pts);
  if (ring.length < 2) return 0;
  return polylineLengthM([...ring, ring[0]]);
}

/** Planar area of a polygon in square metres (shoelace on the local tangent plane). */
export function polygonAreaM2(pts: LatLng[]): number {
  const ring = dropClosingPoint(pts);
  if (ring.length < 3) return 0;
  const origin = meanLatLng(ring);
  const xy = ring.map((p) => toLocalMeters(origin, p));
  let twice = 0;
  for (let i = 0; i < xy.length; i++) {
    const j = (i + 1) % xy.length;
    twice += xy[i].x * xy[j].y - xy[j].x * xy[i].y;
  }
  return Math.abs(twice) / 2;
}

function dropClosingPoint(pts: LatLng[]): LatLng[] {
  if (pts.length > 1) {
    const f = pts[0], l = pts[pts.length - 1];
    if (f.lat === l.lat && f.lng === l.lng) return pts.slice(0, -1);
  }
  return pts;
}

/**
 * Width and height of a polygon measured in its own frame, i.e. after undoing
 * `rotationDeg` (counter-clockwise from east, the convention the builder's
 * transform form uses). For an unrotated shape this is the E-W / N-S extent;
 * for a rotated building it is the real side length, not the bounding box of
 * the tilted outline.
 */
export function orientedSize(pts: LatLng[], rotationDeg = 0): { width: number; height: number; origin: LatLng } {
  const ring = dropClosingPoint(pts);
  const origin = ring.length ? meanLatLng(ring) : { lat: 0, lng: 0 };
  if (!ring.length) return { width: 0, height: 0, origin };
  const c = Math.cos(-rotationDeg * RAD), s = Math.sin(-rotationDeg * RAD);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of ring) {
    const { x, y } = toLocalMeters(origin, p);
    const rx = x * c - y * s, ry = x * s + y * c;
    if (rx < minX) minX = rx; if (rx > maxX) maxX = rx;
    if (ry < minY) minY = ry; if (ry > maxY) maxY = ry;
  }
  return { width: maxX - minX, height: maxY - minY, origin };
}

/**
 * Resize / rotate / move a polygon. `width` and `height` are the target
 * oriented sizes (see {@link orientedSize}), `rotationDeg` the new absolute
 * rotation and `fromRotationDeg` the one the polygon currently has. Scaling
 * happens in the shape's own frame, so a rotated rectangle stays rectangular.
 */
export function transformPolygon(
  pts: LatLng[],
  opts: { fromRotationDeg?: number; rotationDeg?: number; width?: number; height?: number; center?: LatLng },
): LatLng[] {
  const from = opts.fromRotationDeg ?? 0;
  const to = opts.rotationDeg ?? from;
  const cur = orientedSize(pts, from);
  const sx = opts.width != null && cur.width > 1e-9 ? opts.width / cur.width : 1;
  const sy = opts.height != null && cur.height > 1e-9 ? opts.height / cur.height : 1;
  const origin = cur.origin;
  const target = opts.center ?? origin;
  const cu = Math.cos(-from * RAD), su = Math.sin(-from * RAD);
  const cr = Math.cos(to * RAD), sr = Math.sin(to * RAD);
  return pts.map((p) => {
    const { x, y } = toLocalMeters(origin, p);
    // into the shape's frame, scale, back out at the new rotation
    const ux = (x * cu - y * su) * sx, uy = (x * su + y * cu) * sy;
    return fromLocalMeters(target, ux * cr - uy * sr, ux * sr + uy * cr);
  });
}

export function formatLength(m: number): string {
  if (!Number.isFinite(m)) return "-";
  if (m < 10) return `${m.toFixed(2)} m`;
  if (m < 1000) return `${m.toFixed(1)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export function formatArea(m2: number): string {
  if (!Number.isFinite(m2)) return "-";
  if (m2 < 100) return `${m2.toFixed(2)} m²`;
  if (m2 < 10_000) return `${m2.toFixed(1)} m²`;
  return `${(m2 / 10_000).toFixed(2)} ha`;
}

const GRID_STEPS_M = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50];

/**
 * Grid spacing in metres for the current zoom: the smallest round step that is
 * still at least `minPx` screen pixels wide, so the grid is always usable and
 * never a smear. Typed distances are unaffected.
 */
export function gridStepFor(zoom: number, latDeg: number, minPx = 18): number {
  const mpp = metersPerPixel(zoom, latDeg);
  return GRID_STEPS_M.find((s) => s / mpp >= minPx) ?? GRID_STEPS_M[GRID_STEPS_M.length - 1];
}

/** Snap `p` to the nearest node of a `stepM` metre grid anchored at `origin`. */
export function snapToGrid(p: LatLng, stepM: number, origin: LatLng): LatLng {
  const { x, y } = toLocalMeters(origin, p);
  return fromLocalMeters(origin, Math.round(x / stepM) * stepM, Math.round(y / stepM) * stepM);
}

/**
 * Grid lines covering a bounding box, as [lng, lat] pairs per line, capped at
 * `maxLines` per direction so a zoomed-out map never builds thousands of them.
 */
export function gridLines(
  bounds: { west: number; south: number; east: number; north: number },
  stepM: number,
  origin: LatLng,
  maxLines = 120,
): [number, number][][] {
  const sw = toLocalMeters(origin, { lat: bounds.south, lng: bounds.west });
  const ne = toLocalMeters(origin, { lat: bounds.north, lng: bounds.east });
  const x0 = Math.ceil(sw.x / stepM), x1 = Math.floor(ne.x / stepM);
  const y0 = Math.ceil(sw.y / stepM), y1 = Math.floor(ne.y / stepM);
  if (x1 - x0 + 1 > maxLines || y1 - y0 + 1 > maxLines) return [];
  const lines: [number, number][][] = [];
  for (let i = x0; i <= x1; i++) {
    const a = fromLocalMeters(origin, i * stepM, sw.y), b = fromLocalMeters(origin, i * stepM, ne.y);
    lines.push([[a.lng, a.lat], [b.lng, b.lat]]);
  }
  for (let j = y0; j <= y1; j++) {
    const a = fromLocalMeters(origin, sw.x, j * stepM), b = fromLocalMeters(origin, ne.x, j * stepM);
    lines.push([[a.lng, a.lat], [b.lng, b.lat]]);
  }
  return lines;
}

/** Ground metres covered by one screen pixel at `zoom` and `latDeg` (512 px tiles, as MapLibre uses). */
export function metersPerPixel(zoom: number, latDeg: number, tileSize = 512): number {
  const pixelsPerDegreeLng = (tileSize * 2 ** zoom) / 360;
  return metersPerDegree(latDeg).lng / pixelsPerDegreeLng;
}
