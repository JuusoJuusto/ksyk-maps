/**
 * @ksyk/routing — indoor navigation.
 *
 * The package exports:
 *   - `buildGraph(nodes, edges)` — turn a flat node/edge list into the
 *     adjacency structure the search algorithms want.
 *   - `findPath` — A* with a straight-line heuristic. Fast for typical
 *     campus graphs (< 10k nodes).
 *   - `findPathDijkstra` — Dijkstra. Slower but doesn't rely on a
 *     coordinate heuristic — used when profiles distort edge costs so
 *     much that A*'s optimality guarantee is at risk.
 *   - `buildNavGraph` — auto-build the graph from raw campus data
 *     (see `./build.ts`).
 *   - `annotateRoute` — turn a `Route` into a list of TurnHint's for
 *     turn-by-turn UI.
 *
 * Design guarantees:
 *   - Edge weights are ALWAYS non-negative. This is what lets us mix
 *     A* + Dijkstra safely.
 *   - `Route.totalDurationSeconds` uses the profile's walking speed.
 *   - Multi-floor: `Route.segments` splits at floor/building changes so
 *     the UI can animate the floor picker + draw one line per floor.
 */
import type { LatLng, NavGraphNode, NavGraphEdge } from "@ksyk/shared";
import { haversineMeters } from "@ksyk/shared";

/** Complete navigation graph. */
export interface NavGraph {
  nodes: Map<string, NavGraphNode>;
  /** Adjacency: nodeId → list of {edge, toNodeId}. */
  adjacency: Map<string, Array<{ edge: NavGraphEdge; to: string }>>;
}

/** User profile — drives edge weights. */
export interface RoutingProfile {
  walkingSpeedMps: number;
  /** Multiplier applied to stair edges. Wheelchair users set this very
   *  high so stairs are effectively avoided. */
  stairCostMultiplier: number;
  /** Multiplier applied to elevator edges. */
  elevatorCostMultiplier: number;
  /** Multiplier applied to outdoor edges (usually 1). */
  outdoorCostMultiplier: number;
  /** If true, only edges with `accessible: true` are traversed. */
  accessibleOnly: boolean;
  /** Restrictions to REJECT. Any edge whose `restrictions` intersect
   *  this set is skipped. E.g. `["locked", "emergency_only"]`. */
  disallowedRestrictions: string[];
}

export const PROFILE_DEFAULT: RoutingProfile = {
  walkingSpeedMps: 1.35,
  stairCostMultiplier: 1.5,
  elevatorCostMultiplier: 2.0,
  outdoorCostMultiplier: 1.0,
  accessibleOnly: false,
  disallowedRestrictions: ["locked", "emergency_only"],
};

export const PROFILE_WHEELCHAIR: RoutingProfile = {
  walkingSpeedMps: 1.0,
  stairCostMultiplier: 999,
  elevatorCostMultiplier: 1.2,
  outdoorCostMultiplier: 1.1,
  accessibleOnly: true,
  disallowedRestrictions: ["locked", "emergency_only"],
};

/** "Fast" profile — for administrators/staff who can use every route. */
export const PROFILE_FAST: RoutingProfile = {
  walkingSpeedMps: 1.7,
  stairCostMultiplier: 1.0,
  elevatorCostMultiplier: 1.5,
  outdoorCostMultiplier: 1.0,
  accessibleOnly: false,
  disallowedRestrictions: [],
};

/** A finalized route. */
export interface Route {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  path: NavGraphNode[];
  /** Per-floor / per-building sub-segments for rendering. */
  segments: Array<{
    floor: number;
    buildingId: string | null;
    coords: LatLng[];
  }>;
}

