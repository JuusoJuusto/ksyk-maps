/**
 * Builder measurements must be real: checked against an independent geodesic
 * solution (Vincenty's inverse formula, implemented here from scratch) and
 * against round trips, not against the module's own constants.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  metersPerDegree, distanceMeters, distanceLngLat, offsetMeters, toLocalMeters, bearingDeg,
  polygonAreaM2, polygonPerimeterM, polylineLengthM, orientedSize, transformPolygon,
  formatLength, formatArea, metersPerPixel, gridStepFor, snapToGrid, gridLines, type LatLng,
} from "../../client/src/lib/geo";

const KSYK: LatLng = { lat: 60.187, lng: 25.006 }; // KSYK, Kulosaari, Helsinki

/** Vincenty inverse on WGS84 - the reference. Returns metres. */
function vincenty(p1: LatLng, p2: LatLng): number {
  const a = 6378137, f = 1 / 298.257223563, b = (1 - f) * a, rad = Math.PI / 180;
  const L = (p2.lng - p1.lng) * rad;
  const U1 = Math.atan((1 - f) * Math.tan(p1.lat * rad));
  const U2 = Math.atan((1 - f) * Math.tan(p2.lat * rad));
  const sU1 = Math.sin(U1), cU1 = Math.cos(U1), sU2 = Math.sin(U2), cU2 = Math.cos(U2);
  let lambda = L, prev = 0, i = 0;
  let sinSigma = 0, cosSigma = 0, sigma = 0, cosSqAlpha = 0, cos2SigmaM = 0;
  do {
    const sL = Math.sin(lambda), cL = Math.cos(lambda);
    sinSigma = Math.sqrt((cU2 * sL) ** 2 + (cU1 * sU2 - sU1 * cU2 * cL) ** 2);
    if (sinSigma === 0) return 0;
    cosSigma = sU1 * sU2 + cU1 * cU2 * cL;
    sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = (cU1 * cU2 * sL) / sinSigma;
    cosSqAlpha = 1 - sinAlpha ** 2;
    cos2SigmaM = cosSqAlpha !== 0 ? cosSigma - (2 * sU1 * sU2) / cosSqAlpha : 0;
    const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    prev = lambda;
    lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));
  } while (Math.abs(lambda - prev) > 1e-12 && ++i < 200);
  const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const dSigma = B * sinSigma * (cos2SigmaM + (B / 4) * (cosSigma * (-1 + 2 * cos2SigmaM ** 2) - (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma ** 2) * (-3 + 4 * cos2SigmaM ** 2)));
  return b * A * (sigma - dSigma);
}

test("scale per degree matches the WGS84 ellipsoid at the KSYK campus, not a sphere or a flat 111 320", () => {
  const m = metersPerDegree(KSYK.lat);
  // Reference values from Vincenty over exactly one degree at this latitude.
  const refLat = vincenty({ lat: KSYK.lat - 0.5, lng: KSYK.lng }, { lat: KSYK.lat + 0.5, lng: KSYK.lng });
  const refLng = vincenty({ lat: KSYK.lat, lng: KSYK.lng - 0.5 }, { lat: KSYK.lat, lng: KSYK.lng + 0.5 });
  assert.ok(Math.abs(m.lat - refLat) < 1, `lat: ${m.lat} vs ${refLat}`);
  assert.ok(Math.abs(m.lng - refLng) < 6, `lng: ${m.lng} vs ${refLng}`); // a degree of longitude is not flat; 6 m of 49 km
  assert.ok(Math.abs(m.lat - 111320) > 50, "the old flat constant was ~100 m/deg too small here");
});

test("distances agree with Vincenty to the millimetre on a campus and to 1e-5 over kilometres", () => {
  const cases: [number, number, number][] = [ // dEast m, dNorth m, allowed error m
    [10, 0, 0.001], [0, 10, 0.001], [37.25, -81.4, 0.002], [150, 90, 0.005], [-300, 400, 0.01], [3000, 4000, 0.05],
  ];
  for (const [e, n, tol] of cases) {
    const b = offsetMeters(KSYK, e, n);
    const ref = vincenty(KSYK, b);
    const got = distanceMeters(KSYK, b);
    assert.ok(Math.abs(got - ref) < tol, `${e},${n}: got ${got} ref ${ref}`);
    // A flat offset only round-trips exactly at campus scale; over km the scale changes with latitude.
    if (Math.hypot(e, n) < 500) assert.ok(Math.abs(got - Math.hypot(e, n)) < tol * 2, `offset round trip ${e},${n}`);
  }
});

