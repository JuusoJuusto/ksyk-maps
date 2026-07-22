/**
 * NavigationPanel — v1 directions overlay for the public map.
 *
 * Simple flow:
 *   1. Two search inputs (from / to). Each opens the same shared
 *      search index used by the header search.
 *   2. Compute the route as a straight great-circle line between the
 *      centroids (hallway A* comes later). Show distance + walking
 *      time.
 *   3. Draw the route as a blue dashed line on the map, with green
 *      "A" and red "B" pins at either end. Auto-fit the map to the
 *      route bounds.
 *
 * Kept as a floating card in the corner so it stays out of the way
 * when not in use. `onClose` retracts it back to a small pill.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigation2, X, ArrowRightLeft, MapPin, Clock, Footprints, Accessibility, ArrowUpRight, ArrowUp, ArrowUpLeft, CornerDownRight, CornerDownLeft, ChevronsUp, ChevronsDown, Flag, PlayCircle, Layers as LayersIcon, Maximize2 } from "lucide-react";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { Building, Room, LatLng } from "@ksyk/shared";
import { buildRoomSearchIndex, polygonCentroid, haversineMeters } from "@ksyk/shared";
import {
  buildGraph, buildNavGraph, findPath,
  PROFILE_DEFAULT, PROFILE_WHEELCHAIR,
  annotateRoute,
  type TurnHint,
} from "@ksyk/routing";
import { cn } from "@/lib/utils";
import { useCampusData } from "@/hooks/useCampusData";

interface NavigationPanelProps {
  map: MaplibreMap | null;
  onClose: () => void;
  /** When the header search dropdown is up, we collapse to a compact
   *  bar so the two panels don't stack on top of each other. */
  searchActive?: boolean;
}

type Endpoint =
  | { kind: "room"; room: Room; building: Building | null }
  | { kind: "building"; building: Building };

/** Preferred display name for an endpoint. */
function endpointLabel(e: Endpoint): string {
  if (e.kind === "building") return e.building.name;
  const parts = [e.room.roomNumber, e.room.name].filter(Boolean);
  return parts.join(" · ") || "(unnamed room)";
}

function endpointCenter(e: Endpoint): { lat: number; lng: number } | null {
  if (e.kind === "building") {
    return e.building.points?.length ? polygonCentroid(e.building.points) : null;
  }
  return e.room.points?.length ? polygonCentroid(e.room.points) : null;
}

/** Walking pace — 1.35 m/s, indoor-ish. */
const WALKING_MPS = 1.35;

const ROUTE_SOURCE_ID = "nav-route-src";
const ROUTE_LAYER_ID = "nav-route-line";
const ROUTE_ENDS_SOURCE_ID = "nav-route-ends";
const ROUTE_ENDS_LAYER_ID = "nav-route-ends-layer";
const ROUTE_STEPS_SOURCE_ID = "nav-route-steps";
const ROUTE_STEPS_LAYER_ID = "nav-route-steps-layer";

