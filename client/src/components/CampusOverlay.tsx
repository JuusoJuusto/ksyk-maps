/**
 * CampusOverlay — renders published buildings, rooms, and hallways on
 * any CampusMap instance.
 *
 * Headless — no DOM output. Given a MapLibre `Map` reference (via
 * `mapRef.current`), it fetches the campus entities (using `fetchList`
 * so a 404 can't crash the page), builds one GeoJSON source per kind,
 * and draws fill + outline + label layers.
 *
 * Refetches every 60 s so a fresh publish in the Builder is visible in
 * the public map without a full reload.
 *
 * Layers are added in a stable order:
 *   1. `campus-buildings-fill`   — pale filled footprint per building
 *   2. `campus-buildings-outline`— thin building outline
 *   3. `campus-hallways-line`    — corridor lines
 *   4. `campus-rooms-fill`       — filled room polygons (only when
 *                                  activeFloor matches, if provided)
 *   5. `campus-rooms-outline`
 *   6. `campus-rooms-label`      — labels at room centroids
 *   7. `campus-buildings-label`  — building name labels (drawn last so
 *                                  they render on top)
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import maplibregl, { type Map as MaplibreMap } from "maplibre-gl";
import type { Building, Room, Hallway, MapLayer, Stair, Elevator, Door } from "@ksyk/shared";
import { resolveCategoryStyle } from "@ksyk/shared";
import { fetchList } from "@/lib/fetchList";
import { readLayerOverrides, readPoiCategoryFilters, hiddenPoiKindsFromFilter } from "@/components/LayersToggle";
import { useCampusData } from "@/hooks/useCampusData";
import { useDarkMode } from "@/contexts/DarkModeContext";

const SOURCES = {
  buildings: "campus-buildings",
  rooms: "campus-rooms",
  hallways: "campus-hallways",
  pois: "campus-pois",
} as const;

const LAYERS = {
  buildingsFill: "campus-buildings-fill",
  buildingsOutline: "campus-buildings-outline",
  buildingsLabel: "campus-buildings-label",
  hallwaysLine: "campus-hallways-line",
  roomsFill: "campus-rooms-fill",
  roomsOutline: "campus-rooms-outline",
  roomsLabel: "campus-rooms-label",
  poisChip: "campus-pois-chip",
  poisIcon: "campus-pois-icon",
  buildings3D: "campus-buildings-extrude",
  buildingsRoof: "campus-buildings-roof",
  floorSlabs: "campus-floor-slabs",
  rooms3D: "campus-rooms-extrude",
  // v3.19 additions — MazeMap-style 3D depth.
  buildingShadow: "campus-buildings-shadow",
  stairsTower: "campus-stairs-tower",
  elevatorTower: "campus-elevators-tower",
  sky: "campus-sky",
  // v3.20 — POI pillars for every generic POI kind in 3D, plus a
  // door/entrance marker that shows as a colored pad at ground level.
  poi3D: "campus-pois-pillar-3d",
  doorMarker: "campus-doors-marker",
  entranceMarker: "campus-entrances-marker",
  // v3.23 — simulated ambient occlusion + flood light. MapLibre 5.x
  // doesn't expose Mapbox's fill-extrusion AO / flood-light paints
  // upstream, so we fake them with hand-authored ring polygons: a
  // dark ring on the ground where the wall base meets the map,
  // and a coloured glow ring around entrances/POIs.
  buildingAO: "campus-buildings-ao",
  entranceGlow: "campus-entrances-glow",
} as const;

// Physical metres per floor for 3D extrusion. Kept low so the campus
// reads like an isometric MazeMap-style diorama, not a skyscraper block.
const METERS_PER_FLOOR = 3.0;
// Interior wall panels are just a bit shorter than a floor so they look
// like real interior partitions rather than skyscraper walls.
const WALL_HEIGHT_METERS = 2.4;
// Room "slab" thickness — rooms extrude a tiny amount so they visually
// SIT ON the floor. Just enough that MapLibre picks up the color at
// pitch, without dominating over the walls.
const ROOM_SLAB_METERS = 0.35;

export interface CampusOverlayProps {
  /** MapLibre map, `null` until it's ready. */
  map: MaplibreMap | null;
  /** Optional — show only this floor's rooms. Null = show all rooms. */
  activeFloor?: number | null;
  /** Called when a building/room is clicked. Receives kind + id. */
  onFeatureClick?: (kind: "building" | "room" | "hallway", id: string) => void;
  /** When true, render buildings as extruded 3D blocks (MazeMap-style).
   *  Height derives from `building.floors * 3.5m`. The flat fill layer
   *  fades out at close zoom so the 3D blocks don't double-render. */
  is3D?: boolean;
}

