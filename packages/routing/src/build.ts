/**
 * @ksyk/routing/build — auto-build a nav graph from raw campus data.
 *
 * Consumers pass in the raw building/room/hallway/door/stair/elevator
 * tables (exactly the shapes stored in the DB / edited in the builder)
 * and get back a `{ nodes, edges }` pair ready to feed into `buildGraph`.
 *
 * Design principles:
 *
 *  - **Deterministic ids**: nodes/edges get stable ids derived from the
 *    entity that spawned them (`room:<id>`, `door:<id>`, `stair:<id>#f<floor>`).
 *    Rebuilding the graph after a small edit produces the same ids for
 *    unchanged parts — makes diffing routes across edits meaningful.
 *  - **No hidden work**: we don't infer geometry. If a door lists two
 *    connections (roomId + hallwayId or roomA + roomB) that's the edge
 *    we make. If a hallway has no doors on it, it's floating and won't
 *    be reachable — we return that as a warning, not an error, so the
 *    Builder's validation panel can surface it.
 *  - **Cost = metres**: `NavGraphEdge.distance` is real-world metres via
 *    haversine, so the A* heuristic in `findPath` is admissible.
 *
 * Multi-floor:
 *  - Stairs generate one node per served floor + an edge between every
 *    pair of consecutive floors it serves. Same for elevators. Elevator
 *    edges are marked `accessible: true`; stairs are `false`.
 */
import type {
  Building,
  Room,
  Hallway,
  Door,
  Stair,
  Elevator,
  NavGraphNode,
  NavGraphEdge,
  LatLng,
} from "@ksyk/shared";
import { haversineMeters, polygonCentroid } from "@ksyk/shared";

/** Input to the builder. All arrays default to empty. */
export interface BuildNavGraphInput {
  buildings?: Building[];
  rooms: Room[];
  hallways?: Hallway[];
  doors?: Door[];
  stairs?: Stair[];
  elevators?: Elevator[];
  /** Extra hallway-to-hallway junction points to auto-generate at
   *  intersections. Set to false to disable. Default true. */
  detectHallwayIntersections?: boolean;
}

/** Non-fatal issue found while building. */
export interface NavGraphWarning {
  kind:
    | "floating_hallway"
    | "orphan_door"
    | "room_without_position"
    | "unknown_room_reference"
    | "stair_needs_at_least_two_floors";
  entityId: string;
  message: string;
}

export interface BuildNavGraphResult {
  nodes: NavGraphNode[];
  edges: NavGraphEdge[];
  warnings: NavGraphWarning[];
}

/**
 * Convert lat/lng-space (a hallway is stored as startX/Y and endX/Y in
 * whatever coordinate space the builder uses — typically lng/lat). We
 * treat X = lng, Y = lat, consistent with GeoJSON serialisation.
 */
function hallwayStart(h: Hallway): LatLng { return { lat: h.startY, lng: h.startX }; }
function hallwayEnd(h: Hallway): LatLng { return { lat: h.endY, lng: h.endX }; }

/** Rough position for a room: polygon centroid if available, otherwise
 *  null — caller adds it to warnings. */
function roomCenter(room: Room): LatLng | null {
  if (!room.points || room.points.length === 0) return null;
  return polygonCentroid(room.points);
}

/**
 * Build a nav graph from campus data.
 */
