// Smoke test — synthetic campus with 2 rooms, 1 hallway, 2 doors, and
// two floors linked by a stair. Verifies buildNavGraph → findPath.
// Run with: npx tsx packages/routing/src/smoke.mjs
import { buildNavGraph } from "./build.ts";
import { buildGraph, findPath, PROFILE_DEFAULT, PROFILE_WHEELCHAIR } from "./index.ts";

// Coordinates are hand-tuned around KSYK's neighbourhood so haversine
// distances look reasonable (metres, not thousands).
const roomA = {
  id: "R1", buildingId: "B1", floor: 1, roomNumber: "101",
  points: [
    { lat: 60.18590, lng: 25.02890 },
    { lat: 60.18594, lng: 25.02890 },
    { lat: 60.18594, lng: 25.02895 },
    { lat: 60.18590, lng: 25.02895 },
  ],
};
const roomB = {
  id: "R2", buildingId: "B1", floor: 1, roomNumber: "102",
  points: [
    { lat: 60.18590, lng: 25.02905 },
    { lat: 60.18594, lng: 25.02905 },
    { lat: 60.18594, lng: 25.02910 },
    { lat: 60.18590, lng: 25.02910 },
  ],
};
const roomC = {
  id: "R3", buildingId: "B1", floor: 2, roomNumber: "202",
  points: [
    { lat: 60.18590, lng: 25.02905 },
    { lat: 60.18594, lng: 25.02905 },
    { lat: 60.18594, lng: 25.02910 },
    { lat: 60.18590, lng: 25.02910 },
  ],
};

// Hallway on floor 1 running east-west between the two rooms.
const hallway = {
  id: "H1", buildingId: "B1", floor: 1,
  startY: 60.18592, startX: 25.02892,
  endY: 60.18592, endX: 25.02908,
  width: 2.5,
};
// Hallway on floor 2 (shorter but still there so the stair can hook in).
const hallway2 = {
  id: "H2", buildingId: "B1", floor: 2,
  startY: 60.18592, startX: 25.02900,
  endY: 60.18592, endX: 25.02908,
  width: 2.5,
};

// Doors: A ↔ H1 at west end; B ↔ H1 at east end; C ↔ H2 at east end.
const doorA = {
  id: "D1", buildingId: "B1", floor: 1, position: { lat: 60.18592, lng: 25.02893 },
  connects: ["R1", "H1"], accessible: true,
};
const doorB = {
  id: "D2", buildingId: "B1", floor: 1, position: { lat: 60.18592, lng: 25.02907 },
  connects: ["R2", "H1"], accessible: true,
};
const doorC = {
  id: "D3", buildingId: "B1", floor: 2, position: { lat: 60.18592, lng: 25.02907 },
  connects: ["R3", "H2"], accessible: true,
};
// Stair connecting floors 1 and 2 at the middle of the corridor.
const stair = {
  id: "S1", buildingId: "B1", floors: [1, 2],
  position: { lat: 60.18592, lng: 25.02900 }, accessible: false,
};
// Elevator co-located with stair — accessible route.
const elev = {
  id: "E1", buildingId: "B1", floors: [1, 2],
  position: { lat: 60.18592, lng: 25.02900 }, accessible: true,
};

const { nodes, edges, warnings } = buildNavGraph({
  rooms: [roomA, roomB, roomC],
  hallways: [hallway, hallway2],
  doors: [doorA, doorB, doorC],
  stairs: [stair],
  elevators: [elev],
});

console.log(`Graph: ${nodes.length} nodes, ${edges.length} edges`);
if (warnings.length) {
  console.log(`Warnings: ${warnings.length}`);
  for (const w of warnings) console.log(`  ${w.kind}: ${w.message}`);
}

const g = buildGraph(nodes, edges);
const route = findPath(g, "room:R1", "room:R2");
if (!route) {
  console.error("FAIL: R1→R2 no path");
  process.exit(1);
}
console.log(`PASS  R1→R2  ${route.totalDistanceMeters.toFixed(1)} m  ${route.path.length} nodes`);

const cross = findPath(g, "room:R1", "room:R3");
if (!cross) {
  console.error("FAIL: R1→R3 no cross-floor path");
  process.exit(1);
}
console.log(`PASS  R1→R3  ${cross.totalDistanceMeters.toFixed(1)} m  ${cross.path.length} nodes  floors=[${[...new Set(cross.path.map((n) => n.floor))].join(",")}]`);
// Wheelchair route should skip stairs and prefer the elevator — either
// way it must succeed since we included an elevator.
const wc = findPath(g, "room:R1", "room:R3", PROFILE_WHEELCHAIR);
if (!wc) {
  console.error("FAIL: wheelchair R1→R3 no path");
  process.exit(1);
}
// Confirm no stair node appears on the wheelchair path.
const hitStair = wc.path.some((n) => n.type === "stair");
if (hitStair) {
  console.error("FAIL: wheelchair route uses stair");
  process.exit(1);
}
console.log(`PASS  R1→R3 (wheelchair, no stairs)  ${wc.totalDistanceMeters.toFixed(1)} m`);