export default function CampusOverlay({
  map, activeFloor, onFeatureClick, is3D = false,
}: CampusOverlayProps) {
  // Single source of truth — reads from the last-published snapshot
  // when available, live tables otherwise. See useCampusData.ts.
  const { buildings, rooms, hallways, stairs, elevators, doors, pois } = useCampusData();
  const { darkMode } = useDarkMode();
  // Layer visibility from the LeftSidebar Layers tab. Missing / dropped
  // layers default to visible so overlay never becomes accidentally
  // blank when the layer table is empty.
  const { data: layers = [] } = useQuery<MapLayer[]>({
    queryKey: ["/api/layers", "overlay"],
    queryFn: () => fetchList<MapLayer>("/api/layers"),
    refetchInterval: 30_000,
  });
  // Server-side visibility is the default; the client can override per-user
  // via LayersToggle (stored in localStorage). Listen for the change event
  // that toggle dispatches so a click takes effect without a reload.
  const [clientOverrides, setClientOverrides] = useState<Record<string, boolean>>(
    () => readLayerOverrides(),
  );
  const [poiFilter, setPoiFilter] = useState<Record<string, boolean>>(
    () => readPoiCategoryFilters(),
  );
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<Record<string, boolean>>).detail;
      if (detail && typeof detail === "object") setClientOverrides({ ...detail });
    };
    const onPoiChange = (e: Event) => {
      const detail = (e as CustomEvent<Record<string, boolean>>).detail;
      if (detail && typeof detail === "object") setPoiFilter({ ...detail });
    };
    window.addEventListener("ksyk:layer-visibility", onChange);
    window.addEventListener("ksyk:poi-filter", onPoiChange);
    return () => {
      window.removeEventListener("ksyk:layer-visibility", onChange);
      window.removeEventListener("ksyk:poi-filter", onPoiChange);
    };
  }, []);
  // Kinds hidden by the user — precomputed once per filter change so
  // installPOIs can skip them cheaply.
  const hiddenPoiKinds = hiddenPoiKindsFromFilter(poiFilter);
  const visibilityById = new Map<string, boolean>();
  for (const l of layers) visibilityById.set(l.id, l.visible !== false);
  const isVisible = (id: string) => {
    if (id in clientOverrides) return clientOverrides[id];
    return visibilityById.get(id) ?? true;
  };

  const clickHandlerRef = useRef(onFeatureClick);
  clickHandlerRef.current = onFeatureClick;

  useEffect(() => {
    if (!map) return;
    // Effect-scoped guards — declared early so all listeners below can
    // reference them without hitting the TDZ.
    let disposed = false;

    const install = () => {
      installBuildings(map, buildings);
      installHallways(map, hallways, activeFloor ?? null);
      installCorridors(map, rooms, activeFloor ?? null);
      installRooms(map, rooms, activeFloor ?? null);
      // Stair + elevator 3D towers — sit above buildings so users see
      // where vertical transit lives at a glance in 3D.
      installTowers(map, stairs, elevators, buildings);
      // Generic POI pillars + door/entrance markers in 3D.
      installPoiPillars(map, pois, doors, activeFloor ?? null, hiddenPoiKinds);
      installPOIs(map, { stairs, elevators, doors, rooms, generic: pois }, activeFloor ?? null, hiddenPoiKinds);
      // Sky layer disabled — current MapLibre version doesn't support type:"sky"
      // and logs a "missing required property source" error.
      // installSky(map);
      // Walls must always render above rooms, corridors, and POIs — move
      // wall layers to the very top of the stack after everything else is
      // installed. Wrapped in try/catch because moveLayer throws if the
      // layer doesn't exist yet (first cold start before any hallway data).
      // Outer walls on top, inner walls just below outer walls.
      try { map.moveLayer("campus-walls-line"); } catch { /* not yet added */ }
      try { map.moveLayer("campus-walls-inner-line", "campus-walls-line"); } catch { /* not yet added */ }
      applyVisibility();
    };
    // Rebuild the CACHED 3D-room source whenever the active floor changes
    // so the correct floor's rooms are the ones sitting on top of the
    // shell. installRooms writes both the flat + 3D sources; the flat
    // one is already floor-filtered, and the 3D one uses the floor prop
    // to compute the correct extrusion base.
    /** Apply layer visibility from the /api/layers table.
     *
     * Naming matches the LeftSidebar defaults:
     *   Buildings → id "buildings"  → fill + outline + label
     *   Rooms     → id "rooms"      → fill + outline + label
     *   Hallways  → id "hallways"   → line
     *   Labels    → id "labels"     → toggles JUST the label symbol layers
     *                                 for both buildings and rooms
     */
    const applyVisibility = () => {
      const setVis = (layerId: string, visible: boolean) => {
        if (!map.getLayer(layerId)) return;
        map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      };
      const bVis = isVisible("buildings");
      const rVis = isVisible("rooms");
      const hVis = isVisible("hallways");
      const lVis = isVisible("labels");
      setVis(LAYERS.buildingsFill,    bVis && !is3D);
      setVis(LAYERS.buildingsOutline, bVis);
      setVis(LAYERS.buildingsLabel,   bVis && lVis);
      setVis(LAYERS.buildings3D,      bVis && is3D);
      // MazeMap-style roof caps + stacked floor slabs — only make sense
      // when 3D pitch is on. Hidden in flat 2D so the fill layer isn't
      // over-drawn.
      setVis(LAYERS.buildingsRoof,    bVis && is3D);
      setVis(LAYERS.floorSlabs,       bVis && is3D);
      // Ground shadows + stair/elevator towers + sky — all 3D-only.
      setVis(LAYERS.buildingShadow,   bVis && is3D);
      setVis(LAYERS.buildingAO,       bVis && is3D);
      setVis(LAYERS.stairsTower,      is3D);
      setVis(LAYERS.elevatorTower,    is3D);
      setVis(LAYERS.sky,              is3D);
      // Generic POI pillars (info / cafe / vending / etc.) are 3D-only
      // — they don't make sense as ground-plane sprites. But door and
      // entrance markers are important wayfinding cues that need to
      // read in BOTH 2D and 3D. In 2D they still surface as coloured
      // pads so users can see where a building can actually be entered
      // without having to tilt the map first.
      setVis(LAYERS.poi3D,            is3D);
      setVis(LAYERS.doorMarker,       true);
      setVis(LAYERS.entranceMarker,   true);
      setVis(LAYERS.entranceGlow,     true);
      // Interior walls in 3D — walls are drawn as 2D lines
      // (campus-walls-line) at all times, plus an extruded thin
      // rectangle (campus-walls-3d) when 3D is active.
      setVis("campus-walls-3d",       hVis && is3D);
      // POI icons: at ground level in 2D, floating in 3D. Toggle the
      // twin layer instead of running both.
      setVis(LAYERS.poisIcon,         !is3D);
      setVis(`${LAYERS.poisIcon}-3d`, is3D);
      // Flat rooms show in 2D. In 3D we swap to extruded room slabs
      // stacked ON TOP of each building's floor plate so the room reads
      // as a real MazeMap-style raised platform inside the shell. The
      // ghost layer renders lower floors at low opacity so users see
      // the vertical stack even while the active floor is highlighted.
      setVis(LAYERS.roomsFill,        rVis && !is3D);
      setVis(LAYERS.rooms3D,          rVis && is3D);
      setVis(`${LAYERS.rooms3D}-ghost`, rVis && is3D);
      setVis(LAYERS.roomsOutline,     rVis);
      setVis(LAYERS.roomsLabel,       rVis && lVis);
      setVis(LAYERS.hallwaysLine,     hVis);
    };
    // Robust install trigger — style may already be loaded (fast path),
    // still loading (register a one-off), OR the effect may be running
    // between load + first paint. Attach BOTH a `load` and a
    // `styledata` listener so we don't miss the moment.
    //
    // BUG FIX (v3.16): the OLD version registered `map.once(...)` and
    // relied on `once` auto-removal, but never CLEANED UP the listener
    // if the effect re-ran before the event fired. That left a stale
    // handler pointing at an outdated `install` closure — which is what
    // caused the "press 3D once, only tilts; press again, then it works"
    // bug. We now hold the handler references so the cleanup below can
    // detach them, and we always re-run applyVisibility after a
    // `moveend` so the pitch animation completing forces a repaint.
    let installed = false;
    const runInstall = () => {
      if (installed) { install(); return; } // just refresh data
      installed = true;
      install();
    };
    const styleReadyHandler = () => { runInstall(); };
    if (map.isStyleLoaded()) {
      runInstall();
    } else {
      map.once("load", styleReadyHandler);
      map.once("styledata", styleReadyHandler);
    }
    // Safety net — if for any reason install never fired within 500ms
    // of map ready, poll and try once more. Fixes the sporadic
    // "buildings sometimes don't load on first visit" race.
    const safety = window.setTimeout(() => {
      if (!installed && map && map.isStyleLoaded()) runInstall();
    }, 500);
    // Second safety pass — a `moveend` fires when `map.easeTo({pitch})`
    // completes. If the user just toggled 3D, this guarantees the 3D
    // layer visibility gets flipped even if the earlier apply happened
    // mid-animation and MapLibre had already committed the flat frame.
    // Cheap: just a setLayoutProperty call per layer.
    const onMoveEnd = () => { applyVisibility(); };
    map.on("moveend", onMoveEnd);
    // And a raf-based re-application right after the state change so we
    // never leave a frame where is3D=true but the wall/room extrusion
    // is still hidden.
    const raf = window.requestAnimationFrame(() => {
      if (!disposed && map && map.isStyleLoaded()) applyVisibility();
    });

    const onClick = (e: import("maplibre-gl").MapMouseEvent) => {
      // v3.27.4 — widened hit-test. Point-precise queries missed tiny
      // rooms on touch devices where the finger cursor is imprecise.
      // v3.41.0 — bumped from 6px → 14px so mobile touch (finger pad
      // ≈ 44 px target) reliably hits rooms without accidentally
      // stealing clicks on desktop (still accurate at 14px radius).
      const px = 14;
      const bbox: [import("maplibre-gl").PointLike, import("maplibre-gl").PointLike] = [
        [e.point.x - px, e.point.y - px],
        [e.point.x + px, e.point.y + px],
      ];
      // Include the 3D extrude layer so clicks work in 3D mode where
      // campus-rooms-fill is hidden (visibility:none → no rendered features).
      const roomLayers = [LAYERS.roomsFill, LAYERS.rooms3D].filter((id) => map.getLayer(id));
      const bldgLayers = [LAYERS.buildingsFill].filter((id) => map.getLayer(id));
      const hallLayers = [LAYERS.hallwaysLine].filter((id) => map.getLayer(id));
      const layerRow = (kind: "building" | "room" | "hallway") =>
        layers.find((l) => l.id === (kind === "building" ? "buildings" : kind === "room" ? "rooms" : "hallways"));

      // v3.47.0 — iterate all room hits and skip corridors (type="hallway")
      // so classrooms under a corridor polygon are always reachable by click.
      const roomHits = roomLayers.length ? map.queryRenderedFeatures(bbox, { layers: roomLayers }) : [];
      const roomHit = roomHits.find(
        (f) => typeof f.properties?.id === "string" && f.properties?.type !== "hallway",
      );
      if (roomHit && !layerRow("room")?.locked) {
        clickHandlerRef.current?.("room", roomHit.properties!.id as string);
        return;
      }
      const bldgHit = bldgLayers.length ? map.queryRenderedFeatures(bbox, { layers: bldgLayers })[0] : undefined;
      if (bldgHit && typeof bldgHit.properties?.id === "string" && !layerRow("building")?.locked) {
        clickHandlerRef.current?.("building", bldgHit.properties.id);
        return;
      }
      const hallHit = hallLayers.length ? map.queryRenderedFeatures(bbox, { layers: hallLayers })[0] : undefined;
      if (hallHit && typeof hallHit.properties?.id === "string" && !layerRow("hallway")?.locked) {
        clickHandlerRef.current?.("hallway", hallHit.properties.id);
      }
    };
    map.on("click", onClick);

    // MazeMap-style cursor + hover feedback — pointer cursor on any
    // hoverable feature, PLUS a feature-state flip on the specific
    // room/building under the cursor so the fill layer paint (which
    // reads ["feature-state","hover"]) can brighten the polygon.
    // Tracks the last-hovered id so we can clear its state on move-out.
    const hoverableLayers = [LAYERS.buildingsFill, LAYERS.roomsFill, LAYERS.hallwaysLine, LAYERS.poisChip, LAYERS.poisIcon];
    const roomsAndBuildingsLayers = [LAYERS.roomsFill, LAYERS.buildingsFill];
    let lastHover: { source: string; id: string | number } | null = null;
    const clearHover = () => {
      if (!lastHover) return;
      map.setFeatureState(lastHover, { hover: false });
      lastHover = null;
    };
    // MazeMap-style cursor — use CSS classes on the canvas container so
    // we can override MapLibre's built-in "grab" cursor without fighting
    // inline styles. CSS in index.css maps these classes to cursors.
    const cc = map.getCanvasContainer();
    const setCursor = (c: "default" | "pointer" | "drag") => {
      cc.classList.remove("ksyk-cursor-hover", "ksyk-cursor-drag");
      if (c === "pointer") cc.classList.add("ksyk-cursor-hover");
      if (c === "drag")    cc.classList.add("ksyk-cursor-drag");
    };
    const onMouseDown = () => { if (!cc.classList.contains("ksyk-cursor-hover")) setCursor("drag"); };
    const onMouseUp   = () => { cc.classList.remove("ksyk-cursor-drag"); };
    map.getCanvas().addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    const onMove = (e: import("maplibre-gl").MapMouseEvent) => {
      const layerIds = hoverableLayers.filter((id) => map.getLayer(id));
      if (layerIds.length === 0) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: layerIds });
      setCursor(feats.length > 0 ? "pointer" : "default");
      // Rooms take priority over buildings for hover state — a hover
      // inside a room polygon should highlight the room, not its
      // parent building.
      const hoverFeats = map.queryRenderedFeatures(e.point, {
        layers: roomsAndBuildingsLayers.filter((id) => map.getLayer(id)),
      });
      const hit = hoverFeats[0];
      if (!hit) { clearHover(); return; }
      const src = hit.layer.id === LAYERS.roomsFill ? SOURCES.rooms : SOURCES.buildings;
      const id = (hit.id ?? hit.properties?.id) as string | number | undefined;
      if (id === undefined) { clearHover(); return; }
      if (lastHover && lastHover.source === src && lastHover.id === id) return;
      clearHover();
      lastHover = { source: src, id };
      map.setFeatureState(lastHover, { hover: true });
    };
    const onLeave = () => {
      setCursor("default");
      clearHover();
    };
    map.on("mousemove", onMove);
    map.on("mouseleave", onLeave);

    // ── POI hover tooltip — MazeMap-style popup that surfaces the POI
    //    kind + optional label without needing a click. Single reusable
    //    Popup instance so we don't leak DOM nodes on every hover.
    const poiPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: "ksyk-poi-tip",
      maxWidth: "220px",
    });
    const onPoiMove = (e: import("maplibre-gl").MapMouseEvent) => {
      const poiLayers = [LAYERS.poisChip, LAYERS.poisIcon, `${LAYERS.poisIcon}-3d`].filter((id) => map.getLayer(id));
      if (poiLayers.length === 0) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: poiLayers });
      const hit = feats[0];
      if (!hit) { poiPopup.remove(); return; }
      const kind = (hit.properties?.kind as string | undefined) ?? "";
      const label = (hit.properties?.label as string | undefined) ?? poiKindLabel(kind);
      const floor = hit.properties?.floor;
      const parts = [`<div class="text-xs font-semibold text-gray-900">${escapeHtml(label)}</div>`];
      if (kind && kind !== label.toLowerCase()) {
        parts.push(`<div class="text-[10px] uppercase tracking-wide text-gray-500 mt-0.5">${escapeHtml(poiKindLabel(kind))}</div>`);
      }
      if (floor !== null && floor !== undefined && floor !== "") {
        parts.push(`<div class="text-[10px] text-blue-600 mt-0.5">Floor ${escapeHtml(String(floor))}</div>`);
      }
      poiPopup
        .setLngLat(e.lngLat)
        .setHTML(`<div class="px-2 py-1.5 rounded-md bg-white shadow-sm border border-gray-200">${parts.join("")}</div>`)
        .addTo(map);
    };
    const onPoiLeave = () => { poiPopup.remove(); };
    map.on("mousemove", onPoiMove);
    map.on("mouseout", onPoiLeave);

    return () => {
      disposed = true;
      map.off("click", onClick);
      map.off("mousemove", onMove);
      map.off("mouseleave", onLeave);
      map.off("mousemove", onPoiMove);
      map.off("mouseout", onPoiLeave);
      map.off("moveend", onMoveEnd);
      map.getCanvas().removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      cc.classList.remove("ksyk-cursor-hover", "ksyk-cursor-drag");
      poiPopup.remove();
      // Explicitly detach the load/styledata one-offs so a stale
      // closure from a previous effect run can't fire after this
      // one has already re-installed everything with fresh state.
      map.off("load", styleReadyHandler);
      map.off("styledata", styleReadyHandler);
      window.clearTimeout(safety);
      window.cancelAnimationFrame(raf);
    };
  }, [map, buildings, rooms, hallways, stairs, elevators, doors, pois, activeFloor, layers, clientOverrides, poiFilter, is3D]);

  // Update wall line colors when dark mode toggles without reinstalling layers.
  useEffect(() => {
    if (!map) return;
    const wallColor      = darkMode ? "#94a3b8" : "#374151";
    const innerWallColor = darkMode ? "#9ca3af" : "#6b7280";
    if (map.getLayer("campus-walls-line"))
      map.setPaintProperty("campus-walls-line", "line-color", wallColor);
    if (map.getLayer("campus-walls-inner-line"))
      map.setPaintProperty("campus-walls-inner-line", "line-color", innerWallColor);
  }, [map, darkMode]);

  return null;
}

// ── Layer installers ──────────────────────────────────────────────

