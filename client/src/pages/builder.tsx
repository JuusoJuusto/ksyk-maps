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
import LayersToggle from "@/components/LayersToggle";
import ImageOverlay from "@/components/builder/ImageOverlay";
import BuilderPois from "@/components/builder/BuilderPois";
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
  Info,
  Phone,
  ParkingCircle,
  Bike,
  Accessibility,
  Coffee,
  Utensils,
  Droplet,
  HeartPulse,
  Zap,
  Printer,
  Flag,
  Layers as LayersIcon,
  PenLine,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { validateMap } from "@ksyk/shared";
import type { Building as SharedBuilding, Room, Hallway, Floor, Door, Stair, Elevator, MapPackage, ValidationEntityKind } from "@ksyk/shared";
import { useAutosave } from "@/hooks/useAutosave";
import { fetchList } from "@/lib/fetchList";
import { toast } from "@/hooks/use-toast";
import { useUndoStack, type UndoAction } from "@/hooks/useUndoStack";
import { useNavGraph } from "@/lib/navGraph";
import { Circle as CircleIcon, Zap as ZapIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, X as XIcon, Keyboard } from "lucide-react";
import Minimap from "@/components/builder/Minimap";
import SvgImportDialog, { type ImportedPolygon } from "@/components/builder/SvgImportDialog";
import { useDarkMode } from "@/contexts/DarkModeContext";

type BuilderTool =
  | "select" | "pan"
  | "building" | "rectangle" | "room" | "corridor" | "hallway" | "wall" | "measure"
  | "poi-stairs" | "poi-elevator" | "poi-door" | "poi-entrance"
  // Generic POI tools — placed via a single click, backed by
  // /api/pois with a `kind` string. New in v3.14.
  | "poi-info" | "poi-reception" | "poi-parking" | "poi-bike"
  | "poi-restroom" | "poi-restroom-m" | "poi-restroom-f" | "poi-restroom-a"
  // v3.15: cafeteria, vending, drinking fountain, first aid,
  // defibrillator (AED), printer, and meeting point — the "everything
  // else" set MazeMap covers by default.
  | "poi-cafe" | "poi-vending" | "poi-water"
  | "poi-first-aid" | "poi-defibrillator" | "poi-printer" | "poi-meeting"
  // v3.24: navigation graph tools. `node` drops a nav node at cursor
  // (localStorage-backed for now; server sync lands with the routing
  // API). `connect` links two clicked nodes with an edge.
  | "node" | "connect"
  // v3.40.0 — construction line tool. Click to trace reference lines
  // (temporary, session-only, not saved to DB) used for alignment.
  | "line"
  // v3.45.0 — interior wall: thinner, lighter than the exterior "wall"
  // type. Both produce a Hallway row; `surface` field discriminates.
  | "wall-inner";

// Local extension of the shared Building for the builder — everything in
// the shared type plus whatever this file needs beyond it.
type FeatureBuilding = SharedBuilding;

// ─── Auth gate ────────────────────────────────────────────────────────────
// Try server-side session first; fall back to localStorage when the server
// returns 401 (e.g. cross-origin Vercel deployment where the cookie isn't
// forwarded). A 200 with a non-admin role still denies access.
function useAdminAuth() {
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('ksyk_admin_token');
        const res = await fetch("/api/auth/user", {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!cancelled && res.ok) {
          const u = await res.json();
          setState(["admin", "owner", "editor"].includes(u?.role) ? "allowed" : "denied");
          return;
        }
      } catch { /* network error — fall through to localStorage */ }
      if (cancelled) return;
      // localStorage fallback
      const loggedIn = localStorage.getItem("ksyk_admin_logged_in") === "true";
      const userRaw = localStorage.getItem("ksyk_admin_user");
      if (!loggedIn || !userRaw) { setState("denied"); return; }
      try {
        const u = JSON.parse(userRaw);
        setState(["admin", "owner", "editor"].includes(u?.role) ? "allowed" : "denied");
      } catch { setState("denied"); }
    })();
    return () => { cancelled = true; };
  }, []);
  return state;
}

/**
 * v3.26.5 — Snap a lat/lng to the nearest wall segment within the
 * supplied threshold in metres. Iterates every hallway with
 * `surface === "wall"`, projects the click onto each segment, and
 * returns the closest projected point. Falls back to null (caller
 * uses raw click) when no wall is close enough.
 *
 * Projection is done in a locally-linear (small-angle) approximation
 * — for building-scale distances (<50 m) this is off by <0.1 %, far
 * below the 3 m default snap threshold.
 */
