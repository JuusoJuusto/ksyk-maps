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
    if (map.isStyleLoaded()) install();
    else map.once("load", install);

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
    return () => { map.off("click", onClick); };
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

  addLayerIfMissing(map, {
    id: LAYERS.buildingsFill,
    source: SOURCES.buildings,
    type: "fill",
    paint: { "fill-color": ["get", "color"], "fill-opacity": 0.15 },
  });
  addLayerIfMissing(map, {
    id: LAYERS.buildingsOutline,
    source: SOURCES.buildings,
    type: "line",
    paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.85 },
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
  // Walkable hallway paint — amber-orange lane, filtered so walls aren't
  // matched.
  addLayerIfMissing(map, {
    id: LAYERS.hallwaysLine,
    source: SOURCES.hallways,
    type: "line",
    paint: {
      "line-color": "#f59e0b",
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 2, 20, 8],
      "line-opacity": 0.7,
    },
    filter: ["!=", ["get", "isWall"], true],
  });
  // Walls — dark thick lines drawn on top so they read as solid
  // barriers, MazeMap-style.
  addLayerIfMissing(map, {
    id: "campus-walls-line",
    source: SOURCES.hallways,
    type: "line",
    paint: {
      "line-color": "#1f2937",
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 1.5, 20, 4],
      "line-opacity": 0.9,
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
      // MazeMap-style: rooms are solid fills, no outline. Walls that
      // separate rooms are drawn from the walls source instead so the
      // building never looks like a stained-glass window.
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0.0, 17, 0.6, 20, 0.85],
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
      "text-size": 11,
      "text-font": ["Noto Sans Regular"],
      "text-allow-overlap": false,
      "text-optional": true,
    },
    paint: {
      "text-color": "#0f172a",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.2,
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
const POI_ICON: Record<string, string> = {
  stairs:    "⇅",
  elevator:  "⇵",
  door:      "▯",
  entrance:  "➜",
  exit:      "⤴",
  bathroom:  "⚑", // room-type mapping (rooms named "bathroom" render as this)
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

  addLayerIfMissing(map, {
    id: LAYERS.poisChip,
    source: SOURCES.pois,
    type: "circle",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 6, 20, 14],
      "circle-color": "#ffffff",
      "circle-stroke-color": "#111827",
      "circle-stroke-width": 1.5,
      "circle-opacity": 0.95,
    },
    minzoom: 16,
  });
  addLayerIfMissing(map, {
    id: LAYERS.poisIcon,
    source: SOURCES.pois,
    type: "symbol",
    layout: {
      "text-field": ["get", "icon"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 15, 10, 20, 20],
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