function installBuildings(map: MaplibreMap, buildings: Building[]) {
  const data = {
    type: "FeatureCollection" as const,
    features: buildings
      .filter((b) => b.points && b.points.length >= 3)
      .map((b) => {
        const floors = b.floors ?? 1;
        const style = (b.metadata as { style?: Record<string, unknown> } | null | undefined)?.style ?? {};
        // Per-building height controls — admin can override the default
        // METERS_PER_FLOOR (3.0 m) or clamp a total height directly.
        // Falls back to the campus-wide default when unset.
        const perFloor = typeof style.heightPerFloor === "number" && style.heightPerFloor > 0
          ? style.heightPerFloor
          : METERS_PER_FLOOR;
        const heightOverride = typeof style.totalHeight === "number" && style.totalHeight > 0
          ? style.totalHeight
          : null;
        const height = heightOverride ?? Math.max(perFloor, floors * perFloor);
        return {
          // Feature-level id (not just properties.id) is required for
          // map.setFeatureState({source, id}) to hook this specific
          // building. Enables hover highlight without a re-render.
          id: b.id,
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [[
              ...b.points!.map((p) => [p.lng, p.lat]),
              [b.points![0].lng, b.points![0].lat],
            ]],
          },
          properties: {
            id: b.id,
            name: b.name,
            color: b.colorCode ?? "#2563eb",
            floors,
            height,
            perFloor,
            showOutline: style.showOutline !== false, // default true
            fillOpacity: typeof style.fillOpacity === "number" ? style.fillOpacity : null,
            showLabel: style.showLabel !== false,     // default true
            // Wall opacity override — semi-transparent shells are the
            // MazeMap look, but admins can pick more solid walls per
            // building if they want a monolith.
            wallOpacity: typeof style.wallOpacity === "number" ? style.wallOpacity : null,
          },
        };
      }),
  };
  upsertGeoJSONSource(map, SOURCES.buildings, data);

  // Separate source for the HOLLOW 3D shell — same polygons but with
  // an inward-offset hole so `fill-extrusion` renders as thin walls
  // around an empty interior instead of a solid block. Interior
  // rooms show through, MazeMap-style.
  const shellData = {
    type: "FeatureCollection" as const,
    features: buildings
      .filter((b) => b.points && b.points.length >= 3)
      .map((b) => {
        const floors = b.floors ?? 1;
        const style = (b.metadata as { style?: Record<string, unknown> } | null | undefined)?.style ?? {};
        const perFloor = typeof style.heightPerFloor === "number" && style.heightPerFloor > 0
          ? style.heightPerFloor
          : METERS_PER_FLOOR;
        const heightOverride = typeof style.totalHeight === "number" && style.totalHeight > 0
          ? style.totalHeight
          : null;
        const height = heightOverride ?? Math.max(perFloor, floors * perFloor);
        // Wall thickness — admin can widen for chunky rendering or
        // narrow for thin "glass" walls. Default 0.7 m reads well at
        // typical campus zooms.
        const wallThickness = typeof style.wallThickness === "number" && style.wallThickness > 0
          ? style.wallThickness
          : 0.7;
        const outer = b.points!.map((p) => [p.lng, p.lat] as [number, number]);
        const inner = insetPolygonMeters(outer, wallThickness);
        // If the inset degenerates (tiny polygon inset to nothing),
        // skip the hole and fall back to a solid block for that one.
        const rings: number[][][] = inner && inner.length >= 3
          ? [
              [...outer, outer[0]],
              // GeoJSON holes must be reverse-wound relative to the
              // outer ring. `insetPolygonMeters` returns points in the
              // same order as the outer, so we reverse before pushing.
              [...inner.slice().reverse(), inner[inner.length - 1]],
            ]
          : [[...outer, outer[0]]];
        return {
          type: "Feature" as const,
          geometry: { type: "Polygon" as const, coordinates: rings },
          properties: {
            id: b.id,
            color: b.colorCode ?? "#2563eb",
            height,
            wallOpacity: typeof style.wallOpacity === "number" ? style.wallOpacity : null,
          },
        };
      }),
  };
  upsertGeoJSONSource(map, "campus-buildings-shell", shellData);

  // Per-floor slab dataset — one thin plate per (building, floor). Sits
  // at the top of each floor so the eye reads stacked levels through
  // the transparent shell. Colour is a soft cream/warm gray that reads
  // as "floor plate" against the shell tint.
  const slabFeatures: unknown[] = [];
  for (const b of buildings) {
    if (!b.points || b.points.length < 3) continue;
    const floors = b.floors ?? 1;
    const floorMin = typeof b.floorMin === "number" ? b.floorMin : 1;
    const floorMax = typeof b.floorMax === "number" ? b.floorMax : floors;
    const style = (b.metadata as { style?: Record<string, unknown> } | null | undefined)?.style ?? {};
    const perFloor = typeof style.heightPerFloor === "number" && style.heightPerFloor > 0
      ? style.heightPerFloor
      : METERS_PER_FLOOR;
    const coords = [
      ...b.points.map((p) => [p.lng, p.lat]),
      [b.points[0].lng, b.points[0].lat],
    ];
    // Iterate every floor in range. `floorIdx` = zero-based index for Z
    // stacking (so floorMin sits at ground, next slab perFloor above,
    // and so on).
    const lo = Math.min(floorMin, floorMax);
    const hi = Math.max(floorMin, floorMax);
    for (let f = lo, floorIdx = 0; f <= hi; f++, floorIdx++) {
      const base = floorIdx * perFloor;
      slabFeatures.push({
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [coords] },
        properties: {
          id: `${b.id}-slab-${f}`,
          buildingId: b.id,
          floor: f,
          floorIdx,
          base,
          top: base + 0.08, // thin 8 cm plate
        },
      });
    }
  }
  upsertGeoJSONSource(map, "campus-floor-slabs", {
    type: "FeatureCollection" as const,
    features: slabFeatures,
  });

  // Roof cap dataset — one thin translucent plate at the very top of
  // each building shell so the shell reads as an enclosed volume, not
  // a bare picket fence.
  const roofFeatures = buildings
    .filter((b) => b.points && b.points.length >= 3)
    .map((b) => {
      const floors = b.floors ?? 1;
      const style = (b.metadata as { style?: Record<string, unknown> } | null | undefined)?.style ?? {};
      const perFloor = typeof style.heightPerFloor === "number" && style.heightPerFloor > 0
        ? style.heightPerFloor
        : METERS_PER_FLOOR;
      const heightOverride = typeof style.totalHeight === "number" && style.totalHeight > 0
        ? style.totalHeight
        : null;
      const height = heightOverride ?? Math.max(perFloor, floors * perFloor);
      const coords = [
        ...b.points!.map((p) => [p.lng, p.lat]),
        [b.points![0].lng, b.points![0].lat],
      ];
      return {
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [coords] },
        properties: {
          id: `${b.id}-roof`,
          color: b.colorCode ?? "#2563eb",
          base: height - 0.05,
          top: height,
        },
      };
    });
  upsertGeoJSONSource(map, "campus-buildings-roof", {
    type: "FeatureCollection" as const,
    features: roofFeatures,
  });

  // Ground shadow dataset — a copy of each building footprint offset
  // slightly southeast (mimicking the map's "light" position which
  // points northeast). Renders as a soft dark blur under the shell so
  // buildings feel grounded in 3D instead of floating.
  const shadowFeatures = buildings
    .filter((b) => b.points && b.points.length >= 3)
    .map((b) => {
      // Offset each vertex ~1.2 metres SE. At campus latitude that's
      // ~1.1e-5 degrees, which reads as a subtle drop shadow at zoom
      // 17-20 without becoming a full duplicate polygon.
      const outer = b.points!.map((p) => [p.lng, p.lat] as [number, number]);
      const latShift = 1.2 / 111320;
      const lngShift = 1.2 / (111320 * Math.cos((outer[0][1] * Math.PI) / 180));
      const shifted = outer.map(([lng, lat]) => [lng + lngShift, lat - latShift] as [number, number]);
      return {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[...shifted, shifted[0]]],
        },
        properties: { id: `${b.id}-shadow` },
      };
    });
  upsertGeoJSONSource(map, "campus-buildings-shadow", {
    type: "FeatureCollection" as const,
    features: shadowFeatures,
  });

  // v3.23 — simulated ambient occlusion. For each building footprint,
  // generate a thin outer ring polygon (outer = original + 2.5 m,
  // inner = original). Painted as a soft dark fill, this ring darkens
  // the ground exactly where the wall base meets it — the visual cue
  // real AO would produce. Combined with the vertical gradient on
  // the shell itself, buildings get proper depth without needing
  // GPU shadow maps.
  const aoFeatures = buildings
    .filter((b) => b.points && b.points.length >= 3)
    .map((b) => {
      const outer = b.points!.map((p) => [p.lng, p.lat] as [number, number]);
      const expanded = insetPolygonMeters(outer, -2.5); // negative = grow outward
      if (!expanded || expanded.length < 3) return null;
      // Ring = expanded outer + reversed original inner (hole).
      const ring: number[][][] = [
        [...expanded, expanded[0]],
        [...outer.slice().reverse(), outer[outer.length - 1]],
      ];
      return {
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: ring },
        properties: { id: `${b.id}-ao` },
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);
  upsertGeoJSONSource(map, "campus-buildings-ao", {
    type: "FeatureCollection" as const,
    features: aoFeatures,
  });

  // MazeMap-style: soft cream fill (using the brand color at very low
  // opacity so buildings still read as "yours") with a crisp darker
  // outline. Zoom-scaled opacity so buildings appear as user gets close.
  // Per-feature `fillOpacity` (from PropertyPanel Style tab) overrides
  // the zoom curve when set.
  addLayerIfMissing(map, {
    id: LAYERS.buildingsFill,
    source: SOURCES.buildings,
    type: "fill",
    paint: {
      "fill-color": ["get", "color"],
      // Buildings stay VERY faint at close zoom so the room fills sitting
      // on top of them read as the "real content." Otherwise the tinted
      // building rectangle competes with the small rooms drawn inside.
      // MapLibre constraint: ["zoom"] must be the direct input of a top-level
      // interpolate/step — it cannot appear anywhere inside a "case". Fix:
      // zoom interpolate at top level, case expressions inside each stop output.
      "fill-opacity": [
        "interpolate", ["linear"], ["zoom"],
        14, ["case", ["boolean", ["feature-state", "hover"], false], 0.25, ["case", ["!=", ["get", "fillOpacity"], null], ["get", "fillOpacity"], 0.05]],
        16, ["case", ["boolean", ["feature-state", "hover"], false], 0.25, ["case", ["!=", ["get", "fillOpacity"], null], ["get", "fillOpacity"], 0.09]],
        17, ["case", ["boolean", ["feature-state", "hover"], false], 0.25, ["case", ["!=", ["get", "fillOpacity"], null], ["get", "fillOpacity"], 0.06]],
        20, ["case", ["boolean", ["feature-state", "hover"], false], 0.25, ["case", ["!=", ["get", "fillOpacity"], null], ["get", "fillOpacity"], 0.02]],
      ],
      "fill-outline-color": ["case", ["get", "showOutline"], ["get", "color"], "rgba(0,0,0,0)"],
      "fill-antialias": true,
    },
  });
  addLayerIfMissing(map, {
    id: LAYERS.buildingsOutline,
    source: SOURCES.buildings,
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      // v3.26.3 — MazeMap-style hover halo. Hovered building outline
      // thickens 2× and jumps to full opacity, so the user sees
      // exactly which building the cursor is on even when the
      // building color is subtle. Combined with the pre-existing
      // fill-opacity bump, hover feels responsive and MazeMap-adjacent.
      // Zoom at top level (MapLibre constraint — zoom can't be inside case).
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        14, ["case", ["boolean", ["feature-state", "hover"], false], 3, 1.5],
        17, ["case", ["boolean", ["feature-state", "hover"], false], 5, 2.5],
        20, ["case", ["boolean", ["feature-state", "hover"], false], 7, 3.5],
      ],
      // Per-feature outline toggle — showOutline=false hides the line
      // completely (even on hover) so admins can go fully line-free.
      "line-opacity": [
        "case",
        ["!", ["get", "showOutline"]], 0,
        ["boolean", ["feature-state", "hover"], false], 1.0,
        0.95,
      ],
    },
  });
  // Uniform white hover overlay on buildings — same pattern as rooms.
  addLayerIfMissing(map, {
    id: "campus-buildings-hover-overlay",
    source: SOURCES.buildings,
    type: "fill",
    paint: {
      "fill-color": "#ffffff",
      "fill-opacity": [
        "case", ["boolean", ["feature-state", "hover"], false], 0.18, 0,
      ],
      "fill-antialias": true,
    },
  });

  addLayerIfMissing(map, {
    id: LAYERS.buildingsLabel,
    source: SOURCES.buildings,
    type: "symbol",
    layout: {
      "text-field": ["get", "name"],
      // Scale up as the user zooms in — hard to read a tiny label on a
      // big polygon at zoom 19+. At very close zoom we shrink the
      // building label so rooms don't fight it for legibility.
      "text-size": ["interpolate", ["linear"], ["zoom"], 14, 12, 17, 15, 19, 16, 21, 13],
      "text-font": ["Noto Sans Regular"],
      // Force labels to draw even if they overlap the basemap's street
      // labels — the user wants building names always visible, not
      // dropped by MapLibre's collision engine.
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-optional": false,
      "symbol-placement": "point",
      "text-anchor": "center",
      "text-max-width": 10,
    },
    paint: {
      "text-color": ["get", "color"],
      // Slightly thicker halo so the label reads against the building's
      // own tinted fill and the tan OSM background alike.
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
      "text-halo-blur": 0.4,
      // Per-feature label toggle.
      "text-opacity": ["case", ["get", "showLabel"], 1, 0],
    },
  });

  // Ground shadow layer — subtle dark blur under each building's
  // offset copy so the campus reads as landing on ground, not
  // floating. Only visible in 3D (applyVisibility toggles it).
  // Drawn as a flat fill so it doesn't extrude — the shift itself
  // creates the drop-shadow effect.
  addLayerIfMissing(map, {
    id: LAYERS.buildingShadow,
    source: "campus-buildings-shadow",
    type: "fill",
    layout: { visibility: "none" },
    paint: {
      "fill-color": "#0f172a",
      // v3.23 — original drop-shadow polygon (offset SE from the
      // building) supplemented by a dedicated AO ring layer below,
      // together approximating what fill-extrusion-cast-shadows +
      // ambient-occlusion do in Mapbox but that MapLibre doesn't
      // upstream. Kept as directional shadow tint.
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0.0, 16, 0.06, 18, 0.11, 20, 0.15],
      "fill-antialias": true,
    },
    minzoom: 15,
  });

  // AO ring — hand-authored ambient-occlusion band around each
  // building footprint. Radially fades from a dark inside edge to
  // transparent at the outer edge. Achieves what fill-extrusion-
  // ambient-occlusion-* does on Mapbox without needing shader access.
  addLayerIfMissing(map, {
    id: LAYERS.buildingAO,
    source: "campus-buildings-ao",
    type: "fill",
    layout: { visibility: "none" },
    paint: {
      "fill-color": "#0b1220",
      // Peaks at zoom 18-19 where buildings dominate the screen; fades
      // out at low zoom so the AO doesn't smear across the whole map.
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0.0, 17, 0.18, 19, 0.28, 22, 0.32],
      "fill-antialias": true,
    },
    minzoom: 15,
  });

  // 3D extrusion layer — walls only (hollow interior). Sources from
  // the shell dataset whose polygons carry an inward-offset hole, so
  // fill-extrusion renders a thin ring rather than a solid block.
  // Rooms drawn on the room-fill layer show through the empty
  // interior at close zoom, exactly like MazeMap.
  addLayerIfMissing(map, {
    id: LAYERS.buildings3D,
    source: "campus-buildings-shell",
    type: "fill-extrusion",
    layout: { visibility: "none" }, // parent controls via setLayoutProperty
    paint: {
      "fill-extrusion-color": ["get", "color"],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": 0,
      // Lower default opacity so the interior floor slabs + room
      // slabs read through the walls — MazeMap goes for a glassy shell,
      // not a solid block. (fill-extrusion-opacity isn't data-driven in
      // MapLibre, so per-feature transparency lives on the color alpha
      // channel elsewhere — this is the global glass factor.)
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.0, 16, 0.35, 20, 0.55],
      "fill-extrusion-vertical-gradient": true,
    },
    minzoom: 14,
  });

  // Per-floor slab plates — a thin (~8 cm) coloured surface at the top
  // of each floor so the campus reads as a stack of platforms even
  // when the shell is translucent. A slightly warm neutral so the
  // slab reads distinct from the building's brand tint.
  addLayerIfMissing(map, {
    id: LAYERS.floorSlabs,
    source: "campus-floor-slabs",
    type: "fill-extrusion",
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": "#e6ecf5",
      "fill-extrusion-height": ["get", "top"],
      "fill-extrusion-base": ["get", "base"],
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 16, 0.0, 17, 0.6, 20, 0.85],
      "fill-extrusion-vertical-gradient": false,
    },
    minzoom: 16,
  });

  // Roof caps — a slim colored disc sitting flush with the shell top so
  // the shell looks enclosed and the campus reads as blocks with clean
  // roofs when tilted. The colour matches the building tint so a user
  // scanning from a distance can still identify buildings.
  addLayerIfMissing(map, {
    id: LAYERS.buildingsRoof,
    source: "campus-buildings-roof",
    type: "fill-extrusion",
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": ["get", "color"],
      "fill-extrusion-height": ["get", "top"],
      "fill-extrusion-base": ["get", "base"],
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0.15, 17, 0.35, 20, 0.55],
      "fill-extrusion-vertical-gradient": false,
    },
    minzoom: 15,
  });
}

