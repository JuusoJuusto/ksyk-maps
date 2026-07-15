/**
 * @ksyk/routing — indoor navigation.
 *
 * M4.0: A* over a flat graph. Multi-floor stair/elevator transitions,
 * accessibility profiles, and dynamic obstacles land in M4.1-M4.3.
 */
import type { LatLng, NavGraphNode, NavGraphEdge } from "@ksyk/shared";
import { haversineMeters } from "@ksyk/shared";

/** Complete navigation graph. */
export interface NavGraph {
  nodes: Map<string, NavGraphNode>;
  /** Adjacency: nodeId → list of {edgeId, toNodeId}. */
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
  /** If true, only accessible edges are traversed. */
  accessibleOnly: boolean;
}

export const PROFILE_DEFAULT: RoutingProfile = {
  walkingSpeedMps: 1.35,
  stairCostMultiplier: 1.5,
  elevatorCostMultiplier: 2.0,
  accessibleOnly: false,
};

export const PROFILE_WHEELCHAIR: RoutingProfile = {
  walkingSpeedMps: 1.0,
  stairCostMultiplier: 999,
  elevatorCostMultiplier: 1.2,
  accessibleOnly: true,
};

/** A finalized route. */
export interface Route {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  /** Full ordered list of nodes from source to destination. */
  path: NavGraphNode[];
  /** Per-floor sub-segments for rendering. */
  segments: Array<{
    floor: number;
    buildingId: string | null;
    coords: LatLng[];
  }>;
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
    // Symmetric — indoor graphs are undirected unless the edge has a
    // direction restriction (added in M4.3).
    adjacency.get(e.to)!.push({ edge: e, to: e.from });
  }
  return { nodes: nodeMap, adjacency };
}

/** Weight of an edge under the given profile. Returns Infinity if the
 *  edge is disallowed. */
function edgeWeight(
  edge: NavGraphEdge,
  fromNode: NavGraphNode,
  toNode: NavGraphNode,
  profile: RoutingProfile,
): number {
  if (profile.accessibleOnly && !edge.accessible) return Infinity;
  let mult = 1;
  if (fromNode.type === "stair" || toNode.type === "stair") {
    mult *= profile.stairCostMultiplier;
  }
  if (fromNode.type === "elevator" || toNode.type === "elevator") {
    mult *= profile.elevatorCostMultiplier;
  }
  return edge.distance * mult;
}

/** Straight-line distance heuristic for A*. */
function heuristic(a: NavGraphNode, b: NavGraphNode): number {
  return haversineMeters(a.position, b.position);
}

/** A* shortest path from `fromId` to `toId`. Returns null if
 *  unreachable. */
export function findPath(
  graph: NavGraph,
  fromId: string,
  toId: string,
  profile: RoutingProfile = PROFILE_DEFAULT,
): Route | null {
  const src = graph.nodes.get(fromId);
  const dst = graph.nodes.get(toId);
  if (!src || !dst) return null;
  if (fromId === toId) {
    return {
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      path: [src],
      segments: [{ floor: src.floor, buildingId: src.buildingId ?? null, coords: [src.position] }],
    };
  }

  // A* with a plain-array priority queue. Enough for hundreds of nodes;
  // upgrade to a binary heap in M4.1 if we hit perf issues at scale.
  const openSet = new Set<string>([fromId]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  gScore.set(fromId, 0);
  fScore.set(fromId, heuristic(src, dst));

  while (openSet.size > 0) {
    // Pop lowest-fScore node.
    let currentId: string | null = null;
    let currentF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < currentF) {
        currentF = f;
        currentId = id;
      }
    }
    if (!currentId) break;
    if (currentId === toId) return reconstruct(cameFrom, graph, currentId);
    openSet.delete(currentId);

    const currentNode = graph.nodes.get(currentId)!;
    const neighbors = graph.adjacency.get(currentId) ?? [];
    for (const { edge, to } of neighbors) {
      const toNode = graph.nodes.get(to)!;
      const w = edgeWeight(edge, currentNode, toNode, profile);
      if (!Number.isFinite(w)) continue;
      const tentativeG = (gScore.get(currentId) ?? Infinity) + w;
      if (tentativeG < (gScore.get(to) ?? Infinity)) {
        cameFrom.set(to, currentId);
        gScore.set(to, tentativeG);
        fScore.set(to, tentativeG + heuristic(toNode, dst));
        openSet.add(to);
      }
    }
  }
  return null;
}

function reconstruct(
  cameFrom: Map<string, string>,
  graph: NavGraph,
  endId: string,
): Route {
  const path: NavGraphNode[] = [];
  let cursor: string | undefined = endId;
  while (cursor) {
    const n = graph.nodes.get(cursor);
    if (n) path.unshift(n);
    cursor = cameFrom.get(cursor);
  }
  // Compute total distance from consecutive node positions (haversine).
  let totalDistance = 0;
  for (let i = 1; i < path.length; i++) {
    totalDistance += haversineMeters(path[i - 1].position, path[i].position);
  }
  const totalDuration = totalDistance / PROFILE_DEFAULT.walkingSpeedMps;

  // Group into per-floor segments so the UI can render each floor's
  // portion separately (and switch the floor picker as the user follows).
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

export type { NavGraphNode, NavGraphEdge };
