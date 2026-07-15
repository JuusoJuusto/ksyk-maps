// Manual smoke test — runs the search index against synthetic rooms
// and checks that all the important query shapes score correctly.
// Run with:  node --experimental-strip-types packages/shared/src/search/smoke.mjs
// Or (once tsx is available):  npx tsx packages/shared/src/search/smoke.mjs
//
// This isn't a unit-test file — it's a one-shot invariant checker used
// while iterating on the scorer. Not wired to CI.
import { SearchIndex } from "./index.ts";
import { buildRoomSearchIndex } from "./rooms.ts";

const rooms = [
  { id: "1", buildingId: "A", floor: 1, roomNumber: "912", name: "Physics Lab", type: "lab", tags: ["science", "electronics"] },
  { id: "2", buildingId: "A", floor: 2, roomNumber: "105", name: "Auditorium",  type: "auditorium" },
  { id: "3", buildingId: "B", floor: 0, roomNumber: "B01", name: "Library",     type: "library" },
  { id: "4", buildingId: "B", floor: 1, roomNumber: "B105", name: "Biology Lab", type: "lab" },
  { id: "5", buildingId: "A", floor: 1, roomNumber: "108", name: "Music Room",  type: "classroom", nameFi: "Musiikkiluokka" },
];
const buildings = [
  { id: "A", name: "Haavemäki" },
  { id: "B", name: "Länsisiipi" },
];

const idx = buildRoomSearchIndex(rooms, buildings);

const cases = [
  ["912", "1"],           // exact room number
  ["phys", "1"],          // prefix on name
  ["physics", "1"],       // whole word on name
  ["105", "2"],           // number that also appears inside B105 → should still prefer exact
  ["biolgy", "4"],        // typo — one edit distance
  ["musiikk", "5"],       // Finnish name, prefix
  ["haave 108", "5"],     // building name partial + room number
  ["audi", "2"],          // prefix of auditorium
];

let pass = 0, fail = 0;
for (const [q, expected] of cases) {
  const hits = idx.search(q);
  const top = hits[0];
  const topId = top ? top.doc.data.room.id : null;
  const ok = topId === expected;
  if (ok) pass++; else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  q=${JSON.stringify(q).padEnd(15)} expected=${expected}  got=${topId}  (score=${top?.score.toFixed(3) ?? "-"})`);
}
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail === 0 ? 0 : 1);