export function buildNavGraph(input: BuildNavGraphInput): BuildNavGraphResult {
  const {
    rooms,
    hallways = [],
    doors = [],
    stairs = [],
    elevators = [],
    detectHallwayIntersections = true,
  } = input;

  const nodes: NavGraphNode[] = [];
  const edges: NavGraphEdge[] = [];
  const warnings: NavGraphWarning[] = [];

  // Track ids we've added so we can look up entities by their generated
  // node id without a linear scan.
  const nodeById = new Map<string, NavGraphNode>();
  const pushNode = (n: NavGraphNode) => {
    if (nodeById.has(n.id)) return;
    nodes.push(n);
    nodeById.set(n.id, n);
  };
  const pushEdge = (
    id: string,
    from: string,
    to: string,
    accessible: boolean,
    restrictions: string[] | null = null,
  ) => {
    const a = nodeById.get(from);
    const b = nodeById.get(to);
    if (!a || !b) return;
    const distance = haversineMeters(a.position, b.position);
    edges.push({ id, from, to, distance, accessible, restrictions });
  };

  // ── Rooms ──────────────────────────────────────────────────────────
  const roomById = new Map<string, Room>();
  for (const room of rooms) {
    roomById.set(room.id, room);
    const pos = roomCenter(room);
    if (!pos) {
      warnings.push({
        kind: "room_without_position",
        entityId: room.id,
        message: `Room ${room.roomNumber} (${room.id}) has no polygon; skipping in graph`,
      });
      continue;
    }
    pushNode({
      id: `room:${room.id}`,
      position: pos,
      floor: room.floor,
      buildingId: room.buildingId,
      type: "room",
    });
  }

  // ── Hallways ───────────────────────────────────────────────────────
  // Each hallway becomes a start-waypoint + end-waypoint + an edge
  // between them. Two hallways touching at endpoints (within
  // ~0.5 m) become the same waypoint node so the router can flow
  // through junctions.
  const junctionEps = 0.5; // metres
  const waypointOf = new Map<string, string>(); // "lat,lng"@floor → nodeId

  const waypointNodeId = (
    pos: LatLng,
    floor: number,
    buildingId: string | null,
  ): string => {
    // Round to ~1e-6 degrees (~0.11 m at equator) as a cheap grid.
    // Then dedupe against already-registered waypoints within eps metres.
    const key = `${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}@${floor}`;
    if (waypointOf.has(key)) return waypointOf.get(key)!;
    for (const [, id] of waypointOf) {
      const n = nodeById.get(id);
      if (n && n.floor === floor && haversineMeters(n.position, pos) < junctionEps) {
        waypointOf.set(key, id);
        return id;
      }
    }
    const id = `wpt:${nodes.length}`;
    pushNode({
      id,
      position: pos,
      floor,
      buildingId,
      type: "hallway_waypoint",
    });
    waypointOf.set(key, id);
    return id;
  };

  for (const h of hallways) {
    const floor = h.floor ?? 0;
    const b = h.buildingId ?? null;
    const aId = waypointNodeId(hallwayStart(h), floor, b);
    const bId = waypointNodeId(hallwayEnd(h), floor, b);
    if (aId !== bId) {
      pushEdge(`hall:${h.id}`, aId, bId, /* accessible */ (h.width ?? 0) === 0 || (h.width ?? 999) >= 0.9);
    }
  }

  // Hallway intersection detection: any two hallways that share a
  // waypoint node already fold into one via the eps dedupe above. This
  // flag reserves room for future geometric intersection detection
  // (mid-segment crossings) — no-op today.
  void detectHallwayIntersections;

  // ── Doors ──────────────────────────────────────────────────────────
  // A door bridges two entities. If either endpoint is a room we
  // connect its `room:<id>` node; if it's a hallway we connect the
  // nearest waypoint on that hallway; otherwise we warn.
  for (const door of doors) {
    if (!door.connects || door.connects.length !== 2) {
      warnings.push({
        kind: "orphan_door",
        entityId: door.id,
        message: `Door ${door.id} has invalid connects tuple`,
      });
      continue;
    }
    const doorNodeId = `door:${door.id}`;
    pushNode({
      id: doorNodeId,
      position: door.position,
      floor: door.floor,
      buildingId: door.buildingId,
      type: "door",
    });

    for (let side = 0; side < 2; side++) {
      const target = door.connects[side];
      // First: is it a room id?
      const room = roomById.get(target);
      if (room) {
        const roomNode = nodeById.get(`room:${room.id}`);
        if (roomNode) {
          pushEdge(
            `door-${door.id}-side${side}`,
            doorNodeId,
            roomNode.id,
            door.accessible ?? true,
            door.locked ? ["locked"] : null,
          );
        }
        continue;
      }
      // Otherwise assume hallway id — attach to the nearest waypoint on
      // that hallway. If the hallway isn't found, warn.
      const hallway = hallways.find((h) => h.id === target);
      if (!hallway) {
        warnings.push({
          kind: "unknown_room_reference",
          entityId: door.id,
          message: `Door ${door.id} references '${target}' but it is neither a room nor a hallway`,
        });
        continue;
      }
      const nearest = nearestHallwayWaypoint(hallway, door.position, waypointOf, nodeById);
      if (nearest) {
        pushEdge(
          `door-${door.id}-side${side}`,
          doorNodeId,
          nearest,
          door.accessible ?? true,
          door.locked ? ["locked"] : null,
        );
      }
    }
  }

  // ── Stairs ─────────────────────────────────────────────────────────
  for (const stair of stairs) {
    if (!stair.floors || stair.floors.length < 2) {
      warnings.push({
        kind: "stair_needs_at_least_two_floors",
        entityId: stair.id,
        message: `Stair ${stair.id} lists ${stair.floors?.length ?? 0} floor(s)`,
      });
      continue;
    }
    // One node per floor.
    const perFloorIds: string[] = [];
    for (const f of stair.floors) {
      const id = `stair:${stair.id}#f${f}`;
      pushNode({
        id,
        position: stair.position,
        floor: f,
        buildingId: stair.buildingId,
        type: "stair",
      });
      perFloorIds.push(id);
    }
    // Consecutive floors get an edge — going stair→stair skips one flight.
    for (let i = 0; i < perFloorIds.length - 1; i++) {
      pushEdge(
        `stair:${stair.id}#${stair.floors[i]}-${stair.floors[i + 1]}`,
        perFloorIds[i],
        perFloorIds[i + 1],
        stair.accessible ?? false,
      );
    }
    // Every floor-node on the stair connects to the nearest waypoint on
    // that floor — otherwise stairs would be islands. If no waypoint
    // exists on that floor, the stair is unreachable from that floor.
    for (let i = 0; i < stair.floors.length; i++) {
      const stairNodeId = perFloorIds[i];
      const wpt = nearestWaypointOnFloor(stair.position, stair.floors[i], nodeById);
      if (wpt) {
        pushEdge(
          `stair:${stair.id}#f${stair.floors[i]}-wpt`,
          stairNodeId,
          wpt,
          stair.accessible ?? false,
        );
      }
    }
  }

  // ── Elevators ──────────────────────────────────────────────────────
  for (const el of elevators) {
    if (!el.floors || el.floors.length < 2) continue;
    const perFloorIds: string[] = [];
    for (const f of el.floors) {
      const id = `elev:${el.id}#f${f}`;
      pushNode({
        id,
        position: el.position,
        floor: f,
        buildingId: el.buildingId,
        type: "elevator",
      });
      perFloorIds.push(id);
    }
    for (let i = 0; i < perFloorIds.length - 1; i++) {
      pushEdge(
        `elev:${el.id}#${el.floors[i]}-${el.floors[i + 1]}`,
        perFloorIds[i],
        perFloorIds[i + 1],
        el.accessible,
      );
    }
    for (let i = 0; i < el.floors.length; i++) {
      const elNodeId = perFloorIds[i];
      const wpt = nearestWaypointOnFloor(el.position, el.floors[i], nodeById);
      if (wpt) {
        pushEdge(
          `elev:${el.id}#f${el.floors[i]}-wpt`,
          elNodeId,
          wpt,
          el.accessible,
        );
      }
    }
  }

  // ── Report floating hallways ───────────────────────────────────────
  // A hallway is floating if none of its waypoints have degree > 1 from
  // door edges.
  const doorTouched = new Set<string>();
  for (const e of edges) {
    if (e.id.startsWith("door-")) {
      doorTouched.add(e.from);
      doorTouched.add(e.to);
    }
  }
  for (const h of hallways) {
    const floor = h.floor ?? 0;
    const b = h.buildingId ?? null;
    const aId = waypointNodeId(hallwayStart(h), floor, b);
    const bId = waypointNodeId(hallwayEnd(h), floor, b);
    if (!doorTouched.has(aId) && !doorTouched.has(bId)) {
      warnings.push({
        kind: "floating_hallway",
        entityId: h.id,
        message: `Hallway ${h.id} has no doors — unreachable`,
      });
    }
  }

  return { nodes, edges, warnings };
}