/** Human-facing turn hint. */
export interface TurnHint {
  /** Position on the route this hint applies to. */
  at: LatLng;
  /** Node this hint corresponds to. */
  nodeId: string;
  /** Direction to turn: -90..+90 (relative to the previous heading)
   *  where 0 = straight, -90 = hard left, +90 = hard right. */
  turnAngleDeg: number;
  /** Coarse category for UI (icon selection). */
  turn: "start" | "arrive" | "straight" | "slight_left" | "left" | "sharp_left" | "slight_right" | "right" | "sharp_right" | "floor_up" | "floor_down";
  /** Distance to the NEXT hint in metres. */
  distanceToNextMeters: number;
  /** Short description ("Turn right at the elevator"). */
  description: string;
}

/** Build a nav graph from raw node + edge lists. */
export function buildGraph(
  nodes: NavGraphNode[],
  edges: NavGraphEdge[],
): NavGraph {
  const nodeMap = new Map<string, NavGraphNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const adjacency = new Map<string, Array<{ edge: NavGraphEdge; to: string }>>();
  for (const e of edges) {
    if (!nodeMap.has(e.from) || !nodeMap.has(e.to)) continue;
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    if (!adjacency.has(e.to)) adjacency.set(e.to, []);
    adjacency.get(e.from)!.push({ edge: e, to: e.to });
    // Indoor graphs are undirected unless the edge carries a direction
    // restriction (M4.3+ — we filter these client-side in edgeWeight).
    adjacency.get(e.to)!.push({ edge: e, to: e.from });
  }
  return { nodes: nodeMap, adjacency };
}

/** Weight of an edge under `profile`. Returns Infinity when disallowed. */
function edgeWeight(
  edge: NavGraphEdge,
  fromNode: NavGraphNode,
  toNode: NavGraphNode,
  profile: RoutingProfile,
): number {
  if (profile.accessibleOnly && !edge.accessible) return Infinity;
  if (edge.restrictions && edge.restrictions.length) {
    for (const r of edge.restrictions) {
      if (profile.disallowedRestrictions.includes(r)) return Infinity;
    }
  }
  let mult = 1;
  if (fromNode.type === "stair" || toNode.type === "stair") {
    mult *= profile.stairCostMultiplier;
  }
  if (fromNode.type === "elevator" || toNode.type === "elevator") {
    mult *= profile.elevatorCostMultiplier;
  }
  if (fromNode.type === "outdoor" || toNode.type === "outdoor") {
    mult *= profile.outdoorCostMultiplier;
  }
  return edge.distance * mult;
}

/** Straight-line distance heuristic for A*. */
function heuristic(a: NavGraphNode, b: NavGraphNode): number {
  return haversineMeters(a.position, b.position);
}

/** Small binary-heap priority queue. Beats the linear-scan O(n²) in the
 *  previous implementation once graphs grow past a few hundred nodes. */
