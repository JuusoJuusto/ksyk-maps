// Round-trip smoke — MapPackage → JSON → MapPackage and MapPackage →
// GeoJSON → MapPackage should preserve all geometry + typed fields.
// Run: npx tsx packages/shared/src/io/smoke.mjs
import { packageToJSON, packageFromJSON, packageToGeoJSON, geoJSONToPackage } from "./index.ts";

/** @type {import("../types").MapPackage} */
const pkg = {
  manifest: { version: "1.0.0", title: "Test Campus", publishedAt: "2026-07-15T00:00:00Z" },
  mapDefaults: {
    center: { lat: 60.186, lng: 25.029 }, zoom: 17, bearing: 0, pitch: 0, minZoom: 12, maxZoom: 22,
  },
  buildings: [
    { id: "B1", name: "Main", floors: 3, colorCode: "#2563eb", points: [
      { lat: 60.185, lng: 25.028 }, { lat: 60.186, lng: 25.028 },
      { lat: 60.186, lng: 25.030 }, { lat: 60.185, lng: 25.030 },
    ]},
  ],
  floors: [
    { id: "F1", buildingId: "B1", floorNumber: 1 },
    { id: "F2", buildingId: "B1", floorNumber: 2 },
  ],
  rooms: [
    { id: "R1", buildingId: "B1", floor: 1, roomNumber: "101", name: "Physics",
      type: "lab", tags: ["science"], points: [
        { lat: 60.1855, lng: 25.0285 }, { lat: 60.1856, lng: 25.0285 },
        { lat: 60.1856, lng: 25.0286 }, { lat: 60.1855, lng: 25.0286 },
      ]},
  ],
  hallways: [
    { id: "H1", buildingId: "B1", floor: 1, startY: 60.18555, startX: 25.02852, endY: 60.18555, endX: 25.02858, width: 2.5 },
  ],
  doors: [
    { id: "D1", buildingId: "B1", floor: 1, position: { lat: 60.18555, lng: 25.02853 }, connects: ["R1", "H1"], accessible: true },
  ],
  stairs: [
    { id: "S1", buildingId: "B1", floors: [1, 2], position: { lat: 60.1856, lng: 25.02855 } },
  ],
  elevators: [
    { id: "E1", buildingId: "B1", floors: [1, 2], position: { lat: 60.1856, lng: 25.02859 }, accessible: true },
  ],
};

let pass = 0, fail = 0;
const expect = (label, cond) => {
  if (cond) { pass++; console.log(`PASS  ${label}`); }
  else      { fail++; console.log(`FAIL  ${label}`); }
};

// ── JSON round-trip ─────────────────────────────────────
const json = packageToJSON(pkg, { pretty: true });
const back = packageFromJSON(json);
expect("json.buildings preserved", back.buildings.length === 1 && back.buildings[0].id === "B1");
expect("json.rooms preserved", back.rooms.length === 1 && back.rooms[0].tags?.[0] === "science");
expect("json.stairs floors preserved", back.stairs[0].floors.join(",") === "1,2");
expect("json.doors connects preserved", back.doors[0].connects[0] === "R1");

// ── GeoJSON round-trip ─────────────────────────────────
const gj = packageToGeoJSON(pkg);
expect("geojson has 5 features (b+r+h+d+s+e)", gj.features.length === 6);
const gjBack = geoJSONToPackage(gj);
expect("gj.buildings preserved", gjBack.buildings.length === 1 && gjBack.buildings[0].name === "Main");
expect("gj.rooms preserved", gjBack.rooms.length === 1 && gjBack.rooms[0].tags?.[0] === "science");
expect("gj.hallways preserved", gjBack.hallways.length === 1 && Math.abs((gjBack.hallways[0].width ?? 0) - 2.5) < 1e-9);
expect("gj.stairs preserved", gjBack.stairs.length === 1 && gjBack.stairs[0].floors.length === 2);
expect("gj.elevators preserved", gjBack.elevators.length === 1 && gjBack.elevators[0].accessible === true);
expect("gj.mapDefaults preserved via ksyk metadata", Math.abs(gjBack.mapDefaults.center.lat - 60.186) < 1e-9);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail === 0 ? 0 : 1);
