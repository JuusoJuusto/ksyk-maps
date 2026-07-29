/**
 * navGraph — local-first navigation graph store.
 *
 * Nodes = navigable points (junctions, room entrances, stair landings).
 * Edges = walkable connections between two nodes.
 *
 * Persisted to localStorage under `ksyk_nav_graph_v1` so a builder
 * session's work survives reload without needing a server round-trip.
 * When the server-side /api/nav-nodes endpoint lands we'll add a
 * sync layer on top; the shape below matches what the routing package
 * already consumes so migration is a no-op.
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ksyk_nav_graph_v1";

export interface NavNode {
  id: string;
  lat: number;
  lng: number;
  floor: number;
  /** Free-form label — usually a room number or "Junction 3". */
  label?: string;
  /** Semantic role — colors the node on the map. */
  kind?: "junction" | "room" | "stairs" | "elevator" | "entrance";
}

export interface NavEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

export interface NavGraph {
  nodes: NavNode[];
  edges: NavEdge[];
}

function readGraph(): NavGraph {
  if (typeof window === "undefined") return { nodes: [], edges: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { nodes: [], edges: [] };
    const parsed = JSON.parse(raw) as NavGraph;
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return { nodes: [], edges: [] };
    }
    return parsed;
  } catch {
    return { nodes: [], edges: [] };
  }
}

function writeGraph(g: NavGraph): void {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); }
  catch { /* quota — the in-memory copy still works this session */ }
  // Cross-tab sync — the storage event fires in OTHER tabs; same-tab
  // consumers listen for the custom event so a rerender happens too.
  try { window.dispatchEvent(new CustomEvent("ksyk:nav-graph-change")); }
  catch { /* SSR — non-fatal */ }
}

/** Reactive hook that returns the current graph + mutators. */
export function useNavGraph() {
  const [graph, setGraph] = useState<NavGraph>(() => readGraph());
  useEffect(() => {
    const onChange = () => setGraph(readGraph());
    window.addEventListener("ksyk:nav-graph-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("ksyk:nav-graph-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const addNode = useCallback((node: Omit<NavNode, "id">): NavNode => {
    const withId: NavNode = { ...node, id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    const next: NavGraph = { ...readGraph(), nodes: [...readGraph().nodes, withId] };
    writeGraph(next);
    return withId;
  }, []);

  const removeNode = useCallback((id: string) => {
    const g = readGraph();
    const next: NavGraph = {
      nodes: g.nodes.filter((n) => n.id !== id),
      // Cascade — remove any edge that referenced this node so the
      // renderer never tries to draw an edge to a dead node.
      edges: g.edges.filter((e) => e.fromNodeId !== id && e.toNodeId !== id),
    };
    writeGraph(next);
  }, []);

  const addEdge = useCallback((fromNodeId: string, toNodeId: string): NavEdge | null => {
    if (fromNodeId === toNodeId) return null;
    const g = readGraph();
    // Reject duplicate edges (either direction — edges are undirected).
    const already = g.edges.some((e) =>
      (e.fromNodeId === fromNodeId && e.toNodeId === toNodeId)
      || (e.fromNodeId === toNodeId && e.toNodeId === fromNodeId));
    if (already) return null;
    const edge: NavEdge = {
      id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fromNodeId, toNodeId,
    };
    writeGraph({ ...g, edges: [...g.edges, edge] });
    return edge;
  }, []);

  const removeEdge = useCallback((id: string) => {
    const g = readGraph();
    writeGraph({ ...g, edges: g.edges.filter((e) => e.id !== id) });
  }, []);

  const clear = useCallback(() => writeGraph({ nodes: [], edges: [] }), []);

  return { graph, addNode, removeNode, addEdge, removeEdge, clear };
}