function snapPointToNearestWall(
  click: { lat: number; lng: number },
  hallways: Array<{ startX: number; startY: number; endX: number; endY: number; surface?: string | null }>,
  thresholdMeters: number,
): { lat: number; lng: number } | null {
  // Metres per degree at this latitude.
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((click.lat * Math.PI) / 180);
  const px = 0;                       // click is our origin in local metres
  const py = 0;

  let best: { lat: number; lng: number; d2: number } | null = null;
  for (const h of hallways) {
    const sf = (h.surface ?? "").toLowerCase();
    if (sf !== "wall" && sf !== "inner-wall") continue;
    // Segment endpoints in metres relative to the click.
    const ax = (h.startX - click.lng) * mPerDegLng;
    const ay = (h.startY - click.lat) * mPerDegLat;
    const bx = (h.endX - click.lng) * mPerDegLng;
    const by = (h.endY - click.lat) * mPerDegLat;

    const abx = bx - ax; const aby = by - ay;
    const apx = px - ax; const apy = py - ay;
    const denom = abx * abx + aby * aby;
    if (denom === 0) continue;
    let t = (apx * abx + apy * aby) / denom;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + t * abx;
    const projY = ay + t * aby;

    const dx = projX - px; const dy = projY - py;
    const d2 = dx * dx + dy * dy;
    if (d2 <= thresholdMeters * thresholdMeters && (!best || d2 < best.d2)) {
      // Convert back to lat/lng from local-metre offset.
      const lng = click.lng + projX / mPerDegLng;
      const lat = click.lat + projY / mPerDegLat;
      best = { lat, lng, d2 };
    }
  }
  return best ? { lat: best.lat, lng: best.lng } : null;
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
  // v3.26.0 — cursor lat/lng in world space. Updated on mousemove
  // while a draw tool is active so we can render a "ghost" segment
  // from the last placed waypoint to the cursor. Users see EXACTLY
  // where their next click will land before committing. Plain shape
  // (not the maplibre LngLat class) so setting it from any {lng, lat}
  // literal is type-safe.
  const [cursorLngLat, setCursorLngLat] = useState<{ lng: number; lat: number } | null>(null);
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
  const { darkMode } = useDarkMode();

  // Legacy `selectedId` shim — many downstream effects still key off a
  // single string. New code uses `selection`.
  const selectedId = selection?.kind === "building" ? selection.id : null;
  const setSelectedId = useCallback((id: string | null) => {
    setSelection(id ? { kind: "building", id } : null);
  }, []);
  // Multi-selection — Figma-style additional selected polygons beyond
  // the "primary" `selection` (which drives the property panel). Kept
  // as Sets of ids per kind so contains-checks are O(1) during paint.
  // Primary selection is INCLUDED in these sets so the paint expressions
  // don't need to check both places.
  const [extraBuildingIds, setExtraBuildingIds] = useState<Set<string>>(() => new Set());
  const [extraRoomIds, setExtraRoomIds] = useState<Set<string>>(() => new Set());
  const selectedBuildingIds = useMemo(() => {
    const s = new Set(extraBuildingIds);
    if (selection?.kind === "building") s.add(selection.id);
    return s;
  }, [extraBuildingIds, selection]);
  const selectedRoomIds = useMemo(() => {
    const s = new Set(extraRoomIds);
    if (selection?.kind === "room") s.add(selection.id);
    return s;
  }, [extraRoomIds, selection]);
  const clearMultiSelection = useCallback(() => {
    setExtraBuildingIds(new Set());
    setExtraRoomIds(new Set());
  }, []);

  // ── Chrome state ─────────────────────────────────────────────────────
  const [sidebarTab, setSidebarTab] = useState<LeftSidebarTab>("buildings");
  const [showValidation, setShowValidation] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showSvgImport, setShowSvgImport] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  // v3.31.2 — ortho (right-angle) constraint. On → new waypoint
  // clicks snap to horizontal/vertical from the previous vertex.
  // Off → free-form clicks (current behaviour).
  const [orthoEnabled, setOrthoEnabled] = useState(true);
  // Smart guides — orange alignment lines + guide snap. Off = guides
  // hidden and guide snap disabled (raw cursor or vertex snap only).
  const [guidesEnabled, setGuidesEnabled] = useState(true);
  const guidesEnabledRef = useRef(true);
  guidesEnabledRef.current = guidesEnabled;
  // Mirrors snapEnabled into a ref so the stable mousemove handler can
  // read the latest value without being re-registered.
  const snapEnabledRef = useRef(true);
  snapEnabledRef.current = snapEnabled;
  // Refs so the click-handler useEffect (deps: [activeTool, mapReady])
  // can read the LATEST waypoints and orthoEnabled without being
  // re-registered on every state change (stale-closure fix).
  const waypointsRef = useRef<LngLat[]>([]);
  waypointsRef.current = waypoints;
  const orthoEnabledRef = useRef(false);
  orthoEnabledRef.current = orthoEnabled;
  const [isPublishing, setIsPublishing] = useState(false);
  // MazeMap-style keyboard cheat sheet — toggled by "?" (Shift + /).
  const [showShortcuts, setShowShortcuts] = useState(false);
  // ⌘Z / ⌘⇧Z history for building/room/hallway mutations.
  const history = useUndoStack();
  // Active tab in the PropertyPanel — drives whether translate-drag is enabled.
  const [propPanelTab, setPropPanelTab] = useState<string>("props");
  // Floor-shape drawing mode: when set, the next polygon commit saves as
  // a per-floor shape override instead of creating a new room.
  const [floorShapeTarget, setFloorShapeTarget] = useState<{
    entityId: string; entityKind: "room" | "building"; floor: number;
  } | null>(null);
  // Local-first navigation graph. Nodes + edges live in localStorage
  // until the server-side /api/nav-nodes API lands.
  const navGraph = useNavGraph();
  // Connect tool needs to remember the first node the user clicked so
  // the second click can complete the edge.
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  // Right-click context menu — floats at cursor position. `target`
  // captures which entity was under the cursor so the menu shows the
  // right actions. Menu closes on any outside click / Esc.
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target:
      | { kind: "building"; id: string }
      | { kind: "room"; id: string }
      | { kind: "node"; id: string }
      | { kind: "empty" };
  } | null>(null);
  // Route preview — user picks two nav nodes, we run A* over the
  // local nav graph and animate the path between them.
  const [routePreview, setRoutePreview] = useState<{
    startNodeId: string | null;
    endNodeId: string | null;
  }>({ startNodeId: null, endNodeId: null });

  // Listen for the command palette's Import-SVG entry.
  useEffect(() => {
    const onOpenSvg = () => setShowSvgImport(true);
    window.addEventListener("ksyk:cmd:import-svg", onOpenSvg);
    return () => window.removeEventListener("ksyk:cmd:import-svg", onOpenSvg);
  }, []);

  // Listen for the palette's Auto-connect command. Kept behind an
  // event so the palette module doesn't have to import the builder.
  // Refs indirection avoids a TDZ error: autoConnectNodes is declared
  // ~1500 lines below this effect, and putting it in a dep array
  // evaluates the identifier at render → ReferenceError before init.
  const autoConnectNodesRef = useRef<((m?: number) => void) | null>(null);
  useEffect(() => {
    const onAuto = () => autoConnectNodesRef.current?.(8);
    window.addEventListener("ksyk:cmd:autoconnect-nav", onAuto);
    return () => window.removeEventListener("ksyk:cmd:autoconnect-nav", onAuto);
  }, []);

  // ── Camera + cursor + FPS trackers (StatusBar) ───────────────────────
  const [cameraState, setCameraState] = useState({
    zoom: 17,
    bearingDeg: 0,
    activeFloor: 1 as number | null,
  });
  // Mirrors activeFloor into a ref so the click handler (stable closure
  // with deps [activeTool, mapReady]) reads the latest floor without being
  // re-registered on every floor switch.
  const activeFloorRef = useRef<number | null>(1);
  activeFloorRef.current = cameraState.activeFloor;
  const [cursor, setCursor] = useState<{ lat: number; lng: number } | null>(null);
  // Snap-to-vertex — MazeMap/AutoCAD-style visual feedback while a
  // draw tool is active. When the cursor is within a screen-pixel
  // threshold of an existing polygon vertex, we render a crosshair
  // indicator and next click snaps to the vertex instead of the raw
  // cursor lng/lat.
  const snapTargetRef = useRef<{ lat: number; lng: number; kind: "vertex" | "endpoint" | "midpoint" | "close" } | null>(null);
  // Guide snap: horizontal/vertical alignment with any campus vertex.
  // Updated by the ghost preview effect on every mousemove so the click
  // handler and the preview always use the same snapped position.
  const guideSnapRef = useRef<{ lat: number; lng: number } | null>(null);
  // finalPosRef — stores the exact post-ortho/snap position computed on
  // every mousemove by the ghost preview effect. The click handler reads
  // this instead of re-computing so preview and click always land at the
  // same point (ortho v8 consistency fix).
  const finalPosRef = useRef<{ lat: number; lng: number } | null>(null);
  // Temporary construction lines — session-only reference geometry drawn
  // with the Line tool (L). Persisted in sessionStorage so they survive
  // within a browser session (page refresh), but cleared on tab close.
  const [tempLines, setTempLines] = useState<Array<Array<{ lng: number; lat: number }>>>(() => {
    try {
      const saved = sessionStorage.getItem("ksyk-builder-temp-lines");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  // Index of the currently-selected construction line (select tool click).
  // Null when nothing is selected. Delete/Backspace removes it.
  const [selectedTempLineIdx, setSelectedTempLineIdx] = useState<number | null>(null);
  // Distance constraint — user-typed segment length in metres.
  // Non-null overrides where the next waypoint lands (along the cursor
  // direction from the last waypoint). Cleared on waypoint placement.
  const [distanceInput, setDistanceInput] = useState("");
  const distanceInputRef = useRef("");
  distanceInputRef.current = distanceInput;
  // Divide field — user types N to split the last segment into N equal parts.
  const [divideInput, setDivideInput] = useState("");
  // Live segment length shown in the constraint panel (updated by ghost preview).
  const [liveSegmentM, setLiveSegmentM] = useState<number | null>(null);
  const [snapLabel, setSnapLabel] = useState<{ x: number; y: number; kind: string } | null>(null);
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
  // v3.28.2 — generic POI query so PropertyPanel can resolve a
  // `poi` selection into an editable entity + so BuilderPois can
  // share the cached data with LeftSidebar (React Query dedupes).
  const poisQ = useQuery<Record<string, unknown>[]>({
    queryKey: ["/api/pois"],
    queryFn: async () => {
      const r = await fetch("/api/pois");
      if (!r.ok) return [];
      return r.json();
    },
  });

  const validation = useMemo(() => validateMap({
    buildings,
    rooms: roomsQ.data ?? [],
    hallways: hallwaysQ.data ?? [],
    floors: floorsQ.data ?? [],
    doors: doorsQ.data ?? [],
    stairs: stairsQ.data ?? [],
    elevators: elevatorsQ.data ?? [],
  }), [buildings, roomsQ.data, hallwaysQ.data, floorsQ.data, doorsQ.data, stairsQ.data, elevatorsQ.data]);

  // Stable SelectionHandles prop — memoized on selection id+kind so the
  // wrapper object identity doesn't change on every render and cause
  // SelectionHandles' useEffect to re-run (cleanup+setup) on every
  // mousemove, which produced the vertex-handle flashing bug.
  const selectionHandlesInput = useMemo(() => {
    if (!mapReady || !selection) return null;
    const m = handleRef.current?.map ?? null;
    if (!m) return null;
    if (selection.kind === "building") {
      const b = buildings.find((x) => x.id === selection.id);
      return b ? { map: m, sel: { kind: "building" as const, entity: b } } : null;
    }
    if (selection.kind === "room") {
      const r = (roomsQ.data ?? []).find((x) => x.id === selection.id);
      return r ? { map: m, sel: { kind: "room" as const, entity: r } } : null;
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, selection?.kind, selection?.id, buildings, roomsQ.data]);

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
      } else if ((activeTool === "hallway" || activeTool === "wall" || activeTool === "wall-inner") && coords.length >= 2) {
        lineCoords = coords;
      } else if (coords.length >= 3) {
        polyCoords = [...coords, coords[0]];
      } else if ((activeTool === "building" || activeTool === "room" || activeTool === "corridor") && coords.length === 2) {
        // v3.26.4 — while placing a building/room/corridor, show a
        // line between corners 1 and 2 so the user sees their
        // progress. Once corner 3 lands, the branch above kicks in
        // and closes the polygon.
        lineCoords = coords;
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

      // CAD-style live dimension callouts on each drawn segment. Shows
      // the length in metres midway along each edge, so users know the
      // exact size of the shape they're placing without eyeballing.
      const dimFeatures: unknown[] = [];
      const segCount = polyCoords ? polyCoords.length - 1
                     : lineCoords ? lineCoords.length - 1
                     : 0;
      const dimSource = polyCoords ?? lineCoords ?? [];
      for (let i = 0; i < segCount; i++) {
        const a = dimSource[i];
        const b = dimSource[i + 1];
        if (!a || !b) continue;
        const midLng = (a[0] + b[0]) / 2;
        const midLat = (a[1] + b[1]) / 2;
        const R = 6371000;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(b[1] - a[1]);
        const dLng = toRad(b[0] - a[0]);
        const s2 =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
        const dist = 2 * R * Math.asin(Math.sqrt(s2));
        const label = dist < 10
          ? `${dist.toFixed(2)} m`
          : dist < 1000
            ? `${dist.toFixed(1)} m`
            : `${(dist / 1000).toFixed(2)} km`;
        dimFeatures.push({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [midLng, midLat] },
          properties: { label },
        });
      }

      const data = {
        type: "FeatureCollection" as const,
        features: [
          ...(shapeFeature ? [shapeFeature as never] : []),
          ...pointFeatures,
          ...dimFeatures,
        ],
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
        // Live-draw dimension labels — visible only when the feature
        // carries a `label` property (i.e. the mid-edge dim points we
        // just synthesised).
        map.addLayer({
          id: `${layerId}-dims`,
          source: sourceId,
          type: "symbol",
          layout: {
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-font": ["Noto Sans Regular"],
            "text-allow-overlap": true,
            "text-ignore-placement": true,
            "text-anchor": "center",
          },
          paint: {
            "text-color": "#1e3a8a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
          },
          filter: ["has", "label"],
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
            selected: selectedBuildingIds.has(b.id),
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
          // v3.32.0 — smooth selection paint transitions so the
          // fill/outline don't visually snap when the selected flag
          // flips (fixes reported "hover glitch" flicker on selected
          // buildings — every feature-collection regeneration was
          // instantly re-painting).
          "fill-opacity-transition": { duration: 120, delay: 0 },
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
          "line-width-transition": { duration: 120, delay: 0 },
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
  }, [buildings, selectedId, selectedBuildingIds, mapReady]);

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
    // Same floor filtering as the normal public map (CampusOverlay):
    // only rooms on the active floor are shown. When no floor is active
    // (null), all rooms are shown. Selected rooms are always visible
    // regardless of floor for selection feedback.
    const activeFloor = cameraState.activeFloor;
    const roomsFC = {
      type: "FeatureCollection" as const,
      features: rooms
        .filter((r) => r.points && r.points.length >= 3)
        .filter((r) => {
          if (activeFloor === null) return true;
          if (selectedRoomIds.has(r.id)) return true; // always show selected
          type BldMeta = { floorIds?: number[]; floorShapes?: Array<{ floor: number; coordinates: [number, number][] }> };
          const meta = r.metadata as BldMeta | null | undefined;
          const hasShapeForActive = meta?.floorShapes?.some((fs) => fs.floor === activeFloor);
          return r.floor == null || r.floor === activeFloor || hasShapeForActive;
        })
        .map((r) => {
          type BldMeta = { floorIds?: number[]; floorShapes?: Array<{ floor: number; coordinates: [number, number][] }> };
          const meta = r.metadata as BldMeta | null | undefined;
          const floorShape = activeFloor != null ? meta?.floorShapes?.find((fs) => fs.floor === activeFloor) : undefined;
          const builderPts: [number, number][] = floorShape?.coordinates ?? r.points!.map((p) => [p.lng, p.lat]);
          const isSelected = selectedRoomIds.has(r.id);
          return {
            type: "Feature" as const,
            geometry: {
              type: "Polygon" as const,
              coordinates: [[...builderPts, builderPts[0]]],
            },
            properties: {
              id: r.id,
              color: r.colorCode ?? (r.type === "hallway" ? "#64748b" : "#059669"),
              label: [r.roomNumber, r.name].filter(Boolean).join(" "),
              selected: isSelected,
              floor: r.floor ?? 1,
              type: r.type ?? null,
              showOutline: ((r.metadata as { style?: { showOutline?: boolean } } | null)?.style?.showOutline) === true,
            },
          };
        }),
    };
    const roomsSrc = map.getSource(roomsSrcId) as maplibregl.GeoJSONSource | undefined;
    if (roomsSrc) roomsSrc.setData(roomsFC as any);
    else {
      map.addSource(roomsSrcId, { type: "geojson", data: roomsFC as any });
      map.addLayer({
        id: roomsFillId, source: roomsSrcId, type: "fill",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": ["case", ["boolean", ["get", "selected"], false], 0.65, 0.50],
        },
      });
      map.addLayer({
        id: roomsOutlineId, source: roomsSrcId, type: "line",
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["boolean", ["get", "selected"], false], 3, 1.2],
          "line-opacity": [
            "case",
            ["boolean", ["get", "selected"], false], 1,
            ["boolean", ["get", "showOutline"], false], 0.9,
            0,
          ],
        },
      });
      map.addLayer({
        id: roomsLabelId, source: roomsSrcId, type: "symbol",
        layout: { "text-field": ["get", "label"], "text-size": 11, "text-font": ["Noto Sans Regular"], "text-allow-overlap": false, "text-optional": true },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
          "text-opacity": 1,
        },
        minzoom: 17,
      });
    }

    // Hallways
    // v3.31.1 — use the new `points` polyline when set, else fall
    // back to legacy startX/Y → endX/Y. Wall segments render as
    // thick dark lines to distinguish from walkable amber hallways.
    // Both changes matter for admins visually verifying what they
    // drew before hitting publish.
    const hallSrcId = "builder-hallways";
    const hallLineId = "builder-hallways-line";
    const halls = hallwaysQ.data ?? [];
    const hallsFC = {
      type: "FeatureCollection" as const,
      features: halls.map((hw) => {
        const pts = (hw as unknown as { points?: Array<{ lat: number; lng: number }> }).points;
        const coords: number[][] = (Array.isArray(pts) && pts.length >= 2)
          ? pts.map((p) => [p.lng, p.lat])
          : [[hw.startX, hw.startY], [hw.endX, hw.endY]];
        const surface = (hw as { surface?: string | null }).surface ?? "concrete";
        return {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: coords },
          properties: {
            id: hw.id,
            selected: selection?.kind === "hallway" && selection.id === hw.id,
            surface,
            // Legacy bool kept for the dark-mode effect which hasn't been
            // rewritten yet — surface expression replaces it for new paint.
            isWall: surface === "wall" || surface === "inner-wall",
          },
        };
      }),
    };
    const hallsSrc = map.getSource(hallSrcId) as maplibregl.GeoJSONSource | undefined;
    if (hallsSrc) {
      hallsSrc.setData(hallsFC as any);
      // Keep walls on top after every data update.
      try { map.moveLayer(hallLineId); } catch { /* ignore */ }
    } else {
      map.addSource(hallSrcId, { type: "geojson", data: hallsFC as any });
      const wallColor = darkMode ? "#94a3b8" : "#374151";
      const innerWallColor = darkMode ? "#64748b" : "#64748b";
      // Walls are always rendered on top. moveLayer() is called below
      // after addLayer() to ensure the wall line sits above rooms/corridors.
      map.addLayer({
        id: hallLineId, source: hallSrcId, type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": [
            "case",
            ["boolean", ["get", "selected"], false], "#dc2626",
            ["==", ["get", "surface"], "wall"], wallColor,
            ["==", ["get", "surface"], "inner-wall"], innerWallColor,
            "#f59e0b",  // amber walkable
          ],
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            15, ["case",
              ["boolean", ["get", "selected"], false], 4,
              ["==", ["get", "surface"], "wall"], 3,
              ["==", ["get", "surface"], "inner-wall"], 1.5,
              2
            ],
            20, ["case",
              ["boolean", ["get", "selected"], false], 16,
              ["==", ["get", "surface"], "wall"], 12,
              ["==", ["get", "surface"], "inner-wall"], 5,
              8
            ],
          ],
          "line-opacity": [
            "case",
            ["==", ["get", "surface"], "wall"], 0.95,
            ["==", ["get", "surface"], "inner-wall"], 0.85,
            0.8,
          ],
        },
      });
      // Move wall layer to the very top so it always renders above rooms/corridors.
      try { map.moveLayer(hallLineId); } catch { /* ignore */ }
    }
  }, [mapReady, roomsQ.data, hallwaysQ.data, selection, selectedRoomIds, cameraState.activeFloor, darkMode]);

  // ── Dark-mode wall color ────────────────────────────────────────
  // Wall color must flip with the basemap: dark on light Voyager,
  // light on Dark Matter. The layer is only added once (above), so
  // we drive the paint update via setPaintProperty here.
  useEffect(() => {
    if (!mapReady) return;
    const map = handleRef.current?.map;
    if (!map) return;
    const wallColor = darkMode ? "#94a3b8" : "#374151";
    const innerWallColor = "#64748b";
    const expr = [
      "case",
      ["boolean", ["get", "selected"], false], "#dc2626",
      ["==", ["get", "surface"], "wall"], wallColor,
      ["==", ["get", "surface"], "inner-wall"], innerWallColor,
      "#f59e0b",
    ];
    try { map.setPaintProperty("builder-hallways-line", "line-color", expr); } catch { /* layer not yet added */ }
  }, [mapReady, darkMode]);

  // ── Nav graph layer sync ────────────────────────────────────────
  // Draws every localStorage-persisted node + edge on the map. Nodes
  // filter by the active floor; the graph rebuilds cheaply whenever
  // the useNavGraph hook fires a change event.
  useEffect(() => {
    if (!mapReady) return;
    const h = handleRef.current;
    if (!h) return;
    const map = h.map;
    const NODE_SRC = "builder-nav-nodes-src";
    const NODE_LAYER = "builder-nav-nodes";
    const NODE_HALO = "builder-nav-nodes-halo";
    const EDGE_SRC = "builder-nav-edges-src";
    const EDGE_LAYER = "builder-nav-edges";

    const activeFloor = cameraState.activeFloor ?? null;
    const nodes = navGraph.graph.nodes.filter((n) => activeFloor === null || n.floor === activeFloor);
    const nodeIds = new Set(nodes.map((n) => n.id));
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    // Only draw edges whose BOTH endpoints are on the active floor
    // (interfloor edges = stairs/elevators — those get their own
    // treatment eventually).
    const edges = navGraph.graph.edges.filter((e) => nodeIds.has(e.fromNodeId) && nodeIds.has(e.toNodeId));

    const nodeFC = {
      type: "FeatureCollection" as const,
      features: nodes.map((n) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [n.lng, n.lat] },
        properties: {
          id: n.id, kind: n.kind ?? "junction",
          isPickingFrom: n.id === connectFrom,
        },
      })),
    };
    const edgeFC = {
      type: "FeatureCollection" as const,
      features: edges.map((e) => {
        const a = nodeById.get(e.fromNodeId)!;
        const b = nodeById.get(e.toNodeId)!;
        return {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: [[a.lng, a.lat], [b.lng, b.lat]] },
          properties: { id: e.id },
        };
      }),
    };

    // Edges FIRST (below nodes in paint order).
    const edgeSrc = map.getSource(EDGE_SRC) as maplibregl.GeoJSONSource | undefined;
    if (edgeSrc) edgeSrc.setData(edgeFC as any);
    else {
      map.addSource(EDGE_SRC, { type: "geojson", data: edgeFC as any });
      map.addLayer({
        id: EDGE_LAYER, source: EDGE_SRC, type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#3b82f6",
          "line-width": ["interpolate", ["linear"], ["zoom"], 15, 1.5, 20, 4],
          "line-opacity": 0.7,
        },
      });
    }

    const nodeSrc = map.getSource(NODE_SRC) as maplibregl.GeoJSONSource | undefined;
    if (nodeSrc) nodeSrc.setData(nodeFC as any);
    else {
      map.addSource(NODE_SRC, { type: "geojson", data: nodeFC as any });
      // Outer halo — larger when the node is the "picking from" for
      // the connect tool so users see which node they're linking.
      map.addLayer({
        id: NODE_HALO, source: NODE_SRC, type: "circle",
        paint: {
          "circle-radius": ["case", ["boolean", ["get", "isPickingFrom"], false], 14, 8],
          "circle-color": "#3b82f6",
          "circle-opacity": ["case", ["boolean", ["get", "isPickingFrom"], false], 0.4, 0.18],
        },
      });
      // Solid center dot.
      map.addLayer({
        id: NODE_LAYER, source: NODE_SRC, type: "circle",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 4, 20, 7],
          "circle-color": [
            "match", ["get", "kind"],
            "room", "#059669",
            "stairs", "#b45309",
            "elevator", "#2563eb",
            "entrance", "#15803d",
                        "#3b82f6",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
    }
  }, [mapReady, navGraph.graph, cameraState.activeFloor, connectFrom]);

  // ── Map click handler — drops waypoints in draw mode ────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const h = handleRef.current;
    if (!h) return;
    const map = h.map;

    const onClick = (e: MapMouseEvent) => {
      if (activeTool === "select") {
        // Vertex/rotator handles are separate MapLibre layers rendered on top
        // of the selected polygon. A click that lands on a handle should NOT
        // deselect or re-select — it was part of a drag (or a mis-click on the
        // handle). Guard first so the drag-end click is harmlessly swallowed.
        const handleHitLayers = ["selection-vertices", "selection-rotator"].filter((id) => map.getLayer(id));
        if (handleHitLayers.length > 0) {
          const handleHit = map.queryRenderedFeatures(e.point, { layers: handleHitLayers });
          if (handleHit.length > 0) return;
        }
        // Rank hits by kind — rooms + hallways sit inside buildings, so
        // the smallest thing under the cursor wins. Order = priority.
        const roomLayers = ["builder-rooms-fill"].filter((id) => map.getLayer(id));
        const hallLayers = ["builder-hallways-line"].filter((id) => map.getLayer(id));
        const bldgLayers = ["builder-buildings-fill"].filter((id) => map.getLayer(id));
        const tryQuery = (layers: string[]): { kind: LeftSidebarSelection["kind"]; id: string; isCorridor: boolean } | null => {
          if (layers.length === 0) return null;
          const feats = map.queryRenderedFeatures(e.point, { layers });
          // When querying rooms, prefer the one on the active floor so
          // stacked same-spot rooms on different floors don't block each other.
          const isRoomLayer = layers[0].includes("rooms");
          const curFloor = activeFloorRef.current;
          const floorFeats = isRoomLayer && curFloor !== null
            ? feats.filter((f) => f.properties?.floor === curFloor)
            : feats;
          const hit = (floorFeats.length > 0 ? floorFeats : feats)[0];
          if (!hit || typeof hit.properties?.id !== "string") return null;
          const kind: LeftSidebarSelection["kind"] =
            layers[0].includes("rooms") ? "room" :
            layers[0].includes("hallways") ? "hallway" : "building";
          // Corridors are rooms with type="hallway" — they belong in Structure tab
          const isCorridor = kind === "room" && hit.properties?.type === "hallway";
          return { kind, id: hit.properties.id, isCorridor };
        };
        const pick = tryQuery(roomLayers) ?? tryQuery(hallLayers) ?? tryQuery(bldgLayers);
        // Construction line hit — select the clicked line (for deletion).
        const tempLineLayers = ["builder-temp-lines-line"].filter((id) => map.getLayer(id));
        const tempLineHit = tempLineLayers.length
          ? map.queryRenderedFeatures(e.point, { layers: tempLineLayers })[0]
          : null;
        if (tempLineHit && typeof tempLineHit.properties?.id === "number") {
          setSelectedTempLineIdx(tempLineHit.properties.id as number);
          return;
        }
        // Shift-click ADDs the hit to the multi-selection set (Figma
        // convention). No-shift click becomes the primary selection
        // and clears the extras.
        const shiftHeld = e.originalEvent instanceof MouseEvent && e.originalEvent.shiftKey;
        if (pick) {
          if (shiftHeld && pick.kind !== "hallway") {
            // Toggle membership in the appropriate extras set.
            const idsSetter = pick.kind === "building" ? setExtraBuildingIds : setExtraRoomIds;
            idsSetter((prev) => {
              const next = new Set(prev);
              // If the click is the PRIMARY selection, promote an
              // extra to primary and remove it from extras instead.
              const isPrimary = selection?.kind === pick.kind && selection.id === pick.id;
              if (isPrimary) {
                const first = next.values().next().value;
                if (first) { next.delete(first); setSelection({ kind: pick.kind, id: first }); }
                else setSelection(null);
              } else if (next.has(pick.id)) {
                next.delete(pick.id);
              } else {
                next.add(pick.id);
              }
              return next;
            });
          } else {
            clearMultiSelection();
            setSelection({ kind: pick.kind, id: pick.id });
            // Corridors (rooms with type="hallway") belong in Structure tab, not Rooms
            const tab = pick.kind === "building" ? "buildings"
              : (pick.kind === "room" && !pick.isCorridor) ? "rooms"
              : "pois";
            setSidebarTab(tab);
          }
        } else if (!shiftHeld) {
          setSelection(null);
          clearMultiSelection();
          setSelectedTempLineIdx(null);
        }
        return;
      }
      if (
        activeTool === "building" || activeTool === "room" ||
        activeTool === "corridor" ||
        activeTool === "hallway" || activeTool === "wall" || activeTool === "wall-inner" ||
        activeTool === "rectangle" || activeTool === "measure" ||
        activeTool === "line"
      ) {
        const wps = waypointsRef.current;
        // Use finalPosRef (set by ghost preview on every mousemove) so the
        // click always commits exactly what the preview showed — ortho v8
        // consistency. Falls back to snap/raw click if cursor didn't move.
        const final = finalPosRef.current;
        let p: maplibregl.LngLat;
        if (final) {
          p = new maplibregl.LngLat(final.lng, final.lat);
        } else {
          const snap = snapTargetRef.current;
          const orthoOn = orthoEnabledRef.current;
          const useSnap = snap && !(orthoOn && wps.length >= 1);
          const guideSnap = guideSnapRef.current;
          p = useSnap
            ? new maplibregl.LngLat(snap.lng, snap.lat)
            : guideSnap
            ? new maplibregl.LngLat(guideSnap.lng, guideSnap.lat)
            : e.lngLat;
          if (orthoOn && wps.length >= 1) {
            const prev = wps[wps.length - 1];
            // Screen-space ortho: correct for any map rotation/bearing.
            const prevSc = map.project([prev.lng, prev.lat]);
            const curSc  = map.project([p.lng,    p.lat   ]);
            const sdx = curSc.x - prevSc.x;
            const sdy = curSc.y - prevSc.y;
            let nx: number, ny: number;
            if (wps.length === 1) {
              // First edge: snap to screen H or V.
              [nx, ny] = Math.abs(sdx) >= Math.abs(sdy)
                ? [curSc.x, prevSc.y]
                : [prevSc.x, curSc.y];
            } else {
              const pp = wps[wps.length - 2];
              const ppSc = map.project([pp.lng, pp.lat]);
              const edSx = prevSc.x - ppSc.x;
              const edSy = prevSc.y - ppSc.y;
              const edLen = Math.sqrt(edSx * edSx + edSy * edSy);
              if (edLen > 0.5) {
                const ex = edSx / edLen, ey = edSy / edLen;
                const tFwd  =  sdx * ex + sdy * ey;
                const tPerp = -sdx * ey + sdy * ex;
                if (Math.abs(tFwd) >= Math.abs(tPerp)) {
                  nx = prevSc.x + tFwd * ex; ny = prevSc.y + tFwd * ey;
                } else {
                  nx = prevSc.x + tPerp * (-ey); ny = prevSc.y + tPerp * ex;
                }
              } else {
                nx = curSc.x; ny = curSc.y;
              }
            }
            const snp = map.unproject([nx, ny]);
            p = new maplibregl.LngLat(snp.lng, snp.lat);
          }
        }
        setDistanceInput(""); // clear distance constraint after placing waypoint
        setWaypoints((prev) => [...prev, p]);
        return;
      }
      // POI tools: single-click places, no need for Enter. Fire the
      // matching mutation with the click position.
      // v3.24 nav-graph tools — click to drop a node, or click two
      // existing nodes to connect them.
      if (activeTool === "node") {
        navGraph.addNode({
          lat: e.lngLat.lat, lng: e.lngLat.lng,
          floor: cameraState.activeFloor ?? 1,
          kind: "junction",
        });
        return;
      }
      if (activeTool === "connect") {
        // Query the nav-nodes MapLibre layer we install below. Nearest
        // rendered feature within the click box wins.
        const nodeLayers = ["builder-nav-nodes"].filter((id) => map.getLayer(id));
        const feats = nodeLayers.length ? map.queryRenderedFeatures(e.point, { layers: nodeLayers }) : [];
        const hit = feats[0];
        const nodeId = hit?.properties?.id;
        if (typeof nodeId !== "string") return;
        if (!connectFrom) {
          setConnectFrom(nodeId);
          toast({ title: "Now click the second node", description: "Or press Esc to cancel." });
        } else {
          const edge = navGraph.addEdge(connectFrom, nodeId);
          setConnectFrom(null);
          if (edge) toast({ title: "Connected", description: "Nav edge added." });
        }
        return;
      }
      if (activeTool === "poi-stairs") {
        createStair.mutate({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        return;
      }
      if (activeTool === "poi-elevator") {
        createElevator.mutate({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        return;
      }
      if (activeTool === "poi-door" || activeTool === "poi-entrance") {
        // v3.26.5 — snap doors to the nearest wall segment within 3m.
        // Projects the click onto every wall/hallway LineString and
        // picks the closest hit; falls back to raw click if nothing's
        // near. Doors that live ON walls look right; free-floating
        // doors "in the middle of a room" no longer happen on
        // accident.
        const snapped = snapPointToNearestWall(
          { lat: e.lngLat.lat, lng: e.lngLat.lng },
          hallwaysQ.data ?? [],
          3,  // meters
        ) ?? { lat: e.lngLat.lat, lng: e.lngLat.lng };
        createDoor.mutate({
          lat: snapped.lat,
          lng: snapped.lng,
          isEntrance: activeTool === "poi-entrance",
        });
        return;
      }
      // Generic POIs — every one goes to /api/pois with a `kind`
      // derived from the tool id.
      const genericKindByTool: Partial<Record<BuilderTool, string>> = {
        "poi-info":           "info",
        "poi-reception":      "reception",
        "poi-parking":        "parking",
        "poi-bike":           "bike",
        "poi-restroom":       "restroom",   // v3.28.2 unisex/generic
        "poi-restroom-m":     "restroom_m",
        "poi-restroom-f":     "restroom_f",
        "poi-restroom-a":     "restroom_a",
        "poi-cafe":           "cafe",
        "poi-vending":        "vending",
        "poi-water":          "water",
        "poi-first-aid":      "first_aid",
        "poi-defibrillator":  "defibrillator",
        "poi-printer":        "printer",
        "poi-meeting":        "meeting_point",
      };
      const genericKind = genericKindByTool[activeTool];
      if (genericKind) {
        createGenericPoi.mutate({ lat: e.lngLat.lat, lng: e.lngLat.lng, kind: genericKind });
        return;
      }
    };

    map.on("click", onClick);

    // Right-click → context menu. MapLibre fires `contextmenu` with a
    // MapMouseEvent whose `originalEvent.preventDefault()` we call to
    // suppress the browser menu. Query every clickable layer under
    // the cursor and pick the smallest thing so a right-click on a
    // room inside a building targets the room.
    const onContextMenu = (e: MapMouseEvent) => {
      e.preventDefault();
      const nodeLayers = ["builder-nav-nodes"].filter((id) => map.getLayer(id));
      const roomLayers = ["builder-rooms-fill"].filter((id) => map.getLayer(id));
      const bldgLayers = ["builder-buildings-fill"].filter((id) => map.getLayer(id));
      const nodeHit = nodeLayers.length ? map.queryRenderedFeatures(e.point, { layers: nodeLayers })[0] : null;
      const roomHit = roomLayers.length ? map.queryRenderedFeatures(e.point, { layers: roomLayers })[0] : null;
      const bldgHit = bldgLayers.length ? map.queryRenderedFeatures(e.point, { layers: bldgLayers })[0] : null;
      const originalEvent = e.originalEvent as MouseEvent;
      const target: NonNullable<typeof contextMenu>["target"] =
        nodeHit && typeof nodeHit.properties?.id === "string" ? { kind: "node", id: nodeHit.properties.id }
        : roomHit && typeof roomHit.properties?.id === "string"
          // Corridors (type="hallway") are rooms in storage but conceptually
          // different — still use kind:"room" so PropertyPanel opens correctly.
          ? { kind: "room", id: roomHit.properties.id }
        : bldgHit && typeof bldgHit.properties?.id === "string" ? { kind: "building", id: bldgHit.properties.id }
        : { kind: "empty" };
      setContextMenu({ x: originalEvent.clientX, y: originalEvent.clientY, target });
    };
    map.on("contextmenu", onContextMenu);

    return () => {
      map.off("click", onClick);
      map.off("contextmenu", onContextMenu);
    };
  }, [activeTool, mapReady]);

  // ── Keyboard: Enter to finalize, Escape to cancel, hotkeys ──────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" ||
          (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "Escape") {
        // Escape from the shortcuts overlay first if it's open — pressing
        // Esc while looking at shortcuts should close the overlay, not
        // reset the drawing tool.
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (contextMenu) { setContextMenu(null); return; }
        if (connectFrom) { setConnectFrom(null); return; }
        if (floorShapeTarget) { setFloorShapeTarget(null); }
        setWaypoints([]);
        setActiveTool("select");
        return;
      }
      if (e.key === "Enter") {
        finalize();
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcuts((s) => !s);
        return;
      }
      // ⌘D / Ctrl+D — Figma-standard duplicate. Every selected
      // building + room clones with a ~5m south-east offset so the
      // copies don't sit on top of the originals.
      if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        void duplicateSelection();
        return;
      }
      // F — focus the map on the current selection (or every
      // selected feature). Standard 3D-editor convention.
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        focusSelection();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        // Selected construction line → remove just that line.
        const selIdx = selectedTempLineIdxRef.current;
        if (selIdx !== null) {
          setTempLines((prev) => prev.filter((_, i) => i !== selIdx));
          setSelectedTempLineIdx(null);
          return;
        }
        onDeleteSelected();
        return;
      }
      // Ctrl+Z — undo last construction line when line tool is active or
      // a temp line is visible, before falling through to history undo.
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        const lines = tempLinesRef.current;
        if (lines.length > 0 && (activeTool === "line" || activeTool === "select")) {
          e.preventDefault();
          setTempLines((prev) => prev.slice(0, -1));
          setSelectedTempLineIdx(null);
          toast({ title: "Construction line undone" });
          return;
        }
        // Fall through — the toolbar Undo button handles history.undo()
        // but there's no keyboard binding for it here; add one now so
        // Ctrl+Z works without clicking the toolbar.
        e.preventDefault();
        void (async () => {
          const label = await history.undo();
          if (label) toast({ title: "Undone", description: label });
        })();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        void (async () => {
          const label = await history.redo();
          if (label) toast({ title: "Redone", description: label });
        })();
        return;
      }
      // CAD-style arrow-key nudge — when a polygon is selected and no
      // draw tool is active, move it by 1 metre per key press (or 5 m
      // with Shift). Ideal for aligning buildings to street grids.
      if (
        activeTool === "select" && selection &&
        (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1; // metres
        const metersPerDegLat = 111320;
        // Use campus latitude for the lng scale — good enough.
        const anchorLat = handleRef.current?.map.getCenter().lat ?? 60;
        const metersPerDegLng = 111320 * Math.cos((anchorLat * Math.PI) / 180);
        const dLat = (e.key === "ArrowUp") ? step / metersPerDegLat
                   : (e.key === "ArrowDown") ? -step / metersPerDegLat
                   : 0;
        const dLng = (e.key === "ArrowRight") ? step / metersPerDegLng
                   : (e.key === "ArrowLeft") ? -step / metersPerDegLng
                   : 0;
        if (selection.kind === "building") {
          const b = buildings.find((x) => x.id === selection.id);
          if (b?.points) {
            const nextPoints = b.points.map((p) => ({ lat: p.lat + dLat, lng: p.lng + dLng }));
            void apiRequest("PATCH", `/api/buildings/${b.id}`, { points: nextPoints })
              .then(() => qc.invalidateQueries({ queryKey: ["/api/buildings"] }));
          }
        } else if (selection.kind === "room") {
          const r = (roomsQ.data ?? []).find((x) => x.id === selection.id);
          if (r?.points) {
            const nextPoints = r.points.map((p) => ({ lat: p.lat + dLat, lng: p.lng + dLng }));
            void apiRequest("PATCH", `/api/rooms/${r.id}`, { points: nextPoints })
              .then(() => qc.invalidateQueries({ queryKey: ["/api/rooms"] }));
          }
        }
        return;
      }
      // Ctrl+L: clear all construction lines
      if ((e.ctrlKey || e.metaKey) && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        if (tempLines.length > 0) {
          setTempLines([]);
          setSelectedTempLineIdx(null);
          toast({ title: "Construction lines cleared" });
        }
        return;
      }
      if (e.key === "v" || e.key === "V") setActiveTool("select");
      else if (e.key === "b" || e.key === "B") { setActiveTool("building"); setWaypoints([]); }
      else if (e.key === "r" || e.key === "R") { setActiveTool("room"); setWaypoints([]); }
      else if (e.key === "c" || e.key === "C") { setActiveTool("corridor"); setWaypoints([]); }
      else if (e.key === "h" || e.key === "H") { setActiveTool("hallway"); setWaypoints([]); }
      else if (e.key === "w" || e.key === "W") { setActiveTool("wall"); setWaypoints([]); }
      else if (e.key === "l" || e.key === "L") { setActiveTool("line"); setWaypoints([]); }
      else if (e.key === "m" || e.key === "M") { setActiveTool("measure"); setWaypoints([]); }
      else if (e.key === "u" || e.key === "U") { setActiveTool("rectangle"); setWaypoints([]); }
      else if (e.key === "s" || e.key === "S") { setActiveTool("poi-stairs"); setWaypoints([]); }
      else if (e.key === "e" || e.key === "E") { setActiveTool("poi-elevator"); setWaypoints([]); }
      else if (e.key === "d" || e.key === "D") { setActiveTool("poi-door"); setWaypoints([]); }
      else if (e.key === "n" || e.key === "N") { setActiveTool("poi-entrance"); setWaypoints([]); }
      else if (e.key === "i" || e.key === "I") { setActiveTool("poi-info"); setWaypoints([]); }
      else if (e.key === " ") { setActiveTool("pan"); setWaypoints([]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, waypoints, selectedId, history]);

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
    onSuccess: (created: FeatureBuilding | { id?: string } | undefined, variables) => {
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
        // Undo/redo: hold a mutable ref to the current id so the
        // create/delete pair can point at whichever generation we're on.
        history.record(
          makeCreateInverse({
            label: `New building "${variables.name}"`,
            currentId: id,
            resource: "buildings",
            payload: {
              name: variables.name,
              nameEn: variables.name,
              nameFi: variables.name,
              colorCode: "#2563eb",
              floors: 1,
              points: variables.points,
            },
            invalidate: () => qc.invalidateQueries({ queryKey: ["/api/buildings"] }),
          }),
        );
      }
    },
  });

  const createRoom = useMutation({
    mutationFn: async (payload: {
      roomNumber: string;
      buildingId: string;
      floor: number;
      points: Array<{ lng: number; lat: number }>;
      type?: string;
      colorCode?: string;
    }) => {
      const res = await apiRequest("POST", "/api/rooms", {
        roomNumber: payload.roomNumber,
        name: payload.roomNumber,
        buildingId: payload.buildingId,
        floor: payload.floor,
        colorCode: payload.colorCode ?? "#059669",
        ...(payload.type ? { type: payload.type } : {}),
        points: payload.points,
      });
      return res.json();
    },
    onSuccess: (created: Room | { id?: string } | undefined, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/rooms"] });
      setWaypoints([]);
      setActiveTool("select");
      const id = created && typeof (created as { id?: string }).id === "string"
        ? (created as { id: string }).id
        : null;
      const isCorridor = variables.type === "hallway";
      if (id) {
        setSelection({ kind: "room", id });
        setSidebarTab(isCorridor ? "pois" : "rooms");
        toast({
          title: isCorridor ? "Corridor created" : "Room created",
          description: isCorridor
            ? `"${variables.roomNumber}" added — find it in the Structure tab.`
            : `"${variables.roomNumber}" added.`,
        });
        history.record(makeCreateInverse({
          label: isCorridor ? `New corridor "${variables.roomNumber}"` : `New room "${variables.roomNumber}"`,
          currentId: id,
          resource: "rooms",
          payload: {
            roomNumber: variables.roomNumber,
            name: variables.roomNumber,
            buildingId: variables.buildingId,
            floor: variables.floor,
            colorCode: variables.colorCode ?? "#059669",
            ...(variables.type ? { type: variables.type } : {}),
            points: variables.points,
          },
          invalidate: () => qc.invalidateQueries({ queryKey: ["/api/rooms"] }),
        }));
      }
    },
  });

  const createHallway = useMutation({
    mutationFn: async (payload: { points: Array<{ lng: number; lat: number }>; surface?: string; floor?: number }) => {
      // v3.30.0 — single POST with the full polyline as `points`.
      // Server-side we still populate startX/Y + endX/Y with the
      // first + last vertex so older clients that don't understand
      // `points` still see a straight-line segment (backward compat).
      // Previously we chunked into N separate 2-point hallways,
      // which meant they showed as disconnected rows in the sidebar
      // and each could be deleted independently — bad UX.
      const first = payload.points[0];
      const last = payload.points[payload.points.length - 1];
      const res = await apiRequest("POST", "/api/hallways", {
        startX: first.lng,
        startY: first.lat,
        endX: last.lng,
        endY: last.lat,
        points: payload.points.map((p) => ({ lat: p.lat, lng: p.lng })),
        surface: payload.surface,
      });
      try { return await res.json(); } catch { return null; }
    },
    onSuccess: (created, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/hallways"] });
      setWaypoints([]);
      setActiveTool("select");
      const c = created as { id?: string } | null | undefined;
      if (c?.id) {
        setSelection({ kind: "hallway", id: c.id });
        // Inner walls live in the Structure tab; regular hallways/walls
        // navigate to pois so the user can set walkability.
        if (variables.surface !== "inner-wall") setSidebarTab("pois");
      }
    },
    onError: (err: any) => toast({
      title: "Hallway save failed",
      description: err?.message ?? "Could not create hallway — are you logged in?",
      variant: "destructive",
    }),
  });

  const saveFloorShape = useMutation({
    mutationFn: async (vars: {
      entityId: string;
      entityKind: "room" | "building";
      floor: number;
      coordinates: Array<[number, number]>;
    }) => {
      const existingEntity = vars.entityKind === "building"
        ? buildings.find((b) => b.id === vars.entityId)
        : roomsQ.data?.find((r) => r.id === vars.entityId);
      const existingMeta = (((existingEntity as { metadata?: unknown })?.metadata) ?? {}) as Record<string, unknown>;
      const existing = (Array.isArray(existingMeta.floorShapes) ? existingMeta.floorShapes as Array<{ floor: number }> : [])
        .filter((fs) => fs.floor !== vars.floor);
      const newShapes = [...existing, { floor: vars.floor, coordinates: vars.coordinates }];
      const path = vars.entityKind === "building"
        ? `/api/buildings/${vars.entityId}`
        : `/api/rooms/${vars.entityId}`;
      const res = await apiRequest("PATCH", path, { metadata: { ...existingMeta, floorShapes: newShapes } });
      return { ...(await res.json()), _vars: vars };
    },
    onSuccess: (result) => {
      const vars = (result as { _vars: { entityId: string; entityKind: "room" | "building"; floor: number } })._vars;
      qc.invalidateQueries({ queryKey: [vars.entityKind === "building" ? "/api/buildings" : "/api/rooms"] });
      setFloorShapeTarget(null);
      setWaypoints([]);
      setActiveTool("select");
      setSelection({ kind: vars.entityKind === "building" ? "building" : "room", id: vars.entityId });
      toast({ title: `Floor ${vars.floor} shape saved` });
    },
    onError: (err: any) => toast({
      title: "Floor shape save failed",
      description: err?.message,
      variant: "destructive",
    }),
  });

  const createStair = useMutation({
    mutationFn: async (p: { lat: number; lng: number }) => {
      const res = await apiRequest("POST", "/api/stairs", {
        // v3.27.0 — inherit the builder's active floor instead of
        // hardcoding to 1, so stairs land on the level the user is
        // actually drawing on.
        floor: cameraState.activeFloor ?? 1,
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
        floor: cameraState.activeFloor ?? 1,
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
        floor: cameraState.activeFloor ?? 1,
        mapPositionX: p.lng,
        mapPositionY: p.lat,
        isEntrance: p.isEntrance,
        // Explicit empty connects tuple so the validator emits the
        // gentler "unattached door" warning instead of the harsher
        // "invalid connects tuple" error. User wires it up later
        // from the PropertyPanel.
        connects: [],
      });
      try { return await res.json(); } catch { return null; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/doors"] }); },
  });

  /** Free-form POI marker — one endpoint, `kind` string discriminates.
   *  Backed by /api/pois (Firestore campus_pois). Covers info,
   *  reception, parking, bike, restroom_m/f/a. */
  const createGenericPoi = useMutation({
    mutationFn: async (p: { lat: number; lng: number; kind: string }) => {
      const res = await apiRequest("POST", "/api/pois", {
        kind: p.kind,
        position: { lat: p.lat, lng: p.lng },
        floor: cameraState.activeFloor ?? 1,
      });
      try { return await res.json(); } catch { return null; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pois"] }); },
  });

  const deleteBuilding = useMutation({
    mutationFn: async (id: string) => {
      // Snapshot BEFORE the delete so we can reinstate via undo.
      const snapshot = buildings.find((b) => b.id === id) ?? null;
      await apiRequest("DELETE", `/api/buildings/${id}`);
      return snapshot as Record<string, unknown> | null;
    },
    onSuccess: (snapshot) => {
      qc.invalidateQueries({ queryKey: ["/api/buildings"] });
      setSelectedId(null);
      if (snapshot) {
        history.record(makeDeleteInverse({
          label: `Delete building "${(snapshot as { name?: string }).name ?? ""}"`,
          snapshot,
          resource: "buildings",
          invalidate: () => qc.invalidateQueries({ queryKey: ["/api/buildings"] }),
        }));
      }
    },
  });

  // v3.26.0 — delete mutations for rooms + hallways/walls. Rooms and
  // walls previously had no delete path from the property panel — the
  // button called onDeleteSelected which only handled buildings. Now
  // any selected feature can be removed, and the query invalidation
  // makes the removal show up on the map immediately.
  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const snapshot = (roomsQ.data ?? []).find((r) => r.id === id) ?? null;
      await apiRequest("DELETE", `/api/rooms/${id}`);
      return snapshot as Record<string, unknown> | null;
    },
    onSuccess: (snapshot) => {
      qc.invalidateQueries({ queryKey: ["/api/rooms"] });
      setSelection(null);
      if (snapshot) {
        history.record(makeDeleteInverse({
          label: `Delete room "${(snapshot as { roomNumber?: string }).roomNumber ?? ""}"`,
          snapshot,
          resource: "rooms",
          invalidate: () => qc.invalidateQueries({ queryKey: ["/api/rooms"] }),
        }));
      }
    },
  });
  const deleteHallway = useMutation({
    mutationFn: async (id: string) => {
      const snapshot = (hallwaysQ.data ?? []).find((h) => h.id === id) ?? null;
      await apiRequest("DELETE", `/api/hallways/${id}`);
      return snapshot as Record<string, unknown> | null;
    },
    onSuccess: (snapshot) => {
      qc.invalidateQueries({ queryKey: ["/api/hallways"] });
      setSelection(null);
      if (snapshot) {
        const sf = (snapshot as { surface?: string }).surface;
        const label = sf === "wall" ? "wall" : sf === "inner-wall" ? "inner wall" : "hallway";
        history.record(makeDeleteInverse({
          label: `Delete ${label}`,
          snapshot,
          resource: "hallways",
          invalidate: () => qc.invalidateQueries({ queryKey: ["/api/hallways"] }),
        }));
      }
    },
  });

  // Listen for point-POI focus events from the LeftSidebar's PoiList.
  // Fly to the position, keeping bearing + pitch.
  useEffect(() => {
    if (!mapReady) return;
    const onFocus = (e: Event) => {
      const detail = (e as CustomEvent<{ lat: number; lng: number }>).detail;
      const h = handleRef.current;
      if (!h || !detail || typeof detail.lat !== "number") return;
      h.map.flyTo({
        center: [detail.lng, detail.lat],
        zoom: Math.max(h.map.getZoom(), 19),
        bearing: h.map.getBearing(),
        pitch: h.map.getPitch(),
        duration: 500,
        essential: true,
      });
    };
    window.addEventListener("ksyk:focus-point", onFocus);
    return () => window.removeEventListener("ksyk:focus-point", onFocus);
  }, [mapReady]);

  const finalize = useCallback(() => {
    // Construction line: save to temp state (session-only, not DB).
    if (activeTool === "line" && waypoints.length >= 2) {
      setTempLines((prev) => [...prev, waypoints.map((w) => ({ lng: w.lng, lat: w.lat }))]);
      setWaypoints([]);
      // Tool stays active so the user can immediately draw another line.
      toast({ title: "Construction line saved", description: "Click to draw more · Ctrl+Z to undo · Click line in Select to delete" });
      return;
    }
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
    if (activeTool === "wall-inner" && waypoints.length >= 2) {
      createHallway.mutate({
        points: waypoints.map((w) => ({ lng: w.lng, lat: w.lat })),
        surface: "inner-wall",
        floor: activeFloorRef.current ?? 1,
      });
      return;
    }
    // Rectangle: 2 diagonal corners → axis-aligned 4-corner polygon.
    // If the centroid is inside a building, creates a ROOM; otherwise
    // a BUILDING. This makes the rectangle tool usable for both.
    if (activeTool === "rectangle" && waypoints.length >= 2) {
      const [a, b] = waypoints;
      const minLng = Math.min(a.lng, b.lng);
      const maxLng = Math.max(a.lng, b.lng);
      const minLat = Math.min(a.lat, b.lat);
      const maxLat = Math.max(a.lat, b.lat);
      const rectPoints = [
        { lng: minLng, lat: minLat },
        { lng: maxLng, lat: minLat },
        { lng: maxLng, lat: maxLat },
        { lng: minLng, lat: maxLat },
      ];
      const centroid = { lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2 };
      const containing = buildings.find((bld) =>
        bld.points && bld.points.length >= 3 && pointInPolygon(centroid, bld.points),
      );
      if (containing) {
        const roomCount = (roomsQ.data ?? []).filter((r) => r.buildingId === containing.id && r.type !== "hallway").length;
        createRoom.mutate({
          roomNumber: `${containing.name}${roomCount + 1}`,
          buildingId: containing.id,
          floor: cameraState.activeFloor ?? 1,
          points: rectPoints,
        });
      } else {
        const nextLetter = String.fromCharCode(65 + buildings.length);
        createBuilding.mutate({ name: nextLetter, points: rectPoints });
      }
      return;
    }
    // Measure: emit total distance, but keep waypoints so the user can
    // keep chaining segments. Escape clears.
    if (activeTool === "measure" && waypoints.length >= 2) {
      // Handled inline by the coach — nothing to persist.
      return;
    }
    if (activeTool === "building" && waypoints.length >= 3) {
      const nextLetter = String.fromCharCode(65 + buildings.length);
      createBuilding.mutate({
        name: nextLetter,
        points: waypoints.map((w) => ({ lng: w.lng, lat: w.lat })),
      });
      return;
    }
    if ((activeTool === "room" || activeTool === "corridor") && waypoints.length >= 3) {
      let pts = waypoints.map((w) => ({ lng: w.lng, lat: w.lat }));
      // Ortho auto-close: with exactly 3 axis-aligned points, pressing
      // Enter adds the 4th corner so users get a perfect rectangle
      // without placing the last point manually.
      if (orthoEnabled && pts.length === 3) {
        const [A, B, C] = pts;
        // Universal rectangle completion: works at any bearing/rotation.
        const D = { lng: A.lng + C.lng - B.lng, lat: A.lat + C.lat - B.lat };
        pts = [A, B, C, D];
      }
      // Floor-shape mode: save polygon as a floor-specific override on an
      // existing entity instead of creating a new room.
      if (floorShapeTarget) {
        saveFloorShape.mutate({
          entityId: floorShapeTarget.entityId,
          entityKind: floorShapeTarget.entityKind,
          floor: floorShapeTarget.floor,
          coordinates: pts.map((p) => [p.lng, p.lat] as [number, number]),
        });
        return;
      }
      // Rooms MUST belong to a building.
      const centroid = {
        lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
        lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
      };
      const containing = buildings.find((b) =>
        b.points && b.points.length >= 3 && pointInPolygon(centroid, b.points),
      );
      const nearest = containing ?? buildings
        .filter((b) => b.points && b.points.length >= 3)
        .map((b) => ({ b, d: distanceMeters(centroid, polygonCenter(b.points!)) }))
        .sort((a, b) => a.d - b.d)[0]?.b;
      if (!nearest) {
        toast({
          title: "Draw a building first",
          description: "Rooms + corridors live inside buildings — no building found near this shape.",
          variant: "destructive",
        });
        return;
      }
      const roomCount = (roomsQ.data ?? []).filter((r) => r.buildingId === nearest.id).length;
      // v3.32.0 — Corridor tool creates a Room polygon with
      // type="hallway" so it renders as a filled area (like rooms
      // do) but categorized as a walkable corridor. Traces exactly
      // like the Room tool: click each corner, close by clicking
      // back near the first vertex or pressing Enter.
      const isCorridor = activeTool === "corridor";
      const roomNumber = isCorridor
        ? `${nearest.name}-C${(roomsQ.data ?? []).filter((r) => r.type === "hallway" && r.buildingId === nearest.id).length + 1}`
        : `${nearest.name}${roomCount + 1}`;
      const floor = cameraState.activeFloor ?? 1;
      createRoom.mutate({
        roomNumber,
        buildingId: nearest.id,
        floor,
        points: pts,
        ...(isCorridor ? { type: "hallway", colorCode: "#94a3b8" } : {}),
      });
      // Auto-place spine nav nodes along the corridor's long axis so the
      // routing graph runs through the entire walkable area, not just the
      // centroid. Nodes are spaced ~4 m apart (2–10 total) and connected
      // by edges so Dijkstra can route through bends.
      // v3.47.0 — nodes are placed through the polygon CENTROID (laterally
      // centered inside the corridor), NOT corner-to-corner. This keeps
      // every node away from the polygon boundary so the routing graph
      // stays in the middle of walkable space.
      if (isCorridor) {
        const mPerLat = 111320;
        const mPerLng = 111320 * Math.cos((centroid.lat * Math.PI) / 180);
        // Find long-axis direction: two farthest vertices give the spine angle.
        let fA = pts[0], fB = pts[1], maxDist = 0;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const dx = (pts[j].lng - pts[i].lng) * mPerLng;
            const dy = (pts[j].lat - pts[i].lat) * mPerLat;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > maxDist) { maxDist = d; fA = pts[i]; fB = pts[j]; }
          }
        }
        if (maxDist < 0.5) return; // degenerate corridor
        // Unit direction vector in metre space.
        const axisDx = (fB.lng - fA.lng) * mPerLng;
        const axisDy = (fB.lat - fA.lat) * mPerLat;
        const axisLen = Math.sqrt(axisDx * axisDx + axisDy * axisDy);
        const ux = axisDx / axisLen;
        const uy = axisDy / axisLen;
        // Project every vertex onto the spine axis (relative to centroid)
        // to find how far the corridor extends in each direction.
        let minT = Infinity, maxT = -Infinity;
        for (const p of pts) {
          const px = (p.lng - centroid.lng) * mPerLng;
          const py = (p.lat - centroid.lat) * mPerLat;
          const t = px * ux + py * uy;
          if (t < minT) minT = t;
          if (t > maxT) maxT = t;
        }
        const span = maxT - minT;
        // Inset 12% (min 0.5 m, max 1.5 m) so nodes stay inside the polygon.
        const inset = Math.min(1.5, Math.max(0.5, span * 0.12));
        const extMin = minT + inset;
        const extMax = maxT - inset;
        const nodeCount = Math.max(2, Math.min(10, Math.round(span / 4)));
        const spineNodes: Array<{ id: string }> = [];
        for (let k = 0; k < nodeCount; k++) {
          const s = nodeCount === 1 ? 0.5 : k / (nodeCount - 1);
          const spineT = extMin + s * (extMax - extMin);
          // Node lies on the line through the centroid parallel to the long
          // axis — NEVER at a polygon corner.
          const node = navGraph.addNode({
            lat: centroid.lat + (spineT * uy) / mPerLat,
            lng: centroid.lng + (spineT * ux) / mPerLng,
            floor,
            kind: "junction",
          });
          spineNodes.push(node);
        }
        for (let k = 0; k < spineNodes.length - 1; k++) {
          navGraph.addEdge(spineNodes[k].id, spineNodes[k + 1].id);
        }
      }
      return;
    }
  }, [activeTool, waypoints, orthoEnabled, buildings, createBuilding, createRoom, createHallway, saveFloorShape, floorShapeTarget, roomsQ.data, cameraState.activeFloor, navGraph, setTempLines]);

  // ── Snap-to-vertex ───────────────────────────────────────────────
  // On mousemove while a DRAW tool is active, scan every building /
  // room / hallway vertex + endpoint + midpoint, find the closest one
  // in SCREEN space (within SNAP_PX), and if it's a hit render a
  // crosshair indicator via a dedicated MapLibre source. Next click
  // uses the snapped coordinates. Cleared on tool change / hover-off.
  useEffect(() => {
    if (!mapReady) return;
    const h = handleRef.current;
    if (!h) return;
    const map = h.map;
    const SRC = "builder-snap-indicator";
    const LAYER = "builder-snap-indicator-circle";
    const RING = "builder-snap-indicator-ring";
    const SNAP_PX = 12;

    const isDrawTool =
      activeTool === "building" || activeTool === "room" ||
      activeTool === "corridor" ||
      activeTool === "hallway"  || activeTool === "wall" || activeTool === "wall-inner" ||
      activeTool === "rectangle" || activeTool === "measure" ||
      activeTool === "line";

    // Assemble every snap candidate for the current campus. Rebuilt
    // whenever the source data changes; a Ref keeps it stable across
    // mousemoves.
    type SnapCandidate = { lat: number; lng: number; kind: "vertex" | "endpoint" | "midpoint" | "close" };
    const candidates: SnapCandidate[] = [];
    for (const b of buildings) {
      if (!b.points) continue;
      for (const p of b.points) candidates.push({ lat: p.lat, lng: p.lng, kind: "vertex" });
    }
    for (const r of roomsQ.data ?? []) {
      if (!r.points) continue;
      for (const p of r.points) candidates.push({ lat: p.lat, lng: p.lng, kind: "vertex" });
    }
    for (const hw of hallwaysQ.data ?? []) {
      candidates.push({ lat: hw.startY, lng: hw.startX, kind: "endpoint" });
      candidates.push({ lat: hw.endY,   lng: hw.endX,   kind: "endpoint" });
      candidates.push({
        lat: (hw.startY + hw.endY) / 2,
        lng: (hw.startX + hw.endX) / 2,
        kind: "midpoint",
      });
    }

    const clearIndicator = () => {
      snapTargetRef.current = null;
      setSnapLabel(null);
      const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData({ type: "FeatureCollection", features: [] } as never);
    };

    if (!isDrawTool) { clearIndicator(); return; }

    const onMove = (e: MapMouseEvent) => {
      // Always update cursorLngLat — ghost preview needs it even when snap off.
      setCursorLngLat({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      // Snap toggle: if snap is off, clear any existing indicator and bail.
      if (!snapEnabledRef.current) { clearIndicator(); return; }
      // Convert cursor to screen pixel space for accurate distance.
      const cursorPx = e.point;
      let best: { c: SnapCandidate; d2: number } | null = null;
      for (const c of candidates) {
        const p = map.project([c.lng, c.lat]);
        const dx = p.x - cursorPx.x;
        const dy = p.y - cursorPx.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= SNAP_PX * SNAP_PX && (!best || d2 < best.d2)) best = { c, d2 };
      }
      // Close-polygon: first waypoint becomes a snap candidate when 3+ placed.
      const wps = waypointsRef.current;
      if (wps.length >= 3) {
        const fp = wps[0];
        const p = map.project([fp.lng, fp.lat]);
        const dx = p.x - cursorPx.x;
        const dy = p.y - cursorPx.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= SNAP_PX * SNAP_PX && (!best || d2 < best.d2))
          best = { c: { lat: fp.lat, lng: fp.lng, kind: "close" }, d2 };
      }
      if (!best) { clearIndicator(); return; }
      snapTargetRef.current = { lat: best.c.lat, lng: best.c.lng, kind: best.c.kind };
      const pxOnScreen = map.project([best.c.lng, best.c.lat]);
      setSnapLabel({
        x: pxOnScreen.x, y: pxOnScreen.y,
        kind: best.c.kind === "endpoint" ? "Endpoint"
            : best.c.kind === "midpoint" ? "Midpoint"
            : best.c.kind === "close"    ? "Close"
            :                              "Vertex",
      });
      // Update the on-map indicator so it rides pan/zoom until the
      // next mousemove overrides it.
      const feat = {
        type: "FeatureCollection" as const,
        features: [{
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [best.c.lng, best.c.lat] },
          properties: { kind: best.c.kind },
        }],
      };
      const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(feat as never);
      else {
        map.addSource(SRC, { type: "geojson", data: feat as never });
        map.addLayer({
          id: RING,
          source: SRC,
          type: "circle",
          paint: {
            "circle-radius": 12,
            "circle-color": "transparent",
            "circle-stroke-color": ["case", ["==", ["get", "kind"], "close"], "#22c55e", "#f97316"],
            "circle-stroke-width": 2,
            "circle-opacity": 0.9,
          },
        });
        map.addLayer({
          id: LAYER,
          source: SRC,
          type: "circle",
          paint: {
            "circle-radius": 4,
            "circle-color": ["case", ["==", ["get", "kind"], "close"], "#22c55e", "#f97316"],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
          },
        });
      }
    };
    const onLeave = () => { clearIndicator(); setCursorLngLat(null); };

    map.on("mousemove", onMove);
    map.on("mouseleave", onLeave);
    return () => {
      map.off("mousemove", onMove);
      map.off("mouseleave", onLeave);
      if (!map.style) return;
      if (map.getLayer(LAYER)) map.removeLayer(LAYER);
      if (map.getLayer(RING)) map.removeLayer(RING);
      if (map.getSource(SRC)) map.removeSource(SRC);
      clearIndicator();
    };
  }, [mapReady, activeTool, buildings, roomsQ.data, hallwaysQ.data]);

  // ── Ghost preview segment + smart guides + guide snap ────────────
  // Renders a dashed preview segment from the last waypoint to the
  // cursor, with orange guide lines when the cursor aligns with any
  // existing vertex. Also drives guide snap (guideSnapRef) so the click
  // handler places the point at exactly the snapped position.
  useEffect(() => {
    if (!mapReady) return;
    const h = handleRef.current;
    if (!h) return;
    const map = h.map;
    const SRC = "builder-ghost-preview";
    const LAYER = "builder-ghost-preview-line";

    const clear = () => {
      const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData({ type: "FeatureCollection", features: [] } as never);
      finalPosRef.current = null;
      setLiveSegmentM(null);
    };

    const isSegmentTool = activeTool === "wall" || activeTool === "wall-inner"
      || activeTool === "hallway"
      || activeTool === "building" || activeTool === "room" || activeTool === "corridor"
      || activeTool === "measure" || activeTool === "line";

    if (!isSegmentTool || waypoints.length === 0 || !cursorLngLat) {
      guideSnapRef.current = null;
      finalPosRef.current = null;
      setLiveSegmentM(null);
      clear();
      return;
    }

    const GUIDE_PX = 14;

    // ── Wall-direction guide edges ─────────────────────────────────────
    // Collect all building/room polygon edges + hallway segments as
    // screen-space [ax,ay]->[bx,by] pairs. Guides snap to the infinite
    // extension of these edges (not the segment itself), so they align to
    // the actual geometry rather than the map's screen H/V axes.
    type WallEdge = { ax: number; ay: number; bx: number; by: number };
    const wallEdges: WallEdge[] = [];
    for (const b of buildings) {
      if (!b.points || b.points.length < 2) continue;
      for (let i = 0; i < b.points.length; i++) {
        const p1 = b.points[i];
        const p2 = b.points[(i + 1) % b.points.length];
        const s1 = map.project([p1.lng, p1.lat]);
        const s2 = map.project([p2.lng, p2.lat]);
        wallEdges.push({ ax: s1.x, ay: s1.y, bx: s2.x, by: s2.y });
      }
    }
    for (const r of (roomsQ.data ?? [])) {
      if (!r.points || r.points.length < 2) continue;
      for (let i = 0; i < r.points.length; i++) {
        const p1 = r.points[i];
        const p2 = r.points[(i + 1) % r.points.length];
        const s1 = map.project([p1.lng, p1.lat]);
        const s2 = map.project([p2.lng, p2.lat]);
        wallEdges.push({ ax: s1.x, ay: s1.y, bx: s2.x, by: s2.y });
      }
    }
    for (const hw of (hallwaysQ.data ?? [])) {
      if (hw.points && hw.points.length >= 2) {
        for (let i = 0; i < hw.points.length - 1; i++) {
          const p1 = hw.points[i];
          const p2 = hw.points[i + 1];
          const s1 = map.project([p1.lng, p1.lat]);
          const s2 = map.project([p2.lng, p2.lat]);
          wallEdges.push({ ax: s1.x, ay: s1.y, bx: s2.x, by: s2.y });
        }
      } else {
        const s1 = map.project([hw.startX, hw.startY]);
        const s2 = map.project([hw.endX, hw.endY]);
        wallEdges.push({ ax: s1.x, ay: s1.y, bx: s2.x, by: s2.y });
      }
    }
    // Also add edges from already-placed waypoints in the current stroke.
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const s1 = map.project([p1.lng, p1.lat]);
      const s2 = map.project([p2.lng, p2.lat]);
      wallEdges.push({ ax: s1.x, ay: s1.y, bx: s2.x, by: s2.y });
    }

    // Base position: vertex snap (highest priority) > raw cursor.
    // Vertex snap is suppressed once ortho kicks in from the 1st waypoint.
    const snap = snapTargetRef.current;
    const useSnap = snap && !(orthoEnabled && waypoints.length >= 1);
    let endLng = useSnap ? snap.lng : cursorLngLat.lng;
    let endLat = useSnap ? snap.lat : cursorLngLat.lat;

    // Wall-direction guide snap: project cursor onto the infinite
    // extension of the closest wall edge. If within GUIDE_PX, snap the
    // endpoint to that projection. Priority: vertex snap > wall-direction
    // guide snap > raw cursor. Gate on guidesEnabled AND snapEnabled.
    if (!useSnap && guidesEnabled && snapEnabledRef.current) {
      const rawScreen = map.project([cursorLngLat.lng, cursorLngLat.lat]);
      type GuideProjCandidate = { projX: number; projY: number; dist: number; dirX: number; dirY: number };
      let bestGuide: GuideProjCandidate | null = null;
      for (const edge of wallEdges) {
        const dx = edge.bx - edge.ax;
        const dy = edge.by - edge.ay;
        const len2 = dx * dx + dy * dy;
        if (len2 < 4) continue; // degenerate / zero-length edge
        const t = ((rawScreen.x - edge.ax) * dx + (rawScreen.y - edge.ay) * dy) / len2;
        const projX = edge.ax + t * dx;
        const projY = edge.ay + t * dy;
        const dist = Math.sqrt((rawScreen.x - projX) ** 2 + (rawScreen.y - projY) ** 2);
        if (dist < GUIDE_PX && (!bestGuide || dist < bestGuide.dist)) {
          const len = Math.sqrt(len2);
          bestGuide = { projX, projY, dist, dirX: dx / len, dirY: dy / len };
        }
      }
      if (bestGuide) {
        const snapped = map.unproject([bestGuide.projX, bestGuide.projY]);
        endLng = snapped.lng;
        endLat = snapped.lat;
        guideSnapRef.current = { lng: endLng, lat: endLat };
      } else {
        guideSnapRef.current = null;
      }
    } else {
      guideSnapRef.current = null;
    }

    const last = waypoints[waypoints.length - 1];

    // Screen-space ortho — works at any map bearing/rotation.
    // Project into pixels, constrain there, unproject back.
    if (orthoEnabled && waypoints.length >= 1) {
      const lastSc = map.project([last.lng, last.lat]);
      const curSc  = map.project([endLng,   endLat  ]);
      const sdx = curSc.x - lastSc.x;
      const sdy = curSc.y - lastSc.y;
      let nx: number, ny: number;
      if (waypoints.length === 1) {
        // First edge: screen H (const y) or screen V (const x).
        [nx, ny] = Math.abs(sdx) >= Math.abs(sdy)
          ? [curSc.x, lastSc.y]
          : [lastSc.x, curSc.y];
      } else {
        // Subsequent: perpendicular to previous edge in screen space.
        const prevPrev = waypoints[waypoints.length - 2];
        const ppSc = map.project([prevPrev.lng, prevPrev.lat]);
        const edSx = lastSc.x - ppSc.x;
        const edSy = lastSc.y - ppSc.y;
        const edLen = Math.sqrt(edSx * edSx + edSy * edSy);
        if (edLen > 0.5) {
          const ex = edSx / edLen, ey = edSy / edLen;
          const tFwd  =  sdx * ex + sdy * ey;
          const tPerp = -sdx * ey + sdy * ex;
          if (Math.abs(tFwd) >= Math.abs(tPerp)) {
            nx = lastSc.x + tFwd * ex; ny = lastSc.y + tFwd * ey;
          } else {
            nx = lastSc.x + tPerp * (-ey); ny = lastSc.y + tPerp * ex;
          }
        } else {
          nx = curSc.x; ny = curSc.y;
        }
      }
      const snp = map.unproject([nx, ny]);
      endLng = snp.lng; endLat = snp.lat;
    }

    // Distance constraint: if the user has typed a length, project the
    // endpoint to be exactly that many metres from the last waypoint in
    // the current direction (applied after ortho so both work together).
    const constraintM = parseFloat(distanceInputRef.current);
    if (!isNaN(constraintM) && constraintM > 0) {
      const mPerLatC = 111320;
      const mPerLngC = 111320 * Math.cos((last.lat * Math.PI) / 180);
      const dx = (endLng - last.lng) * mPerLngC;
      const dy = (endLat - last.lat) * mPerLatC;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const scale = constraintM / dist;
        endLng = last.lng + (dx * scale) / mPerLngC;
        endLat = last.lat + (dy * scale) / mPerLatC;
      }
    }

    // Publish the final resolved position so the click handler can read
    // it directly (ortho v8 — preview and click always match).
    finalPosRef.current = { lng: endLng, lat: endLat };

    // Live segment length for the constraint panel display.
    {
      const mPL = 111320;
      const mPLng = 111320 * Math.cos((last.lat * Math.PI) / 180);
      const dx = (endLng - last.lng) * mPLng;
      const dy = (endLat - last.lat) * mPL;
      setLiveSegmentM(Math.sqrt(dx * dx + dy * dy));
    }

    // Wall-direction guide visual lines — orange dashed lines extended
    // along each wall edge whose infinite projection passes near the
    // resolved endpoint. Deduped by 5° angle bucket so parallel edges
    // don't stack multiple identical guide lines.
    const cursorScreen = map.project([endLng, endLat]);
    type GeoFeature = { type: "Feature"; geometry: { type: "LineString"; coordinates: number[][] }; properties: { guide: number } };
    const guideFeatures: GeoFeature[] = [];
    if (guidesEnabled) {
      const usedAngles = new Set<number>();
      const EXTEND_PX = 2400;
      for (const edge of wallEdges) {
        const dx = edge.bx - edge.ax;
        const dy = edge.by - edge.ay;
        const len2 = dx * dx + dy * dy;
        if (len2 < 4) continue;
        const len = Math.sqrt(len2);
        const dirX = dx / len;
        const dirY = dy / len;
        // Project the resolved endpoint onto this edge's infinite extension.
        const t = ((cursorScreen.x - edge.ax) * dx + (cursorScreen.y - edge.ay) * dy) / len2;
        const projX = edge.ax + t * dx;
        const projY = edge.ay + t * dy;
        const dist = Math.sqrt((cursorScreen.x - projX) ** 2 + (cursorScreen.y - projY) ** 2);
        if (dist >= GUIDE_PX) continue;
        // Normalize angle to 0–180° (undirected) and bucket by 5°.
        const angleDeg = ((Math.atan2(dirY, dirX) * 180) / Math.PI + 180) % 180;
        const bucket = Math.round(angleDeg / 5);
        if (usedAngles.has(bucket)) continue;
        usedAngles.add(bucket);
        const p1 = map.unproject([projX - dirX * EXTEND_PX, projY - dirY * EXTEND_PX]);
        const p2 = map.unproject([projX + dirX * EXTEND_PX, projY + dirY * EXTEND_PX]);
        guideFeatures.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[p1.lng, p1.lat], [p2.lng, p2.lat]] }, properties: { guide: 1 } });
      }
    }

    const ghostColor = activeTool === "corridor" ? "#64748b"
      : activeTool === "line" ? "#ec4899"
      : activeTool === "wall" ? "#374151"
      : activeTool === "wall-inner" ? "#64748b"
      : "#3b82f6";
    const data = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: [[last.lng, last.lat], [endLng, endLat]] },
          properties: { guide: 0 },
        },
        ...guideFeatures,
      ],
    };
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(data as never);
      // Refresh ghost color when tool changes (expression baked at addLayer).
      try { map.setPaintProperty(LAYER, "line-color", ["case", ["==", ["get", "guide"], 1], "#f97316", ghostColor]); } catch { /* not yet ready */ }
    } else {
      map.addSource(SRC, { type: "geojson", data: data as never });
      map.addLayer({
        id: LAYER,
        source: SRC,
        type: "line",
        paint: {
          "line-color": ["case", ["==", ["get", "guide"], 1], "#f97316", ghostColor],
          "line-width": ["case", ["==", ["get", "guide"], 1], 1.2, 2.5],
          "line-opacity": ["case", ["==", ["get", "guide"], 1], 0.75, 0.75],
          "line-dasharray": [4, 3],
        },
      });
    }

    return () => { clear(); };
  }, [mapReady, activeTool, waypoints, cursorLngLat, orthoEnabled, guidesEnabled, snapEnabled, distanceInput, buildings, roomsQ.data, hallwaysQ.data]);

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
    if (!selection) return;
    // v3.26.0 — route to the right mutation based on selection.kind.
    // v3.28.1 — extended to point POIs (door/stair/elevator/poi).
    switch (selection.kind) {
      case "building": {
        if (!confirm("Delete this building?")) return;
        deleteBuilding.mutate(selection.id);
        return;
      }
      case "room": {
        if (!confirm("Delete this room?")) return;
        deleteRoom.mutate(selection.id);
        return;
      }
      case "hallway": {
        const h = (hallwaysQ.data ?? []).find((x) => x.id === selection.id);
        const label = h?.surface === "wall" ? "wall"
          : h?.surface === "inner-wall" ? "inner wall"
          : "hallway";
        if (!confirm(`Delete this ${label}?`)) return;
        deleteHallway.mutate(selection.id);
        return;
      }
      case "door":
      case "stair":
      case "elevator":
      case "poi": {
        const label = selection.kind === "door" ? "door"
                    : selection.kind === "stair" ? "stairs"
                    : selection.kind === "elevator" ? "elevator"
                    : "POI";
        if (!confirm(`Delete this ${label}?`)) return;
        const resource = selection.kind === "door" ? "doors"
                       : selection.kind === "stair" ? "stairs"
                       : selection.kind === "elevator" ? "elevators"
                       : "pois";
        void apiRequest("DELETE", `/api/${resource}/${selection.id}`)
          .then(() => {
            qc.invalidateQueries({ queryKey: [`/api/${resource}`] });
            setSelection(null);
          })
          .catch(() => toast({ title: "Delete failed", variant: "destructive" }));
        return;
      }
    }
  }, [selection, deleteBuilding, deleteRoom, deleteHallway, hallwaysQ.data, qc]);

  /** Duplicate every selected building + room with a small SE offset.
   *  Figma-standard behaviour (⌘D). New polygons register with undo so
   *  the whole batch can be reverted with a single ⌘Z. */
  const duplicateSelection = useCallback(async () => {
    if (selectedBuildingIds.size === 0 && selectedRoomIds.size === 0) return;
    const OFFSET_METERS = 5;
    const anchorLat = handleRef.current?.map.getCenter().lat ?? 60;
    const dLat = OFFSET_METERS / 111320;
    const dLng = OFFSET_METERS / (111320 * Math.cos((anchorLat * Math.PI) / 180));
    let count = 0;
    for (const id of selectedBuildingIds) {
      const b = buildings.find((x) => x.id === id);
      if (!b?.points) continue;
      const nextPoints = b.points.map((p) => ({ lat: p.lat - dLat, lng: p.lng + dLng }));
      createBuilding.mutate({
        name: b.name ? `${b.name} copy` : String.fromCharCode(65 + buildings.length),
        points: nextPoints,
      });
      count++;
    }
    for (const id of selectedRoomIds) {
      const r = (roomsQ.data ?? []).find((x) => x.id === id);
      if (!r?.points) continue;
      const nextPoints = r.points.map((p) => ({ lat: p.lat - dLat, lng: p.lng + dLng }));
      createRoom.mutate({
        roomNumber: `${r.roomNumber ?? "R"}c`,
        buildingId: r.buildingId,
        floor: r.floor ?? 1,
        points: nextPoints,
      });
      count++;
    }
    if (count > 0) toast({ title: "Duplicated", description: `${count} feature${count === 1 ? "" : "s"}` });
  }, [buildings, roomsQ.data, selectedBuildingIds, selectedRoomIds, createBuilding, createRoom]);

  /** F key — fit the map to the current selection's combined bounds.
   *  Preserves bearing + pitch so the user's tilted view doesn't get
   *  slammed back to flat. Falls back gracefully when nothing is
   *  selected. */
  const focusSelection = useCallback(() => {
    const h = handleRef.current;
    if (!h) return;
    const allLats: number[] = [];
    const allLngs: number[] = [];
    for (const id of selectedBuildingIds) {
      const b = buildings.find((x) => x.id === id);
      if (b?.points) for (const p of b.points) { allLats.push(p.lat); allLngs.push(p.lng); }
    }
    for (const id of selectedRoomIds) {
      const r = (roomsQ.data ?? []).find((x) => x.id === id);
      if (r?.points) for (const p of r.points) { allLats.push(p.lat); allLngs.push(p.lng); }
    }
    if (allLats.length === 0) return;
    h.map.fitBounds(
      [[Math.min(...allLngs), Math.min(...allLats)], [Math.max(...allLngs), Math.max(...allLats)]],
      {
        padding: 120,
        duration: 600,
        bearing: h.map.getBearing(),
        pitch: h.map.getPitch(),
      },
    );
  }, [buildings, roomsQ.data, selectedBuildingIds, selectedRoomIds]);

  /** Compute the shortest path (Dijkstra) between the two nodes the
   *  user picked for the route preview. Returns an ordered array of
   *  nav-graph node ids, or null if the endpoints are disconnected.
   *  Kept in-file because our nav-graph shape is simpler than the
   *  @ksyk/routing package's — running Dijkstra here is ~20 lines. */
  const routePath = useMemo<string[] | null>(() => {
    const { startNodeId, endNodeId } = routePreview;
    if (!startNodeId || !endNodeId || startNodeId === endNodeId) return null;
    const nodes = navGraph.graph.nodes;
    const edges = navGraph.graph.edges;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    if (!byId.has(startNodeId) || !byId.has(endNodeId)) return null;
    // Adjacency — Dijkstra needs neighbours + edge weight (metres).
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const distMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(s));
    };
    const adj = new Map<string, Array<{ id: string; w: number }>>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
      const a = byId.get(e.fromNodeId), b = byId.get(e.toNodeId);
      if (!a || !b) continue;
      const w = distMeters(a, b);
      adj.get(a.id)!.push({ id: b.id, w });
      adj.get(b.id)!.push({ id: a.id, w });
    }
    // Dijkstra — small graph so plain array-scan for the min-cost
    // frontier is fine. Would swap for a heap at >1k nodes.
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    for (const n of nodes) { dist.set(n.id, Infinity); prev.set(n.id, null); }
    dist.set(startNodeId, 0);
    const unvisited = new Set(nodes.map((n) => n.id));
    while (unvisited.size > 0) {
      let uId: string | null = null;
      let uDist = Infinity;
      for (const id of unvisited) {
        const d = dist.get(id)!;
        if (d < uDist) { uDist = d; uId = id; }
      }
      if (uId === null || uDist === Infinity) break;
      if (uId === endNodeId) break;
      unvisited.delete(uId);
      for (const nb of adj.get(uId) ?? []) {
        if (!unvisited.has(nb.id)) continue;
        const alt = uDist + nb.w;
        if (alt < (dist.get(nb.id) ?? Infinity)) {
          dist.set(nb.id, alt);
          prev.set(nb.id, uId);
        }
      }
    }
    if (dist.get(endNodeId) === Infinity) return null;
    const path: string[] = [];
    let cur: string | null = endNodeId;
    while (cur) { path.unshift(cur); cur = prev.get(cur) ?? null; }
    return path.length > 1 ? path : null;
  }, [routePreview, navGraph.graph]);

  // ── Construction lines layer ─────────────────────────────────────
  // Renders temp lines drawn with the Line tool (L) as pink dashed
  // segments. Selected line (click in Select mode) renders brighter and
  // thicker. Session-only — not saved to DB.
  useEffect(() => {
    if (!mapReady) return;
    const map = handleRef.current?.map;
    if (!map) return;
    const SRC = "builder-temp-lines";
    const LAYER = "builder-temp-lines-line";
    const LAYER_SEL = "builder-temp-lines-selected";
    const fc = {
      type: "FeatureCollection" as const,
      features: tempLines.map((pts, i) => ({
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: pts.map((p) => [p.lng, p.lat]) },
        properties: { id: i, selected: i === selectedTempLineIdx },
      })),
    };
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(fc as any);
    } else {
      map.addSource(SRC, { type: "geojson", data: fc as any });
      // Base line — all construction lines.
      map.addLayer({
        id: LAYER, source: SRC, type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["case", ["boolean", ["get", "selected"], false], "#f43f5e", "#ec4899"],
          "line-width": ["case", ["boolean", ["get", "selected"], false], 2.5, 1.5],
          "line-opacity": ["case", ["boolean", ["get", "selected"], false], 1, 0.8],
          "line-dasharray": [6, 3],
        },
      });
      // Selection halo — wider translucent ring on the selected line so
      // it's obvious which one is selected even on a busy map.
      map.addLayer({
        id: LAYER_SEL, source: SRC, type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        filter: ["boolean", ["get", "selected"], false],
        paint: {
          "line-color": "#f43f5e",
          "line-width": 8,
          "line-opacity": 0.2,
        },
      }, LAYER); // insert BELOW the base line so the halo is behind it
    }
  }, [mapReady, tempLines, selectedTempLineIdx]);

  // Route preview layer sync — paints the computed path as a blue
  // line on top of the nav edges. Cleared automatically when the
  // preview endpoints are unset.
  useEffect(() => {
    if (!mapReady) return;
    const h = handleRef.current;
    if (!h) return;
    const map = h.map;
    const SRC = "builder-route-preview-src";
    const LINE = "builder-route-preview-line";
    const CASING = "builder-route-preview-casing";
    const byId = new Map(navGraph.graph.nodes.map((n) => [n.id, n]));

    if (!routePath) {
      // Clear.
      for (const id of [LINE, CASING]) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(SRC)) map.removeSource(SRC);
      return;
    }
    const coords = routePath
      .map((id) => byId.get(id))
      .filter((n): n is NonNullable<typeof n> => Boolean(n))
      .map((n) => [n.lng, n.lat]);
    if (coords.length < 2) return;
    const fc = {
      type: "FeatureCollection" as const,
      features: [{
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: coords },
        properties: {},
      }],
    };
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(fc as any);
    else {
      map.addSource(SRC, { type: "geojson", data: fc as any });
      // Fatter white casing under a slimmer blue line so the route
      // reads even over the ground shadow + AO layers.
      map.addLayer({
        id: CASING, source: SRC, type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 15, 5, 20, 12],
          "line-opacity": 0.9,
        },
      });
      map.addLayer({
        id: LINE, source: SRC, type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#2563eb",
          "line-width": ["interpolate", ["linear"], ["zoom"], 15, 2.5, 20, 7],
          "line-opacity": 0.95,
        },
      });
    }
  }, [mapReady, routePath, navGraph.graph]);

  /** Auto-connect: link every pair of nav nodes within `maxMeters` of
   *  each other on the same floor. Idempotent — addEdge silently
   *  skips duplicates. Great for bootstrapping the graph after
   *  dropping a bunch of nodes down a hallway. */
  const autoConnectNodes = useCallback((maxMeters = 8) => {
    const nodes = navGraph.graph.nodes;
    if (nodes.length < 2) {
      toast({ title: "Nothing to connect", description: "Drop at least two nav nodes first." });
      return;
    }
    let added = 0;
    // Haversine — good enough at campus scale.
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        // Same-floor only for now — inter-floor edges are the job of
        // dedicated stair/elevator nodes.
        if (a.floor !== b.floor) continue;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
        const dist = 2 * R * Math.asin(Math.sqrt(s));
        if (dist <= maxMeters) {
          if (navGraph.addEdge(a.id, b.id)) added++;
        }
      }
    }
    toast({
      title: added === 0 ? "No new edges" : `Connected ${added} pair${added === 1 ? "" : "s"}`,
      description: added === 0
        ? `No node pairs closer than ${maxMeters} m — add more nodes or raise the threshold.`
        : `Every pair within ${maxMeters} m is now linked.`,
    });
  }, [navGraph]);

  // Sync the ref so the earlier useEffect can invoke the latest
  // callback without depending on it (which would cause a TDZ error
  // — the effect is declared 1500 lines above autoConnectNodes).
  useEffect(() => { autoConnectNodesRef.current = autoConnectNodes; }, [autoConnectNodes]);

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

  // Persist construction lines to sessionStorage so they survive page
  // refreshes within the same browser session.
  useEffect(() => {
    try { sessionStorage.setItem("ksyk-builder-temp-lines", JSON.stringify(tempLines)); }
    catch { /* quota exceeded — non-fatal */ }
  }, [tempLines]);

  // A ref so the keyboard handler (closed over activeTool) can read
  // the latest tempLines without re-registering the listener.
  const tempLinesRef = useRef<Array<Array<{ lng: number; lat: number }>>>([]);
  tempLinesRef.current = tempLines;
  const selectedTempLineIdxRef = useRef<number | null>(null);
  selectedTempLineIdxRef.current = selectedTempLineIdx;

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
      // Open the drawer AND toast so the user isn't confused why the
      // click seemed to do nothing.
      setShowValidation(true);
      toast({
        title: "Fix errors before publishing",
        description: `${validation.errorCount} error${validation.errorCount === 1 ? "" : "s"} block publishing. See the validation drawer.`,
        variant: "destructive",
      });
      return;
    }
    setIsPublishing(true);
    try {
      await autosave.forceSave();
      const res = await apiRequest("POST", "/api/map-package/publish", { versionId: "current" });
      const body = await res.json().catch(() => ({} as { version?: number }));
      qc.invalidateQueries({ queryKey: ["/api/map-package/versions"] });
      qc.invalidateQueries({ queryKey: ["/api/map-package/published"] });
      toast({
        title: "Published",
        description: body.version
          ? `Version v${body.version} is now live for all users.`
          : "The current campus snapshot is now live for all users.",
      });
    } catch (e) {
      toast({
        title: "Publish failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  }, [validation.publishable, validation.errorCount, autosave, qc]);

  // ── Focus-issue callback for the validation drawer ───────────────
  const focusIssue = useCallback((kind: ValidationEntityKind, id: string) => {
    if (kind === "building" || kind === "room" || kind === "hallway") {
      setSelection({ kind, id });
      const nextTab: LeftSidebarTab = kind === "building" ? "buildings" : kind === "room" ? "rooms" : "pois";
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
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          isPublishing={isPublishing}
          hasErrors={validation.errorCount > 0}
          snapEnabled={snapEnabled}
          gridEnabled={gridEnabled}
          onBack={() => setLocation("/admin")}
          onSave={() => void autosave.forceSave()}
          onUndo={async () => {
            const label = await history.undo();
            if (label) toast({ title: "Undone", description: label });
          }}
          onRedo={async () => {
            const label = await history.redo();
            if (label) toast({ title: "Redone", description: label });
          }}
          onImport={() => setShowImportExport(true)}
          onExport={() => setShowImportExport(true)}
          // v3.26.5 — image overlay import lives in the top toolbar
          // now. Dispatch a global event; ImageOverlay listens and
          // triggers its own file-picker flow.
          onImportImage={() => {
            try { window.dispatchEvent(new CustomEvent("ksyk:builder-import-image")); }
            catch { /* older browsers — non-fatal */ }
          }}
          onToggleGrid={() => setGridEnabled((g) => !g)}
          onToggleSnap={() => setSnapEnabled((s) => !s)}
          orthoEnabled={orthoEnabled}
          onToggleOrtho={() => setOrthoEnabled((o) => !o)}
          lineToolActive={activeTool === "line"}
          onLineTool={() => { setActiveTool("line"); setWaypoints([]); }}
          guidesEnabled={guidesEnabled}
          onToggleGuides={() => setGuidesEnabled((g) => !g)}
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

        {/* Canvas + floating overlays. `builder-canvas-{tool}` class
         *  lets CSS swap the cursor to a crosshair on draw tools and a
         *  grab hand on pan — CAD-adjacent affordance. */}
        <main className={cn(
          "flex-1 min-w-0 relative",
          `builder-canvas-tool-${activeTool}`,
          activeTool !== "select" && activeTool !== "pan" && "[&_.maplibregl-canvas]:!cursor-crosshair",
          activeTool === "pan" && "[&_.maplibregl-canvas]:!cursor-grab active:[&_.maplibregl-canvas]:!cursor-grabbing",
        )}>
          <CampusMap onReady={(h) => { handleRef.current = h; setMapReady(true); }} />

          {/* MazeMap-style floor selector — top-right of the canvas.
           *  Shows the union of every building's floor range so a
           *  building spanning -1..3 and another at 4 both appear.
           *  New rooms + hallways/POIs created while a floor is
           *  selected land on THAT floor. Rooms not on the active
           *  floor render at very low opacity as ghost context. */}
          {(() => {
            const set = new Set<number>();
            for (const b of buildings) {
              const min = typeof b.floorMin === "number" ? b.floorMin : 1;
              const max = typeof b.floorMax === "number" ? b.floorMax : (b.floors ?? 1);
              const lo = Math.min(min, max);
              const hi = Math.max(min, max);
              for (let f = lo; f <= hi; f++) set.add(f);
            }
            if (set.size === 0) set.add(1);
            const floorList = [...set].sort((a, b) => b - a);
            if (floorList.length < 2) return null;
            return (
              <div className="absolute top-3 right-3 z-30 flex flex-col p-1 rounded-2xl border border-border bg-card/95 shadow-md backdrop-blur-md">
                {/* v3.25.9 — icon replaces "FL". See KSYKMapView. */}
                <div
                  className="flex items-center justify-center py-1 text-muted-foreground"
                  translate="no"
                  aria-label="Floors"
                  title="Floors"
                >
                  <LayersIcon className="h-3 w-3" strokeWidth={2.25} />
                </div>
                <div className="flex flex-col gap-0.5">
                  {floorList.map((floor) => {
                    const active = cameraState.activeFloor === floor;
                    return (
                      <button
                        key={floor}
                        type="button"
                        aria-label={`Floor ${floor}`}
                        aria-pressed={active}
                        onClick={() => setCameraState((s) => ({ ...s, activeFloor: floor }))}
                        className={cn(
                          "min-w-[36px] h-9 px-1 rounded-xl text-[13px] font-bold transition-all leading-none tabular-nums flex items-center justify-center",
                          active
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25 scale-[1.02]"
                            : "text-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
                        )}
                      >
                        {floor}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Layers toggle — v3.25.4. Sits to the left of the floor
           *  selector so admins can preview what public users see with
           *  buildings/rooms/hallways/labels + POI categories hidden.
           *  Writes to the same localStorage overrides + custom events
           *  that CampusOverlay listens for, so toggles take effect
           *  live without a page reload. */}
          <div className="absolute top-3 right-16 z-30">
            <LayersToggle />
          </div>

          {/* v3.26.4 — reference image overlay tool. Import a floor
           *  plan / architect PDF page / photo, position + rotate +
           *  fade it, then trace walls and rooms on top. Uses
           *  MapLibre image sources; overlays persist in localStorage.
           *  Gated on mapReady (a state var) so the component
           *  re-mounts with the actual map handle once the map's
           *  `load` event fires. */}
          {mapReady && <ImageOverlay map={handleRef.current?.map ?? null} />}

          {/* v3.28.0 — render doors, stairs, elevators, and generic
           *  POIs as circle chips directly on the builder map so
           *  admins can SEE what they're placing without publishing.
           *  Filtered by the currently-selected floor.
           *  v3.28.1 — POIs are also selectable + editable now via
           *  the onSelect callback → LeftSidebarSelection. */}
          {mapReady && (
            <BuilderPois
              map={handleRef.current?.map ?? null}
              activeFloor={cameraState.activeFloor ?? null}
              onSelect={(kind, id) => setSelection({ kind, id })}
            />
          )}

          {/* Snap label — floating pill next to the snap indicator so
           *  users see "Vertex" / "Endpoint" / "Midpoint" and know why
           *  their next click will jump. Positioned via absolute pixel
           *  offsets from the MapLibre projection. */}
          {snapLabel && (
            <div
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full mt-[-14px]"
              style={{ left: `${snapLabel.x}px`, top: `${snapLabel.y}px` }}
            >
              <div className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-md ring-1 ring-orange-600">
                {snapLabel.kind}
              </div>
            </div>
          )}

          {/* Selected construction line banner — Del to remove */}
          {selectedTempLineIdx !== null && activeTool === "select" && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow-md pointer-events-none">
              <PenLine className="h-3.5 w-3.5" />
              Construction line selected — Del to delete · click elsewhere to deselect
            </div>
          )}

          {/* In-flight coach — MazeMap-style pill chip that surfaces
           *  the current tool, live progress, and the cancel hint.
           *  Everything a user needs to know while drawing lives here
           *  so they never have to hunt the StatusBar. */}
          {activeTool !== "select" && activeTool !== "pan" && (() => {
            const meta = coachMetaFor(activeTool, waypoints.length, measureDistanceMeters);
            // For the line tool, append saved line count so the user knows
            // how many reference lines are on the canvas.
            if (activeTool === "line" && tempLines.length > 0) {
              (meta as typeof meta & { text: string }).text +=
                ` · ${tempLines.length} saved line${tempLines.length === 1 ? "" : "s"}`;
            }
            const ToolIcon = meta.Icon;
            return (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-card border border-border rounded-2xl shadow-lg overflow-hidden pointer-events-none flex items-stretch text-[13px] font-medium text-foreground">
                {/* Tool badge — colored strip with icon + name */}
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 text-white",
                  meta.badgeBg,
                )}>
                  <ToolIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">{meta.name}</span>
                </div>
                {/* Instruction text */}
                <div className="px-3 py-2 flex items-center gap-3">
                  <span>{meta.text}</span>
                  {waypoints.length > 0 && (
                    <kbd className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
                      Esc
                    </kbd>
                  )}
                </div>
                {cursor && (
                  <div className="px-3 py-2 border-l border-border bg-muted/40">
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                      {cursor.lat.toFixed(6)}, {cursor.lng.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* CAD constraint panel — appears while drawing so users can
           *  enter exact segment lengths and divide segments. Floats at
           *  the bottom-centre of the canvas so it doesn't block the map. */}
          {(() => {
            const isDrawTool = activeTool === "building" || activeTool === "room" ||
              activeTool === "corridor" || activeTool === "hallway" ||
              activeTool === "wall" || activeTool === "wall-inner" ||
              activeTool === "measure" || activeTool === "line";
            if (!isDrawTool || waypoints.length === 0) return null;
            const mDisplay = liveSegmentM !== null
              ? (liveSegmentM < 10 ? liveSegmentM.toFixed(2) : liveSegmentM.toFixed(1))
              : null;
            return (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/95 border border-border shadow-md backdrop-blur-md text-xs">
                {/* Length input */}
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">L</span>
                <input
                  type="number"
                  placeholder={mDisplay ?? "auto"}
                  value={distanceInput}
                  onChange={(e) => setDistanceInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setDistanceInput(""); }}
                  min={0.01}
                  step={0.1}
                  className="w-20 h-7 px-2 rounded-lg border border-border bg-background text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <span className="text-[10px] text-muted-foreground">m</span>

                {/* Divide */}
                {waypoints.length >= 2 && (
                  <>
                    <div className="h-4 w-px bg-border" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">÷</span>
                    <input
                      type="number"
                      placeholder="N"
                      value={divideInput}
                      onChange={(e) => setDivideInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const n = parseInt(divideInput, 10);
                          if (n >= 2 && waypoints.length >= 2) {
                            const a = waypoints[waypoints.length - 2];
                            const b = waypoints[waypoints.length - 1];
                            const intermediates: maplibregl.LngLat[] = [];
                            for (let i = 1; i < n; i++) {
                              const t = i / n;
                              intermediates.push(new maplibregl.LngLat(
                                a.lng + t * (b.lng - a.lng),
                                a.lat + t * (b.lat - a.lat),
                              ));
                            }
                            setWaypoints((prev) => [
                              ...prev.slice(0, prev.length - 1),
                              ...intermediates,
                              prev[prev.length - 1],
                            ]);
                            setDivideInput("");
                            toast({ title: `Divided into ${n} parts`, description: `${n - 1} intermediate points added` });
                          }
                        }
                        if (e.key === "Escape") setDivideInput("");
                      }}
                      min={2}
                      max={20}
                      className="w-12 h-7 px-2 rounded-lg border border-border bg-background text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <span className="text-[10px] text-muted-foreground">parts ↵</span>
                  </>
                )}
              </div>
            );
          })()}

          {/* Selection handles — vertex drag + rotation for the picked
           *  polygon entity. Headless (returns null), renders inside the
           *  MapLibre canvas so it stays aligned during pan/rotate.
           *  Uses memoized selectionHandlesInput so handle layers don't
           *  flash on every mousemove (stale-object-reference bug fix). */}
          {selectionHandlesInput && (
            <SelectionHandles
              map={selectionHandlesInput.map}
              selection={selectionHandlesInput.sel}
              translateEnabled={propPanelTab === "transform"}
            />
          )}

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
              if (r) entity = r.type === "hallway"
                ? { kind: "corridor" as never, data: r }
                : { kind: "room", data: r };
            } else if (selection.kind === "hallway") {
              const h = (hallwaysQ.data ?? []).find((x) => x.id === selection.id);
              if (h) entity = { kind: "hallway", data: h };
            } else if (selection.kind === "door") {
              const d = (doorsQ.data ?? []).find((x) => (x as { id: string }).id === selection.id);
              if (d) entity = { kind: "door", data: d as never };
            } else if (selection.kind === "stair") {
              const s = (stairsQ.data ?? []).find((x) => (x as { id: string }).id === selection.id);
              if (s) entity = { kind: "stair", data: s as never };
            } else if (selection.kind === "elevator") {
              const e = (elevatorsQ.data ?? []).find((x) => (x as { id: string }).id === selection.id);
              if (e) entity = { kind: "elevator", data: e as never };
            } else if (selection.kind === "poi") {
              const p = (poisQ.data ?? []).find((x) => (x as { id: string }).id === selection.id);
              if (p) entity = { kind: "poi", data: p as never };
            }
            if (!entity) return null;
            return (
              <PropertyPanel
                key={selection.id}
                entity={entity}
                onDelete={onDeleteSelected}
                onClose={() => setSelection(null)}
                onTabChange={setPropPanelTab}
                onHistoryRecord={history.record}
                activeFloor={cameraState.activeFloor}
                onAddFloorShape={(floorNum) => {
                  if (selection.kind !== "building" && selection.kind !== "room") return;
                  const entityKind = selection.kind === "building" ? "building" : "room";
                  setFloorShapeTarget({ entityId: selection.id, entityKind, floor: floorNum });
                  setActiveTool("room");
                  setWaypoints([]);
                  setSelection(null);
                  toast({ title: `Drawing floor ${floorNum} shape`, description: "Click corners then press Enter to save. Esc to cancel." });
                }}
              />
            );
          })()}

          {/* Campus minimap — pro editor signal. Bottom-left, click
           *  to jump the main map. Auto-shows "No buildings yet" hint
           *  on a fresh campus. */}
          {mapReady && (
            <Minimap map={handleRef.current?.map ?? null} buildings={buildings} />
          )}

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
      <SvgImportDialog
        open={showSvgImport}
        onClose={() => setShowSvgImport(false)}
        map={handleRef.current?.map ?? null}
        onImport={(polygons: ImportedPolygon[]) => {
          // Each parsed shape becomes a building — user can convert
          // to rooms manually via drag-select later. Buildings are
          // the safe default since we don't know the containing
          // building context at import time.
          for (const poly of polygons) {
            const name = poly.label ?? String.fromCharCode(65 + (buildings.length % 26));
            createBuilding.mutate({
              name,
              points: poly.points.map((p) => ({ lat: p.lat, lng: p.lng })),
            });
          }
          toast({
            title: `Imported ${polygons.length} shape${polygons.length === 1 ? "" : "s"}`,
            description: "Drag vertices to refine the alignment. Right-click a shape to convert to Room.",
          });
        }}
      />

      {/* Keyboard cheat sheet — MazeMap-style overlay. Toggled with '?'.
       *  Floating button in the bottom-right also opens it so
       *  keyboard-shy users can still find it. */}
      <button
        type="button"
        onClick={() => setShowShortcuts(true)}
        title="Keyboard shortcuts (?)"
        aria-label="Show keyboard shortcuts"
        className="absolute bottom-14 right-3 z-30 h-9 w-9 rounded-full border border-border bg-card shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Keyboard className="h-4 w-4" />
      </button>

      {showShortcuts && (
        <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
      )}

      {(routePreview.startNodeId || routePreview.endNodeId) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-card border border-border rounded-full shadow-lg px-3 py-1.5 flex items-center gap-3 text-[12px]">
          <span className={cn(
            "flex items-center gap-1.5 font-semibold",
            routePreview.startNodeId ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
          )}>
            <span className={cn(
              "h-2 w-2 rounded-full",
              routePreview.startNodeId ? "bg-emerald-500" : "bg-muted-foreground/40",
            )} />
            From {routePreview.startNodeId ? "✓" : "?"}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={cn(
            "flex items-center gap-1.5 font-semibold",
            routePreview.endNodeId ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
          )}>
            <span className={cn(
              "h-2 w-2 rounded-full",
              routePreview.endNodeId ? "bg-red-500" : "bg-muted-foreground/40",
            )} />
            To {routePreview.endNodeId ? "✓" : "?"}
          </span>
          {routePath && (
            <span className="text-[10px] tabular-nums text-blue-600 dark:text-blue-400 border-l border-border pl-2">
              {routePath.length} hops
            </span>
          )}
          {!routePath && routePreview.startNodeId && routePreview.endNodeId && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 border-l border-border pl-2">
              No path
            </span>
          )}
          <button
            type="button"
            onClick={() => setRoutePreview({ startNodeId: null, endNodeId: null })}
            className="text-[10px] font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted"
          >
            Clear
          </button>
        </div>
      )}

      {contextMenu && (
        <BuilderContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          onClose={() => setContextMenu(null)}
          onDelete={() => {
            const t = contextMenu.target;
            if (t.kind === "building") deleteBuilding.mutate(t.id);
            else if (t.kind === "node") navGraph.removeNode(t.id);
            setContextMenu(null);
          }}
          onDuplicate={() => {
            const t = contextMenu.target;
            if (t.kind === "building") {
              setSelection({ kind: "building", id: t.id });
              void duplicateSelection();
            } else if (t.kind === "room") {
              setSelection({ kind: "room", id: t.id });
              void duplicateSelection();
            }
            setContextMenu(null);
          }}
          onFocus={() => {
            const t = contextMenu.target;
            if (t.kind === "building" || t.kind === "room") {
              setSelection({ kind: t.kind, id: t.id });
              // Give the selection state a tick to settle before we
              // fitBounds — otherwise focusSelection reads the OLD
              // selectedIds and no-ops.
              setTimeout(focusSelection, 0);
            }
            setContextMenu(null);
          }}
          onProperties={() => {
            const t = contextMenu.target;
            if (t.kind === "building") {
              setSelection({ kind: "building", id: t.id });
              setSidebarTab("buildings");
            } else if (t.kind === "room") {
              setSelection({ kind: "room", id: t.id });
              setSidebarTab("rooms");
            }
            setContextMenu(null);
          }}
          onRouteFrom={() => {
            const t = contextMenu.target;
            if (t.kind === "node") setRoutePreview((r) => ({ ...r, startNodeId: t.id }));
            setContextMenu(null);
          }}
          onRouteTo={() => {
            const t = contextMenu.target;
            if (t.kind === "node") setRoutePreview((r) => ({ ...r, endNodeId: t.id }));
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}

/** MazeMap-style keyboard shortcuts overlay. Lists every hotkey the
 *  builder responds to, grouped by category. Dismissed via '?' again,
 *  Esc, X button, or clicking the backdrop. */
function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const groups: Array<{ title: string; rows: Array<{ keys: string[]; label: string }> }> = [
    {
      title: "Tools",
      rows: [
        { keys: ["V"], label: "Select" },
        { keys: ["Space"], label: "Pan" },
        { keys: ["B"], label: "Building polygon" },
        { keys: ["U"], label: "Rectangle building" },
        { keys: ["R"], label: "Room polygon" },
        { keys: ["H"], label: "Path (multi-vertex hallway)" },
        { keys: ["W"], label: "Wall (exterior)" },
        { keys: ["—"], label: "Inner wall (toolbar button)" },
        { keys: ["M"], label: "Measure" },
        { keys: ["L"], label: "Construction line (session-only)" },
        { keys: ["S"], label: "Stairs POI" },
        { keys: ["E"], label: "Elevator POI" },
        { keys: ["D"], label: "Door POI" },
        { keys: ["N"], label: "Entrance POI" },
        { keys: ["I"], label: "Info POI" },
      ],
    },
    {
      title: "Drawing",
      rows: [
        { keys: ["Enter"], label: "Finish current shape / save line" },
        { keys: ["Esc"], label: "Cancel current shape" },
        { keys: ["Del"], label: "Delete selected feature or line" },
        { keys: ["⌘", "+", "Z"], label: "Undo last construction line (or mutation)" },
        { keys: ["⌘", "+", "⇧", "+", "Z"], label: "Redo" },
        { keys: ["⌘", "+", "L"], label: "Clear all construction lines" },
      ],
    },
    {
      title: "Editing",
      rows: [
        { keys: ["↑", "↓", "←", "→"], label: "Nudge selection 1 m" },
        { keys: ["Shift", "+", "↑↓←→"], label: "Nudge 5 m" },
        { keys: ["Shift", "+", "drag vertex"], label: "Constrain axis-aligned" },
        { keys: ["Shift", "+", "drag rotator"], label: "Snap rotation 15°" },
        { keys: ["Drag inside polygon"], label: "Translate whole shape" },
        { keys: ["Shift", "+", "click"], label: "Add/remove from selection" },
        { keys: ["⌘", "+", "D"], label: "Duplicate selection" },
        { keys: ["F"], label: "Focus camera on selection" },
      ],
    },
    {
      title: "Panel",
      rows: [
        { keys: ["?"], label: "Toggle this overlay" },
      ],
    },
  ];
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-gradient-to-r from-blue-50/60 to-blue-100/40 dark:from-blue-500/10 dark:to-blue-500/5">
          <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Keyboard className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400">
              Cheat sheet
            </p>
            <p className="text-lg font-bold text-foreground leading-tight">Keyboard shortcuts</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Close shortcuts overlay"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <section key={g.title}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                {g.title}
              </p>
              <ul className="space-y-1.5">
                {g.rows.map((r) => (
                  <li key={r.label} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-foreground truncate">{r.label}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {r.keys.map((k, i) => (
                        k === "+" ? (
                          <span key={i} className="text-[10px] text-muted-foreground">+</span>
                        ) : (
                          <kbd key={i} className="text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded border border-border bg-muted text-foreground min-w-[24px] text-center">
                            {k}
                          </kbd>
                        )
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer className="px-4 py-2 border-t border-border bg-muted/40 text-[11px] text-muted-foreground text-center">
          Press <kbd className="font-mono font-bold px-1 py-0.5 rounded border border-border bg-card">Esc</kbd> or <kbd className="font-mono font-bold px-1 py-0.5 rounded border border-border bg-card">?</kbd> to close
        </footer>
      </div>
    </div>
  );
}

// ── Geometry helpers used by the room-creation building lookup ──────

function polygonCenter(pts: Array<{ lat: number; lng: number }>): { lat: number; lng: number } {
  let lat = 0, lng = 0;
  for (const p of pts) { lat += p.lat; lng += p.lng; }
  return { lat: lat / pts.length, lng: lng / pts.length };
}

/** Great-circle distance in metres (haversine). Local to the builder
 *  so we don't have to depend on the shared package here. */
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Build the inverse-and-then-inverse pair for an undo/redo cycle of
 *  a "create" mutation. Undo → DELETE the current id; Redo → POST the
 *  original payload and thread the fresh id through so subsequent
 *  cycles keep working after id rotation on the server.
 *
 *  Kept local to the builder because it needs `apiRequest` + the
 *  React-Query invalidator; not general enough to live in a package. */
function makeCreateInverse(opts: {
  label: string;
  currentId: string;
  resource: "buildings" | "rooms" | "hallways";
  payload: Record<string, unknown>;
  invalidate: () => void;
}): UndoAction {
  const { label, currentId, resource, payload, invalidate } = opts;
  return {
    label,
    run: async () => {
      // UNDO — delete the row we last created.
      await apiRequest("DELETE", `/api/${resource}/${currentId}`).catch(() => { /* already gone */ });
      invalidate();
      // REDO — repost, then hand back a fresh UNDO pointing at the
      // new id.
      return {
        label,
        run: async () => {
          const res = await apiRequest("POST", `/api/${resource}`, payload);
          let nextId = currentId;
          try {
            const body = await res.json();
            if (body && typeof body.id === "string") nextId = body.id;
          } catch { /* keep the old id as fallback */ }
          invalidate();
          return makeCreateInverse({ ...opts, currentId: nextId });
        },
      };
    },
  };
}

/** Build the inverse-and-then-inverse pair for a "delete" mutation.
 *  Undo → recreate the row from the saved snapshot; Redo → delete
 *  the fresh row again. */
function makeDeleteInverse(opts: {
  label: string;
  snapshot: Record<string, unknown>;
  resource: "buildings" | "rooms" | "hallways";
  invalidate: () => void;
}): UndoAction {
  const { label, snapshot, resource, invalidate } = opts;
  return {
    label,
    run: async () => {
      // UNDO — POST the pre-delete snapshot back to the server. The
      // server may assign a NEW id which we use for redo.
      const res = await apiRequest("POST", `/api/${resource}`, snapshot);
      let nextId: string | null = null;
      try {
        const body = await res.json();
        if (body && typeof body.id === "string") nextId = body.id;
      } catch { /* ignore */ }
      invalidate();
      return {
        label,
        run: async () => {
          if (nextId) {
            await apiRequest("DELETE", `/api/${resource}/${nextId}`).catch(() => { /* already gone */ });
          }
          invalidate();
          return makeDeleteInverse({ ...opts });
        },
      };
    },
  };
}

/** Coach chip metadata for a given tool — icon, badge color, name,
 *  and the instruction shown to the right. Centralises what used to
 *  be a big cascade of conditionals in the JSX. */
function coachMetaFor(
  tool: BuilderTool,
  n: number,
  measureDist: number,
): { Icon: typeof MousePointer2; name: string; text: string; badgeBg: string } {
  const distLabel = measureDist < 1000
    ? `${measureDist.toFixed(1)} m`
    : `${(measureDist / 1000).toFixed(2)} km`;
  switch (tool) {
    case "building":       return { Icon: Building2,         name: "Building",  text: `Click corners — Enter to finish (${n}/3+ needed)`, badgeBg: "bg-blue-600" };
    case "rectangle":      return { Icon: Square,            name: "Rectangle", text: `Click 2 diagonal corners (${n}/2)`,                badgeBg: "bg-blue-600" };
    case "room":           return { Icon: DoorOpen,          name: "Room",      text: `Click corners — Enter to finish (${n}/3+ needed)`, badgeBg: "bg-emerald-600" };
    case "corridor":       return { Icon: RouteIcon,         name: "Corridor",  text: `Trace corridor corners — Enter to close (${n}/3+ needed)`, badgeBg: "bg-slate-500" };
    case "hallway":        return { Icon: RouteIcon,         name: "Path",      text: `Click each corner — Enter to finish (${n} points, min 2)`, badgeBg: "bg-amber-600" };
    case "wall":           return { Icon: StretchHorizontal, name: "Wall",      text: `Click wall endpoints — Enter to finish (${n})`,          badgeBg: "bg-gray-800" };
    case "wall-inner":     return { Icon: Minus,             name: "Inner wall", text: `Click interior wall endpoints — Enter to finish (${n})`,   badgeBg: "bg-slate-500" };
    case "measure":        return {
      Icon: Ruler, name: "Measure",
      text: n < 2 ? `Click points — line total shows here (${n})` : `Distance: ${distLabel} · Esc to clear`,
      badgeBg: "bg-purple-600",
    };
    case "poi-stairs":        return { Icon: StepForward,   name: "Stairs",     text: "Click to place stairs",              badgeBg: "bg-amber-600" };
    case "poi-elevator":      return { Icon: MoveVertical,  name: "Elevator",   text: "Click to place elevator",            badgeBg: "bg-blue-600" };
    case "poi-door":          return { Icon: DoorClosed,    name: "Door",       text: "Click to place door",                badgeBg: "bg-gray-600" };
    case "poi-entrance":      return { Icon: LogIn,         name: "Entrance",   text: "Click to place entrance",            badgeBg: "bg-emerald-600" };
    case "poi-info":          return { Icon: Info,          name: "Info",       text: "Click to place info point",          badgeBg: "bg-sky-600" };
    case "poi-reception":     return { Icon: Phone,         name: "Reception",  text: "Click to place reception",           badgeBg: "bg-blue-600" };
    case "poi-parking":       return { Icon: ParkingCircle, name: "Parking",    text: "Click to place parking",             badgeBg: "bg-sky-700" };
    case "poi-bike":          return { Icon: Bike,          name: "Bike",       text: "Click to place bike parking",        badgeBg: "bg-green-600" };
    case "poi-restroom":      return { Icon: Accessibility, name: "Restroom",   text: "Click to place unisex restroom",   badgeBg: "bg-pink-600" };
    case "poi-restroom-m":    return { Icon: Accessibility, name: "Restroom M", text: "Click to place restroom (M)",        badgeBg: "bg-blue-600" };
    case "poi-restroom-f":    return { Icon: Accessibility, name: "Restroom F", text: "Click to place restroom (F)",        badgeBg: "bg-pink-600" };
    case "poi-restroom-a":    return { Icon: Accessibility, name: "Accessible", text: "Click to place accessible restroom", badgeBg: "bg-purple-600" };
    case "poi-cafe":          return { Icon: Coffee,        name: "Café",       text: "Click to place café",                badgeBg: "bg-amber-700" };
    case "poi-vending":       return { Icon: Utensils,      name: "Vending",    text: "Click to place vending machine",     badgeBg: "bg-violet-600" };
    case "poi-water":         return { Icon: Droplet,       name: "Water",      text: "Click to place water fountain",      badgeBg: "bg-cyan-600" };
    case "poi-first-aid":     return { Icon: HeartPulse,    name: "First aid",  text: "Click to place first aid",           badgeBg: "bg-red-600" };
    case "poi-defibrillator": return { Icon: Zap,           name: "AED",        text: "Click to place defibrillator (AED)", badgeBg: "bg-rose-600" };
    case "poi-printer":       return { Icon: Printer,       name: "Printer",    text: "Click to place printer",             badgeBg: "bg-gray-600" };
    case "poi-meeting":       return { Icon: Flag,          name: "Meeting",    text: "Click to place meeting point",       badgeBg: "bg-emerald-600" };
    case "line":              return { Icon: PenLine,       name: "Line",       text: n === 0 ? "Click to start · Enter to finish · Ctrl+Z to undo" : `${n} point${n === 1 ? "" : "s"} — Enter to save · click to add more`, badgeBg: "bg-pink-600" };
    case "node":              return { Icon: CircleIcon,    name: "Nav node",   text: "Click to drop a navigation node",    badgeBg: "bg-blue-600" };
    case "connect":           return { Icon: ZapIcon,       name: "Connect",    text: "Click a node, then another to link", badgeBg: "bg-blue-600" };
    default:                  return { Icon: MousePointer2, name: "Tool",       text: "Click on the map",                   badgeBg: "bg-blue-600" };
  }
}

/** Standard even-odd point-in-polygon. Operates in lat/lng space —
 *  fine at campus scale where earth curvature is negligible. */
function pointInPolygon(pt: { lat: number; lng: number }, poly: Array<{ lat: number; lng: number }>): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].lng, yi = poly[i].lat;
    const xj = poly[j].lng, yj = poly[j].lat;
    const intersect = ((yi > pt.lat) !== (yj > pt.lat)) &&
      (pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// ─── Narrow tool palette (icon column, far left) ─────────────────────────
//
// MazeMap-style layout: the core drawing tools stay inline in the
// vertical strip. All POI kinds (18 of them) live behind a single
// "POIs" button that opens a categorised popover so the strip stays
// short and scannable instead of the previous ~19-button squish.
//
// Groups (top → bottom):
//   1. Cursor      — Select, Pan
//   2. Shape       — Building, Rectangle, Room, Hallway, Wall, Measure
//   3. POIs        — single icon → popover with everything
//   4. Delete      — bottom, red

type ToolDef = { id: BuilderTool; Icon: typeof MousePointer2; label: string; hotkey: string };

const CURSOR_TOOLS: ToolDef[] = [
  { id: "select", Icon: MousePointer2, label: "Select", hotkey: "V" },
  { id: "pan",    Icon: Hand,          label: "Pan",    hotkey: "Space" },
];

const SHAPE_TOOLS: ToolDef[] = [
  { id: "building",  Icon: Building2,         label: "Building",  hotkey: "B" },
  { id: "rectangle", Icon: Square,            label: "Rectangle", hotkey: "U" },
  { id: "room",      Icon: DoorOpen,          label: "Room",      hotkey: "R" },
  { id: "corridor",  Icon: RouteIcon,         label: "Corridor",  hotkey: "C" },
  { id: "hallway",   Icon: RouteIcon,         label: "Path",      hotkey: "H" },
  { id: "wall",       Icon: StretchHorizontal, label: "Wall",       hotkey: "W" },
  { id: "wall-inner", Icon: Minus,             label: "Inner wall", hotkey: "" },
  { id: "measure",    Icon: Ruler,             label: "Measure",    hotkey: "M" },
];

/** Nav-graph tools — nodes + edges. Users route by dropping nodes on
 *  a floor, connecting them, and stairs/elevators bridge floors. Kept
 *  in its own group between shape tools and POIs so the palette
 *  visually communicates "here's where routing lives". */
const NAV_TOOLS: ToolDef[] = [
  { id: "node",    Icon: CircleIcon, label: "Nav node",    hotkey: "" },
  { id: "connect", Icon: ZapIcon,    label: "Connect",     hotkey: "" },
];

/** POI tools grouped by category — mirrors MazeMap's "POIs" flyout
 *  where each category has its own tinted header. Categories map to
 *  the same color families used in the map's chip renderer, so the
 *  builder toolbar and the rendered map read as the same system. */
const POI_GROUPS: Array<{ label: string; tint: string; tools: ToolDef[] }> = [
  {
    label: "Transit",
    tint: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    tools: [
      { id: "poi-stairs",    Icon: StepForward,   label: "Stairs",    hotkey: "S" },
      { id: "poi-elevator",  Icon: MoveVertical,  label: "Elevator",  hotkey: "E" },
      { id: "poi-door",      Icon: DoorClosed,    label: "Door",      hotkey: "D" },
      { id: "poi-entrance",  Icon: LogIn,         label: "Entrance",  hotkey: "N" },
    ],
  },
  {
    label: "Information",
    tint: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    tools: [
      { id: "poi-info",      Icon: Info,   label: "Info",      hotkey: "I" },
      { id: "poi-reception", Icon: Phone,  label: "Reception", hotkey: "" },
      { id: "poi-meeting",   Icon: Flag,   label: "Meeting",   hotkey: "" },
    ],
  },
  {
    label: "Restrooms",
    tint: "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300",
    tools: [
      { id: "poi-restroom",   Icon: Accessibility, label: "WC", hotkey: "" },
      { id: "poi-restroom-m", Icon: Accessibility, label: "M",  hotkey: "" },
      { id: "poi-restroom-f", Icon: Accessibility, label: "F",  hotkey: "" },
      { id: "poi-restroom-a", Icon: Accessibility, label: "♿", hotkey: "" },
    ],
  },
  {
    label: "Food & drink",
    tint: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    tools: [
      { id: "poi-cafe",    Icon: Coffee,   label: "Café",    hotkey: "" },
      { id: "poi-vending", Icon: Utensils, label: "Vending", hotkey: "" },
      { id: "poi-water",   Icon: Droplet,  label: "Water",   hotkey: "" },
    ],
  },
  {
    label: "Safety",
    tint: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    tools: [
      { id: "poi-first-aid",     Icon: HeartPulse, label: "First aid", hotkey: "" },
      { id: "poi-defibrillator", Icon: Zap,        label: "AED",       hotkey: "" },
    ],
  },
  {
    label: "Amenities",
    tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    tools: [
      { id: "poi-parking", Icon: ParkingCircle, label: "Parking", hotkey: "" },
      { id: "poi-bike",    Icon: Bike,          label: "Bike",    hotkey: "" },
      { id: "poi-printer", Icon: Printer,       label: "Printer", hotkey: "" },
    ],
  },
];

function ToolPalette({
  activeTool, selectionCount, onTool, onDelete,
}: {
  activeTool: BuilderTool;
  selectionCount: number;
  onTool: (t: BuilderTool) => void;
  onDelete: () => void;
}) {
  // Whether the current tool is a POI — used to visually flag the POIs
  // button as "active" even though it's a group, and to keep the
  // popover in sync with the actual selected tool for feedback.
  const isPoiActive = activeTool.startsWith("poi-");
  const [poiOpen, setPoiOpen] = useState(false);
  // When the user picks a POI, close the flyout so their next click
  // goes to the map. Feels like MazeMap where selecting a tool commits.
  const pickPoi = (t: BuilderTool) => {
    onTool(t);
    setPoiOpen(false);
  };

  return (
    <div className="w-12 shrink-0 flex flex-col items-center py-2 gap-1 bg-white/95 dark:bg-gray-900/95 border-r border-gray-200 dark:border-gray-800 backdrop-blur">
      {CURSOR_TOOLS.map((t) => (
        <PaletteButton key={t.id} tool={t} active={activeTool === t.id} onClick={() => onTool(t.id)} />
      ))}

      <Divider />

      {SHAPE_TOOLS.map((t) => (
        <PaletteButton key={t.id} tool={t} active={activeTool === t.id} onClick={() => onTool(t.id)} />
      ))}

      <Divider />

      {NAV_TOOLS.map((t) => (
        <PaletteButton key={t.id} tool={t} active={activeTool === t.id} onClick={() => onTool(t.id)} />
      ))}

      <Divider />

      {/* POIs group — single button that opens a categorised popover.
       *  Highlights when any POI tool is active so users know which
       *  bucket their current tool came from. Wired via shadcn Popover
       *  so it auto-positions to the right of the strip and closes on
       *  outside click. */}
      <Popover open={poiOpen} onOpenChange={setPoiOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="POIs — click to pick one"
            aria-label="POIs"
            aria-pressed={isPoiActive || poiOpen}
            className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center transition-colors relative",
              (isPoiActive || poiOpen)
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
            )}
          >
            <MapPin className="h-4 w-4" strokeWidth={2} />
            {/* Little chevron dot to hint "this opens a menu" */}
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-gray-900",
                (isPoiActive || poiOpen) ? "bg-white" : "bg-blue-500",
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={12}
          className="p-0 w-[300px] rounded-2xl border border-border shadow-xl overflow-hidden"
        >
          <PoiFlyout activeTool={activeTool} onPick={pickPoi} onClose={() => setPoiOpen(false)} />
        </PopoverContent>
      </Popover>

      <div className="flex-1" />

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

function PaletteButton({
  tool, active, onClick,
}: {
  tool: ToolDef;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tool.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={tool.hotkey ? `${tool.label} (${tool.hotkey})` : tool.label}
      aria-label={tool.label}
      aria-pressed={active}
      className={cn(
        "h-9 w-9 rounded-lg flex items-center justify-center transition-colors relative",
        active
          ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      {/* Hotkey ghost — visible only when hovering, MazeMap-style */}
      {tool.hotkey && (
        <span className="absolute -right-0.5 -bottom-0.5 text-[7px] font-mono font-bold text-gray-400 dark:text-gray-500 leading-none pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          {tool.hotkey}
        </span>
      )}
    </button>
  );
}

function Divider() {
  return <div className="my-1 h-px w-6 bg-gray-200 dark:bg-gray-700" />;
}

/** The categorised POI flyout — matches MazeMap's "add POI" popup. Each
 *  category has a tinted header, a grid of tools underneath. Clicking
 *  a tool commits it and closes the flyout (via `onPick`). */
function PoiFlyout({
  activeTool, onPick, onClose,
}: {
  activeTool: BuilderTool;
  onPick: (t: BuilderTool) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col max-h-[70vh]">
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-blue-50/60 dark:bg-blue-500/10">
        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-foreground leading-none">Points of interest</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Pick one, then click on the map</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Close POI picker"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {POI_GROUPS.map((group) => (
          <section key={group.label}>
            <div className={cn("inline-block text-[9px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 rounded", group.tint)}>
              {group.label}
            </div>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {group.tools.map((t) => {
                const Icon = t.Icon;
                const active = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onPick(t.id)}
                    title={t.hotkey ? `${t.label} (${t.hotkey})` : t.label}
                    aria-label={t.label}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col items-center gap-1 px-1 py-2 rounded-lg border transition-colors",
                      active
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 shadow-sm"
                        : "border-transparent text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                    <span className="text-[9.5px] font-medium leading-tight text-center truncate max-w-full">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// Old inline UI helpers (ToolGroup/ToolButton) were removed when the
// Builder migrated to the new TopToolbar/LeftSidebar/ToolPalette layout
// (M14). BuildingPropertyPanel is now in components/builder/PropertyPanel.tsx.

// ─── Right-click context menu ─────────────────────────────────────────────
//
// Floats at the cursor. Actions vary by target kind: polygon
// targets (building/room) show Delete/Duplicate/Focus/Properties;
// node targets show Delete/Route from here/Route to here; empty
// canvas gets an "About" hint that right-click needs a target.
//
// Kept as an outside-click closable panel — clicking any menu item
// runs the action, closing happens via the parent's setContextMenu.

interface BuilderContextMenuProps {
  x: number;
  y: number;
  target:
    | { kind: "building"; id: string }
    | { kind: "room"; id: string }
    | { kind: "node"; id: string }
    | { kind: "empty" };
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onFocus: () => void;
  onProperties: () => void;
  onRouteFrom: () => void;
  onRouteTo: () => void;
}

function BuilderContextMenu({
  x, y, target,
  onClose, onDelete, onDuplicate, onFocus, onProperties,
  onRouteFrom, onRouteTo,
}: BuilderContextMenuProps) {
  // Outside-click dismiss. Bound once per mount.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-builder-context-menu]")) return;
      onClose();
    };
    // Use capture so we win over other listeners.
    window.addEventListener("mousedown", onDown, { capture: true });
    return () => window.removeEventListener("mousedown", onDown, { capture: true } as EventListenerOptions);
  }, [onClose]);

  const isEmpty = target.kind === "empty";
  const isNode = target.kind === "node";
  const isPolygon = target.kind === "building" || target.kind === "room";

  // Clamp position so a right-click near the bottom-right edge
  // doesn't spawn the menu off-screen.
  const style: React.CSSProperties = {
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - 240),
  };

  return (
    <div
      data-builder-context-menu
      style={style}
      className={cn(
        "fixed z-[200] w-52 rounded-xl border border-border bg-card shadow-xl overflow-hidden",
        "text-sm text-foreground",
      )}
      role="menu"
    >
      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
        {isEmpty ? "Empty area"
          : target.kind === "node" ? "Nav node"
          : target.kind === "building" ? "Building"
          : "Room"}
      </div>
      <ul className="py-1">
        {isPolygon && (
          <>
            <ContextMenuItem label="Properties" onClick={onProperties} shortcut="Enter" />
            <ContextMenuItem label="Focus" onClick={onFocus} shortcut="F" />
            <ContextMenuItem label="Duplicate" onClick={onDuplicate} shortcut="⌘D" />
            <ContextMenuSeparator />
            <ContextMenuItem label="Delete" onClick={onDelete} shortcut="Del" danger />
          </>
        )}
        {isNode && (
          <>
            <ContextMenuItem label="Route from here" onClick={onRouteFrom} />
            <ContextMenuItem label="Route to here" onClick={onRouteTo} />
            <ContextMenuSeparator />
            <ContextMenuItem label="Delete node" onClick={onDelete} shortcut="Del" danger />
          </>
        )}
        {isEmpty && (
          <li className="px-3 py-2 text-[11.5px] text-muted-foreground">
            Right-click a building, room, or nav node to see actions.
          </li>
        )}
      </ul>
    </div>
  );
}

function ContextMenuItem({
  label, onClick, shortcut, danger,
}: {
  label: string;
  onClick: () => void;
  shortcut?: string;
  danger?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors",
          danger
            ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            : "text-foreground hover:bg-muted",
        )}
      >
        <span>{label}</span>
        {shortcut && (
          <kbd className="text-[10px] font-mono font-semibold text-muted-foreground">
            {shortcut}
          </kbd>
        )}
      </button>
    </li>
  );
}

function ContextMenuSeparator() {
  return <li className="my-1 h-px bg-border" />;
}