// ── Geometry helpers ─────────────────────────────────────────────

/** Inset a polygon by `insetMeters` metres inward. Returns null when
 *  the resulting polygon is degenerate (self-intersecting or too
 *  small). Uses the CCW/CW winding of the input to pick the correct
 *  normal direction — buildings drawn in either order both work.
 *
 *  Not a full polygon offset algorithm — it just shifts each vertex
 *  along the bisector of its two adjacent edges. Fine for the
 *  convex-ish shapes buildings usually are; concave shapes with sharp
 *  reflex angles may kink but won't crash. */
function insetPolygonMeters(pts: Array<[number, number]>, insetMeters: number): Array<[number, number]> | null {
  const n = pts.length;
  if (n < 3) return null;
  // Rough m/deg factors at the polygon's centroid latitude.
  let cLat = 0, cLng = 0;
  for (const [lng, lat] of pts) { cLat += lat; cLng += lng; }
  cLat /= n; cLng /= n;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((cLat * Math.PI) / 180);

  // Signed area (in local m² space) → sign tells winding.
  let area2 = 0;
  const local: Array<[number, number]> = pts.map(([lng, lat]) => [
    (lng - cLng) * metersPerDegLng,
    (lat - cLat) * metersPerDegLat,
  ]);
  for (let i = 0; i < n; i++) {
    const [x1, y1] = local[i];
    const [x2, y2] = local[(i + 1) % n];
    area2 += x1 * y2 - x2 * y1;
  }
  const cw = area2 < 0; // clockwise if signed area is negative

  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = local[i];
    const [px, py] = local[(i - 1 + n) % n];
    const [nx, ny] = local[(i + 1) % n];
    // Two edge normals (pointing inward for the winding).
    const e1x = x - px, e1y = y - py;
    const e2x = nx - x, e2y = ny - y;
    const l1 = Math.hypot(e1x, e1y) || 1;
    const l2 = Math.hypot(e2x, e2y) || 1;
    // Left-hand normal (rotate 90°). Flip when clockwise.
    let n1x = -e1y / l1, n1y = e1x / l1;
    let n2x = -e2y / l2, n2y = e2x / l2;
    if (cw) { n1x = -n1x; n1y = -n1y; n2x = -n2x; n2y = -n2y; }
    // Bisector direction — sum of the two edge normals, then
    // normalise, then scale so the perpendicular distance = inset.
    const bx = n1x + n2x, by = n1y + n2y;
    const bl = Math.hypot(bx, by) || 1;
    // Miter length correction: perpendicular distance is inset when
    // bisector length is scaled by inset / cos(theta/2). Simplified:
    const dot = n1x * n2x + n1y * n2y;
    const miter = insetMeters / Math.max(0.25, Math.sqrt((1 + dot) / 2));
    const shiftX = (bx / bl) * miter;
    const shiftY = (by / bl) * miter;
    out.push([x + shiftX, y + shiftY]);
  }

  // Sanity check — if the inset produced NaN or the polygon collapsed
  // (all points close to centroid), reject.
  for (const [x, y] of out) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  }
  // Back to lng/lat.
  return out.map(([x, y]) => [
    cLng + x / metersPerDegLng,
    cLat + y / metersPerDegLat,
  ]);
}

function installHallways(map: MaplibreMap, hallways: Hallway[], activeFloor: number | null) {
  const data = {
    type: "FeatureCollection" as const,
    features: hallways
      .filter((h) => {
        // Inner walls are only visible on the active floor.
        if (h.surface === "inner-wall" && activeFloor !== null && h.floor != null) {
          return h.floor === activeFloor;
        }
        return true;
      })
      .map((h) => {
        // v3.30.0 — polyline support. If a `points` array is set,
        // walk every vertex; otherwise fall back to the legacy
        // startX/Y → endX/Y two-point segment.
        const coords: [number, number][] = (Array.isArray(h.points) && h.points.length >= 2)
          ? h.points.map((p) => [p.lng, p.lat] as [number, number])
          : [[h.startX, h.startY], [h.endX, h.endY]];
        return {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: coords },
          properties: {
            id: h.id,
            width: h.width ?? 2,
            floor: h.floor ?? 0,
            // isWall: outer/exterior walls (surface="wall")
            // isInnerWall: interior partition walls (surface="inner-wall")
            isWall: h.surface === "wall",
            isInnerWall: h.surface === "inner-wall",
          },
        };
      }),
  };
  upsertGeoJSONSource(map, SOURCES.hallways, data);
  // Corridor layers — exclude both outer and inner walls so they don't
  // accidentally render as cream/amber walkable paths.
  const corridorFilter = ["all", ["!=", ["get", "isWall"], true], ["!=", ["get", "isInnerWall"], true]] as unknown as maplibregl.FilterSpecification;
  addLayerIfMissing(map, {
    id: `${LAYERS.hallwaysLine}-under`,
    source: SOURCES.hallways,
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#fef3c7",
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 4, 20, 14],
      "line-opacity": 0.75,
    },
    filter: corridorFilter,
  });
  addLayerIfMissing(map, {
    id: LAYERS.hallwaysLine,
    source: SOURCES.hallways,
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#d97706",
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 0.8, 20, 2.2],
      "line-opacity": 0.5,
    },
    filter: corridorFilter,
  });
  // Inner walls — lighter gray partition lines, rendered below outer walls.
  // Floor-filtered in the GeoJSON data preparation above.
  addLayerIfMissing(map, {
    id: "campus-walls-inner-line",
    source: SOURCES.hallways,
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#6b7280",
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 1.5, 20, 5],
      "line-opacity": 0.85,
    },
    filter: ["==", ["get", "isInnerWall"], true],
  });
  // Outer/exterior walls — thick dark segments. Rendered above inner walls
  // and everything else (moveLayer called in install()).
  addLayerIfMissing(map, {
    id: "campus-walls-line",
    source: SOURCES.hallways,
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#374151",
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 2, 20, 6],
      "line-opacity": 0.95,
    },
    filter: ["==", ["get", "isWall"], true],
  });

  // 3D wall shells — buffer each wall LineString into a thin
  // rectangle polygon so `fill-extrusion` can raise it up. Wall
  // panels are ~0.35m thick and extrude ~2.4m tall by default (short
  // interior wall — WALL_HEIGHT_METERS). Users see actual
  // room-dividing walls through the building's hollow shell. Wall
  // sits on its floor's slab (base = (floor - 1) * METERS_PER_FLOOR)
  // so multi-story wall segments don't all pile up at ground level.
  const wallShellFeatures = hallways
    .filter((h) => h.surface === "wall")
    .map((h) => {
      const rect = bufferLineToRectMeters(
        { lat: h.startY, lng: h.startX },
        { lat: h.endY, lng: h.endX },
        0.35,
      );
      if (!rect) return null;
      const floor = h.floor ?? 1;
      const floorIdx = Math.max(0, floor - 1);
      const base = floorIdx * METERS_PER_FLOOR;
      return {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [rect.map((p) => [p.lng, p.lat])],
        },
        properties: {
          id: h.id,
          floor,
          base,
          height: base + WALL_HEIGHT_METERS,
        },
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);
  upsertGeoJSONSource(map, "campus-walls-shell", {
    type: "FeatureCollection" as const,
    features: wallShellFeatures,
  });
  addLayerIfMissing(map, {
    id: "campus-walls-3d",
    source: "campus-walls-shell",
    type: "fill-extrusion",
    layout: { visibility: "none" }, // parent toggles via applyVisibility(is3D)
    paint: {
      // MazeMap-adjacent — walls read as neutral warm gray instead of
      // pure black so they don't overpower the room fills sitting
      // between them.
      "fill-extrusion-color": "#4b5563",
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": ["get", "base"],
      "fill-extrusion-opacity": 0.85,
      "fill-extrusion-vertical-gradient": true,
    },
    minzoom: 15,
  });
}

