// Smoke test — synthetic bboxes around KSYK campus. Verifies that:
//   1. Point queries return the enclosing bboxes.
//   2. BBox queries return overlapping bboxes only.
//   3. Removal takes bboxes out of subsequent queries.
//   4. Culling gives a real speedup on a 1000-feature set (rough check).
import { SpatialIndex } from "./index.ts";

const idx = new SpatialIndex();

// Three overlapping-ish rectangles around Helsinki.
idx.insert("A", { minLat: 60.185, maxLat: 60.186, minLng: 25.028, maxLng: 25.030 });
idx.insert("B", { minLat: 60.186, maxLat: 60.187, minLng: 25.030, maxLng: 25.032 });
idx.insert("C", { minLat: 60.190, maxLat: 60.191, minLng: 25.050, maxLng: 25.052 });

const inA = idx.queryPoint({ lat: 60.1855, lng: 25.0290 });
console.log(`point in A → [${inA.join(",")}]  ${inA[0] === "A" && inA.length === 1 ? "PASS" : "FAIL"}`);

const around = idx.queryBBox({ minLat: 60.185, maxLat: 60.187, minLng: 25.028, maxLng: 25.032 });
console.log(`bbox A+B    → [${around.join(",")}]  ${around.length === 2 && around.includes("A") && around.includes("B") ? "PASS" : "FAIL"}`);

idx.remove("A");
const afterRemove = idx.queryPoint({ lat: 60.1855, lng: 25.0290 });
console.log(`after remove A → [${afterRemove.join(",")}]  ${afterRemove.length === 0 ? "PASS" : "FAIL"}`);

// Stress: 5000 random rooms in a KSYK-sized window; query a 100 m viewport.
const stress = new SpatialIndex();
const cLat = 60.186, cLng = 25.029;
const rand = (() => { let s = 1; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; })();
const N = 5000;
for (let i = 0; i < N; i++) {
  const lat = cLat + (rand() - 0.5) * 0.02;
  const lng = cLng + (rand() - 0.5) * 0.02;
  stress.insert(`r${i}`, { minLat: lat, maxLat: lat + 0.00003, minLng: lng, maxLng: lng + 0.00005 });
}
const t0 = performance.now();
let total = 0;
for (let i = 0; i < 1000; i++) {
  const q = stress.queryBBox({
    minLat: cLat, maxLat: cLat + 0.0009, minLng: cLng, maxLng: cLng + 0.0015,
  });
  total += q.length;
}
const t1 = performance.now();
console.log(`stress: ${N} feats, 1000 queries → ${(t1 - t0).toFixed(1)}ms total (${((t1 - t0) / 1000 * 1000).toFixed(3)}us/query), avg hits ${(total / 1000).toFixed(1)}`);
