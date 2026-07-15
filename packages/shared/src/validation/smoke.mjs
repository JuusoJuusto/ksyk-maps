// Smoke test — synthetic broken campus. Verifies validator catches
// duplicate ids, missing buildings, degenerate polygons, and missing
// stair floors. Run: npx tsx packages/shared/src/validation/smoke.mjs
import { validateMap } from "./index.ts";

const result = validateMap({
  buildings: [
    { id: "B1", name: "Main", points: [
      { lat: 60.185, lng: 25.028 }, { lat: 60.186, lng: 25.028 }, { lat: 60.186, lng: 25.030 }, { lat: 60.185, lng: 25.030 },
    ]},
    { id: "B1", name: "Duplicate id!", points: [
      { lat: 60.186, lng: 25.030 }, { lat: 60.187, lng: 25.030 }, { lat: 60.187, lng: 25.032 }, { lat: 60.186, lng: 25.032 },
    ]},
  ],
  floors: [
    { id: "F1", buildingId: "B1", floorNumber: 1 },
    { id: "F2", buildingId: "B1", floorNumber: 2 },
  ],
  rooms: [
    { id: "R1", buildingId: "B1", floor: 1, roomNumber: "101", points: [
      { lat: 60.1855, lng: 25.0285 }, { lat: 60.1856, lng: 25.0285 }, { lat: 60.1856, lng: 25.0286 }, { lat: 60.1855, lng: 25.0286 },
    ]},
    { id: "R2", buildingId: "NOPE", floor: 1, roomNumber: "102" }, // dangling building
    { id: "R3", buildingId: "B1", floor: 99, roomNumber: "103" },  // dangling floor
    { id: "R4", buildingId: "B1", floor: 1, roomNumber: "104", points: [
      { lat: 60.1855, lng: 25.0285 }, { lat: 60.1855, lng: 25.0285 }, // degenerate: 2 points
    ]},
  ],
  stairs: [
    { id: "S1", buildingId: "B1", floors: [1] , position: { lat: 60.1855, lng: 25.0285 }},
  ],
  doors: [
    { id: "D1", buildingId: "B1", floor: 1, position: { lat: 60.1855, lng: 25.0285 }, connects: ["R1", "ghost"] },
  ],
});

console.log(`Issues: ${result.issues.length}`);
console.log(`  errors:   ${result.errorCount}`);
console.log(`  warnings: ${result.warningCount}`);
console.log(`  info:     ${result.infoCount}`);
console.log(`Publishable: ${result.publishable}`);

const codes = result.issues.map((i) => i.code);
const expected = [
  "duplicate_id",
  "polygon_too_few_vertices",
  "room_unknown_building",
  "room_unknown_floor",
  "stair_too_few_floors",
  "door_unknown_reference",
];
let allSeen = true;
for (const e of expected) {
  const ok = codes.includes(e);
  console.log(`  ${ok ? "PASS" : "FAIL"}  saw '${e}'`);
  if (!ok) allSeen = false;
}
console.log(result.publishable ? "FAIL: should not be publishable" : "PASS: correctly blocks publish");
process.exit(allSeen && !result.publishable ? 0 : 1);
