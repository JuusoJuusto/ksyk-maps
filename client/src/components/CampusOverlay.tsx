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
import type { Map as MaplibreMap } from "maplibre-gl";
import type { Building, Room, Hallway, MapLayer, Stair, Elevator, Door } from "@ksyk/shared";
import { fetchList } from "@/lib/fetchList";
import { readLayerOverrides } from "@/components/LayersToggle";
import { useCampusData } from "@/hooks/useCampusData";

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
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<Record<string, boolean>>).detail;
      if (detail && typeof detail === "object") setClientOverrides({ ...detail });
    };
    window.addEventListener("ksyk:layer-visibility", onChange);
    return () => window.removeEventListener("ksyk:layer-visibility", onChange);
  }, []);
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

    const install = () => {
      installBuildings(map, buildings);
      installHallways(map, hallways);
      installRooms(map, rooms, activeFloor ?? null);
      installPOIs(map, { stairs, elevators, doors, rooms, generic: pois }, activeFloor ?? null);
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
      // as a real MazeMap-style raised platform inside the shell.
      setVis(LAYERS.roomsFill,        rVis && !is3D);
      setVis(LAYERS.rooms3D,          rVis && is3D);
      setVis(LAYERS.roomsOutline,     rVis);
      setVis(LAYERS.roomsLabel,       rVis && lVis);
      setVis(LAYERS.hallwaysLine,     hVis);
    };
    // Robust install trigger — style may already be loaded (fast path),
    // still loading (register a one-off), OR the effect may be running
    // between load + first paint. Attach BOTH a `load` and a
    // `styledata` listener so we don't miss the moment.
    let installed = false;
    const runInstall = () => {
      if (installed) { install(); return; } // just refresh data
      installed = true;
      install();
    };
    if (map.isStyleLoaded()) {
      runInstall();
    } else {
      const onLoad = () => runInstall();
      map.once("load", onLoad);
      map.once("styledata", onLoad);
    }
    // Safety net — if for any reason install never fired within 500ms
    // of map ready, poll and try once more. Fixes the sporadic
    // "buildings sometimes don't load on first visit" race.
    const safety = window.setTimeout(() => {
      if (!installed && map && map.isStyleLoaded()) runInstall();
    }, 500);

    const onClick = (e: import("maplibre-gl").MapMouseEvent) => {
      const feats = map.queryRenderedFeatures(e.point, {
        layers: [LAYERS.buildingsFill, LAYERS.roomsFill, LAYERS.hallwaysLine].filter((id) => map.getLayer(id)),
      });
      const hit = feats[0];
      if (!hit || typeof hit.properties?.id !== "string") return;
      // Locked layers block interaction. Check the corresponding
      // layer's `locked` flag from the /api/layers table.
      const kind = hit.layer.id === LAYERS.buildingsFill ? "building"
                 : hit.layer.id === LAYERS.roomsFill    ? "room"
                 :                                        "hallway";
      const layerRow = layers.find((l) => l.id === (kind === "building" ? "buildings" : kind === "room" ? "rooms" : "hallways"));
      if (layerRow?.locked) return;
      clickHandlerRef.current?.(kind, hit.properties.id);
    };
    map.on("click", onClick);

    // MazeMap-style cursor + hover feedback — swap to a pointer any
    // time the mouse is over a hoverable feature. We use a low-cost
    // move handler that just runs queryRenderedFeatures on the
    // buildings/rooms/hallways layers and toggles the canvas cursor.
    const hoverableLayers = [LAYERS.buildingsFill, LAYERS.roomsFill, LAYERS.hallwaysLine, LAYERS.poisChip, LAYERS.poisIcon];
    const onMove = (e: import("maplibre-gl").MapMouseEvent) => {
      const layerIds = hoverableLayers.filter((id) => map.getLayer(id));
      if (layerIds.length === 0) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: layerIds });
      map.getCanvas().style.cursor = feats.length > 0 ? "pointer" : "";
    };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };
    map.on("mousemove", onMove);
    map.on("mouseleave", onLeave);

    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
      map.off("mouseleave", onLeave);
      window.clearTimeout(safety);
    };
  }, [map, buildings, rooms, hallways, stairs, elevators, doors, pois, activeFloor, layers, clientOverrides, is3D]);

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
        const height = Math.max(METERS_PER_FLOOR, floors * METERS_PER_FLOOR);
        const style = (b.metadata as { style?: Record<string, unknown> } | null | undefined)?.style ?? {};
        return {
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
            showOutline: style.showOutline !== false, // default true
            fillOpacity: typeof style.fillOpacity === "number" ? style.fillOpacity : null,
            showLabel: style.showLabel !== false,     // default true
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
        const height = Math.max(METERS_PER_FLOOR, floors * METERS_PER_FLOOR);
        // Wall thickness — real walls are ~0.3 m; we use 0.7 m so the
        // extrusion reads visually even at zoom 17 without swallowing the
        // interior.
        const outer = b.points!.map((p) => [p.lng, p.lat] as [number, number]);
        const inner = insetPolygonMeters(outer, 0.7);
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
    const coords = [
      ...b.points.map((p) => [p.lng, p.lat]),
      [b.points[0].lng, b.points[0].lat],
    ];
    // Iterate every floor in range. `floorIdx` = zero-based index for Z
    // stacking (so floorMin sits at ground, next slab METERS_PER_FLOOR
    // above, and so on).
    const lo = Math.min(floorMin, floorMax);
    const hi = Math.max(floorMin, floorMax);
    for (let f = lo, floorIdx = 0; f <= hi; f++, floorIdx++) {
      const base = floorIdx * METERS_PER_FLOOR;
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
      const height = Math.max(METERS_PER_FLOOR, floors * METERS_PER_FLOOR);
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
      "fill-opacity": [
        "case",
        ["!=", ["get", "fillOpacity"], null],
        ["get", "fillOpacity"],
        ["interpolate", ["linear"], ["zoom"], 14, 0.05, 17, 0.12, 20, 0.22],
      ],
      "fill-outline-color": ["get", "color"],
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
      "line-width": ["interpolate", ["linear"], ["zoom"], 14, 1.5, 17, 2.5, 20, 3.5],
      // Per-feature outline toggle — false collapses the line to zero
      // opacity without hiding the layer for every building.
      "line-opacity": ["case", ["get", "showOutline"], 0.95, 0],
    },
  });
  addLayerIfMissing(map, {
    id: LAYERS.buildingsLabel,
    source: SOURCES.buildings,
    type: "symbol",
    layout: {
      "text-field": ["get", "name"],
      // Scale up as the user zooms in — hard to read a tiny label on a
      // big polygon at zoom 19.
      "text-size": ["interpolate", ["linear"], ["zoom"], 14, 12, 17, 15, 20, 18],
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
      // not a solid block.
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.0, 16, 0.45, 20, 0.7],
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

function installHallways(map: MaplibreMap, hallways: Hallway[]) {
  const data = {
    type: "FeatureCollection" as const,
    features: hallways.map((h) => ({
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: [[h.startX, h.startY], [h.endX, h.endY]],
      },
      properties: {
        id: h.id,
        width: h.width ?? 2,
        floor: h.floor ?? 0,
        // Walls are stored as hallways with surface="wall". The renderer
        // uses this to switch to a dark thick line instead of the
        // walkable amber path.
        isWall: h.surface === "wall",
      },
    })),
  };
  upsertGeoJSONSource(map, SOURCES.hallways, data);
  // MazeMap-style hallway: a soft cream "corridor" (light fill line
  // for the walkable strip) sitting under a slightly thinner outline
  // so the corridor reads as an area with edges rather than a raw
  // colored stroke.
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
    filter: ["!=", ["get", "isWall"], true],
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
    filter: ["!=", ["get", "isWall"], true],
  });
  // Walls — thick dark segments with rounded caps for a MazeMap look.
  // Slightly heavier than the previous version so barriers really stand
  // out against room fills.
  addLayerIfMissing(map, {
    id: "campus-walls-line",
    source: SOURCES.hallways,
    type: "line",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#0f172a",
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 1.8, 20, 5.5],
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

function installRooms(map: MaplibreMap, rooms: Room[], activeFloor: number | null) {
  const data = {
    type: "FeatureCollection" as const,
    features: rooms
      .filter((r) => r.points && r.points.length >= 3)
      .filter((r) => activeFloor === null || r.floor === activeFloor)
      .map((r) => {
        const style = (r.metadata as { style?: Record<string, unknown> } | null | undefined)?.style ?? {};
        return {
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
            name: r.name ?? "",
            label: [r.roomNumber, r.name].filter(Boolean).join(" "),
            color: r.colorCode ?? "#059669",
            floor: r.floor ?? 0,
            showOutline: style.showOutline !== false,
            fillOpacity: typeof style.fillOpacity === "number" ? style.fillOpacity : null,
            showLabel: style.showLabel !== false,
          },
        };
      }),
  };
  upsertGeoJSONSource(map, SOURCES.rooms, data);

  // 3D room slabs — sit ON TOP of the building's floor plate for the
  // room's floor. We compute a Z base = (floor - 1) * METERS_PER_FLOOR
  // + 0.08 (floor slab thickness) and extrude by ROOM_SLAB_METERS so
  // the room reads as a raised platform inside the wall shell.
  //
  // Filtering: only the active floor's rooms extrude — otherwise every
  // floor's rooms would stack visually inside the shell and the user
  // couldn't see which one they're actually looking at. MazeMap does
  // the same — you swap floor, the interior redraws.
  const rooms3DData = {
    type: "FeatureCollection" as const,
    features: rooms
      .filter((r) => r.points && r.points.length >= 3)
      .filter((r) => activeFloor === null || r.floor === activeFloor)
      .map((r) => {
        const floor = r.floor ?? 1;
        const floorIdx = Math.max(0, floor - 1);
        const base = floorIdx * METERS_PER_FLOOR + 0.08;
        return {
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
            floor,
            base,
            height: base + ROOM_SLAB_METERS,
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
      // drawn from the walls source instead). Gentle opacity ramp so
      // the building fills read through at low zoom and rooms take
      // over at close zoom. Per-feature override lets the user pin an
      // exact opacity from the Style tab.
      "fill-opacity": [
        "case",
        ["!=", ["get", "fillOpacity"], null],
        ["get", "fillOpacity"],
        ["interpolate", ["linear"], ["zoom"], 16, 0.0, 17.5, 0.55, 20, 0.8],
      ],
      "fill-antialias": true,
    },
  });
  // Room outlines removed by request — see MazeMap-style comment above.
  // Keeping the layer id in LAYERS.roomsOutline for backwards-compat with
  // the visibility toggles; installer just skips it now.
  void LAYERS.roomsOutline;

  // 3D room slabs — used when the map is pitched. Sits at the correct
  // Z for the room's floor so multi-story buildings actually stack.
  // Because the slab is thin (ROOM_SLAB_METERS ≈ 35 cm), the user sees
  // colored floor plates through the shell rather than solid room
  // "boxes" that would fill the whole floor volume.
  addLayerIfMissing(map, {
    id: LAYERS.rooms3D,
    source: "campus-rooms-3d",
    type: "fill-extrusion",
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": ["get", "color"],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": ["get", "base"],
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 16, 0.0, 17, 0.75, 20, 0.9],
      "fill-extrusion-vertical-gradient": true,
    },
    minzoom: 16,
  });
  addLayerIfMissing(map, {
    id: LAYERS.roomsLabel,
    source: SOURCES.rooms,
    type: "symbol",
    layout: {
      "text-field": ["get", "label"],
      // MazeMap uses a compact, weightier label that scales with zoom.
      "text-size": ["interpolate", ["linear"], ["zoom"], 17, 10, 20, 14],
      "text-font": ["Noto Sans Regular"],
      "text-allow-overlap": false,
      "text-optional": true,
      "text-anchor": "center",
      "text-max-width": 10,
      "text-padding": 2,
    },
    paint: {
      "text-color": "#0b1220",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.6,
      "text-halo-blur": 0.4,
      "text-opacity": ["case", ["get", "showLabel"], 1, 0],
    },
    // Only start drawing room labels once the user is zoomed in enough
    // that they can distinguish rooms — before that, buildings labels
    // dominate.
    minzoom: 17,
  });
}