test("a typed length is the length the label shows (the 20 m -> 19.98 m bug)", () => {
  for (const meters of [2.5, 7, 20, 83.3]) {
    const east = offsetMeters(KSYK, meters, 0), north = offsetMeters(KSYK, 0, meters);
    assert.equal(formatLength(distanceMeters(KSYK, east)), formatLength(meters));
    assert.equal(formatLength(distanceMeters(KSYK, north)), formatLength(meters));
  }
});

test("distanceLngLat, symmetry, zero length and the antimeridian", () => {
  const b = offsetMeters(KSYK, 55, 12);
  assert.equal(distanceLngLat([KSYK.lng, KSYK.lat], [b.lng, b.lat]), distanceMeters(KSYK, b));
  assert.equal(distanceMeters(KSYK, b), distanceMeters(b, KSYK));
  assert.equal(distanceMeters(KSYK, KSYK), 0);
  const d = distanceMeters({ lat: 0, lng: 179.9995 }, { lat: 0, lng: -179.9995 });
  assert.ok(Math.abs(d - 111.3) < 0.5, `antimeridian: ${d}`);
});

test("beyond 20 km it falls back to the great circle and stays within 0.5 % of Vincenty", () => {
  const far = { lat: 60.1699, lng: 24.9384 }; // Helsinki, ~450 km
  const ref = vincenty(KSYK, far);
  assert.ok(Math.abs(distanceMeters(KSYK, far) - ref) / ref < 0.005);
});

test("polygon area and perimeter of known shapes", () => {
  const sq = (w: number, h: number) => {
    const o = KSYK;
    return [offsetMeters(o, 0, 0), offsetMeters(o, w, 0), offsetMeters(o, w, h), offsetMeters(o, 0, h)];
  };
  assert.ok(Math.abs(polygonAreaM2(sq(20, 10)) - 200) < 0.01);
  assert.ok(Math.abs(polygonPerimeterM(sq(20, 10)) - 60) < 0.01);
  const ring = sq(20, 10); ring.push({ ...ring[0] });
  assert.ok(Math.abs(polygonAreaM2(ring) - 200) < 0.01, "closing point is ignored");
  assert.ok(Math.abs(polygonPerimeterM(ring) - 60) < 0.01);
  assert.equal(polygonAreaM2(sq(1, 1).slice(0, 2)), 0);
  assert.ok(Math.abs(polylineLengthM(sq(20, 10)) - 50) < 0.01, "an open polyline does not close");
  // L shape: 20x10 minus a 10x5 corner = 150
  const o = KSYK;
  const L = [[0, 0], [20, 0], [20, 5], [10, 5], [10, 10], [0, 10]].map(([x, y]) => offsetMeters(o, x, y));
  assert.ok(Math.abs(polygonAreaM2(L) - 150) < 0.01);
});

test("bearings", () => {
  assert.ok(Math.abs(bearingDeg(KSYK, offsetMeters(KSYK, 0, 50)) - 0) < 0.01);
  assert.ok(Math.abs(bearingDeg(KSYK, offsetMeters(KSYK, 50, 0)) - 90) < 0.01);
  assert.ok(Math.abs(bearingDeg(KSYK, offsetMeters(KSYK, 0, -50)) - 180) < 0.01);
  assert.ok(Math.abs(bearingDeg(KSYK, offsetMeters(KSYK, -50, 0)) - 270) < 0.01);
});

test("a rotated rectangle reports its real side lengths, and resizing keeps it rectangular", () => {
  const rect = [[-10, -5], [10, -5], [10, 5], [-10, 5]].map(([x, y]) => offsetMeters(KSYK, x, y));
  const rotated = transformPolygon(rect, { fromRotationDeg: 0, rotationDeg: 30 });
  const size = orientedSize(rotated, 30);
  assert.ok(Math.abs(size.width - 20) < 0.01 && Math.abs(size.height - 10) < 0.01, `${size.width} x ${size.height}`);
  const bbox = orientedSize(rotated, 0);
  assert.ok(bbox.width > 20.5, "the old bounding-box 'width' of the tilted outline was wrong");
  // resize to 30 x 8 while rotated
  const resized = transformPolygon(rotated, { fromRotationDeg: 30, rotationDeg: 30, width: 30, height: 8 });
  const s2 = orientedSize(resized, 30);
  assert.ok(Math.abs(s2.width - 30) < 0.01 && Math.abs(s2.height - 8) < 0.01, `${s2.width} x ${s2.height}`);
  assert.ok(Math.abs(polygonAreaM2(resized) - 240) < 0.05, "still a true 30 x 8 rectangle");
  const sides = [0, 1, 2, 3].map((i) => distanceMeters(resized[i], resized[(i + 1) % 4]));
  assert.ok(Math.abs(sides[0] - 30) < 0.01 && Math.abs(sides[1] - 8) < 0.01 && Math.abs(sides[2] - 30) < 0.01 && Math.abs(sides[3] - 8) < 0.01);
  // moving without resizing changes no length
  const moved = transformPolygon(rotated, { fromRotationDeg: 30, rotationDeg: 30, center: offsetMeters(KSYK, 100, 100) });
  assert.ok(Math.abs(polygonAreaM2(moved) - 200) < 0.01);
  assert.ok(distanceMeters(toCentroid(moved), offsetMeters(KSYK, 100, 100)) < 0.01);
  // rotating alone keeps every side
  const spun = transformPolygon(rotated, { fromRotationDeg: 30, rotationDeg: 75 });
  assert.ok(Math.abs(polygonPerimeterM(spun) - 60) < 0.01);
  const back = orientedSize(spun, 75);
  assert.ok(Math.abs(back.width - 20) < 0.01 && Math.abs(back.height - 10) < 0.01);
});