/** Nearest existing waypoint on a hallway to a given position. Falls
 *  back to the nearest hallway endpoint if no better waypoint exists. */
function nearestHallwayWaypoint(
  h: Hallway,
  pos: LatLng,
  waypointOf: Map<string, string>,
  nodeById: Map<string, NavGraphNode>,
): string | null {
  const floor = h.floor ?? 0;
  let best: string | null = null;
  let bestD = Infinity;
  for (const id of waypointOf.values()) {
    const n = nodeById.get(id);
    if (!n || n.type !== "hallway_waypoint" || n.floor !== floor) continue;
    const d = haversineMeters(n.position, pos);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  // Only accept if within ~30 m (a rough sanity radius — anything farther
  // and the door probably shouldn't be pointing at that hallway).
  if (best && bestD < 30) return best;
  // Fallback: match either raw endpoint of the hallway directly.
  const start = hallwayStart(h);
  const end = hallwayEnd(h);
  const dStart = haversineMeters(start, pos);
  const dEnd = haversineMeters(end, pos);
  const chosenPos = dStart <= dEnd ? start : end;
  for (const id of waypointOf.values()) {
    const n = nodeById.get(id);
    if (!n || n.floor !== floor) continue;
    if (haversineMeters(n.position, chosenPos) < 0.5) return id;
  }
  return null;
}

/** Nearest waypoint on a given floor to a position. Used to hook
 *  stairs/elevators into the hallway graph. */
function nearestWaypointOnFloor(
  pos: LatLng,
  floor: number,
  nodeById: Map<string, NavGraphNode>,
): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const n of nodeById.values()) {
    if (n.type !== "hallway_waypoint" || n.floor !== floor) continue;
    const d = haversineMeters(n.position, pos);
    if (d < bestD) {
      bestD = d;
      best = n.id;
    }
  }
  return best;
}
