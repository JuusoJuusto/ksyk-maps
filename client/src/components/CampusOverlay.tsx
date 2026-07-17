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
} as const;

export interface CampusOverlayProps {
  /** MapLibre map, `null` until it's ready. */
  map: MaplibreMap | null;
  /** Optional — show only this floor's rooms. Null = show all rooms. */
  activeFloor?: number | null;
  /** Called when a building/room is clicked. Receives kind + id. */
  onFeatureClick?: (kind: "building" | "room" | "hallway", id: string) => void;
}

export default function CampusOverlay({
  map, activeFloor, onFeatureClick,
}: CampusOverlayProps) {
  // Single source of truth — reads from the last-published snapshot
  // when available, live tables otherwise. See useCampusData.ts.
  const { buildings, rooms, hallways, stairs, elevators, doors } = useCampusData();
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
      installPOIs(map, { stairs, elevators, doors, rooms }, activeFloor ?? null);
      applyVisibility();
    };
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
      setVis(LAYERS.buildingsFill,    bVis);
      setVis(LAYERS.buildingsOutline, bVis);
      setVis(LAYERS.buildingsLabel,   bVis && lVis);
      setVis(LAYERS.roomsFill,        rVis);
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
    return () => {
      map.off("click", onClick);
      window.clearTimeout(safety);
    };
  }, [map, buildings, rooms, hallways, stairs, elevators, doors, activeFloor, layers, clientOverrides]);

  return null;
}

// ── Layer installers ──────────────────────────────────────────────

function installBuildings(map: MaplibreMap, buildings: Building[]) {
  const data = {
    type: "FeatureCollection" as const,
    features: buildings
      .filter((b) => b.points && b.points.length >= 3)
      .map((b) => ({
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
        },
      })),
  };
  upsertGeoJSONSource(map, SOURCES.buildings, data);

  // MazeMap-style: soft cream fill (using the brand color at very low
  // opacity so buildings still read as "yours") with a crisp darker
  // outline. Zoom-scaled opacity so buildings appear as user gets close.
  addLayerIfMissing(map, {
    id: LAYERS.buildingsFill,
    source: SOURCES.buildings,
    type: "fill",
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.05, 17, 0.12, 20, 0.22],
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
      "line-opacity": 0.95,
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
    },
  });
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
}

function installRooms(map: MaplibreMap, rooms: Room[], activeFloor: number | null) {
  const data = {
    type: "FeatureCollection" as const,
    features: rooms
      .filter((r) => r.points && r.points.length >= 3)
      .filter((r) => activeFloor === null || r.floor === activeFloor)
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
          name: r.name ?? "",
          label: [r.roomNumber, r.name].filter(Boolean).join(" "),
          color: r.colorCode ?? "#059669",
          floor: r.floor ?? 0,
        },
      })),
  };
  upsertGeoJSONSource(map, SOURCES.rooms, data);

  addLayerIfMissing(map, {
    id: LAYERS.roomsFill,
    source: SOURCES.rooms,
    type: "fill",
    paint: {
      "fill-color": ["get", "color"],
      // MazeMap-style: rooms are solid fills — no outline (walls are
      // drawn from the walls source instead). Gentle opacity ramp so
      // the building fills read through at low zoom and rooms take
      // over at close zoom.
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 16, 0.0, 17.5, 0.55, 20, 0.8],
      "fill-antialias": true,
    },
  });
  // Room outlines removed by request — see MazeMap-style comment above.
  // Keeping the layer id in LAYERS.roomsOutline for backwards-compat with
  // the visibility toggles; installer just skips it now.
  void LAYERS.roomsOutline;
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
  stairs:    "⇕",   // up + down arrows
  elevator:  "⇳",   // vertical double-arrow (elevator car)
  door:      "◫",   // door + wall
  entrance:  "▶",   // "in" pointer
  exit:      "◄",   // "out" pointer
  bathroom:  "♁",   // toilet-adjacent
  info:      "ⓘ",
};

interface POIData {
  stairs: Stair[];
  elevators: Elevator[];
  doors: Door[];
  rooms: Room[];
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
        "elevator", "#dbeafe",  // blue-100
        "stairs",   "#fef3c7",  // amber-100
        "bathroom", "#fce7f3",  // pink-100
        "entrance", "#dcfce7",  // green-100
        "exit",     "#fee2e2",  // red-100
        "door",     "#f3f4f6",  // gray-100
                    "#ffffff",  // fallback
      ],
      "circle-stroke-color": [
        "match", ["get", "kind"],
        "elevator", "#2563eb",
        "stairs",   "#b45309",
        "bathroom", "#be185d",
        "entrance", "#15803d",
        "exit",     "#b91c1c",
        "door",     "#4b5563",
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