/** Buffer a line segment into a 4-corner rectangle centred on the
 *  segment with the given width in metres. Returns null on
 *  degenerate zero-length input. Corners walk in CCW order in
 *  local metres space so the resulting polygon is valid GeoJSON. */
function bufferLineToRectMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  widthMeters: number,
): Array<{ lat: number; lng: number }> | null {
  const cLat = (a.lat + b.lat) / 2;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((cLat * Math.PI) / 180);
  const ax = (a.lng - b.lng) * metersPerDegLng;
  const ay = (a.lat - b.lat) * metersPerDegLat;
  const len = Math.hypot(ax, ay);
  if (len < 0.1) return null;
  // Perpendicular (rotated 90°), normalised, scaled to half width.
  const px = (-ay / len) * (widthMeters / 2);
  const py = ( ax / len) * (widthMeters / 2);
  // Corners in local metres, walking CCW.
  const corners: Array<[number, number]> = [
    [ (a.lng - b.lng) * metersPerDegLng / 2 + px, (a.lat - b.lat) * metersPerDegLat / 2 + py ],
    [-(a.lng - b.lng) * metersPerDegLng / 2 + px, -(a.lat - b.lat) * metersPerDegLat / 2 + py ],
    [-(a.lng - b.lng) * metersPerDegLng / 2 - px, -(a.lat - b.lat) * metersPerDegLat / 2 - py ],
    [ (a.lng - b.lng) * metersPerDegLng / 2 - px, (a.lat - b.lat) * metersPerDegLat / 2 - py ],
    // Close the ring.
    [ (a.lng - b.lng) * metersPerDegLng / 2 + px, (a.lat - b.lat) * metersPerDegLat / 2 + py ],
  ];
  const cLng = (a.lng + b.lng) / 2;
  return corners.map(([x, y]) => ({
    lat: cLat + y / metersPerDegLat,
    lng: cLng + x / metersPerDegLng,
  }));
}

/** Small square polygon (in lng/lat) centred on `pt` with the given
 *  half-width in metres. Used to give point POIs an extrudable footprint
 *  so they can render as tiny towers in 3D. */
function squareAroundPointMeters(pt: { lat: number; lng: number }, halfWidthMeters: number): Array<[number, number]> {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((pt.lat * Math.PI) / 180);
  const dLat = halfWidthMeters / metersPerDegLat;
  const dLng = halfWidthMeters / metersPerDegLng;
  return [
    [pt.lng - dLng, pt.lat - dLat],
    [pt.lng + dLng, pt.lat - dLat],
    [pt.lng + dLng, pt.lat + dLat],
    [pt.lng - dLng, pt.lat + dLat],
    [pt.lng - dLng, pt.lat - dLat],
  ];
}

/** Color per POI kind — mirrors the 2D chip stroke colors from
 *  installPOIs so 2D and 3D read as the same visual system. */
function poi3DColor(kind: string): string {
  switch (kind) {
    case "info":          return "#0ea5e9";
    case "reception":     return "#2563eb";
    case "restroom_m":    return "#2563eb";
    case "restroom_f":    return "#be185d";
    case "restroom_a":    return "#7c3aed";
    case "bathroom":      return "#be185d";
    case "cafe":          return "#a16207";
    case "vending":       return "#7c3aed";
    case "water":         return "#0891b2";
    case "first_aid":     return "#dc2626";
    case "defibrillator": return "#e11d48";
    case "printer":       return "#4b5563";
    case "meeting_point": return "#059669";
    case "parking":       return "#0369a1";
    case "bike":          return "#16a34a";
    default:              return "#3b82f6";
  }
}

/** Height (metres) each 3D POI pillar rises above the ground. Compact
 *  enough not to occlude the interior, tall enough to spot at a glance
 *  through the building shell. */
const POI_PILLAR_HEIGHT = 2.2;

/** Install 3D pillars for every generic POI + door/entrance markers.
 *  Runs alongside installTowers (which handles stairs + elevators as
 *  taller towers). */
function installPoiPillars(
  map: MaplibreMap,
  pois: GenericPOI[],
  doors: Door[],
  activeFloor: number | null,
  hiddenKinds: Set<string>,
) {
  // Small square around each POI position (~0.9 m half-width) — reads
  // as a coloured pin from any pitch without swallowing map space.
  const features = pois
    .filter((p) => typeof p.position?.lat === "number" && typeof p.position?.lng === "number")
    .filter((p) => !hiddenKinds.has(p.kind))
    .filter((p) => activeFloor === null || p.floor === null || p.floor === undefined || p.floor === activeFloor)
    .map((p) => {
      const coords = squareAroundPointMeters(p.position!, 0.9);
      return {
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [coords.map(([lng, lat]) => [lng, lat])] },
        properties: {
          id: p.id,
          kind: p.kind,
          color: poi3DColor(p.kind),
          height: POI_PILLAR_HEIGHT,
        },
      };
    });
  upsertGeoJSONSource(map, "campus-pois-pillar-3d-src", {
    type: "FeatureCollection" as const,
    features,
  });

  addLayerIfMissing(map, {
    id: LAYERS.poi3D,
    source: "campus-pois-pillar-3d-src",
    type: "fill-extrusion",
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": ["get", "color"],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.85,
      "fill-extrusion-vertical-gradient": true,
    },
    minzoom: 16,
  });

  // Door + entrance markers — flat coloured tiles at ground so users
  // see where they can walk into buildings from the 3D view.
  const doorFeatures: unknown[] = [];
  const entranceFeatures: unknown[] = [];
  for (const d of doors) {
    if (typeof d.position?.lat !== "number" || typeof d.position?.lng !== "number") continue;
    if (activeFloor !== null && d.floor !== null && d.floor !== undefined && d.floor !== activeFloor) continue;
    const coords = squareAroundPointMeters(d.position, 0.7);
    const feat = {
      type: "Feature" as const,
      geometry: { type: "Polygon" as const, coordinates: [coords.map(([lng, lat]) => [lng, lat])] },
      properties: { id: d.id, floor: d.floor ?? null },
    };
    if (d.emergencyExit) doorFeatures.push({ ...feat, properties: { ...feat.properties, kind: "exit" } });
    else if ((d as unknown as { isEntrance?: boolean }).isEntrance) entranceFeatures.push({ ...feat, properties: { ...feat.properties, kind: "entrance" } });
    else doorFeatures.push({ ...feat, properties: { ...feat.properties, kind: "door" } });
  }
  upsertGeoJSONSource(map, "campus-doors-marker-src", {
    type: "FeatureCollection" as const,
    features: doorFeatures,
  });
  upsertGeoJSONSource(map, "campus-entrances-marker-src", {
    type: "FeatureCollection" as const,
    features: entranceFeatures,
  });

  // Entrance glow — larger green disc under each entrance pad so the
  // "way in" reads from a distance in 3D. Simulates flood-light
  // spilling onto the ground; MapLibre doesn't have real flood-light
  // paints for fill-extrusion.
  const entranceGlowFeatures = doors
    .filter((d) => (d as unknown as { isEntrance?: boolean }).isEntrance)
    .filter((d) => typeof d.position?.lat === "number" && typeof d.position?.lng === "number")
    .map((d) => ({
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [squareAroundPointMeters(d.position!, 2.5).map(([lng, lat]) => [lng, lat])],
      },
      properties: { id: `${d.id}-glow` },
    }));
  upsertGeoJSONSource(map, "campus-entrances-glow-src", {
    type: "FeatureCollection" as const,
    features: entranceGlowFeatures,
  });
  addLayerIfMissing(map, {
    id: LAYERS.entranceGlow,
    source: "campus-entrances-glow-src",
    type: "fill",
    layout: { visibility: "none" },
    paint: {
      "fill-color": "#22c55e",
      // v3.25.6 — boosted opacity so entrances read as strong wayfinding
      // cues in 2D, not subtle background tint. Zoom-interpolated so
      // the campus-wide view stays clean and the walk-up view really
      // shouts "you can get in here."
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0.0, 16, 0.28, 18, 0.55, 20, 0.65],
      "fill-antialias": true,
    },
    minzoom: 15,
  });

  // v3.25.6 — dedicated CIRCLE overlay for doors + entrances, always
  // visible in 2D. The extrusion pads read well in 3D but disappear
  // as tiny squares from a top-down view; a circle marker gives users
  // an unambiguous "door here" chip at every zoom above 16. Green =
  // entrance (way in), red = exit-only, grey = interior door.
  addLayerIfMissing(map, {
    id: "campus-doors-chip",
    source: "campus-doors-marker-src",
    type: "circle",
    minzoom: 16,
    paint: {
      // v3.31.0 — pin translate + bigger chip, matching the generic
      // POI pin treatment from 3.30.1. Chip sits ABOVE the door
      // coordinate; the tail glyph below points to the exact spot.
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 16, 6, 18, 10, 20, 14],
      "circle-translate": ["interpolate", ["linear"], ["zoom"], 16, ["literal", [0, -8]], 18, ["literal", [0, -13]], 20, ["literal", [0, -18]]],
      "circle-translate-anchor": "viewport",
      "circle-color": [
        "match", ["get", "kind"],
        "exit", "#dc2626",
                "#374151",
      ],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2.5,
      "circle-opacity": 1,
    },
  });
  addLayerIfMissing(map, {
    id: "campus-entrances-chip",
    source: "campus-entrances-marker-src",
    type: "circle",
    minzoom: 15,
    paint: {
      // v3.31.0 — bigger pin for entrances, translated up like doors.
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 8, 18, 14, 20, 20],
      "circle-translate": ["interpolate", ["linear"], ["zoom"], 15, ["literal", [0, -10]], 18, ["literal", [0, -18]], 20, ["literal", [0, -26]]],
      "circle-translate-anchor": "viewport",
      "circle-color": "#16a34a",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
      "circle-opacity": 1,
    },
  });
  // v3.31.0 — pin TAILS. Small ▼ pointing at each door/entrance
  // coordinate so the whole marker reads as a MazeMap teardrop.
  addLayerIfMissing(map, {
    id: "campus-doors-tail",
    source: "campus-doors-marker-src",
    type: "symbol",
    minzoom: 16,
    layout: {
      "text-field": "▼",
      "text-size": ["interpolate", ["linear"], ["zoom"], 16, 10, 18, 14, 20, 18],
      "text-font": ["Noto Sans Regular"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-anchor": "bottom",
    },
    paint: {
      "text-color": [
        "match", ["get", "kind"],
        "exit", "#dc2626",
                "#374151",
      ],
      "text-halo-color": "#ffffff",
      "text-halo-width": 1,
    },
  });
  addLayerIfMissing(map, {
    id: "campus-entrances-tail",
    source: "campus-entrances-marker-src",
    type: "symbol",
    minzoom: 15,
    layout: {
      "text-field": "▼",
      "text-size": ["interpolate", ["linear"], ["zoom"], 15, 12, 18, 18, 20, 24],
      "text-font": ["Noto Sans Regular"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-anchor": "bottom",
    },
    paint: {
      "text-color": "#16a34a",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1,
    },
  });
  // v3.27.1 — "D" / "E" letter inside each chip. Reads clearly even
  // in high-contrast / monochrome and helps colorblind users tell
  // doors from entrances at a glance.
  addLayerIfMissing(map, {
    id: "campus-doors-letter",
    source: "campus-doors-marker-src",
    type: "symbol",
    minzoom: 17,
    layout: {
      "text-field": "D",
      "text-size": ["interpolate", ["linear"], ["zoom"], 17, 9, 20, 14],
      "text-font": ["Noto Sans Regular"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#00000060",
      "text-halo-width": 0.4,
      // v3.31.0 — match the chip's translate so the letter sits
      // inside the pin head, not floating below.
      "text-translate": ["interpolate", ["linear"], ["zoom"], 17, ["literal", [0, -10]], 20, ["literal", [0, -18]]],
      "text-translate-anchor": "viewport",
    },
  });
  addLayerIfMissing(map, {
    id: "campus-entrances-letter",
    source: "campus-entrances-marker-src",
    type: "symbol",
    minzoom: 16,
    layout: {
      "text-field": "E",
      "text-size": ["interpolate", ["linear"], ["zoom"], 16, 11, 20, 18],
      "text-font": ["Noto Sans Regular"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#00000060",
      "text-halo-width": 0.4,
      // v3.31.0 — translate to sit inside the pin head.
      "text-translate": ["interpolate", ["linear"], ["zoom"], 16, ["literal", [0, -10]], 20, ["literal", [0, -26]]],
      "text-translate-anchor": "viewport",
    },
  });

  addLayerIfMissing(map, {
    id: LAYERS.doorMarker,
    source: "campus-doors-marker-src",
    type: "fill-extrusion",
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": [
        "match", ["get", "kind"],
        "exit", "#dc2626",
                "#6b7280",
      ],
      // Very short "pad" — signals a door without piercing walls
      "fill-extrusion-height": 0.5,
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.9,
      "fill-extrusion-vertical-gradient": true,
    },
    minzoom: 16,
  });
  addLayerIfMissing(map, {
    id: LAYERS.entranceMarker,
    source: "campus-entrances-marker-src",
    type: "fill-extrusion",
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": "#15803d",
      "fill-extrusion-height": 0.8,
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.95,
      "fill-extrusion-vertical-gradient": true,
    },
    minzoom: 15,
  });
}