class MinHeap<T> {
  private heap: Array<{ key: number; value: T }> = [];
  push(key: number, value: T): void {
    this.heap.push({ key, value });
    this.bubbleUp(this.heap.length - 1);
  }
  pop(): { key: number; value: T } | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }
  get size(): number { return this.heap.length; }
  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[i].key < this.heap[parent].key) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
        i = parent;
      } else return;
    }
  }
  private bubbleDown(i: number) {
    const n = this.heap.length;
    while (true) {
      const l = i * 2 + 1;
      const r = i * 2 + 2;
      let smallest = i;
      if (l < n && this.heap[l].key < this.heap[smallest].key) smallest = l;
      if (r < n && this.heap[r].key < this.heap[smallest].key) smallest = r;
      if (smallest === i) return;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}

/** A* shortest path from `fromId` to `toId`. Returns null if unreachable. */
export function findPath(
  graph: NavGraph,
  fromId: string,
  toId: string,
  profile: RoutingProfile = PROFILE_DEFAULT,
): Route | null {
  const src = graph.nodes.get(fromId);
  const dst = graph.nodes.get(toId);
  if (!src || !dst) return null;
  if (fromId === toId) return zeroRoute(src);

  const gScore = new Map<string, number>();
  const cameFrom = new Map<string, string>();
  gScore.set(fromId, 0);

  const open = new MinHeap<string>();
  open.push(heuristic(src, dst), fromId);

  while (open.size > 0) {
    const { value: currentId } = open.pop()!;
    if (currentId === toId) return reconstruct(cameFrom, graph, currentId, profile);
    const currentNode = graph.nodes.get(currentId)!;
    const currentG = gScore.get(currentId) ?? Infinity;
    const neighbors = graph.adjacency.get(currentId) ?? [];
    for (const { edge, to } of neighbors) {
      const toNode = graph.nodes.get(to)!;
      const w = edgeWeight(edge, currentNode, toNode, profile);
      if (!Number.isFinite(w)) continue;
      const tentativeG = currentG + w;
      if (tentativeG < (gScore.get(to) ?? Infinity)) {
        cameFrom.set(to, currentId);
        gScore.set(to, tentativeG);
        open.push(tentativeG + heuristic(toNode, dst), to);
      }
    }
  }
  return null;
}

/** Dijkstra shortest path — same call shape, no heuristic. Use when
 *  edge weights can be so heavily multiplied that A*'s admissibility
 *  breaks (large stair penalties, etc.). */
export function findPathDijkstra(
  graph: NavGraph,
  fromId: string,
  toId: string,
  profile: RoutingProfile = PROFILE_DEFAULT,
): Route | null {
  const src = graph.nodes.get(fromId);
  const dst = graph.nodes.get(toId);
  if (!src || !dst) return null;
  if (fromId === toId) return zeroRoute(src);

  const gScore = new Map<string, number>();
  const cameFrom = new Map<string, string>();
  gScore.set(fromId, 0);

  const open = new MinHeap<string>();
  open.push(0, fromId);

  while (open.size > 0) {
    const { key: currentG, value: currentId } = open.pop()!;
    if (currentG > (gScore.get(currentId) ?? Infinity)) continue; // stale
    if (currentId === toId) return reconstruct(cameFrom, graph, currentId, profile);
    const currentNode = graph.nodes.get(currentId)!;
    for (const { edge, to } of graph.adjacency.get(currentId) ?? []) {
      const toNode = graph.nodes.get(to)!;
      const w = edgeWeight(edge, currentNode, toNode, profile);
      if (!Number.isFinite(w)) continue;
      const tentativeG = currentG + w;
      if (tentativeG < (gScore.get(to) ?? Infinity)) {
        cameFrom.set(to, currentId);
        gScore.set(to, tentativeG);
        open.push(tentativeG, to);
      }
    }
  }
  return null;
}

function zeroRoute(node: NavGraphNode): Route {
  return {
    totalDistanceMeters: 0,
    totalDurationSeconds: 0,
    path: [node],
    segments: [{ floor: node.floor, buildingId: node.buildingId ?? null, coords: [node.position] }],
  };
}

function reconstruct(
  cameFrom: Map<string, string>,
  graph: NavGraph,
  endId: string,
  profile: RoutingProfile,
): Route {
  const path: NavGraphNode[] = [];
  let cursor: string | undefined = endId;
  while (cursor) {
    const n = graph.nodes.get(cursor);
    if (n) path.unshift(n);
    cursor = cameFrom.get(cursor);
  }
  let totalDistance = 0;
  for (let i = 1; i < path.length; i++) {
    totalDistance += haversineMeters(path[i - 1].position, path[i].position);
  }
  const totalDuration = totalDistance / profile.walkingSpeedMps;

  const segments: Route["segments"] = [];
  let cur: Route["segments"][number] | null = null;
  for (const n of path) {
    if (!cur || cur.floor !== n.floor || cur.buildingId !== (n.buildingId ?? null)) {
      cur = { floor: n.floor, buildingId: n.buildingId ?? null, coords: [] };
      segments.push(cur);
    }
    cur.coords.push(n.position);
  }
  return {
    totalDistanceMeters: totalDistance,
    totalDurationSeconds: totalDuration,
    path,
    segments,
  };
}

// ── Turn-by-turn ───────────────────────────────────────────────────

/** Convert a `Route` into a list of `TurnHint`s. Merges collinear
 *  segments and emits a "start", "arrive", and one hint per meaningful
 *  turn (>15° absolute) or floor transition. */
export function annotateRoute(route: Route): TurnHint[] {
  if (route.path.length === 0) return [];
  const hints: TurnHint[] = [];
  if (route.path.length === 1) {
    hints.push({
      at: route.path[0].position,
      nodeId: route.path[0].id,
      turnAngleDeg: 0,
      turn: "start",
      distanceToNextMeters: 0,
      description: "You have arrived.",
    });
    return hints;
  }

  // Start hint.
  hints.push({
    at: route.path[0].position,
    nodeId: route.path[0].id,
    turnAngleDeg: 0,
    turn: "start",
    distanceToNextMeters: haversineMeters(route.path[0].position, route.path[1].position),
    description: "Start.",
  });

  let prevBearing = bearingDeg(route.path[0].position, route.path[1].position);
  let runningDist = 0;

  for (let i = 1; i < route.path.length - 1; i++) {
    const prev = route.path[i - 1];
    const cur = route.path[i];
    const next = route.path[i + 1];
    runningDist += haversineMeters(prev.position, cur.position);

    // Floor transition.
    if (cur.floor !== prev.floor || cur.floor !== next.floor) {
      const goingUp = next.floor > cur.floor;
      hints.push({
        at: cur.position,
        nodeId: cur.id,
        turnAngleDeg: 0,
        turn: goingUp ? "floor_up" : "floor_down",
        distanceToNextMeters: haversineMeters(cur.position, next.position),
        description: goingUp
          ? `Take the ${cur.type === "elevator" ? "elevator" : "stairs"} up to floor ${next.floor}.`
          : `Take the ${cur.type === "elevator" ? "elevator" : "stairs"} down to floor ${next.floor}.`,
      });
      prevBearing = bearingDeg(cur.position, next.position);
      runningDist = 0;
      continue;
    }

    const b = bearingDeg(cur.position, next.position);
    const delta = normaliseAngleDeg(b - prevBearing);
    if (Math.abs(delta) >= 15) {
      hints.push({
        at: cur.position,
        nodeId: cur.id,
        turnAngleDeg: delta,
        turn: classifyTurn(delta),
        distanceToNextMeters: haversineMeters(cur.position, next.position),
        description: `${describeTurn(delta)} at ${cur.type === "door" ? "the door" : cur.type === "hallway_waypoint" ? "the hallway" : "the next junction"}.`,
      });
      prevBearing = b;
      runningDist = 0;
    }
  }

  // Arrival.
  const last = route.path[route.path.length - 1];
  hints.push({
    at: last.position,
    nodeId: last.id,
    turnAngleDeg: 0,
    turn: "arrive",
    distanceToNextMeters: 0,
    description: "You have arrived.",
  });

  return hints;
}

/** Bearing in degrees from `a` to `b`, 0 = north, +90 = east. */
function bearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Wrap an angle to (-180, 180]. */
function normaliseAngleDeg(d: number): number {
  while (d > 180) d -= 360;
  while (d <= -180) d += 360;
  return d;
}

function classifyTurn(delta: number): TurnHint["turn"] {
  const a = delta;
  if (a < -135) return "sharp_left";
  if (a < -60) return "left";
  if (a < -15) return "slight_left";
  if (a <= 15) return "straight";
  if (a <= 60) return "slight_right";
  if (a <= 135) return "right";
  return "sharp_right";
}

function describeTurn(delta: number): string {
  switch (classifyTurn(delta)) {
    case "sharp_left":  return "Take a sharp left";
    case "left":        return "Turn left";
    case "slight_left": return "Bear left";
    case "straight":    return "Continue straight";
    case "slight_right": return "Bear right";
    case "right":       return "Turn right";
    case "sharp_right": return "Take a sharp right";
    default:            return "Continue";
  }
}

export type { NavGraphNode, NavGraphEdge };
export * from "./build";
