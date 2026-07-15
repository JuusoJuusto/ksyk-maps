/**
 * @ksyk/shared/validation — pre-publish sanity checks for a MapPackage.
 *
 * Pure functions — no DOM, no fetch, no side effects. Safe to run on
 * server (before persist) and client (in the Builder before publish).
 *
 * Each check emits `ValidationIssue`s at one of three severities:
 *   - `error`   — publish must be blocked.
 *   - `warning` — publish allowed, but the Builder should surface it.
 *   - `info`    — advisory, useful for the "validation" panel.
 *
 * Issues carry `entityKind` + `entityId` so the Builder can jump to
 * the offending object.
 */
import type {
  Building, Room, Hallway, Door, Stair, Elevator, Floor, Polygon,
} from "../types";
import { polygonBounds, bboxOverlaps, haversineMeters } from "../geo";

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationEntityKind =
  | "building" | "floor" | "room" | "hallway"
  | "door" | "stair" | "elevator" | "package";

/** A single finding from the validator. */
export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  entityKind: ValidationEntityKind;
  entityId: string | null;
  message: string;
  /** Human-actionable hint ("Add a door on floor 2"). */
  hint?: string;
}

/** Result of a full validation pass. */
export interface ValidationResult {
  issues: ValidationIssue[];
  /** Count by severity — pre-computed for the Builder header pill. */
  errorCount: number;
  warningCount: number;
  infoCount: number;
  /** True when there are no errors — publish is allowed. */
  publishable: boolean;
}

/** Everything the validator inspects. Superset of `MapPackage` payload
 *  fields so callers can pass an already-loaded batch of entities
 *  without wrapping into the full package. */
export interface ValidateInput {
  buildings: Building[];
  floors?: Floor[];
  rooms: Room[];
  hallways?: Hallway[];
  doors?: Door[];
  stairs?: Stair[];
  elevators?: Elevator[];
}

/** Run every check and return a consolidated result. */
export function validateMap(input: ValidateInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  issues.push(...checkDuplicateIds(input));
  issues.push(...checkInvalidPolygons(input));
  issues.push(...checkOverlappingBuildings(input));
  issues.push(...checkOrphanRooms(input));
  issues.push(...checkFloorReferences(input));
  issues.push(...checkStairFloors(input));
  issues.push(...checkElevatorFloors(input));
  issues.push(...checkDoors(input));

  // Sort: errors first, then warnings, then info; then by entityKind.
  const rank: Record<ValidationSeverity, number> = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => rank[a.severity] - rank[b.severity] || a.entityKind.localeCompare(b.entityKind));

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return {
    issues,
    errorCount,
    warningCount,
    infoCount,
    publishable: errorCount === 0,
  };
}

// ── Checks ─────────────────────────────────────────────────────────

/** IDs must be unique per kind. */
function checkDuplicateIds(input: ValidateInput): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const dupCheck = <T extends { id: string }>(
    items: T[] | undefined,
    kind: ValidationEntityKind,
  ) => {
    if (!items) return;
    const seen = new Set<string>();
    for (const it of items) {
      if (seen.has(it.id)) {
        out.push({
          code: "duplicate_id",
          severity: "error",
          entityKind: kind,
          entityId: it.id,
          message: `Duplicate ${kind} id "${it.id}"`,
          hint: "Rename or delete the duplicate.",
        });
      }
      seen.add(it.id);
    }
  };
  dupCheck(input.buildings, "building");
  dupCheck(input.floors, "floor");
  dupCheck(input.rooms, "room");
  dupCheck(input.hallways, "hallway");
  dupCheck(input.doors, "door");
  dupCheck(input.stairs, "stair");
  dupCheck(input.elevators, "elevator");
  return out;
}

/** Polygons must have ≥ 3 unique vertices and not self-touch. */
function checkInvalidPolygons(input: ValidateInput): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const checkPoly = (poly: Polygon | undefined, kind: ValidationEntityKind, id: string) => {
    if (!poly) return;
    if (poly.length < 3) {
      out.push({
        code: "polygon_too_few_vertices",
        severity: "error",
        entityKind: kind,
        entityId: id,
        message: `${kind[0].toUpperCase() + kind.slice(1)} ${id} has ${poly.length} vertices (min 3).`,
        hint: "Add at least three corner points.",
      });
      return;
    }
    // Adjacent-duplicate check.
    for (let i = 1; i < poly.length; i++) {
      if (poly[i].lat === poly[i - 1].lat && poly[i].lng === poly[i - 1].lng) {
        out.push({
          code: "polygon_duplicate_vertex",
          severity: "warning",
          entityKind: kind,
          entityId: id,
          message: `${kind} ${id} has consecutive duplicate vertices at index ${i}.`,
        });
      }
    }
  };
  for (const b of input.buildings) checkPoly(b.points, "building", b.id);
  for (const r of input.rooms) checkPoly(r.points, "room", r.id);
  return out;
}