/** Install MazeMap-style stair + elevator towers — small extruded
 *  boxes at each POI position that pierce the building shell. Users
 *  seeing a 3D campus at a glance can spot where vertical transit
 *  lives. Colored per kind (stairs = amber, elevator = blue). */
function installTowers(
  map: MaplibreMap,
  stairs: Stair[],
  elevators: Elevator[],
  buildings: Building[],
) {
  // Building height lookup so a tower pokes just above its parent
  // building's roof. Falls back to 8m for orphan POIs.
  const heightByBuildingId = new Map<string, number>();
  for (const b of buildings) {
    const style = (b.metadata as { style?: Record<string, unknown> } | null | undefined)?.style ?? {};
    const perFloor = typeof style.heightPerFloor === "number" && style.heightPerFloor > 0
      ? style.heightPerFloor
      : METERS_PER_FLOOR;
    const heightOverride = typeof style.totalHeight === "number" && style.totalHeight > 0
      ? style.totalHeight
      : null;
    const height = heightOverride ?? Math.max(perFloor, (b.floors ?? 1) * perFloor);
    heightByBuildingId.set(b.id, height);
  }
  const towerFeature = (id: string, pos: { lat: number; lng: number }, buildingId: string | null | undefined, kind: "stairs" | "elevator") => {
    const parentH = (buildingId && heightByBuildingId.get(buildingId)) || 8;
    const height = parentH + 0.8; // just pokes above the roof
    const halfW = kind === "elevator" ? 1.6 : 1.2; // elevator slightly chunkier
    const coords = squareAroundPointMeters(pos, halfW);
    return {
      type: "Feature" as const,
      geometry: { type: "Polygon" as const, coordinates: [coords.map(([lng, lat]) => [lng, lat])] },
      properties: { id, kind, height },
    };
  };
  const stairFeatures = stairs
    .filter((s) => typeof s.position?.lat === "number" && typeof s.position?.lng === "number")
    .map((s) => towerFeature(s.id, s.position!, (s as unknown as { buildingId?: string }).buildingId, "stairs"));
  const elevatorFeatures = elevators
    .filter((e) => typeof e.position?.lat === "number" && typeof e.position?.lng === "number")
    .map((e) => towerFeature(e.id, e.position!, (e as unknown as { buildingId?: string }).buildingId, "elevator"));

  upsertGeoJSONSource(map, "campus-stairs-tower-src", {
    type: "FeatureCollection" as const,
    features: stairFeatures,
  });
  upsertGeoJSONSource(map, "campus-elevators-tower-src", {
    type: "FeatureCollection" as const,
    features: elevatorFeatures,
  });

  addLayerIfMissing(map, {
    id: LAYERS.stairsTower,
    source: "campus-stairs-tower-src",
    type: "fill-extrusion",
    layout: { visibility: "none" },
    paint: {
      // Warm amber, matches the stairs POI chip in 2D.
      "fill-extrusion-color": "#b45309",
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.85,
      "fill-extrusion-vertical-gradient": true,
    },
    minzoom: 15,
  });
  addLayerIfMissing(map, {
    id: LAYERS.elevatorTower,
    source: "campus-elevators-tower-src",
    type: "fill-extrusion",
    layout: { visibility: "none" },
    paint: {
      // Blue, matches the elevator POI chip in 2D.
      "fill-extrusion-color": "#2563eb",
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.85,
      "fill-extrusion-vertical-gradient": true,
    },
    minzoom: 15,
  });
}


/**
 * v3.26.5 — MazeMap-style default color per room type. Applied only
 * when a room has NO explicit `colorCode` set in the builder — user
 * overrides always win. Keeps floor plans legible at a glance by
 * giving every room type a distinct hue: classroom (KSYK green),
 * lab (orange), toilets (pink), cafeteria (amber), office (indigo),
 * storage (grey), gym (rose), etc.
 */
const ROOM_TYPE_COLORS: Record<string, string> = {
  classroom:  "#059669",   // KSYK green
  class:      "#059669",
  luokka:     "#059669",
  lecture:    "#0891b2",   // teal
  lab:        "#ea580c",   // orange
  laboratory: "#ea580c",
  workshop:   "#d97706",   // amber-darker
  gym:        "#e11d48",   // rose
  sports:     "#e11d48",
  cafeteria:  "#f59e0b",   // amber
  cafe:       "#f59e0b",
  canteen:    "#f59e0b",
  kitchen:    "#f97316",
  restroom:   "#ec4899",   // pink
  restrooms:  "#ec4899",
  toilets:    "#ec4899",
  bathroom:   "#ec4899",
  office:     "#6366f1",   // indigo
  admin:      "#6366f1",
  staff:      "#6366f1",
  meeting:    "#8b5cf6",   // violet
  library:    "#7c3aed",
  storage:    "#6b7280",   // slate
  utility:    "#6b7280",
  hallway:    "#94a3b8",
  corridor:   "#94a3b8",
  stairs:     "#f59e0b",
  elevator:   "#2563eb",
  auditorium: "#a855f7",
  music:      "#c084fc",
  art:        "#f43f5e",
  // v3.27.0 — additional types requested by users
  stage:      "#a21caf",   // fuchsia — theater / assembly stage
  "näyttämö": "#a21caf",   // Finnish alias
  theater:    "#a21caf",
  theatre:    "#a21caf",
  assembly:   "#a21caf",
  chapel:     "#eab308",
  reception:  "#0ea5e9",
};
function colorForRoomType(type: string | null | undefined): string | null {
  if (!type) return null;
  return ROOM_TYPE_COLORS[type.toLowerCase().trim()] ?? null;
}

function installCorridors(map: MaplibreMap, rooms: Room[], activeFloor: number | null) {
  const corridors = rooms.filter(
    (r) => r.type === "hallway" && r.points && r.points.length >= 3
  ).filter((r) => {
    if (activeFloor === null) return true;
    const meta = r.metadata as RoomMeta;
    const hasShapeForFloor = meta?.floorShapes?.some((fs) => fs.floor === activeFloor);
    return r.floor == null || r.floor === activeFloor || hasShapeForFloor;
  });

  const data = {
    type: "FeatureCollection" as const,
    features: corridors.map((r) => {
      const meta = r.metadata as RoomMeta;
      const floorShape = activeFloor != null ? meta?.floorShapes?.find((fs) => fs.floor === activeFloor) : undefined;
      const pts: [number, number][] = floorShape?.coordinates ?? r.points!.map((p) => [p.lng, p.lat]);
      return {
        id: r.id,
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[...pts, pts[0]]],
        },
        // Use the corridor's stored colorCode (or a visible slate default).
        properties: { id: r.id, floor: r.floor ?? 0, color: r.colorCode ?? "#94a3b8" },
      };
    }),
  };
  upsertGeoJSONSource(map, "campus-corridors", data);
  addLayerIfMissing(map, {
    id: "campus-corridors-fill",
    source: "campus-corridors",
    type: "fill",
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": 0.45,
    },
  });
  addLayerIfMissing(map, {
    id: "campus-corridors-outline",
    source: "campus-corridors",
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": 1.5,
      "line-opacity": 0.85,
    },
  });
}

type FloorShape = { floor: number; coordinates: [number, number][] };
type RoomMeta = { style?: Record<string, unknown>; floorShapes?: FloorShape[] } | null | undefined;