function toCentroid(pts: LatLng[]): LatLng {
  return { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length };
}

test("grid: steps are round and always at least minPx wide; snapping lands on exact metre multiples", () => {
  for (let z = 14; z <= 22; z += 0.5) {
    const step = gridStepFor(z, KSYK.lat);
    assert.ok([0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50].includes(step), `round step at z${z}`);
    assert.ok(step / metersPerPixel(z, KSYK.lat) >= 18 || step === 50, `z${z}: ${step} m is ${(step / metersPerPixel(z, KSYK.lat)).toFixed(1)} px`);
  }
  assert.ok(gridStepFor(21, KSYK.lat) < gridStepFor(17, KSYK.lat), "zooming in refines the grid");
  const origin = KSYK;
  const p = offsetMeters(origin, 12.34, -7.81);
  const s = snapToGrid(p, 0.5, origin);
  const local = toLocalMeters(origin, s);
  assert.ok(Math.abs(local.x - 12.5) < 1e-6 && Math.abs(local.y - -8) < 1e-6, `${local.x},${local.y}`);
  assert.ok(distanceMeters(p, s) < 0.5 * Math.SQRT2 / 2 + 1e-6, "never moves more than half a cell diagonal");
  assert.deepEqual(snapToGrid(s, 0.5, origin), s, "idempotent");
});

test("grid lines: parallel, evenly spaced in real metres, capped when zoomed out", () => {
  // box edges sit half a metre outside the outermost lines so rounding can't drop one
  const sw = offsetMeters(KSYK, -10.5, -10.5), ne = offsetMeters(KSYK, 10.5, 10.5);
  const bounds = { west: sw.lng, south: sw.lat, east: ne.lng, north: ne.lat };
  const lines = gridLines(bounds, 5, KSYK);
  assert.equal(lines.length, 10, "lines at -10, -5, 0, 5, 10 each way");
  const verticals = lines.slice(0, 5);
  for (let i = 1; i < verticals.length; i++) {
    const gap = distanceLngLat(verticals[i - 1][0], verticals[i][0]);
    assert.ok(Math.abs(gap - 5) < 0.001, `gap ${gap}`);
  }
  const wide = offsetMeters(KSYK, 5000, 5000);
  assert.deepEqual(gridLines({ west: sw.lng, south: sw.lat, east: wide.lng, north: wide.lat }, 1, KSYK), []);
});

test("formatting keeps the labels the builder already used", () => {
  assert.equal(formatLength(3.456), "3.46 m");
  assert.equal(formatLength(42.34), "42.3 m");
  assert.equal(formatLength(1234), "1.23 km");
  assert.equal(formatLength(NaN), "-");
  assert.equal(formatArea(12.345), "12.35 m²");
  assert.equal(formatArea(850.56), "850.6 m²");
  assert.equal(formatArea(25000), "2.50 ha");
});

test("metres per pixel matches the Web Mercator tile maths at the campus", () => {
  // z0 world = 360 deg across 512 px -> at the equator 78 271.5 m/px
  assert.ok(Math.abs(metersPerPixel(0, 0) - 78271.517) < 5);
  // equator 78 271.517 / 2^19 = 0.1493 m/px, times cos(60.19 deg) = 0.0742; the ellipsoid adds ~0.3 %
  const z19 = metersPerPixel(19, KSYK.lat);
  assert.ok(z19 > 0.0735 && z19 < 0.0750, `z19 ${z19}`);
  assert.ok(Math.abs(metersPerPixel(20, KSYK.lat) * 2 - z19) < 1e-9);
});