/** Buildings' bboxes shouldn't overlap. Rooms' bboxes shouldn't overlap
 *  within the same building/floor pair. */
function checkOverlappingBuildings(input: ValidateInput): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const withBBox = input.buildings.map((b) => ({
    id: b.id, bbox: b.points ? polygonBounds(b.points) : null,
  })).filter((b) => b.bbox);
  for (let i = 0; i < withBBox.length; i++) {
    for (let j = i + 1; j < withBBox.length; j++) {
      if (bboxOverlaps(withBBox[i].bbox!, withBBox[j].bbox!)) {
        out.push({
          code: "buildings_overlap",
          severity: "warning",
          entityKind: "building",
          entityId: withBBox[i].id,
          message: `Building ${withBBox[i].id} bbox overlaps ${withBBox[j].id}.`,
          hint: "Confirm this is intended (e.g. adjacent buildings).",
        });
      }
    }
  }
  return out;
}

/** Rooms must belong to a real building. Rooms marked traversable
 *  (classroom, office, etc.) should also have at least one door in
 *  the doors table pointing at them — otherwise they're unreachable. */
function checkOrphanRooms(input: ValidateInput): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const buildingIds = new Set(input.buildings.map((b) => b.id));
  const doorTargets = new Set<string>();
  for (const d of input.doors ?? []) {
    if (d.connects) {
      for (const c of d.connects) doorTargets.add(c);
    }
  }
  for (const room of input.rooms) {
    if (!buildingIds.has(room.buildingId)) {
      out.push({
        code: "room_unknown_building",
        severity: "error",
        entityKind: "room",
        entityId: room.id,
        message: `Room ${room.roomNumber} references unknown building "${room.buildingId}".`,
      });
    }
    // Doors are optional in the schema — only warn for non-outdoor/
    // non-emergency rooms, where "no door" is the surprising case.
    if (
      (input.doors?.length ?? 0) > 0 &&
      room.type !== "outdoor" &&
      room.type !== "emergency" &&
      !doorTargets.has(room.id)
    ) {
      out.push({
        code: "room_no_doors",
        severity: "warning",
        entityKind: "room",
        entityId: room.id,
        message: `Room ${room.roomNumber} has no doors — unreachable in navigation.`,
        hint: "Add a door connecting this room to a hallway or adjacent room.",
      });
    }
  }
  return out;
}

/** Referenced floors must exist. */
function checkFloorReferences(input: ValidateInput): ValidationIssue[] {
  if (!input.floors || input.floors.length === 0) return [];
  const out: ValidationIssue[] = [];
  const floorKey = (buildingId: string, n: number) => `${buildingId}#${n}`;
  const floorSet = new Set<string>();
  for (const f of input.floors) floorSet.add(floorKey(f.buildingId, f.floorNumber));

  for (const room of input.rooms) {
    if (!floorSet.has(floorKey(room.buildingId, room.floor))) {
      out.push({
        code: "room_unknown_floor",
        severity: "error",
        entityKind: "room",
        entityId: room.id,
        message: `Room ${room.roomNumber} references floor ${room.floor} which doesn't exist in building ${room.buildingId}.`,
      });
    }
  }
  return out;
}

/** Stairs must reach ≥ 2 distinct floors + all floors must actually
 *  exist in the building's floor table. */