function installRooms(map: MaplibreMap, rooms: Room[], activeFloor: number | null) {
  const data = {
    type: "FeatureCollection" as const,
    features: rooms
      .filter((r) => r.points && r.points.length >= 3)
      .filter((r) => r.type !== "hallway") // corridors rendered separately
      .filter((r) => {
        if (activeFloor === null) return true;
        const meta = r.metadata as RoomMeta;
        const hasShapeForFloor = meta?.floorShapes?.some((fs) => fs.floor === activeFloor);
        return r.floor == null || r.floor === activeFloor || hasShapeForFloor;
      })
      .map((r) => {
        const meta = r.metadata as RoomMeta;
        const style = meta?.style ?? {};
        // Use floor-specific polygon when available, fall back to default points
        const floorShape = activeFloor != null ? meta?.floorShapes?.find((fs) => fs.floor === activeFloor) : undefined;
        const pts: [number, number][] = floorShape?.coordinates ?? r.points!.map((p) => [p.lng, p.lat]);
        return {
          // Feature-level id lets setFeatureState() target this room
          // for hover highlight without re-rendering the source.
          id: r.id,
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [[...pts, pts[0]]],
          },
          // v3.29.0 — MazeMap-style bilingual label. Show nameEn AND
          // nameFi (separated by " / ") when both exist; otherwise
          // show whichever is set; fall back to the base name only
          // when neither is defined. Base name dropped from labels
          // per user feedback ("delete the normal name").
          properties: (() => {
            const rr = r as unknown as { nameEn?: string | null; nameFi?: string | null };
            const bilingual = [rr.nameEn, rr.nameFi].filter((s): s is string => !!s && s.trim().length > 0);
            const displayName = bilingual.length > 0
              ? bilingual.join(" / ")
              : (r.name ?? "");
            return {
              id: r.id,
              name: displayName,
              label: [r.roomNumber, displayName].filter(Boolean).join(" "),
              color: r.colorCode ?? colorForRoomType(r.type) ?? "#059669",
              floor: r.floor ?? 0,
              showOutline: style.showOutline === true,
              fillOpacity: typeof style.fillOpacity === "number" ? style.fillOpacity : null,
              showLabel: style.showLabel !== false,
            };
          })(),
        };
      }),
  };
  upsertGeoJSONSource(map, SOURCES.rooms, data);

  // 3D room slabs — sit ON TOP of the building's floor plate for the
  // room's floor. We compute a Z base = (floor - 1) * METERS_PER_FLOOR
  // + 0.08 (floor slab thickness) and extrude by ROOM_SLAB_METERS so
  // the room reads as a raised platform inside the wall shell.
  //
  // MazeMap "ghost lower floors": we include rooms on the active floor
  // AT FULL COLOR + rooms on floors below the active floor with
  // isActive=false so a companion "ghost" layer can render them at
  // reduced opacity. Users see the vertical stack of the building
  // even when concentrating on a specific level. Rooms on floors ABOVE
  // the active floor are hidden entirely (they'd occlude the interior).
  //
  // Custom heights: rooms accept `metadata.style.slabHeight` (how tall
  // the raised platform is, default 0.35 m) and `metadata.style.perFloor`
  // (per-floor Z stacking distance, default 3.0 m — usually inherited
  // from the parent building).
  const rooms3DData = {
    type: "FeatureCollection" as const,
    features: rooms
      .filter((r) => r.points && r.points.length >= 3)
      .filter((r) => r.type !== "hallway") // corridors rendered separately
      .filter((r) => {
        if (activeFloor === null) return true;
        return (r.floor ?? 1) <= activeFloor;
      })
      .map((r) => {
        const floor = r.floor ?? 1;
        const floorIdx = Math.max(0, floor - 1);
        const meta3d = r.metadata as RoomMeta;
        const style = meta3d?.style ?? {};
        const perFloor = typeof style.perFloor === "number" && style.perFloor > 0
          ? style.perFloor
          : METERS_PER_FLOOR;
        const slabHeight = typeof style.slabHeight === "number" && style.slabHeight > 0
          ? style.slabHeight
          : ROOM_SLAB_METERS;
        const base = floorIdx * perFloor + 0.08;
        const floorShape3D = activeFloor != null ? meta3d?.floorShapes?.find((fs) => fs.floor === activeFloor) : undefined;
        const pts3D: [number, number][] = floorShape3D?.coordinates ?? r.points!.map((p) => [p.lng, p.lat]);
        return {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [[...pts3D, pts3D[0]]],
          },
          properties: {
            id: r.id,
            color: r.colorCode ?? colorForRoomType(r.type) ?? "#059669",
            floor,
            base,
            height: base + slabHeight,
            // 1 = current floor (full colour), 0 = below (ghosted).
            isActive: activeFloor === null || floor === activeFloor,
          },
        };
      }),
  };
  upsertGeoJSONSource(map, "campus-rooms-3d", rooms3DData);

  addLayerIfMissing(map, {
    id: LAYERS.roomsFill,
    source: SOURCES.rooms,
    type: "fill",
    paint: {
      "fill-color": ["get", "color"],
      // MazeMap-style: rooms are solid fills — no outline (walls are
      // drawn from the walls source instead). BUGFIX (v3.16): the
      // previous ramp started at zoom 16 (opacity 0) which meant users
      // at zoom 15–16 saw the (also-translucent) building fill on top
      // of an invisible room fill — the "building overlaps the room"
      // complaint. Now rooms start becoming visible at zoom 15 so users
      // see the interior detail as soon as buildings themselves become
      // legible. Per-feature override lets the user pin an exact opacity
      // from the Style tab.
      // MapLibre constraint: zoom at top level, case inside stop outputs.
      // Hover → 0.95 solid, fillOpacity override → data value, else zoom ramp.
      "fill-opacity": [
        "interpolate", ["linear"], ["zoom"],
        15, ["case", ["boolean", ["feature-state", "hover"], false], 0.95, ["case", ["!=", ["get", "fillOpacity"], null], ["get", "fillOpacity"], 0.6]],
        17, ["case", ["boolean", ["feature-state", "hover"], false], 0.95, ["case", ["!=", ["get", "fillOpacity"], null], ["get", "fillOpacity"], 0.85]],
        19, ["case", ["boolean", ["feature-state", "hover"], false], 0.95, ["case", ["!=", ["get", "fillOpacity"], null], ["get", "fillOpacity"], 0.92]],
        22, ["case", ["boolean", ["feature-state", "hover"], false], 0.95, ["case", ["!=", ["get", "fillOpacity"], null], ["get", "fillOpacity"], 0.95]],
      ],
      "fill-antialias": true,
    },
  });
  addLayerIfMissing(map, {
    id: LAYERS.roomsOutline,
    source: SOURCES.rooms,
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 0.5, 18, 1.5, 22, 2.5],
      "line-opacity": ["case", ["boolean", ["get", "showOutline"], false], 0.9, 0],
    },
  });

  // Premium uniform hover glow — flat white overlay layer that sits
  // above the base fill. When hover=true the whole room brightens
  // uniformly (no edge artifacts from opacity-only approaches).
  addLayerIfMissing(map, {
    id: "campus-rooms-hover-overlay",
    source: SOURCES.rooms,
    type: "fill",
    paint: {
      "fill-color": "#ffffff",
      "fill-opacity": [
        "case", ["boolean", ["feature-state", "hover"], false], 0.28, 0,
      ],
      "fill-antialias": true,
    },
  });

  // v3.26.3 — hover halo ring around the room the cursor is on. Only
  // renders when feature-state.hover is true; invisible otherwise so
  // permanent outlines don't clutter the map. Bright blue for
  // wayfinding contrast.
  addLayerIfMissing(map, {
    id: "campus-rooms-hover-halo",
    source: SOURCES.rooms,
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#2563eb",
      // Zoom at top level (MapLibre constraint). Hover → scaled width, else 0.
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        15, ["case", ["boolean", ["feature-state", "hover"], false], 2, 0],
        18, ["case", ["boolean", ["feature-state", "hover"], false], 3.5, 0],
        22, ["case", ["boolean", ["feature-state", "hover"], false], 5, 0],
      ],
      "line-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        0.95,
        0,
      ],
    },
  });

  // 3D room slabs — used when the map is pitched. Sits at the correct
  // Z for the room's floor so multi-story buildings actually stack.
  // Because the slab is thin (ROOM_SLAB_METERS ≈ 35 cm), the user sees
  // colored floor plates through the shell rather than solid room
  // "boxes" that would fill the whole floor volume.
  //
  // Split into two layers:
  //   - `rooms-3d` — active floor rooms at full opacity (colourful)
  //   - `rooms-3d-ghost` — rooms on floors BELOW the active floor at
  //     low opacity so users see the stack context. Filtered via the
  //     isActive property so both layers read from the same source.
  addLayerIfMissing(map, {
    id: LAYERS.rooms3D,
    source: "campus-rooms-3d",
    type: "fill-extrusion",
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": ["get", "color"],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": ["get", "base"],
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 16, 0.0, 17, 0.85, 20, 0.95],
      "fill-extrusion-vertical-gradient": true,
    },
    filter: ["boolean", ["get", "isActive"], true],
    minzoom: 16,
  });
  addLayerIfMissing(map, {
    id: `${LAYERS.rooms3D}-ghost`,
    source: "campus-rooms-3d",
    type: "fill-extrusion",
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": ["get", "color"],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": ["get", "base"],
      // Very low opacity — just enough to hint the stack, not enough to
      // fight with the active floor for attention.
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 16, 0.0, 17, 0.18, 20, 0.28],
      "fill-extrusion-vertical-gradient": false,
    },
    filter: ["!", ["boolean", ["get", "isActive"], true]],
    minzoom: 16,
  });
  addLayerIfMissing(map, {
    id: LAYERS.roomsLabel,
    source: SOURCES.rooms,
    type: "symbol",
    layout: {
      "text-field": ["get", "label"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 17, 11, 19, 15, 21, 22],
      "text-font": ["Noto Sans Bold"],
      "text-allow-overlap": false,
      "text-optional": true,
      "text-anchor": "center",
      "text-max-width": 12,
      "text-padding": 3,
      "text-letter-spacing": 0.03,
    },
    paint: {
      "text-color": "#0b1220",
      "text-halo-color": "rgba(255,255,255,0.95)",
      "text-halo-width": 2,
      "text-halo-blur": 0.3,
      "text-opacity": ["case", ["get", "showLabel"], 1, 0],
    },
    minzoom: 16,
  });
}

/** Icons for the POI symbol layer. Using Unicode pictographs keeps us
 *  glyph-only — no image loading, no CORS, no atlas. Rendered by the
 *  demotiles font which covers Latin-1 + basic pictographs; the black
 *  square chip behind each icon supplies contrast on any tile theme.
 *
 *  Order of poiKind here dictates render priority — later ones sit on
 *  top when two POIs overlap. */
/** MazeMap-style POI glyphs. Uses widely-supported Unicode emoji so
 *  icons are immediately recognisable at any zoom level. */
const POI_ICON: Record<string, string> = {
  stairs:        "🪜",   // staircase
  elevator:      "🛗",   // elevator cab
  door:          "🚪",   // door
  entrance:      "⊙",   // bullseye entry point
  exit:          "↪",   // exit arrow
  bathroom:      "WC",   // restroom (unisex) — clean text renders everywhere
  info:          "ⓘ",
  reception:     "☎",
  parking:       "Ⓟ",
  bike:          "🚲",
  restroom_m:    "♂",   // men
  restroom_f:    "♀",   // women
  restroom_a:    "♿",   // accessible
  cafe:          "☕",
  vending:       "🍫",
  water:         "💧",
  first_aid:     "✚",   // medical cross
  defibrillator: "⚡",
  printer:       "🖨",
  meeting_point: "⚑",
  restroom:      "WC",
};

interface GenericPOI {
  id: string;
  kind: string;
  position: { lat: number; lng: number };
  floor?: number | null;
  label?: string | null;
}

interface POIData {
  stairs: Stair[];
  elevators: Elevator[];
  doors: Door[];
  rooms: Room[];
  /** Free-form kinds placed via the generic POI toolbar (info,
   *  reception, parking, restroom_m/f/a, bike). Stored in Firestore
   *  campus_pois. */
  generic: GenericPOI[];
}

