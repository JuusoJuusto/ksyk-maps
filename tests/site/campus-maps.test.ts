/**
 * Multiple maps: the scoping rules that decide what visitors vs the builder see.
 * Pure functions only (no database), because these rules are what keeps the
 * public map safe while a second map is being built.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";

// server/db.ts refuses to load without a connection string; none of these tests touch it.
process.env.DATABASE_URL ??= "postgres://nobody:nothing@127.0.0.1:1/none";
type Mod = typeof import("../../server/campusMaps");
let DEFAULT_MAP_ID: Mod["DEFAULT_MAP_ID"], DEFAULT_STATE: Mod["DEFAULT_STATE"], normalizeState: Mod["normalizeState"],
  newMapId: Mod["newMapId"], pickMapId: Mod["pickMapId"], scopeRows: Mod["scopeRows"], scopedCacheControl: Mod["scopedCacheControl"];
let state: ReturnType<Mod["normalizeState"]>;

before(async () => {
  ({ DEFAULT_MAP_ID, DEFAULT_STATE, normalizeState, newMapId, pickMapId, scopeRows, scopedCacheControl } = await import("../../server/campusMaps"));
  state = normalizeState({
    published: "main",
    maps: [{ id: "main", name: "Main" }, { id: "new-wing", name: "New wing" }],
  });
});

test("stored state is sanitised: the default map always exists and `published` always points at a real map", () => {
  assert.deepEqual(normalizeState(undefined), DEFAULT_STATE);
  assert.deepEqual(normalizeState("junk"), DEFAULT_STATE);
  assert.ok(state.maps.some((m) => m.id === DEFAULT_MAP_ID), "default map re-added");
  assert.equal(state.published, "main");
  assert.equal(normalizeState({ published: "gone", maps: [{ id: "a1", name: "A" }] }).published, DEFAULT_MAP_ID, "dangling published falls back to default");
  const messy = normalizeState({ published: "a1", maps: [{ id: "a1", name: "A" }, { id: "a1", name: "Dup" }, { id: "BAD ID", name: "x" }, { id: "ok", name: "<b>Hi</b>" }, { id: "z", name: "" }] });
  assert.deepEqual(messy.maps.map((m) => m.id).sort(), ["a1", DEFAULT_MAP_ID, "ok"].sort(), "dups, bad ids and nameless maps dropped");
  assert.equal(messy.maps.find((m) => m.id === "ok")!.name, "bHi/b", "angle brackets stripped from names (no markup can survive)");
});

test("only admins can look at a map other than the published one", () => {
  assert.equal(pickMapId("new-wing", false, state), "main", "a visitor sending the header still gets the published map");
  assert.equal(pickMapId("new-wing", true, state), "new-wing");
  assert.equal(pickMapId("does-not-exist", true, state), "main", "unknown map ids are ignored");
  assert.equal(pickMapId(undefined, true, state), "main");
  assert.equal(pickMapId(["new-wing"], true, state), "main", "non-string header values are ignored");
});

test("scopeRows: unassigned rows are the default map; assigned rows only show in their map; floors follow their building", () => {
  const rows = [{ id: "b1" }, { id: "b2" }, { id: "b3" }];
  const assignments = new Map([["b2", "new-wing"]]);
  assert.deepEqual(scopeRows(rows, { mapId: DEFAULT_MAP_ID, assignments }).map((r) => r.id), ["b1", "b3"]);
  assert.deepEqual(scopeRows(rows, { mapId: "new-wing", assignments }).map((r) => r.id), ["b2"]);
  assert.deepEqual(scopeRows(rows, { mapId: "main", assignments }).map((r) => r.id), [], "a published map with nothing assigned is empty, not everything");
  const floors = [{ id: "f1", buildingId: "b1" }, { id: "f2", buildingId: "b2" }, { id: "f3", buildingId: "b2" }];
  const byBuilding = (f: { id: string; buildingId: string }) => f.buildingId;
  assert.deepEqual(scopeRows(floors, { mapId: "new-wing", assignments }, undefined, byBuilding).map((f) => f.id), ["f2", "f3"]);
  assert.deepEqual(scopeRows(floors, { mapId: DEFAULT_MAP_ID, assignments }, undefined, byBuilding).map((f) => f.id), ["f1"]);
  // every row lands in exactly one map
  const total = ["new-wing", DEFAULT_MAP_ID].reduce((n, mapId) => n + scopeRows(rows, { mapId, assignments }).length, 0);
  assert.equal(total, rows.length);
});

test("with no second map the feature is a no-op: every row stays in the default map", () => {
  const rows = [{ id: "a" }, { id: "b" }];
  assert.deepEqual(scopeRows(rows, { mapId: DEFAULT_MAP_ID, assignments: new Map() }), rows);
  assert.equal(pickMapId(undefined, false, DEFAULT_STATE), DEFAULT_MAP_ID);
});

test("new map ids are readable, unique and safe", () => {
  const taken = ["new-wing-0000"];
  let n = 0;
  const id = newMapId("New Wing!", taken, () => (n++ === 0 ? 0 : 0.5));
  assert.match(id, /^new-wing-[0-9a-z]{4}$/);
  assert.ok(!taken.includes(id), "does not reuse an existing id");
  assert.match(newMapId("  ÄÖ  ", [], () => 0.25), /^[a-z0-9][a-z0-9-]{0,40}$/);
  assert.match(newMapId("", [], () => 0.25), /^map-/, "a symbol-only or empty name still gives a valid id");
  assert.notEqual(newMapId("default", [], () => 0), DEFAULT_MAP_ID);
});

test("drafts are never CDN-cached; the published map is cached briefly (so a publish shows up within minutes)", () => {
  assert.equal(scopedCacheControl({ draft: true }), "no-store");
  assert.match(scopedCacheControl({ draft: false }), /s-maxage=60/);
  assert.doesNotMatch(scopedCacheControl({ draft: false }), /s-maxage=1800/);
});
