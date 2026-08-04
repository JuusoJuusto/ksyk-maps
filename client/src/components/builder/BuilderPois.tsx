/**
 * BuilderPois — renders point-POIs (doors, stairs, elevators, generic
 * POIs) directly on the builder map so admins can see what they're
 * placing without publishing first.
 *
 * Previously invisible: the builder page never rendered doors etc.,
 * so admins had to visit the public map after each publish to check
 * placement. That round-trip is gone.
 *
 * Layers installed on the shared map:
 *   - `builder-doors`         (fill circles, green entrance / grey door / red exit)
 *   - `builder-stairs`        (amber circles with "S" letter)
 *   - `builder-elevators`     (blue circles with "E" letter)
 *   - `builder-pois`          (light chips per POI category)
 *
 * Filters by `activeFloor` when set. Passive component — no click
 * handling; the builder's own hit-test picks up the click.
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Map as MaplibreMap } from "maplibre-gl";

interface PointFeature {
  id: string;
  floor?: number | null;
  mapPositionX?: number | null;
  mapPositionY?: number | null;
  lat?: number | null;
  lng?: number | null;
}
interface DoorFeature extends PointFeature { isEntrance?: boolean | null; isExit?: boolean | null }
interface GenericPoi extends PointFeature { kind?: string | null }

const SRC = {
  doors: "builder-doors-src",
  stairs: "builder-stairs-src",
  elevators: "builder-elevators-src",
  pois: "builder-pois-src",
} as const;
const LYR = {
  doors: "builder-doors",
  doorsLetter: "builder-doors-letter",
  stairs: "builder-stairs",
  stairsLetter: "builder-stairs-letter",
  elevators: "builder-elevators",
  elevatorsLetter: "builder-elevators-letter",
  pois: "builder-pois",
} as const;

interface Props {
  map: MaplibreMap | null;
  activeFloor?: number | null;
}

export default function BuilderPois({ map, activeFloor = null }: Props) {
  const doorsQ = useQuery<DoorFeature[]>({
    queryKey: ["/api/doors"],
    queryFn: async () => {
      const r = await fetch("/api/doors");
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 30_000,
  });
  const stairsQ = useQuery<PointFeature[]>({
    queryKey: ["/api/stairs"],
    queryFn: async () => {
      const r = await fetch("/api/stairs");
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 30_000,
  });
  const elevQ = useQuery<PointFeature[]>({
    queryKey: ["/api/elevators"],
    queryFn: async () => {
      const r = await fetch("/api/elevators");
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 30_000,
  });
  const poisQ = useQuery<GenericPoi[]>({
    queryKey: ["/api/pois"],
    queryFn: async () => {
      const r = await fetch("/api/pois");
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!map) return;

    const build = (pts: PointFeature[], kindProp?: (p: PointFeature) => string) => {
      const features: unknown[] = [];
      for (const p of pts) {
        const f = p.floor ?? 1;
        if (activeFloor !== null && activeFloor !== undefined && f !== activeFloor) continue;
        const lat = p.mapPositionY ?? p.lat;
        const lng = p.mapPositionX ?? p.lng;
        if (typeof lat !== "number" || typeof lng !== "number") continue;
        const props: Record<string, unknown> = { id: p.id, floor: f };
        if (kindProp) props.kind = kindProp(p);
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: props,
        });
      }
      return { type: "FeatureCollection" as const, features };
    };

    const install = () => {
      const doorsData = build(doorsQ.data ?? [], (d) => {
        const dd = d as DoorFeature;
        if (dd.isEntrance) return "entrance";
        if (dd.isExit) return "exit";
        return "door";
      });
      const stairsData = build(stairsQ.data ?? []);
      const elevData = build(elevQ.data ?? []);
      const poisData = build(poisQ.data ?? [], (p) => (p as GenericPoi).kind ?? "other");

      // ─ DOORS ─
      const doorsSrc = map.getSource(SRC.doors) as maplibregl.GeoJSONSource | undefined;
      if (doorsSrc) {
        doorsSrc.setData(doorsData as never);
      } else {
        map.addSource(SRC.doors, { type: "geojson", data: doorsData as never });
        map.addLayer({
          id: LYR.doors,
          source: SRC.doors,
          type: "circle",
          minzoom: 15,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 3, 18, 6, 20, 9],
            "circle-color": [
              "match", ["get", "kind"],
              "entrance", "#16a34a",
              "exit", "#dc2626",
              /* door */ "#374151",
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
            "circle-opacity": 0.98,
          },
        });
        map.addLayer({
          id: LYR.doorsLetter,
          source: SRC.doors,
          type: "symbol",
          minzoom: 17,
          layout: {
            "text-field": [
              "match", ["get", "kind"],
              "entrance", "E",
              "exit", "X",
              /* door */ "D",
            ],
            "text-size": ["interpolate", ["linear"], ["zoom"], 17, 8, 20, 12],
            "text-font": ["Noto Sans Regular"],
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#00000055",
            "text-halo-width": 0.4,
          },
        });
      }

      // ─ STAIRS ─
      const stairsSrc = map.getSource(SRC.stairs) as maplibregl.GeoJSONSource | undefined;
      if (stairsSrc) {
        stairsSrc.setData(stairsData as never);
      } else {
        map.addSource(SRC.stairs, { type: "geojson", data: stairsData as never });
        map.addLayer({
          id: LYR.stairs,
          source: SRC.stairs,
          type: "circle",
          minzoom: 15,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 4, 18, 8, 20, 12],
            "circle-color": "#f59e0b",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
            "circle-opacity": 0.98,
          },
        });
        map.addLayer({
          id: LYR.stairsLetter,
          source: SRC.stairs,
          type: "symbol",
          minzoom: 16,
          layout: {
            "text-field": "S",
            "text-size": ["interpolate", ["linear"], ["zoom"], 16, 9, 20, 14],
            "text-font": ["Noto Sans Regular"],
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#00000060",
            "text-halo-width": 0.4,
          },
        });
      }

      // ─ ELEVATORS ─
      const elevSrc = map.getSource(SRC.elevators) as maplibregl.GeoJSONSource | undefined;
      if (elevSrc) {
        elevSrc.setData(elevData as never);
      } else {
        map.addSource(SRC.elevators, { type: "geojson", data: elevData as never });
        map.addLayer({
          id: LYR.elevators,
          source: SRC.elevators,
          type: "circle",
          minzoom: 15,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 4, 18, 8, 20, 12],
            "circle-color": "#2563eb",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
            "circle-opacity": 0.98,
          },
        });
        map.addLayer({
          id: LYR.elevatorsLetter,
          source: SRC.elevators,
          type: "symbol",
          minzoom: 16,
          layout: {
            "text-field": "E",
            "text-size": ["interpolate", ["linear"], ["zoom"], 16, 9, 20, 14],
            "text-font": ["Noto Sans Regular"],
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#00000060",
            "text-halo-width": 0.4,
          },
        });
      }

      // ─ GENERIC POIs ─
      // Colored by kind — reception/info blue, cafe amber, restroom
      // pink, first-aid red, parking cyan, everything else grey.
      const poisSrc = map.getSource(SRC.pois) as maplibregl.GeoJSONSource | undefined;
      if (poisSrc) {
        poisSrc.setData(poisData as never);
      } else {
        map.addSource(SRC.pois, { type: "geojson", data: poisData as never });
        map.addLayer({
          id: LYR.pois,
          source: SRC.pois,
          type: "circle",
          minzoom: 15,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 3.5, 18, 7, 20, 10],
            "circle-color": [
              "match", ["get", "kind"],
              "info", "#0ea5e9",
              "reception", "#0ea5e9",
              "cafe", "#f59e0b",
              "vending", "#d97706",
              "water", "#06b6d4",
              "first_aid", "#dc2626",
              "defibrillator", "#dc2626",
              "restroom_m", "#ec4899",
              "restroom_f", "#ec4899",
              "restroom_a", "#ec4899",
              "parking", "#6366f1",
              "bike", "#10b981",
              "printer", "#a855f7",
              "meeting", "#8b5cf6",
              /* other */ "#6b7280",
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
            "circle-opacity": 0.95,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      install();
    } else {
      const onLoad = () => install();
      map.once("load", onLoad);
      map.once("styledata", onLoad);
    }
  }, [map, activeFloor, doorsQ.data, stairsQ.data, elevQ.data, poisQ.data]);

  // Cleanup on unmount — remove all layers + sources we added.
  useEffect(() => {
    return () => {
      if (!map) return;
      for (const l of Object.values(LYR)) {
        if (map.getLayer(l)) map.removeLayer(l);
      }
      for (const s of Object.values(SRC)) {
        if (map.getSource(s)) map.removeSource(s);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}