function checkStairFloors(input: ValidateInput): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const floorKey = (buildingId: string, n: number) => `${buildingId}#${n}`;
  const floorSet = new Set((input.floors ?? []).map((f) => floorKey(f.buildingId, f.floorNumber)));

  for (const s of input.stairs ?? []) {
    if (!s.floors || s.floors.length < 2) {
      out.push({
        code: "stair_too_few_floors",
        severity: "error",
        entityKind: "stair",
        entityId: s.id,
        message: `Stair ${s.id} lists ${s.floors?.length ?? 0} floor(s) — needs at least 2.`,
      });
      continue;
    }
    if (new Set(s.floors).size !== s.floors.length) {
      out.push({
        code: "stair_duplicate_floors",
        severity: "warning",
        entityKind: "stair",
        entityId: s.id,
        message: `Stair ${s.id} lists a floor more than once.`,
      });
    }
    if (input.floors) {
      for (const f of s.floors) {
        if (!floorSet.has(floorKey(s.buildingId, f))) {
          out.push({
            code: "stair_unknown_floor",
            severity: "error",
            entityKind: "stair",
            entityId: s.id,
            message: `Stair ${s.id} references floor ${f} which doesn't exist.`,
          });
        }
      }
    }
  }
  return out;
}

/** Elevators — same rules as stairs but a 1-floor elevator (rare, but
 *  legal for e.g. a mezzanine) is allowed. */
function checkElevatorFloors(input: ValidateInput): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const floorKey = (buildingId: string, n: number) => `${buildingId}#${n}`;
  const floorSet = new Set((input.floors ?? []).map((f) => floorKey(f.buildingId, f.floorNumber)));

  for (const e of input.elevators ?? []) {
    if (!e.floors || e.floors.length === 0) {
      out.push({
        code: "elevator_no_floors",
        severity: "error",
        entityKind: "elevator",
        entityId: e.id,
        message: `Elevator ${e.id} lists no floors.`,
      });
      continue;
    }
    if (e.floors.length < 2) {
      out.push({
        code: "elevator_single_floor",
        severity: "warning",
        entityKind: "elevator",
        entityId: e.id,
        message: `Elevator ${e.id} connects only one floor.`,
      });
    }
    if (!e.accessible) {
      out.push({
        code: "elevator_not_accessible",
        severity: "warning",
        entityKind: "elevator",
        entityId: e.id,
        message: `Elevator ${e.id} is marked not accessible.`,
        hint: "Wheelchair routing depends on accessible elevators — confirm this is correct.",
      });
    }
    if (input.floors) {
      for (const f of e.floors) {
        if (!floorSet.has(floorKey(e.buildingId, f))) {
          out.push({
            code: "elevator_unknown_floor",
            severity: "error",
            entityKind: "elevator",
            entityId: e.id,
            message: `Elevator ${e.id} references floor ${f} which doesn't exist.`,
          });
        }
      }
    }
  }
  return out;
}

/** Each door must (a) reference two existing entities, (b) be
 *  reasonably close (< 30 m) to the room polygon centroid it claims to
 *  belong to. */
function checkDoors(input: ValidateInput): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const roomIds = new Set(input.rooms.map((r) => r.id));
  const hallwayIds = new Set((input.hallways ?? []).map((h) => h.id));
  const roomIndex = new Map(input.rooms.map((r) => [r.id, r]));

  for (const d of input.doors ?? []) {
    if (!d.connects || d.connects.length !== 2) {
      out.push({
        code: "door_invalid_connects",
        severity: "error",
        entityKind: "door",
        entityId: d.id,
        message: `Door ${d.id} has invalid connects tuple.`,
      });
      continue;
    }
    for (const side of d.connects) {
      if (!roomIds.has(side) && !hallwayIds.has(side)) {
        out.push({
          code: "door_unknown_reference",
          severity: "error",
          entityKind: "door",
          entityId: d.id,
          message: `Door ${d.id} references unknown entity "${side}".`,
        });
      }
    }
    // Sanity: door too far from every room it points to?
    for (const side of d.connects) {
      const room = roomIndex.get(side);
      if (!room || !room.points || room.points.length === 0) continue;
      const centroid = {
        lat: room.points.reduce((s, p) => s + p.lat, 0) / room.points.length,
        lng: room.points.reduce((s, p) => s + p.lng, 0) / room.points.length,
      };
      const dist = haversineMeters(centroid, d.position);
      if (dist > 30) {
        out.push({
          code: "door_far_from_room",
          severity: "warning",
          entityKind: "door",
          entityId: d.id,
          message: `Door ${d.id} is ${dist.toFixed(1)} m from room ${side} centre.`,
          hint: "Confirm the door's position is on the correct room's wall.",
        });
      }
    }
  }
  return out;
}
