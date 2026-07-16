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
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { Building, Room, Hallway, MapLayer } from "@ksyk/shared";
import { fetchList } from "@/lib/fetchList";

const SOURCES = {
  buildings: "campus-buildings",
  rooms: "campus-rooms",
  hallways: "campus-hallways",
} as const;

const LAYERS = {
  buildingsFill: "campus-buildings-fill",
  buildingsOutline: "campus-buildings-outline",
  buildingsLabel: "campus-buildings-label",
  hallwaysLine: "campus-hallways-line",
  roomsFill: "campus-rooms-fill",
  roomsOutline: "campus-rooms-outline",
  roomsLabel: "campus-rooms-label",
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
  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings", "overlay"],
    queryFn: () => fetchList<Building>("/api/buildings"),
    refetchInterval: 60_000,
  });
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms", "overlay"],
    queryFn: () => fetchList<Room>("/api/rooms"),
    refetchInterval: 60_000,
  });
  const { data: hallways = [] } = useQuery<Hallway[]>({
    queryKey: ["/api/hallways", "overlay"],
    queryFn: () => fetchList<Hallway>("/api/hallways"),
    refetchInterval: 60_000,
  });
  // Layer visibility from the LeftSidebar Layers tab. Missing / dropped
  // layers default to visible so overlay never becomes accidentally
  // blank when the layer table is empty.
  const { data: layers = [] } = useQuery<MapLayer[]>({
    queryKey: ["/api/layers", "overlay"],
    queryFn: () => fetchList<MapLayer>("/api/layers"),
    refetchInterval: 30_000,
  });
  const visibilityById = new Map<string, boolean>();
  for (const l of layers) visibilityById.set(l.id, l.visible !== false);
  const isVisible = (id: string) => visibilityById.get(id) ?? true;

  const clickHandlerRef = useRef(onFeatureClick);
  clickHandlerRef.current = onFeatureClick;

  useEffect(() => {
    if (!map) return;

    const install = () => {
      installBuildings(map, buildings);
      installHallways(map, hallways);
      installRooms(map, rooms, activeFloor ?? null);
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
  }, [map, buildings, rooms, hallways, activeFloor, layers]);

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
      "text-size": 13,
      "text-font": ["Noto Sans Regular"],
      "text-allow-overlap": false,
      "text-optional": true,
    },
    paint: {
      "text-color": ["get", "color"],
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
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
      },
    })),
  };
  upsertGeoJSONSource(map, SOURCES.hallways, data);
  addLayerIfMissing(map, {
    id: LAYERS.hallwaysLine,
    source: SOURCES.hallways,
    type: "line",
    paint: {
      "line-color": "#f59e0b",
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 2, 20, 8],
      "line-opacity": 0.7,
    },
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
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0.0, 17, 0.35, 20, 0.5],
    },
  });
  addLayerIfMissing(map, {
    id: LAYERS.roomsOutline,
    source: SOURCES.rooms,
    type: "line",
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 0.5, 20, 2],
      "line-opacity": 0.9,
    },
  });
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