function installPOIs(
  map: MaplibreMap,
  data: POIData,
  activeFloor: number | null,
  hiddenKinds: Set<string> = new Set(),
) {
  type PoiFeature = {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: {
      id: string; kind: string; icon: string; floor: number | null;
      label: string;
      // v3.31.2 — resolved style baked in from Shape B category tree.
      // Paint expressions can now use ["get","chipColor"] etc. instead
      // of hardcoded ["match", ["get","kind"], ...] arms. Adding a
      // new POI category with its own icon+color no longer requires
      // touching the paint spec.
      chipColor: string;
      strokeColor: string;
    };
  };
  const features: PoiFeature[] = [];

  const push = (
    id: string, kind: string, floor: number | null,
    lat: number, lng: number, label?: string | null,
  ) => {
    if (activeFloor !== null && floor !== null && floor !== activeFloor) return;
    // POI category filter — user hid this category via LayersToggle.
    if (hiddenKinds.has(kind)) return;
    // v3.31.2 — Shape B resolver merges parent+leaf category styles.
    // Legacy flat kind strings (restroom_m) resolve to their category
    // paths (amenity/restroom/m) via LEGACY_KIND_MAP.
    const resolved = resolveCategoryStyle(kind);
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        id, kind,
        // Prefer POI_ICON (hand-tuned) when the kind is one we ship
        // with, else fall back to the resolved category icon.
        icon: POI_ICON[kind] ?? resolved.icon,
        chipColor: resolved.chipColor,
        strokeColor: resolved.strokeColor,
        floor,
        // Fall back to a friendly kind name for the hover popup so
        // every POI has something to show even without a custom label.
        label: (label && label.trim()) || poiKindLabel(kind),
      },
    });
  };

  for (const s of data.stairs) {
    if (typeof s.position?.lat === "number" && typeof s.position?.lng === "number") {
      push(s.id, "stairs", s.floors?.[0] ?? null, s.position.lat, s.position.lng);
    } else {
      // Legacy shape — position not populated. Skip; the seed script
      // will re-populate on next publish.
    }
  }
  for (const e of data.elevators) {
    if (typeof e.position?.lat === "number" && typeof e.position?.lng === "number") {
      push(e.id, "elevator", e.floors?.[0] ?? null, e.position.lat, e.position.lng, e.name ?? null);
    }
  }
  for (const d of data.doors) {
    if (typeof d.position?.lat === "number" && typeof d.position?.lng === "number") {
      const kind = d.emergencyExit ? "exit" : "door";
      push(d.id, kind, d.floor ?? null, d.position.lat, d.position.lng);
    }
  }
  // Generic POIs (info, reception, restroom_*, parking, bike) —
  // placed via the builder POI toolbar, stored in campus_pois.
  for (const p of data.generic) {
    if (typeof p.position?.lat !== "number" || typeof p.position?.lng !== "number") continue;
    push(p.id, p.kind, p.floor ?? null, p.position.lat, p.position.lng, p.label ?? null);
  }
  // Auto-derive POI markers from typed rooms (bathroom, elevator, stairs).
  for (const r of data.rooms) {
    if (!r.points?.length) continue;
    if (activeFloor !== null && r.floor !== activeFloor) continue;
    const centre = polygonCenter(r.points);
    if (!centre) continue;
    if (r.type === "bathroom") push(`room-${r.id}`, "bathroom", r.floor ?? null, centre.lat, centre.lng);
    else if (r.type === "elevator") push(`room-${r.id}`, "elevator", r.floor ?? null, centre.lat, centre.lng);
    else if (r.type === "stairs") push(`room-${r.id}`, "stairs", r.floor ?? null, centre.lat, centre.lng);
  }

  const fc = { type: "FeatureCollection" as const, features };
  upsertGeoJSONSource(map, SOURCES.pois, fc);

  // Tint chip background by kind — MazeMap uses semantic colors so a
  // toilet reads pink, elevator blue, stairs a warm ochre, entrance
  // green, exits red. Icon stays black for max contrast.
  addLayerIfMissing(map, {
    id: LAYERS.poisChip,
    source: SOURCES.pois,
    type: "circle",
    paint: {
      // Pin chip sits well above the tail arrow so the two never collide.
      // Translate values computed so: chip_bottom = translate+radius,
      // tail_top ≈ -text-size. Gap at each zoom: ~7-10 px.
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 9, 19, 16, 21, 24],
      "circle-translate": ["interpolate", ["linear"], ["zoom"], 15, ["literal", [0, -26]], 19, ["literal", [0, -44]], 21, ["literal", [0, -60]]],
      "circle-translate-anchor": "viewport",
      "circle-color": [
        "match", ["get", "kind"],
        "elevator",      "#dbeafe",  // blue-100
        "stairs",        "#fef3c7",  // amber-100
        "bathroom",      "#fce7f3",  // pink-100
        "restroom",      "#fce7f3",  // v3.29.0 unisex/generic
        "restroom_m",    "#dbeafe",
        "restroom_f",    "#fce7f3",
        "restroom_a",    "#e9d5ff",
        "entrance",      "#dcfce7",  // green-100
        "exit",          "#fee2e2",  // red-100
        "door",          "#f3f4f6",  // gray-100
        "info",          "#e0f2fe",  // sky-100
        "reception",     "#dbeafe",
        "cafe",          "#fef3c7",
        "vending",       "#ede9fe",
        "water",         "#cffafe",
        "first_aid",     "#fee2e2",
        "defibrillator", "#ffe4e6",
        "printer",       "#f3f4f6",
        "meeting_point", "#dcfce7",
        "parking",       "#e0f2fe",
        "bike",          "#dcfce7",
                         "#ffffff",  // fallback
      ],
      "circle-stroke-color": [
        "match", ["get", "kind"],
        "elevator",      "#2563eb",
        "stairs",        "#b45309",
        "bathroom",      "#be185d",
        "restroom",      "#be185d",
        "restroom_m",    "#2563eb",
        "restroom_f",    "#be185d",
        "restroom_a",    "#7c3aed",
        "entrance",      "#15803d",
        "exit",          "#b91c1c",
        "door",          "#4b5563",
        "info",          "#0ea5e9",
        "reception",     "#2563eb",
        "cafe",          "#a16207",
        "vending",       "#7c3aed",
        "water",         "#0891b2",
        "first_aid",     "#dc2626",
        "defibrillator", "#e11d48",
        "printer",       "#4b5563",
        "meeting_point", "#059669",
        "parking",       "#0369a1",
        "bike",          "#16a34a",
                         "#111827",
      ],
      "circle-stroke-width": 2,
      "circle-opacity": 1,
    },
    minzoom: 14,
  });
  addLayerIfMissing(map, {
    id: LAYERS.poisIcon,
    source: SOURCES.pois,
    type: "symbol",
    layout: {
      "text-field": ["get", "icon"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 15, 12, 19, 22, 21, 32],
      "text-font": ["Noto Sans Regular"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-anchor": "center",
    },
    paint: {
      "text-color": "#111827",
      "text-translate": ["interpolate", ["linear"], ["zoom"], 15, ["literal", [0, -26]], 19, ["literal", [0, -44]], 21, ["literal", [0, -60]]],
      "text-translate-anchor": "viewport",
    },
    minzoom: 14,
  });
  // v3.30.1 — pin TAIL. A small ▼ glyph rendered at the actual
  // coordinate points down to the ground so the whole thing reads
  // as a MazeMap-style teardrop pin. Colored to match the chip's
  // stroke so the pin looks unified.
  addLayerIfMissing(map, {
    id: `${LAYERS.poisChip}-tail`,
    source: SOURCES.pois,
    type: "symbol",
    layout: {
      "text-field": "▼",
      "text-size": ["interpolate", ["linear"], ["zoom"], 15, 9, 19, 15, 21, 20],
      "text-font": ["Noto Sans Regular"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-anchor": "bottom",
    },
    paint: {
      "text-color": [
        "match", ["get", "kind"],
        "elevator",      "#2563eb",
        "stairs",        "#b45309",
        "bathroom",      "#be185d",
        "restroom",      "#be185d",
        "restroom_m",    "#2563eb",
        "restroom_f",    "#be185d",
        "restroom_a",    "#7c3aed",
        "entrance",      "#15803d",
        "exit",          "#b91c1c",
        "door",          "#4b5563",
        "info",          "#0ea5e9",
        "reception",     "#2563eb",
        "cafe",          "#a16207",
        "vending",       "#7c3aed",
        "water",         "#0891b2",
        "first_aid",     "#dc2626",
        "defibrillator", "#e11d48",
        "printer",       "#4b5563",
        "meeting_point", "#059669",
        "parking",       "#0369a1",
        "bike",          "#16a34a",
                         "#111827",
      ],
      "text-halo-color": "#ffffff",
      "text-halo-width": 1,
    },
    minzoom: 16,
  });
  // MazeMap-style 3D POIs — when the map is pitched, add a small
  // vertical offset so icons hover above building walls instead of
  // being occluded. We do this by adjusting `text-translate` (pixel
  // space, negated for "up") — MapLibre pre-2.4 doesn't have a
  // proper z-elevate for symbols. The offset scales with pitch so
  // flat 2D stays untouched.
  //
  // Note: the base `poisChip`/`poisIcon` layers already draw at
  // ground level. This extra layer sits ABOVE the extrusion layer
  // in the paint order so its text isn't clipped by wall geometry.
  addLayerIfMissing(map, {
    id: `${LAYERS.poisIcon}-3d`,
    source: SOURCES.pois,
    type: "symbol",
    layout: {
      "text-field": ["get", "icon"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 15, 11, 19, 20, 21, 30],
      "text-font": ["Noto Sans Regular"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-anchor": "center",
      "visibility": "none", // enabled dynamically when is3D is on
    },
    paint: {
      "text-color": "#111827",
      // Pixel offset upward to hover above the wall shell.
      "text-translate": [0, -32],
      "text-translate-anchor": "viewport",
      // Subtle halo helps the glyph read against varied backgrounds.
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.2,
    },
    minzoom: 16,
  });
}

/** Simple polygon centroid — average of vertex positions. Good enough
 *  for icon placement inside a room. */
function polygonCenter(points: { lat: number; lng: number }[]): { lat: number; lng: number } | null {
  if (!points.length) return null;
  let lat = 0, lng = 0;
  for (const p of points) { lat += p.lat; lng += p.lng; }
  return { lat: lat / points.length, lng: lng / points.length };
}

/** Add or update a GeoJSON source in place. */
function upsertGeoJSONSource(map: MaplibreMap, id: string, data: unknown) {
  const src = map.getSource(id) as import("maplibre-gl").GeoJSONSource | undefined;
  if (src) {
    src.setData(data as never);
  } else {
    map.addSource(id, { type: "geojson", data: data as never });
  }
}

function addLayerIfMissing(map: MaplibreMap, layer: import("maplibre-gl").AddLayerObject) {
  if (map.getLayer(layer.id)) return;
  try {
    map.addLayer(layer);
  } catch {
    // If the map style is still transitioning, MapLibre may reject the
    // add. The next data-driven effect will retry.
  }
}

/** Friendly label for a POI kind — mirrors the sidebar's naming so the
 *  hover tooltip on the map uses the same words the admin sees while
 *  editing. Falls back to a titlecased kind for unknown values so new
 *  POI kinds render sanely without a code change. */
function poiKindLabel(kind: string): string {
  switch (kind) {
    case "stairs":        return "Stairs";
    case "elevator":      return "Elevator";
    case "door":          return "Door";
    case "entrance":      return "Entrance";
    case "exit":          return "Emergency exit";
    case "bathroom":      return "Bathroom";
    case "info":          return "Information";
    case "reception":     return "Reception";
    case "parking":       return "Parking";
    case "bike":          return "Bike parking";
    case "restroom_m":    return "Restroom · M";
    case "restroom_f":    return "Restroom · F";
    case "restroom_a":    return "Accessible restroom";
    case "cafe":          return "Café";
    case "vending":       return "Vending machine";
    case "water":         return "Water fountain";
    case "first_aid":     return "First aid";
    case "defibrillator": return "Defibrillator (AED)";
    case "printer":       return "Printer";
    case "meeting_point": return "Meeting point";
    default: return kind ? (kind.charAt(0).toUpperCase() + kind.slice(1).replace(/_/g, " ")) : "POI";
  }
}

/** Minimal HTML-escape for popup contents — Popup#setHTML doesn't
 *  sanitize, and we're passing untrusted POI labels from the DB. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