export default function NavigationPanel({ map, onClose, searchActive = false }: NavigationPanelProps) {
  // Measure header height so the panel sits right under it on mobile.
  const [headerBottom, setHeaderBottom] = useState<number>(120);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const measure = () => {
      const h = document.querySelector<HTMLElement>('header');
      if (!h) return;
      setHeaderBottom(Math.max(0, h.getBoundingClientRect().bottom + 8));
    };
    measure();
    window.addEventListener("resize", measure);
    let ro: ResizeObserver | null = null;
    const h = document.querySelector<HTMLElement>('header');
    if (h && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(h);
    }
    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, []);

  // Prefers /api/map-package/published when the admin has published;
  // falls back to live tables otherwise. Same shape either way.
  const { buildings, rooms, hallways, doors, stairs, elevators, source } = useCampusData();

  const index = useMemo(() => buildRoomSearchIndex(rooms, buildings), [rooms, buildings]);

  const [from, setFrom] = useState<Endpoint | null>(null);
  const [to, setTo] = useState<Endpoint | null>(null);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  // Active step in the turn-by-turn timeline. Advances when the user
  // taps a step (which also flies the map there) so users can follow
  // along visually — the current step gets a highlighted ring + the
  // total ETA re-renders from that point forward.
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  // Ref to the active step's <li> so we can auto-scroll it into view
  // whenever the user advances. Especially helpful on mobile where the
  // step list is short and the current step would otherwise scroll off.
  const activeStepRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    activeStepRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeStepIdx]);

  // Listen for cross-component route requests — the FeatureInfoSheet
  // dispatches `ksyk:route-to` when the user hits "Directions here"
  // from a clicked feature. We map the payload into an Endpoint and
  // stuff it into the To field, leaving From for the user (usually
  // their location or another search pick).
  useEffect(() => {
    const onRouteTo = (e: Event) => {
      const detail = (e as CustomEvent<{ kind: "building" | "room" | "hallway"; entity: Building | Room }>).detail;
      if (!detail) return;
      if (detail.kind === "building") {
        setTo({ kind: "building", building: detail.entity as Building });
      } else if (detail.kind === "room") {
        const room = detail.entity as Room;
        const b = buildings.find((x) => x.id === room.buildingId) ?? null;
        setTo({ kind: "room", room, building: b });
      }
      // Hallways don't make useful nav destinations — ignore.
    };
    window.addEventListener("ksyk:route-to", onRouteTo);
    return () => window.removeEventListener("ksyk:route-to", onRouteTo);
  }, [buildings]);

  // Build the campus navigation graph once per data change. Excludes
  // walls (surface="wall") — those are barriers, not walkable.
  const graph = useMemo(() => {
    const walkableHallways = (hallways ?? []).filter((h) => h.surface !== "wall");
    const built = buildNavGraph({
      buildings, rooms, hallways: walkableHallways, doors, stairs, elevators,
    });
    return { built, graph: buildGraph(built.nodes, built.edges) };
  }, [buildings, rooms, hallways, doors, stairs, elevators]);

  /** Snap an endpoint (room / building centroid) to the nearest graph
   *  node so A* has something to search from. Returns nodeId + the
   *  physical position we're representing. */
  const snapEndpoint = useCallback((e: Endpoint): { nodeId: string; pos: LatLng } | null => {
    const pos = endpointCenter(e);
    if (!pos) return null;
    // Prefer the exact room node if that endpoint is a room already
    // present in the graph (buildNavGraph creates room:<id> nodes).
    if (e.kind === "room") {
      const directId = `room:${e.room.id}`;
      if (graph.graph.nodes.has(directId)) return { nodeId: directId, pos };
    }
    // Otherwise, find the nearest node by haversine distance.
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const [id, n] of graph.graph.nodes) {
      const d = haversineMeters(pos, n.position);
      if (d < bestDist) { bestDist = d; bestId = id; }
    }
    return bestId ? { nodeId: bestId, pos } : null;
  }, [graph]);

  const route = useMemo(() => {
    if (!from || !to) return null;
    const a = endpointCenter(from);
    const b = endpointCenter(to);
    if (!a || !b) return null;

    const sA = snapEndpoint(from);
    const sB = snapEndpoint(to);
    // Attempt A* if we have a snap on both sides.
    if (sA && sB && sA.nodeId !== sB.nodeId) {
      const profile = accessibleOnly ? PROFILE_WHEELCHAIR : PROFILE_DEFAULT;
      const path = findPath(graph.graph, sA.nodeId, sB.nodeId, profile);
      if (path) {
        // Prepend/append the real endpoint centroid so the drawn
        // line starts exactly at the user's picks (not the snap
        // node).
        const coords: LatLng[] = [
          a,
          ...path.path.map((n) => n.position),
          b,
        ];
        return {
          kind: "graph" as const,
          coords,
          distanceMeters: path.totalDistanceMeters
            + haversineMeters(a, path.path[0].position)
            + haversineMeters(b, path.path[path.path.length - 1].position),
          floors: path.segments.map((s) => s.floor),
          // Keep the raw Route around so we can annotate it into
          // turn-by-turn hints without re-running A*.
          navRoute: path,
        };
      }
    }
    // Fallback: straight line so users always see SOMETHING.
    return {
      kind: "straight" as const,
      coords: [a, b] as LatLng[],
      distanceMeters: haversineMeters(a, b),
      floors: [] as number[],
      navRoute: null,
    };
  }, [from, to, graph, accessibleOnly, snapEndpoint]);

  // Derive turn-by-turn hints from the underlying nav route (graph
  // routes only — straight-line fallback has nothing to narrate).
  const turnHints = useMemo(() => {
    if (!route || route.kind !== "graph" || !route.navRoute) return [];
    return annotateRoute(route.navRoute);
  }, [route]);

  const walkingSeconds = route ? route.distanceMeters / WALKING_MPS : 0;

  // Reset the active step whenever from/to changes so a new route
  // starts at step 0. Keeping the previous idx would leave the user
  // pointing at a step that no longer exists.
  useEffect(() => { setActiveStepIdx(0); }, [from?.kind, to?.kind, (from as { room?: { id: string } })?.room?.id, (to as { room?: { id: string } })?.room?.id]);

  // Remaining distance/time from the active step to the end — helps
  // users understand "how much more" as they walk. Sum of
  // distanceToNextMeters from the active step onwards.
  const remainingMeters = turnHints
    .slice(activeStepIdx)
    .reduce((sum, h) => sum + (h.distanceToNextMeters ?? 0), 0);
  const remainingSeconds = remainingMeters / WALKING_MPS;

  // Draw / clear the route on the map when it changes.
  useEffect(() => {
    if (!map) return;
    const upsertLine = () => {
      if (!route) {
        // Clear any existing route.
        for (const l of [ROUTE_LAYER_ID, ROUTE_ENDS_LAYER_ID, `${ROUTE_ENDS_LAYER_ID}-label`, ROUTE_STEPS_LAYER_ID, `${ROUTE_STEPS_LAYER_ID}-label`]) {
          if (map.getLayer(l)) map.removeLayer(l);
        }
        for (const s of [ROUTE_SOURCE_ID, ROUTE_ENDS_SOURCE_ID, ROUTE_STEPS_SOURCE_ID]) {
          if (map.getSource(s)) map.removeSource(s);
        }
        return;
      }
      const start = route.coords[0];
      const end = route.coords[route.coords.length - 1];
      const lineData = {
        type: "FeatureCollection" as const,
        features: [{
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: route.coords.map((c) => [c.lng, c.lat]),
          },
          properties: { kind: route.kind },
        }],
      };
      // Midpoint chip — picks the middle vertex of the polyline (not
      // the geometric midpoint) so long routes still land the label on
      // the line itself.
      const midIdx = Math.floor(route.coords.length / 2);
      const mid = route.coords[midIdx];
      const distanceLabel = route.distanceMeters < 1000
        ? `${route.distanceMeters.toFixed(0)} m`
        : `${(route.distanceMeters / 1000).toFixed(2)} km`;
      const endsData = {
        type: "FeatureCollection" as const,
        features: [
          { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [start.lng, start.lat] }, properties: { role: "from", label: "A" } },
          { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [end.lng, end.lat]   }, properties: { role: "to",   label: "B" } },
          { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [mid.lng, mid.lat]   }, properties: { role: "mid",  label: distanceLabel } },
        ],
      };
      const srcLine = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      const srcEnds = map.getSource(ROUTE_ENDS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (srcLine) srcLine.setData(lineData as never);
      else {
        map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: lineData as never });
        map.addLayer({
          id: ROUTE_LAYER_ID,
          source: ROUTE_SOURCE_ID,
          type: "line",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#2563eb",
            // Fatter when zoomed in so the corridor route reads clearly.
            "line-width": ["interpolate", ["linear"], ["zoom"], 15, 3, 20, 8],
            "line-opacity": 0.9,
            // Solid for a real graph route; dashed for the straight-line
            // fallback so users notice it's approximate.
            "line-dasharray": ["case", ["==", ["get", "kind"], "graph"], ["literal", [1, 0]], ["literal", [2, 1.5]]],
          },
        });
      }
      if (srcEnds) srcEnds.setData(endsData as never);
      else {
        map.addSource(ROUTE_ENDS_SOURCE_ID, { type: "geojson", data: endsData as never });
        // Circle behind each endpoint / distance chip.
        map.addLayer({
          id: ROUTE_ENDS_LAYER_ID,
          source: ROUTE_ENDS_SOURCE_ID,
          type: "circle",
          paint: {
            "circle-radius": ["case",
              ["==", ["get", "role"], "mid"], 16,
              10,
            ],
            "circle-color": ["case",
              ["==", ["get", "role"], "from"], "#10b981",
              ["==", ["get", "role"], "to"],   "#dc2626",
              "#ffffff",
            ],
            "circle-stroke-color": ["case",
              ["==", ["get", "role"], "mid"], "#2563eb",
              "#ffffff",
            ],
            "circle-stroke-width": 3,
          },
          filter: ["!=", ["get", "role"], "mid-hidden"],
        });
        // Text labels — "A", "B", and the distance figure.
        map.addLayer({
          id: `${ROUTE_ENDS_LAYER_ID}-label`,
          source: ROUTE_ENDS_SOURCE_ID,
          type: "symbol",
          layout: {
            "text-field": ["get", "label"],
            "text-size": ["case",
              ["==", ["get", "role"], "mid"], 11,
              12,
            ],
            "text-font": ["Noto Sans Regular"],
            "text-allow-overlap": true,
            "text-anchor": "center",
          },
          paint: {
            "text-color": ["case",
              ["==", ["get", "role"], "mid"], "#1e3a8a",
              "#ffffff",
            ],
          },
        });
      }
      // Step markers — one numbered circle per turn hint. Skips the
      // start/arrive endpoints since those already get A/B labels.
      const stepFeatures = turnHints
        .filter((h) => h.turn !== "start" && h.turn !== "arrive")
        .map((h, i) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [h.at.lng, h.at.lat] },
          properties: { idx: i + 1, description: h.description },
        }));
      const stepsData = { type: "FeatureCollection" as const, features: stepFeatures };
      const srcSteps = map.getSource(ROUTE_STEPS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (srcSteps) srcSteps.setData(stepsData as never);
      else {
        map.addSource(ROUTE_STEPS_SOURCE_ID, { type: "geojson", data: stepsData as never });
        map.addLayer({
          id: ROUTE_STEPS_LAYER_ID,
          source: ROUTE_STEPS_SOURCE_ID,
          type: "circle",
          paint: {
            "circle-radius": 10,
            "circle-color": "#ffffff",
            "circle-stroke-color": "#2563eb",
            "circle-stroke-width": 2.5,
          },
        });
        map.addLayer({
          id: `${ROUTE_STEPS_LAYER_ID}-label`,
          source: ROUTE_STEPS_SOURCE_ID,
          type: "symbol",
          layout: {
            "text-field": ["to-string", ["get", "idx"]],
            "text-size": 11,
            "text-font": ["Noto Sans Regular"],
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#1e3a8a" },
        });
      }

      // Fit the FULL route bounds (every vertex), preserving rotation + pitch.
      const lngs = route.coords.map((c) => c.lng);
      const lats = route.coords.map((c) => c.lat);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        {
          padding: 100,
          duration: 600,
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        },
      );
    };
    if (map.isStyleLoaded()) upsertLine();
    else map.once("load", upsertLine);
    return () => {
      // Route lifetime = component lifetime. On unmount, clear.
    };
  }, [map, route, turnHints]);

  // Clean up route layers when the panel unmounts.
  useEffect(() => {
    return () => {
      if (!map) return;
      for (const l of [
        ROUTE_LAYER_ID,
        ROUTE_ENDS_LAYER_ID, `${ROUTE_ENDS_LAYER_ID}-label`,
        ROUTE_STEPS_LAYER_ID, `${ROUTE_STEPS_LAYER_ID}-label`,
      ]) {
        if (map.getLayer(l)) map.removeLayer(l);
      }
      for (const s of [ROUTE_SOURCE_ID, ROUTE_ENDS_SOURCE_ID, ROUTE_STEPS_SOURCE_ID]) {
        if (map.getSource(s)) map.removeSource(s);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  const swap = useCallback(() => {
    setFrom(to);
    setTo(from);
  }, [from, to]);

  return (
    <div
      className={cn(
        // Top-anchored on both mobile + desktop, right under the header,
        // so it never covers the bottom-right control rail. Mobile:
        // stretches side-to-side; sm+: floating card with fixed width.
        "fixed z-40 rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col",
        "left-2 right-2 sm:left-3 sm:right-auto sm:w-[min(92vw,24rem)]",
      )}
      style={{
        // When the search dropdown is up we duck the nav panel below
        // the map bottom-left corner so the two never fight for the
        // same screen real estate.
        top: searchActive ? undefined : headerBottom,
        bottom: searchActive ? "calc(1rem + env(safe-area-inset-bottom, 0px))" : undefined,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        // Leave the right-rail buttons + attribution room at the bottom.
        maxHeight: searchActive
          ? "12rem"
          : `min(70dvh, calc(100dvh - ${headerBottom}px - 5rem))`,
      }}
      role="dialog"
      aria-label="Navigation directions"
    >
      <header className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border bg-blue-50/50 dark:bg-blue-950/30">
        <Navigation2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <p className="text-[13px] font-semibold text-foreground flex-1">Directions</p>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Close directions"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="p-3 space-y-2.5 overflow-y-auto">
        <EndpointField
          label="From"
          color="#10b981"
          value={from}
          onChange={setFrom}
          index={index}
        />

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <button
            type="button"
            onClick={swap}
            disabled={!from || !to}
            title="Swap from / to"
            className={cn(
              "h-7 w-7 rounded-full border border-border flex items-center justify-center transition-colors",
              from && to
                ? "text-foreground hover:bg-muted"
                : "text-muted-foreground opacity-50 cursor-not-allowed",
            )}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex-1 h-px bg-border" />
        </div>

        <EndpointField
          label="To"
          color="#dc2626"
          value={to}
          onChange={setTo}
          index={index}
        />

        {/* Data source badge — tiny reassurance that the numbers here
         *  are the same ones the admin published. */}
        {source === "published" && (
          <p className="text-[10px] text-muted-foreground text-center">
            Routing on the last-published campus snapshot.
          </p>
        )}
        {source === "live" && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center">
            Routing on live (unpublished) draft.
          </p>
        )}

        {/* Profile toggle — accessible routing avoids stairs. */}
        <div className="mt-1 flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Accessibility className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Accessible route</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={accessibleOnly}
            onClick={() => setAccessibleOnly((v) => !v)}
            className={cn(
              "relative w-8 h-5 rounded-full transition-colors",
              accessibleOnly ? "bg-blue-600" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                accessibleOnly ? "translate-x-3.5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        {route && (
          <div className="mt-2 rounded-xl bg-gradient-to-br from-blue-50/70 to-blue-100/40 dark:from-blue-500/10 dark:to-blue-500/5 border border-blue-200/60 dark:border-blue-500/30 p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700/80 dark:text-blue-300/80">Distance</div>
                <div className="text-base font-bold tabular-nums text-foreground">
                  {route.distanceMeters < 1000
                    ? `${route.distanceMeters.toFixed(0)} m`
                    : `${(route.distanceMeters / 1000).toFixed(2)} km`}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700/80 dark:text-blue-300/80 flex items-center gap-1">
                  <Footprints className="h-2.5 w-2.5" /> Walk
                </div>
                <div className="text-base font-bold tabular-nums text-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  {formatWalkTime(walkingSeconds)}
                </div>
              </div>
              {/* Floor transitions count — surfaces multi-floor routes at
               *  a glance. Only shows when the route actually spans more
               *  than one floor so single-floor walks stay uncluttered. */}
              {route.kind === "graph" && new Set(route.floors).size > 1 && (
                <div className="border-l border-blue-300/40 dark:border-blue-500/30 pl-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700/80 dark:text-blue-300/80 flex items-center gap-1">
                    <LayersIcon className="h-2.5 w-2.5" /> Floors
                  </div>
                  <div className="text-base font-bold tabular-nums text-foreground">
                    {new Set(route.floors).size}
                  </div>
                </div>
              )}
            </div>
            {/* Route progress strip — visual indicator of how far along
             *  the user is. Fills left→right based on the active step.
             *  Straight-line fallback shows as amber at 50% so users see
             *  something without a real percentage. */}
            <div className="mt-2 h-1 rounded-full overflow-hidden bg-white/50 dark:bg-black/20">
              <div className={cn(
                "h-full transition-all duration-500",
                route.kind === "graph" ? "bg-blue-500" : "bg-amber-400",
              )} style={{
                width: route.kind === "graph"
                  ? `${Math.max(0, Math.min(100, turnHints.length > 1 ? (activeStepIdx / (turnHints.length - 1)) * 100 : 0))}%`
                  : "50%",
              }} />
            </div>
            {/* Remaining pill — visible only after the user starts
             *  advancing through the timeline (activeStepIdx > 0) so the
             *  fresh route stays uncluttered. */}
            {route.kind === "graph" && activeStepIdx > 0 && remainingMeters > 0 && (
              <div className="mt-2 flex items-center justify-between text-[11px] text-blue-700 dark:text-blue-300">
                <span className="font-semibold">Remaining</span>
                <span className="tabular-nums">
                  {remainingMeters < 1000
                    ? `${remainingMeters.toFixed(0)} m`
                    : `${(remainingMeters / 1000).toFixed(2)} km`}
                  {" · "}
                  {formatWalkTime(remainingSeconds)}
                </span>
              </div>
            )}
          </div>
        )}
        {route && route.kind === "straight" && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
            No connecting hallways yet — showing straight-line distance.
          </p>
        )}
        {!route && from && to && (
          <p className="text-[11px] text-muted-foreground text-center">
            One of these has no location on the map yet.
          </p>
        )}
        {(!from || !to) && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-4 text-center">
            <div className="mx-auto h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
              <Navigation2 className="h-4 w-4" />
            </div>
            <p className="text-[12px] font-semibold text-foreground">
              {!from && !to ? "Where to?" : !from ? "Where from?" : "Where to?"}
            </p>
            <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">
              Search for a room or building above, or click a feature on the map and hit “Directions here.”
            </p>
          </div>
        )}

        {/* Turn-by-turn narration — MazeMap-style timeline. Always
         *  visible when we have a real graph route (users don't have to
         *  hunt for the disclosure), rendered as a vertical connected
         *  timeline with typed icons per step. Click any step to fly
         *  the map there and switch to the step's floor. */}
        {turnHints.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            {/* Screen-reader-only live region announcing the current
             *  step as the user advances. Helps blind users follow
             *  along without needing to hunt the visible timeline. */}
            <p aria-live="polite" className="sr-only">
              Step {activeStepIdx + 1} of {turnHints.length}: {turnHints[activeStepIdx]?.description ?? ""}
            </p>
            <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground min-w-0">
                <Footprints className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Directions</span>
                {activeStepIdx > 0 && activeStepIdx < turnHints.length && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold tabular-nums truncate">
                    · step {activeStepIdx + 1}/{turnHints.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Fit route — re-fits the map bounds to the ENTIRE
                 *  route so users can see it end-to-end after they've
                 *  wandered/zoomed. Preserves bearing + pitch. */}
                {route && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!map || !route.coords.length) return;
                      const lngs = route.coords.map((c) => c.lng);
                      const lats = route.coords.map((c) => c.lat);
                      map.fitBounds(
                        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
                        {
                          padding: 100, duration: 500,
                          bearing: map.getBearing(),
                          pitch: map.getPitch(),
                        },
                      );
                    }}
                    className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center"
                    aria-label="Fit route in view"
                    title="Fit route in view"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                )}
                {activeStepIdx > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveStepIdx(0)}
                    className="h-6 px-2 rounded-md text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
                    aria-label="Reset progress to start"
                    title="Reset progress"
                  >
                    <ArrowRightLeft className="h-3 w-3 rotate-180" />
                    Reset
                  </button>
                )}
                <span className="text-[10px] text-muted-foreground tabular-nums">{turnHints.length} steps</span>
              </div>
            </div>
            {/* Arrival banner — fires when user taps the LAST step
             *  ("arrive"). MazeMap-style small celebration so the
             *  route feels finished, not just "you're at the end of a
             *  list." */}
            {activeStepIdx === turnHints.length - 1 && turnHints.length > 1 && (
              <div className="px-3 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Flag className="h-3.5 w-3.5" />
                <span>You've arrived at your destination.</span>
              </div>
            )}
            <ol className="p-2 space-y-0 max-h-64 overflow-y-auto">
              {turnHints.map((hint, i) => {
                const isEndpoint = hint.turn === "start" || hint.turn === "arrive";
                const isFloorChange = hint.turn === "floor_up" || hint.turn === "floor_down";
                const isLast = i === turnHints.length - 1;
                const isActive = i === activeStepIdx;
                const isPast = i < activeStepIdx;
                // The step's floor comes from the node it corresponds
                // to — annotateRoute doesn't surface it, so we resolve
                // via the raw route.
                const stepFloor = route?.navRoute?.path
                  .find((n) => n.id === hint.nodeId)?.floor ?? null;
                const TurnIcon = turnIconFor(hint.turn);
                const chipStyles = isEndpoint
                  ? (hint.turn === "start"
                    ? "bg-emerald-500 text-white ring-2 ring-emerald-200 dark:ring-emerald-900/40"
                    : "bg-red-500 text-white ring-2 ring-red-200 dark:ring-red-900/40")
                  : isFloorChange
                    ? "bg-amber-500 text-white ring-2 ring-amber-200 dark:ring-amber-900/40"
                    : isActive
                      ? "bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-900/40 shadow-md shadow-blue-500/25"
                      : "bg-white ring-2 ring-blue-500 text-blue-700 dark:bg-blue-500 dark:text-white dark:ring-blue-300/40";
                return (
                  <li
                    key={hint.nodeId + "-" + i}
                    ref={isActive ? activeStepRef : undefined}
                    className={cn(
                      "relative flex items-start gap-3 rounded-lg p-1.5 transition-colors group cursor-pointer",
                      isActive
                        ? "bg-blue-50 dark:bg-blue-500/15"
                        : "hover:bg-blue-50/60 dark:hover:bg-blue-500/10",
                      isPast && "opacity-60",
                    )}
                    onClick={() => {
                      setActiveStepIdx(i);
                      // Two side effects:
                      //   1. Fly the map to the step position (short zoom-in).
                      //   2. If the step lives on a different floor,
                      //      broadcast a floor-select event so the
                      //      floor selector in KSYKMapView switches.
                      if (map) {
                        map.flyTo({
                          center: [hint.at.lng, hint.at.lat],
                          zoom: Math.max(map.getZoom(), 18.5),
                          bearing: map.getBearing(),
                          pitch: map.getPitch(),
                          duration: 500,
                          essential: true,
                        });
                      }
                      if (stepFloor !== null) {
                        try {
                          window.dispatchEvent(new CustomEvent("ksyk:select-floor", { detail: stepFloor }));
                        } catch { /* non-fatal */ }
                      }
                    }}
                  >
                    {/* Timeline rail — connects the chips down the
                     *  column so the whole list reads as a path, not an
                     *  unrelated list of items. */}
                    {!isLast && (
                      <span className="absolute left-[19px] top-8 bottom-0 w-px bg-gradient-to-b from-blue-300/60 to-blue-200/20 dark:from-blue-500/40 dark:to-blue-500/5 pointer-events-none" />
                    )}
                    <span className={cn(
                      "shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 shadow-sm",
                      chipStyles,
                    )}>
                      <TurnIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[12.5px] leading-snug text-foreground">
                        {hint.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        {hint.distanceToNextMeters > 0 && (
                          <span className="tabular-nums">
                            {hint.distanceToNextMeters < 1000
                              ? `${hint.distanceToNextMeters.toFixed(0)} m`
                              : `${(hint.distanceToNextMeters / 1000).toFixed(2)} km`}
                          </span>
                        )}
                        {stepFloor !== null && !isEndpoint && (
                          <span className="tabular-nums">· Floor {stepFloor}</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Endpoint input with search dropdown ────────────────────────────

interface EndpointFieldProps {
  label: string;
  color: string;
  value: Endpoint | null;
  onChange: (e: Endpoint | null) => void;
  index: ReturnType<typeof buildRoomSearchIndex>;
}

function EndpointField({ label, color, value, onChange, index }: EndpointFieldProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const hits = useMemo(() => {
    if (!query.trim()) return [];
    return index.search(query, { limit: 6 });
  }, [index, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const displayValue = value ? endpointLabel(value) : query;

  return (
    <div ref={rootRef} className="relative">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <MapPin className="h-2.5 w-2.5" style={{ color }} />
        {label}
      </label>
      <div className="relative mt-1">
        <input
          type="search"
          value={displayValue}
          placeholder={value ? "" : "Search rooms or buildings…"}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            if (value) onChange(null);
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="w-full h-9 px-3 pr-8 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          autoComplete="off"
          spellCheck={false}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); setQuery(""); setOpen(true); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && hits.length > 0 && !value && (
        <ul className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50 max-h-56 overflow-y-auto">
          {hits.map((hit) => {
            const room = hit.doc.data?.room ?? null;
            const building = hit.doc.data?.building ?? null;
            const pick: Endpoint | null = room
              ? { kind: "room", room, building }
              : building
              ? { kind: "building", building }
              : null;
            if (!pick) return null;
            return (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => { onChange(pick); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-500/10 flex flex-col"
                >
                  <span className="font-semibold truncate">{endpointLabel(pick)}</span>
                  {hit.doc.subtitle && (
                    <span className="text-[11px] text-muted-foreground truncate">{hit.doc.subtitle}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Pick a Lucide icon component matching the turn hint category. Used
 *  in the turn-by-turn timeline so users see the shape of the next
 *  action, not just a numeric index. */
function turnIconFor(turn: TurnHint["turn"]): typeof PlayCircle {
  switch (turn) {
    case "start":       return PlayCircle;
    case "arrive":      return Flag;
    case "floor_up":    return ChevronsUp;
    case "floor_down":  return ChevronsDown;
    case "left":        return CornerDownLeft;
    case "sharp_left":  return CornerDownLeft;
    case "slight_left": return ArrowUpLeft;
    case "right":       return CornerDownRight;
    case "sharp_right": return CornerDownRight;
    case "slight_right":return ArrowUpRight;
    case "straight":
    default:            return ArrowUp;
  }
}

function formatWalkTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return "< 1 min";
  const mins = seconds / 60;
  if (mins < 1) return `${Math.round(seconds)} s`;
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}
