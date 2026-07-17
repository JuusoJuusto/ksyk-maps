/**
 * KSYK Maps — Builder (v2, MapLibre-based).
 *
 * Top-level /builder route. Admin-only. Uses the new MapLibre-based
 * CampusMap so buildings/rooms/hallways rotate with the map (they're
 * drawn as GeoJSON layers on the WebGL canvas, not portalled SVG).
 *
 * Tools:
 *   - Select (V) — click features to select + edit
 *   - Building (B) — click 4+ corners → polygon → POST /api/buildings
 *   - Room (R) — click 4+ corners inside a building → POST /api/rooms
 *   - Hallway (H) — click waypoints → LineString → POST /api/hallways
 *
 * Enter finalizes, Escape cancels. Del removes the selected feature.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import maplibregl, { Map as MaplibreMap, LngLat, MapMouseEvent } from "maplibre-gl";
import CampusMap, { type CampusMapHandle } from "@/components/CampusMap";
import PropertyPanel, { type SelectedEntity } from "@/components/builder/PropertyPanel";
import SelectionHandles from "@/components/builder/SelectionHandles";
import LeftSidebar, { type LeftSidebarTab, type LeftSidebarSelection } from "@/components/builder/LeftSidebar";
import StatusBar, { type StatusBarState } from "@/components/builder/StatusBar";
import TopToolbar from "@/components/builder/TopToolbar";
import ValidationDrawer from "@/components/builder/ValidationDrawer";
import ImportExportDialog from "@/components/builder/ImportExportDialog";
import { Button } from "@/components/ui/button";
import {
  Building2,
  DoorOpen,
  Route as RouteIcon,
  MousePointer2,
  Trash2,
  Loader2,
  ShieldAlert,
  Hand,
  Ruler,
  Square,
  StretchHorizontal,
  StepForward,
  MoveVertical,
  DoorClosed,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { validateMap } from "@ksyk/shared";
import type { Building as SharedBuilding, Room, Hallway, Floor, Door, Stair, Elevator, MapPackage, ValidationEntityKind } from "@ksyk/shared";
import { useAutosave } from "@/hooks/useAutosave";
import { fetchList } from "@/lib/fetchList";

type BuilderTool =
  | "select" | "pan"
  | "building" | "rectangle" | "room" | "hallway" | "wall" | "measure"
  | "poi-stairs" | "poi-elevator" | "poi-door" | "poi-entrance";

// Local extension of the shared Building for the builder — everything in
// the shared type plus whatever this file needs beyond it.
type FeatureBuilding = SharedBuilding;

// ─── Auth gate ────────────────────────────────────────────────────────────
function useAdminAuth() {
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");
  useEffect(() => {
    const loggedIn = localStorage.getItem("ksyk_admin_logged_in") === "true";
    const userRaw = localStorage.getItem("ksyk_admin_user");
    if (!loggedIn || !userRaw) {
      setState("denied");
      return;
    }
    try {
      const u = JSON.parse(userRaw);
      if (["admin", "owner", "editor"].includes(u?.role)) setState("allowed");
      else setState("denied");
    } catch {
      setState("denied");
    }
  }, []);
  return state;
}

// ─── Root page ────────────────────────────────────────────────────────────
export default function BuilderPage() {
  const [, setLocation] = useLocation();
  const auth = useAdminAuth();

  if (auth === "checking") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }
  if (auth === "denied") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-sm p-6 text-center">
          <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-950/40 ring-1 ring-red-100 dark:ring-red-900/60 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-red-600 dark:text-red-400" strokeWidth={2.25} />
          </div>
          <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-red-600 dark:text-red-400 mb-2">
            Restricted
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground mb-2">
            Builder is admin-only
          </h1>
          <p className="text-sm text-muted-foreground mb-5">
            Sign in as an admin or owner to edit the campus map.
          </p>
          <Button
            onClick={() => setLocation("/admin")}
            className="h-11 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98]"
          >
            Go to admin login
          </Button>
        </div>
      </div>
    );
  }

  return <BuilderWorkspace />;
}

// ─── Workspace ────────────────────────────────────────────────────────────
function BuilderWorkspace() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [activeTool, setActiveTool] = useState<BuilderTool>("select");
  const [waypoints, setWaypoints] = useState<LngLat[]>([]);
  const [selection, setSelection] = useState<LeftSidebarSelection | null>(null);
  const handleRef = useRef<CampusMapHandle | null>(null);
  // Ref alone is enough for handler access, but effects that install
  // GeoJSON layers need to re-run once the map becomes ready — so we
  // also mirror readiness into state. Without this, when the buildings
  // query resolves BEFORE the map's `load` event, the install effect
  // sees `handleRef.current === null`, returns early, and never re-runs
  // because refs don't trigger re-renders. Result: nothing appears
  // until the user changes some data.
  const [mapReady, setMapReady] = useState(false);

  // Legacy `selectedId` shim — many downstream effects still key off a
  // single string. New code uses `selection`.
  const selectedId = selection?.kind === "building" ? selection.id : null;
  const setSelectedId = useCallback((id: string | null) => {
    setSelection(id ? { kind: "building", id } : null);
  }, []);

  // ── Chrome state ─────────────────────────────────────────────────────
  const [sidebarTab, setSidebarTab] = useState<LeftSidebarTab>("buildings");
  const [showValidation, setShowValidation] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  // ── Camera + cursor + FPS trackers (StatusBar) ───────────────────────
  const [cameraState, setCameraState] = useState({
    zoom: 17,
    bearingDeg: 0,
    activeFloor: 1 as number | null,
  });
  const [cursor, setCursor] = useState<{ lat: number; lng: number } | null>(null);
  const [fps, setFps] = useState<number | null>(null);

  const buildingsQ = useQuery<FeatureBuilding[]>({
    queryKey: ["/api/buildings"],
  });
  const buildings = useMemo<FeatureBuilding[]>(
    () => buildingsQ.data ?? [],
    [buildingsQ.data],
  );

  // ── Live data for validation + autosave (deduped by React Query) ────
  // All queryFn's go through fetchList which guarantees T[] back — so
  // a 404 or auth redirect can't corrupt validateMap / buildRoomSearchIndex.
  const roomsQ = useQuery<Room[]>({ queryKey: ["/api/rooms"], queryFn: () => fetchList<Room>("/api/rooms") });
  const hallwaysQ = useQuery<Hallway[]>({ queryKey: ["/api/hallways"], queryFn: () => fetchList<Hallway>("/api/hallways") });
  const floorsQ = useQuery<Floor[]>({ queryKey: ["/api/floors"], queryFn: () => fetchList<Floor>("/api/floors") });
  const doorsQ = useQuery<Door[]>({ queryKey: ["/api/doors"], queryFn: () => fetchList<Door>("/api/doors") });
  const stairsQ = useQuery<Stair[]>({ queryKey: ["/api/stairs"], queryFn: () => fetchList<Stair>("/api/stairs") });
  const elevatorsQ = useQuery<Elevator[]>({ queryKey: ["/api/elevators"], queryFn: () => fetchList<Elevator>("/api/elevators") });

  const validation = useMemo(() => validateMap({
    buildings,
    rooms: roomsQ.data ?? [],
    hallways: hallwaysQ.data ?? [],
    floors: floorsQ.data ?? [],
    doors: doorsQ.data ?? [],
    stairs: stairsQ.data ?? [],
    elevators: elevatorsQ.data ?? [],
  }), [buildings, roomsQ.data, hallwaysQ.data, floorsQ.data, doorsQ.data, stairsQ.data, elevatorsQ.data]);

  // ── Autosave (M11) — every 30s writes a MapPackage snapshot to
  //    localStorage + optionally to /api/map-package/draft. ──────────
  const buildSnapshot = useCallback((): MapPackage => ({
    manifest: {
      version: "1.0.0",
      title: "KSYK Campus (draft)",
      publishedAt: new Date().toISOString(),
    },
    mapDefaults: {
      center: { lat: 0, lng: 0 }, zoom: 17, bearing: 0, pitch: 0,
      minZoom: 12, maxZoom: 22,
    },
    buildings,
    floors: floorsQ.data ?? [],
    rooms: roomsQ.data ?? [],
    hallways: hallwaysQ.data ?? [],
    doors: doorsQ.data ?? [],
    stairs: stairsQ.data ?? [],
    elevators: elevatorsQ.data ?? [],
  }), [buildings, floorsQ.data, roomsQ.data, hallwaysQ.data, doorsQ.data, stairsQ.data, elevatorsQ.data]);

  const autosave = useAutosave<MapPackage>({
    key: "builder-main",
    snapshot: buildSnapshot,
    // Remote persist is best-effort — swallow errors so the local copy
    // still wins.
    remoteSaver: async () => {
      try { await apiRequest("POST", "/api/map-package/draft", buildSnapshot()); }
      catch { /* offline — local save still happened */ }
    },
  });

  // ── Draw waypoints layer sync ───────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const h = handleRef.current;
    if (!h) return;
    const map = h.map;
    const sourceId = "builder-waypoints";
    const layerId = "builder-waypoints-line";
    const pointsLayerId = "builder-waypoints-points";

    const setSourceData = () => {
      const coords = waypoints.map((w) => [w.lng, w.lat]);
      const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;

      // Rectangle preview: if the user has 2 corners, synthesize the 4
      // rectangle corners and close the ring — same shape they'll get
      // when they hit Enter. If they only have 1 point, just draw the
      // marker so they can see where corner A landed.
      let polyCoords: number[][] | null = null;
      let lineCoords: number[][] | null = null;
      if (activeTool === "rectangle" && coords.length === 2) {
        const [a, b] = coords;
        const minLng = Math.min(a[0], b[0]);
        const maxLng = Math.max(a[0], b[0]);
        const minLat = Math.min(a[1], b[1]);
        const maxLat = Math.max(a[1], b[1]);
        polyCoords = [
          [minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat],
        ];
      } else if (activeTool === "measure" && coords.length >= 2) {
        lineCoords = coords;
      } else if ((activeTool === "hallway" || activeTool === "wall") && coords.length >= 2) {
        lineCoords = coords;
      } else if (coords.length >= 3) {
        polyCoords = [...coords, coords[0]];
      }

      const shapeFeature: unknown | null = polyCoords
        ? { type: "Feature" as const, geometry: { type: "Polygon" as const, coordinates: [polyCoords] }, properties: {} }
        : lineCoords
        ? { type: "Feature" as const, geometry: { type: "LineString" as const, coordinates: lineCoords }, properties: {} }
        : null;

      const pointFeatures = coords.map((c, i) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: c },
        properties: { idx: i },
      }));

      const data = {
        type: "FeatureCollection" as const,
        features: shapeFeature ? [shapeFeature as never, ...pointFeatures] : pointFeatures,
      };
      if (src) {
        src.setData(data as any);
      } else {
        map.addSource(sourceId, { type: "geojson", data: data as any });
        // Two shape layers coexist — polygon fill (buildings/rooms/
        // rectangle) and line (hallways/measure). Filter by $type so
        // both can live on the same source without extra branches.
        map.addLayer({
          id: layerId,
          source: sourceId,
          type: "fill",
          paint: { "fill-color": "#2563eb", "fill-opacity": 0.15, "fill-outline-color": "#2563eb" },
          filter: ["==", "$type", "Polygon"],
        });
        map.addLayer({
          id: `${layerId}-line`,
          source: sourceId,
          type: "line",
          paint: { "line-color": "#2563eb", "line-width": 4, "line-opacity": 0.8, "line-dasharray": [2, 1] },
          filter: ["==", "$type", "LineString"],
        });
        map.addLayer({
          id: pointsLayerId,
          source: sourceId,
          type: "circle",
          paint: {
            "circle-radius": 6,
            "circle-color": "#ffffff",
            "circle-stroke-color": "#2563eb",
            "circle-stroke-width": 2,
          },
          filter: ["==", "$type", "Point"],
        });
      }
    };
    setSourceData();
  }, [waypoints, activeTool, mapReady]);

  // ── Draw finalized buildings layer ──────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const h = handleRef.current;
    if (!h) return;
    const map = h.map;
    // Note: no early-return on empty buildings — we still need to
    // upsert an empty FeatureCollection so leftover features clear.
    const sourceId = "builder-buildings";
    const layerId = "builder-buildings-fill";
    const outlineLayerId = "builder-buildings-outline";
    const labelLayerId = "builder-buildings-labels";

    const featureCollection = {
      type: "FeatureCollection" as const,
      features: buildings
        .filter((b) => b.points && b.points.length >= 3)
        .map((b) => ({
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                ...b.points!.map((p) => [p.lng, p.lat]),
                [b.points![0].lng, b.points![0].lat],
              ],
            ],
          },
          properties: {
            id: b.id,
            name: b.name,
            color: b.colorCode ?? "#2563eb",
            selected: b.id === selectedId,
          },
        })),
    };

    const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(featureCollection as any);
    } else {
      map.addSource(sourceId, { type: "geojson", data: featureCollection as any });
      map.addLayer({
        id: layerId,
        source: sourceId,
        type: "fill",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["boolean", ["get", "selected"], false],
            0.35,
            0.2,
          ],
        },
      });
      map.addLayer({
        id: outlineLayerId,
        source: sourceId,
        type: "line",
        paint: {
          "line-color": ["get", "color"],
          "line-width": [
            "case",
            ["boolean", ["get", "selected"], false],
            4,
            2,
          ],
        },
      });
      map.addLayer({
        id: labelLayerId,
        source: sourceId,
        type: "symbol",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 14,
          "text-font": ["Noto Sans Regular"],
        },
        paint: {
          "text-color": ["get", "color"],
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });
    }
  }, [buildings, selectedId, mapReady]);

  // ── Draw rooms + hallways so builder shows the whole campus, not
  //    just buildings. Uses simpler paint than CampusOverlay to keep
  //    editing legible; selection styling still lives on
  //    builder-buildings-fill.
  useEffect(() => {
    if (!mapReady) return;
    const h = handleRef.current;
    if (!h) return;
    const map = h.map;

    // Rooms
    const roomsSrcId = "builder-rooms";
    const roomsFillId = "builder-rooms-fill";
    const roomsOutlineId = "builder-rooms-outline";
    const roomsLabelId = "builder-rooms-labels";
    const rooms = roomsQ.data ?? [];
    const roomsFC = {
      type: "FeatureCollection" as const,
      features: rooms
        .filter((r) => r.points && r.points.length >= 3)
        .map((r) => ({
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [[
              ...r.points!.map((p) => [p.lng, p.lat]),
              [r.points![0].lng, r.points![0].lat],
            ]],
          },
          properties: {
            id: r.id,
            color: r.colorCode ?? "#059669",
            label: [r.roomNumber, r.name].filter(Boolean).join(" "),
            selected: selection?.kind === "room" && selection.id === r.id,
          },
        })),
    };
    const roomsSrc = map.getSource(roomsSrcId) as maplibregl.GeoJSONSource | undefined;
    if (roomsSrc) roomsSrc.setData(roomsFC as any);
    else {
      map.addSource(roomsSrcId, { type: "geojson", data: roomsFC as any });
      map.addLayer({
        id: roomsFillId, source: roomsSrcId, type: "fill",
        paint: { "fill-color": ["get", "color"], "fill-opacity": ["case", ["boolean", ["get", "selected"], false], 0.5, 0.28] },
      });
      map.addLayer({
        id: roomsOutlineId, source: roomsSrcId, type: "line",
        paint: { "line-color": ["get", "color"], "line-width": ["case", ["boolean", ["get", "selected"], false], 3, 1.2] },
      });
      map.addLayer({
        id: roomsLabelId, source: roomsSrcId, type: "symbol",
        layout: { "text-field": ["get", "label"], "text-size": 11, "text-font": ["Noto Sans Regular"], "text-allow-overlap": false, "text-optional": true },
        paint: { "text-color": "#0f172a", "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
        minzoom: 17,
      });
    }

    // Hallways
    const hallSrcId = "builder-hallways";
    const hallLineId = "builder-hallways-line";
    const halls = hallwaysQ.data ?? [];
    const hallsFC = {
      type: "FeatureCollection" as const,
      features: halls.map((hw) => ({
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: [[hw.startX, hw.startY], [hw.endX, hw.endY]] },
        properties: {
          id: hw.id,
          selected: selection?.kind === "hallway" && selection.id === hw.id,
        },
      })),
    };
    const hallsSrc = map.getSource(hallSrcId) as maplibregl.GeoJSONSource | undefined;
    if (hallsSrc) hallsSrc.setData(hallsFC as any);
    else {
      map.addSource(hallSrcId, { type: "geojson", data: hallsFC as any });
      map.addLayer({
        id: hallLineId, source: hallSrcId, type: "line",
        paint: {
          "line-color": ["case", ["boolean", ["get", "selected"], false], "#dc2626", "#f59e0b"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 15, 2, 20, 8],
          "line-opacity": 0.8,
        },
      });
    }
  }, [mapReady, roomsQ.data, hallwaysQ.data, selection]);

  // ── Map click handler — drops waypoints in draw mode ────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const h = handleRef.current;
    if (!h) return;
    const map = h.map;

    const onClick = (e: MapMouseEvent) => {
      if (activeTool === "select") {
        // Rank hits by kind — rooms + hallways sit inside buildings, so
        // the smallest thing under the cursor wins. Order = priority.
        const roomLayers = ["builder-rooms-fill"].filter((id) => map.getLayer(id));
        const hallLayers = ["builder-hallways-line"].filter((id) => map.getLayer(id));
        const bldgLayers = ["builder-buildings-fill"].filter((id) => map.getLayer(id));
        const tryQuery = (layers: string[]): { kind: LeftSidebarSelection["kind"]; id: string } | null => {
          if (layers.length === 0) return null;
          const feats = map.queryRenderedFeatures(e.point, { layers });
          const hit = feats[0];
          if (!hit || typeof hit.properties?.id !== "string") return null;
          const kind: LeftSidebarSelection["kind"] =
            layers[0].includes("rooms") ? "room" :
            layers[0].includes("hallways") ? "hallway" : "building";
          return { kind, id: hit.properties.id };
        };
        const pick = tryQuery(roomLayers) ?? tryQuery(hallLayers) ?? tryQuery(bldgLayers);
        if (pick) {
          setSelection({ kind: pick.kind, id: pick.id });
          setSidebarTab(pick.kind === "building" ? "buildings" : pick.kind === "room" ? "rooms" : "hallways");
        } else {
          setSelection(null);
        }
        return;
      }
      if (
        activeTool === "building" || activeTool === "room" ||
        activeTool === "hallway" || activeTool === "wall" ||
        activeTool === "rectangle" || activeTool === "measure"
      ) {
        setWaypoints((prev) => [...prev, e.lngLat]);
        return;
      }
      // POI tools: single-click places, no need for Enter. Fire the
      // matching mutation with the click position.
      if (activeTool === "poi-stairs") {
        createStair.mutate({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        return;
      }
      if (activeTool === "poi-elevator") {
        createElevator.mutate({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        return;
      }
      if (activeTool === "poi-door" || activeTool === "poi-entrance") {
        createDoor.mutate({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          isEntrance: activeTool === "poi-entrance",
        });
        return;
      }
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [activeTool, mapReady]);

  // ── Keyboard: Enter to finalize, Escape to cancel, hotkeys ──────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" ||
          (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "Escape") {
        setWaypoints([]);
        setActiveTool("select");
        return;
      }
      if (e.key === "Enter") {
        finalize();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        onDeleteSelected();
        return;
      }
      if (e.key === "v" || e.key === "V") setActiveTool("select");
      else if (e.key === "b" || e.key === "B") { setActiveTool("building"); setWaypoints([]); }
      else if (e.key === "r" || e.key === "R") { setActiveTool("room"); setWaypoints([]); }
      else if (e.key === "h" || e.key === "H") { setActiveTool("hallway"); setWaypoints([]); }
      else if (e.key === "w" || e.key === "W") { setActiveTool("wall"); setWaypoints([]); }
      else if (e.key === "m" || e.key === "M") { setActiveTool("measure"); setWaypoints([]); }
      else if (e.key === "u" || e.key === "U") { setActiveTool("rectangle"); setWaypoints([]); }
      else if (e.key === "s" || e.key === "S") { setActiveTool("poi-stairs"); setWaypoints([]); }
      else if (e.key === "e" || e.key === "E") { setActiveTool("poi-elevator"); setWaypoints([]); }
      else if (e.key === "d" || e.key === "D") { setActiveTool("poi-door"); setWaypoints([]); }
      else if (e.key === "n" || e.key === "N") { setActiveTool("poi-entrance"); setWaypoints([]); }
      else if (e.key === " ") { setActiveTool("pan"); setWaypoints([]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, waypoints, selectedId]);

  // ── Mutations ───────────────────────────────────────────────────────────
  const createBuilding = useMutation({
    mutationFn: async (payload: {
      name: string;
      points: Array<{ lng: number; lat: number }>;
    }) => {
      const res = await apiRequest("POST", "/api/buildings", {
        name: payload.name,
        nameEn: payload.name,
        nameFi: payload.name,
        colorCode: "#2563eb",
        floors: 1,
        // Store polygon in `points`. Server may not use it yet — passing
        // through as-is; will be persisted once schema catches up. In the
        // meantime we compute mapPositionX/Y from bbox center.
        points: payload.points,
      });
      return res.json();
    },
    onSuccess: (created: FeatureBuilding | { id?: string } | undefined) => {
      qc.invalidateQueries({ queryKey: ["/api/buildings"] });
      setWaypoints([]);
      // Snap back to the Select tool and open the Property panel on the
      // fresh building so the user can name / colour / configure it
      // without a second click. The server returns the created row —
      // fall back to a lookup by-name if the id isn't present.
      setActiveTool("select");
      const id = created && typeof (created as { id?: string }).id === "string"
        ? (created as { id: string }).id
        : null;
      if (id) {
        setSelection({ kind: "building", id });
        setSidebarTab("buildings");
      }
    },
  });

  const createHallway = useMutation({
    mutationFn: async (payload: { points: Array<{ lng: number; lat: number }>; surface?: string }) => {
      // Chunk polyline into start/end segments — matches the server schema.
      const created: unknown[] = [];
      for (let i = 0; i < payload.points.length - 1; i++) {
        const res = await apiRequest("POST", "/api/hallways", {
          startX: payload.points[i].lng,
          startY: payload.points[i].lat,
          endX: payload.points[i + 1].lng,
          endY: payload.points[i + 1].lat,
          surface: payload.surface,
        });
        try { created.push(await res.json()); } catch { /* swallow parse */ }
      }
      return created;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["/api/hallways"] });
      setWaypoints([]);
      setActiveTool("select");
      const first = created[0] as { id?: string } | undefined;
      if (first?.id) {
        setSelection({ kind: "hallway", id: first.id });
        setSidebarTab("hallways");
      }
    },
  });

  const createStair = useMutation({
    mutationFn: async (p: { lat: number; lng: number }) => {
      const res = await apiRequest("POST", "/api/stairs", {
        floor: 1,
        mapPositionX: p.lng,
        mapPositionY: p.lat,
      });
      try { return await res.json(); } catch { return null; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/stairs"] }); },
  });

  const createElevator = useMutation({
    mutationFn: async (p: { lat: number; lng: number }) => {
      const res = await apiRequest("POST", "/api/elevators", {
        floor: 1,
        mapPositionX: p.lng,
        mapPositionY: p.lat,
      });
      try { return await res.json(); } catch { return null; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/elevators"] }); },
  });

  const createDoor = useMutation({
    mutationFn: async (p: { lat: number; lng: number; isEntrance: boolean }) => {
      const res = await apiRequest("POST", "/api/doors", {
        floor: 1,
        mapPositionX: p.lng,
        mapPositionY: p.lat,
        isEntrance: p.isEntrance,
      });
      try { return await res.json(); } catch { return null; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/doors"] }); },
  });

  const deleteBuilding = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/buildings/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/buildings"] });
      setSelectedId(null);
    },
  });

  const finalize = useCallback(() => {
    if (activeTool === "hallway" && waypoints.length >= 2) {
      createHallway.mutate({
        points: waypoints.map((w) => ({ lng: w.lng, lat: w.lat })),
      });
      return;
    }
    if (activeTool === "wall" && waypoints.length >= 2) {
      createHallway.mutate({
        points: waypoints.map((w) => ({ lng: w.lng, lat: w.lat })),
        surface: "wall",
      });
      return;
    }
    // Rectangle: 2 diagonal corners → axis-aligned 4-corner polygon.
    if (activeTool === "rectangle" && waypoints.length >= 2) {
      const [a, b] = waypoints;
      const minLng = Math.min(a.lng, b.lng);
      const maxLng = Math.max(a.lng, b.lng);
      const minLat = Math.min(a.lat, b.lat);
      const maxLat = Math.max(a.lat, b.lat);
      const nextLetter = String.fromCharCode(65 + buildings.length);
      createBuilding.mutate({
        name: nextLetter,
        points: [
          { lng: minLng, lat: minLat },
          { lng: maxLng, lat: minLat },
          { lng: maxLng, lat: maxLat },
          { lng: minLng, lat: maxLat },
        ],
      });
      return;
    }
    // Measure: emit total distance, but keep waypoints so the user can
    // keep chaining segments. Escape clears.
    if (activeTool === "measure" && waypoints.length >= 2) {
      // Handled inline by the coach — nothing to persist.
      return;
    }
    if ((activeTool === "building" || activeTool === "room") && waypoints.length >= 3) {
      const nextLetter = String.fromCharCode(65 + buildings.length);
      createBuilding.mutate({
        name: nextLetter,
        points: waypoints.map((w) => ({ lng: w.lng, lat: w.lat })),
      });
    }
  }, [activeTool, waypoints, buildings.length, createBuilding, createHallway]);

  /** Live distance (metres) along the current waypoint chain. Used by
   *  the Measure tool coach. Haversine over each segment. */
  const measureDistanceMeters = useMemo(() => {
    if (activeTool !== "measure" || waypoints.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const R = 6371000;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
      total += 2 * R * Math.asin(Math.sqrt(s));
    }
    return total;
  }, [activeTool, waypoints]);

  const onDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    if (!confirm("Delete this building?")) return;
    deleteBuilding.mutate(selectedId);
  }, [selectedId, deleteBuilding]);

  const isDirty =
    createBuilding.isPending || createHallway.isPending || deleteBuilding.isPending;

  // ── Camera + cursor + FPS wire-up ────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const h = handleRef.current;
    if (!h) return;
    const map = h.map;
    const onMove = () => {
      setCameraState((s) => ({ ...s, zoom: map.getZoom(), bearingDeg: map.getBearing() }));
    };
    const onMouse = (e: MapMouseEvent) => setCursor({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    map.on("move", onMove);
    map.on("mousemove", onMouse);
    onMove();
    return () => { map.off("move", onMove); map.off("mousemove", onMouse); };
  }, [mapReady]);

  useEffect(() => {
    let frames = 0;
    let running = true;
    let lastReport = performance.now();
    const tick = (now: number) => {
      if (!running) return;
      frames++;
      const elapsed = now - lastReport;
      if (elapsed >= 500) {
        setFps((frames * 1000) / elapsed);
        frames = 0;
        lastReport = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { running = false; };
  }, []);

  // ── Import applier — replaces the campus with a MapPackage ─────
  const applyImport = useCallback(async (pkg: MapPackage) => {
    // Post buildings first, then rooms, then hallways. Server-side
    // duplicate ids are rejected — the user is warned by the import
    // dialog first.
    for (const b of pkg.buildings) {
      await apiRequest("POST", "/api/buildings", b).catch(() => { /* skip dups */ });
    }
    for (const r of pkg.rooms) {
      await apiRequest("POST", "/api/rooms", r).catch(() => { /* skip dups */ });
    }
    for (const h of pkg.hallways) {
      await apiRequest("POST", "/api/hallways", h).catch(() => { /* skip dups */ });
    }
    qc.invalidateQueries();
  }, [qc]);

  // ── Publish handler ──────────────────────────────────────────────
  const onPublish = useCallback(async () => {
    if (!validation.publishable) {
      setShowValidation(true);
      return;
    }
    setIsPublishing(true);
    try {
      await autosave.forceSave();
      await apiRequest("POST", "/api/map-package/publish", { versionId: "current" });
    } finally {
      setIsPublishing(false);
    }
  }, [validation.publishable, autosave]);

  // ── Focus-issue callback for the validation drawer ───────────────
  const focusIssue = useCallback((kind: ValidationEntityKind, id: string) => {
    if (kind === "building" || kind === "room" || kind === "hallway") {
      setSelection({ kind, id });
      const nextTab: LeftSidebarTab = kind === "building" ? "buildings" : kind === "room" ? "rooms" : "hallways";
      setSidebarTab(nextTab);
    }
  }, []);

  // ── Save state pill ───────────────────────────────────────────────
  const saveState: StatusBarState["saveState"] =
    autosave.status === "saving" ? "saving" :
    autosave.status === "error"  ? "error" :
    isDirty || autosave.pendingDraft ? "dirty" :
    "saved";

  const statusState: StatusBarState = {
    cursorLat: cursor?.lat ?? null,
    cursorLng: cursor?.lng ?? null,
    zoom: cameraState.zoom,
    bearingDeg: cameraState.bearingDeg,
    activeFloor: cameraState.activeFloor,
    activeLayer: null,
    selectionCount: selection ? 1 : 0,
    fps,
    errorCount: validation.errorCount,
    warningCount: validation.warningCount,
    saveState,
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden relative">
      {/* Top toolbar */}
      <div className="relative h-11 shrink-0">
        <TopToolbar
          canUndo={false}
          canRedo={false}
          isPublishing={isPublishing}
          hasErrors={validation.errorCount > 0}
          snapEnabled={snapEnabled}
          gridEnabled={gridEnabled}
          onBack={() => setLocation("/admin")}
          onSave={() => void autosave.forceSave()}
          onUndo={() => {/* M14.1 */}}
          onRedo={() => {/* M14.1 */}}
          onImport={() => setShowImportExport(true)}
          onExport={() => setShowImportExport(true)}
          onToggleGrid={() => setGridEnabled((g) => !g)}
          onToggleSnap={() => setSnapEnabled((s) => !s)}
          onZoomIn={() => handleRef.current?.map.zoomIn()}
          onZoomOut={() => handleRef.current?.map.zoomOut()}
          onRotateCW={() => handleRef.current?.map.rotateTo(handleRef.current.map.getBearing() + 30)}
          // Preview opens the public map in a new tab so the Builder's
          // draft state doesn't get lost.
          onPreview={() => window.open("/", "_blank", "noopener,noreferrer")}
          onValidate={() => setShowValidation(true)}
          onPublish={() => void onPublish()}
        />
      </div>

      {/* Main content — flex row with ToolPalette, LeftSidebar, Canvas */}
      <div className="flex-1 flex min-h-0">
        {/* Narrow tool palette — icon column at the far left. */}
        <ToolPalette
          activeTool={activeTool}
          selectionCount={selection ? 1 : 0}
          onTool={(t) => { setActiveTool(t); setWaypoints([]); }}
          onDelete={onDeleteSelected}
        />

        {/* Tabbed entity lists — Buildings/Rooms/Hallways/Layers/History. */}
        <LeftSidebar
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          selection={selection}
          onSelect={(sel) => {
            setSelection(sel);
            // Focus the map on the picked entity when possible. IMPORTANT:
            // fitBounds resets bearing to 0 unless we pass the current
            // bearing explicitly — that was causing the map to spin
            // back to north-up on every list click.
            const h = handleRef.current;
            const preserve = h ? { bearing: h.map.getBearing(), pitch: h.map.getPitch() } : {};
            if (sel.kind === "building" && h) {
              const b = buildings.find((x) => x.id === sel.id);
              if (b?.points && b.points.length) {
                const lats = b.points.map((p) => p.lat);
                const lngs = b.points.map((p) => p.lng);
                h.map.fitBounds(
                  [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
                  { padding: 80, duration: 500, ...preserve },
                );
              }
            } else if (sel.kind === "room" && h) {
              const r = (roomsQ.data ?? []).find((x) => x.id === sel.id);
              if (r?.points && r.points.length) {
                const lats = r.points.map((p) => p.lat);
                const lngs = r.points.map((p) => p.lng);
                h.map.fitBounds(
                  [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
                  { padding: 120, duration: 500, ...preserve },
                );
              }
            } else if (sel.kind === "hallway" && h) {
              const hw = (hallwaysQ.data ?? []).find((x) => x.id === sel.id);
              if (hw) {
                h.map.flyTo({
                  center: [(hw.startX + hw.endX) / 2, (hw.startY + hw.endY) / 2],
                  zoom: Math.max(h.map.getZoom(), 18),
                  ...preserve,
                  duration: 500,
                });
              }
            }
          }}
          onRestoreVersion={(id) => { void apiRequest("POST", `/api/map-package/versions/${id}/restore`); }}
        />

        {/* Canvas + floating overlays */}
        <main className="flex-1 min-w-0 relative">
          <CampusMap onReady={(h) => { handleRef.current = h; setMapReady(true); }} />

          {/* In-flight coach — appears while a drawing tool is active. */}
          {activeTool !== "select" && activeTool !== "pan" && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-card border border-border rounded-xl shadow-sm px-3.5 py-2 text-[13px] font-medium text-foreground pointer-events-none">
              {activeTool === "hallway" && (<>Click waypoints — Enter to finish ({waypoints.length})</>)}
              {activeTool === "wall" && (<>Click wall endpoints — Enter to finish ({waypoints.length})</>)}
              {activeTool === "rectangle" && (<>Click 2 diagonal corners — Enter to finish ({waypoints.length}/2)</>)}
              {activeTool === "measure" && (
                <>
                  {waypoints.length < 2
                    ? <>Click points — line total shows here ({waypoints.length})</>
                    : <>Distance: {measureDistanceMeters < 1000
                        ? `${measureDistanceMeters.toFixed(1)} m`
                        : `${(measureDistanceMeters / 1000).toFixed(2)} km`} · Esc to clear</>}
                </>
              )}
              {(activeTool === "building" || activeTool === "room") && (
                <>Click corners — Enter to finish ({waypoints.length}/3+ needed)</>
              )}
              {activeTool === "poi-stairs"    && (<>Click to place stairs</>)}
              {activeTool === "poi-elevator"  && (<>Click to place elevator</>)}
              {activeTool === "poi-door"      && (<>Click to place door</>)}
              {activeTool === "poi-entrance"  && (<>Click to place entrance</>)}
            </div>
          )}

          {/* Selection handles — vertex drag + rotation for the picked
           *  polygon entity. Headless (returns null), renders inside the
           *  MapLibre canvas so it stays aligned during pan/rotate. */}
          {(() => {
            if (!mapReady || !selection) return null;
            const map = handleRef.current?.map ?? null;
            if (!map) return null;
            if (selection.kind === "building") {
              const b = buildings.find((x) => x.id === selection.id);
              if (b) return <SelectionHandles map={map} selection={{ kind: "building", entity: b }} />;
            } else if (selection.kind === "room") {
              const r = (roomsQ.data ?? []).find((x) => x.id === selection.id);
              if (r) return <SelectionHandles map={map} selection={{ kind: "room", entity: r }} />;
            }
            return null;
          })()}

          {/* Property panel — full tabbed editor. Building selection is
           *  wired via the canvas click handler; room/hallway selection
           *  reach here via the LeftSidebar rows above. */}
          {selection && (() => {
            let entity: SelectedEntity | null = null;
            if (selection.kind === "building") {
              const b = buildings.find((x) => x.id === selection.id);
              if (b) entity = { kind: "building", data: b };
            } else if (selection.kind === "room") {
              const r = (roomsQ.data ?? []).find((x) => x.id === selection.id);
              if (r) entity = { kind: "room", data: r };
            } else if (selection.kind === "hallway") {
              const h = (hallwaysQ.data ?? []).find((x) => x.id === selection.id);
              if (h) entity = { kind: "hallway", data: h };
            }
            if (!entity) return null;
            return (
              <PropertyPanel
                key={selection.id}
                entity={entity}
                onDelete={onDeleteSelected}
                onClose={() => setSelection(null)}
              />
            );
          })()}

          {/* Autosave restore banner */}
          {autosave.pendingDraft && (
            <div className="absolute top-3 right-3 z-40 max-w-sm bg-blue-500/95 text-white rounded-xl shadow-lg p-3">
              <p className="text-xs font-semibold mb-1">Unsaved draft found</p>
              <p className="text-[11px] opacity-90 mb-2">
                Autosaved {new Date(autosave.pendingDraft.savedAt).toLocaleTimeString()}.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => autosave.discardDraft()}
                  className="text-[11px] font-semibold px-2 py-1 rounded-md bg-white/15 hover:bg-white/25"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => autosave.discardDraft()}
                  className="text-[11px] font-semibold px-2 py-1 rounded-md bg-white text-blue-700 hover:bg-blue-50"
                >
                  Keep working
                </button>
              </div>
            </div>
          )}

          {/* Mobile fallback — the editor really is desktop-only. */}
          <div className="md:hidden absolute inset-0 bg-card/95 flex items-center justify-center p-4 z-40">
            <div className="max-w-sm text-center bg-card border border-border rounded-2xl shadow-sm p-6">
              <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400 mb-2">
                Builder
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
                Best on desktop
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                The map editor needs a mouse and keyboard. Open KSYK Maps on a laptop or desktop.
              </p>
              <Button
                onClick={() => setLocation("/admin")}
                className="h-11 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98]"
              >
                Back to admin
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom status bar */}
      <StatusBar state={statusState} onOpenValidation={() => setShowValidation(true)} />

      {/* Drawers + dialogs */}
      <ValidationDrawer
        open={showValidation}
        onClose={() => setShowValidation(false)}
        onFocusIssue={focusIssue}
      />
      <ImportExportDialog
        open={showImportExport}
        onClose={() => setShowImportExport(false)}
        onImport={applyImport}
      />
    </div>
  );
}

// ─── Narrow tool palette (icon column, far left) ─────────────────────────
function ToolPalette({
  activeTool, selectionCount, onTool, onDelete,
}: {
  activeTool: BuilderTool;
  selectionCount: number;
  onTool: (t: BuilderTool) => void;
  onDelete: () => void;
}) {
  const tools: Array<{ id: BuilderTool; Icon: typeof MousePointer2; label: string; hotkey: string }> = [
    { id: "select",         Icon: MousePointer2,      label: "Select",       hotkey: "V" },
    { id: "pan",            Icon: Hand,               label: "Pan",          hotkey: "Space" },
    { id: "building",       Icon: Building2,          label: "Building",     hotkey: "B" },
    { id: "rectangle",      Icon: Square,             label: "Rectangle",    hotkey: "U" },
    { id: "room",           Icon: DoorOpen,           label: "Room",         hotkey: "R" },
    { id: "hallway",        Icon: RouteIcon,          label: "Hallway",      hotkey: "H" },
    { id: "wall",           Icon: StretchHorizontal,  label: "Wall",         hotkey: "W" },
    { id: "measure",        Icon: Ruler,              label: "Measure",      hotkey: "M" },
    // POI tools — placed with a single click, no Enter needed.
    { id: "poi-stairs",     Icon: StepForward,        label: "Stairs",       hotkey: "S" },
    { id: "poi-elevator",   Icon: MoveVertical,       label: "Elevator",     hotkey: "E" },
    { id: "poi-door",       Icon: DoorClosed,         label: "Door",         hotkey: "D" },
    { id: "poi-entrance",   Icon: LogIn,              label: "Entrance",     hotkey: "N" },
  ];

  return (
    <div className="w-12 shrink-0 flex flex-col items-center py-2 gap-1 bg-white/95 dark:bg-gray-900/95 border-r border-gray-200 dark:border-gray-800 backdrop-blur">
      {tools.map((t) => {
        const Icon = t.Icon;
        const active = activeTool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTool(t.id)}
            title={`${t.label} (${t.hotkey})`}
            aria-label={t.label}
            aria-pressed={active}
            className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
              active
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </button>
        );
      })}

      <div className="my-1 h-px w-6 bg-gray-200 dark:bg-gray-700" />

      <div className="my-1 h-px w-6 bg-gray-200 dark:bg-gray-700" />

      <button
        type="button"
        onClick={onDelete}
        disabled={selectionCount === 0}
        title="Delete selection (Del)"
        aria-label="Delete selection"
        className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
          selectionCount === 0
            ? "text-gray-400 opacity-40 cursor-not-allowed"
            : "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30",
        )}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// Old inline UI helpers (ToolGroup/ToolButton) were removed when the
// Builder migrated to the new TopToolbar/LeftSidebar/ToolPalette layout
// (M14). BuildingPropertyPanel is now in components/builder/PropertyPanel.tsx.