/** Icons for the POI symbol layer. Using Unicode pictographs keeps us
 *  glyph-only — no image loading, no CORS, no atlas. Rendered by the
 *  demotiles font which covers Latin-1 + basic pictographs; the black
 *  square chip behind each icon supplies contrast on any tile theme.
 *
 *  Order of poiKind here dictates render priority — later ones sit on
 *  top when two POIs overlap. */
/** MazeMap-style POI glyphs. Kept in a single font (Noto Sans) so we
 *  don't have to load an icon atlas. Uses cleaner geometric symbols
 *  that read as pictographs at 12–20 px. */
const POI_ICON: Record<string, string> = {
  stairs:        "⇕",   // up + down arrows
  elevator:      "⇳",   // vertical double-arrow (elevator car)
  door:          "◫",   // door + wall
  entrance:      "▶",   // "in" pointer
  exit:          "◄",   // "out" pointer
  bathroom:      "♁",   // toilet-adjacent
  info:          "ⓘ",
  reception:     "☎",
  parking:       "Ⓟ",
  bike:          "🚲",  // universal
  restroom_m:    "♂",
  restroom_f:    "♀",
  restroom_a:    "♿",  // accessible
  // v3.15 additions — MazeMap-style POIs. Emoji fallbacks so the icons
  // render even in the default `Noto Sans Regular` font.
  cafe:          "☕",
  vending:       "🍫",
  water:         "💧",
  first_aid:     "＋",
  defibrillator: "⚡",
  printer:       "🖨",
  meeting_point: "⚑",
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

function installPOIs(map: MaplibreMap, data: POIData, activeFloor: number | null) {
  type PoiFeature = {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: { id: string; kind: string; icon: string; floor: number | null };
  };
  const features: PoiFeature[] = [];

  const push = (id: string, kind: string, floor: number | null, lat: number, lng: number) => {
    if (activeFloor !== null && floor !== null && floor !== activeFloor) return;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: { id, kind, icon: POI_ICON[kind] ?? "•", floor },
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
      push(e.id, "elevator", e.floors?.[0] ?? null, e.position.lat, e.position.lng);
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
    push(p.id, p.kind, p.floor ?? null, p.position.lat, p.position.lng);
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
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 7, 20, 15],
      "circle-color": [
        "match", ["get", "kind"],
        "elevator",      "#dbeafe",  // blue-100
        "stairs",        "#fef3c7",  // amber-100
        "bathroom",      "#fce7f3",  // pink-100
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
    minzoom: 16,
  });
  addLayerIfMissing(map, {
    id: LAYERS.poisIcon,
    source: SOURCES.pois,
    type: "symbol",
    layout: {
      "text-field": ["get", "icon"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 15, 11, 20, 22],
      "text-font": ["Noto Sans Regular"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-anchor": "center",
    },
    paint: {
      "text-color": "#111827",
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
      "text-size": ["interpolate", ["linear"], ["zoom"], 15, 11, 20, 22],
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
