/**
 * @ksyk/renderer/adapters/maplibre — MapLibre GL adapter.
 *
 * Wraps a MapLibre `Map` and implements `RendererHandle` on top. Features
 * are batched into a single GeoJSON source per feature-kind, then styled
 * with fill/line/circle/symbol layers. This keeps DOM churn low even for
 * thousands of features because MapLibre re-tessellates the whole source
 * on update in a worker.
 */
import maplibregl, { Map as MaplibreMap } from "maplibre-gl";
import type {
  CameraState,
  CreateRendererOptions,
  RendererEvent,
  RendererEventHandler,
  RendererHandle,
  RenderFeature,
} from "../types";
import type { BBox, LatLng } from "@ksyk/shared";

const SOURCE_ID = "ksyk-renderer-features";
const FILL_LAYER = "ksyk-renderer-fill";
const LINE_LAYER = "ksyk-renderer-line";
const POINT_LAYER = "ksyk-renderer-point";
const LABEL_LAYER = "ksyk-renderer-label";

export function createMaplibreRenderer(opts: CreateRendererOptions): RendererHandle {
  const {
    container,
    initialCamera,
    style = "https://demotiles.maplibre.org/style.json",
  } = opts;

  const map = new maplibregl.Map({
    container,
    style: style as any,
    center: initialCamera?.center
      ? [initialCamera.center.lng, initialCamera.center.lat]
      : [25.0289, 60.1859], // KSYK Helsinki default
    zoom: initialCamera?.zoom ?? 15,
    bearing: initialCamera?.bearing ?? 0,
    pitch: initialCamera?.pitch ?? 0,
  });

  const features = new Map<string, RenderFeature>();
  const handlers = new Set<RendererEventHandler>();
  const emit = (e: RendererEvent) => handlers.forEach((h) => h(e));

  const buildFeatureCollection = () => {
    return {
      type: "FeatureCollection" as const,
      features: Array.from(features.values()).map((f) => {
        const coords = f.coords.map((c) => [c.lng, c.lat]);
        let geometry: any;
        if (f.kind === "polygon") {
          const ring = coords.length > 0 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])
            ? [...coords, coords[0]]
            : coords;
          geometry = { type: "Polygon", coordinates: [ring] };
        } else if (f.kind === "line") {
          geometry = { type: "LineString", coordinates: coords };
        } else {
          geometry = { type: "Point", coordinates: coords[0] };
        }
        return {
          type: "Feature" as const,
          geometry,
          properties: {
            id: f.id,
            kind: f.kind,
            label: f.label ?? null,
            fill: f.style?.fill ?? "#2563eb",
            fillOpacity: f.style?.fillOpacity ?? 0.2,
            stroke: f.style?.stroke ?? "#2563eb",
            strokeWidth: f.style?.strokeWidth ?? 2,
            strokeOpacity: f.style?.strokeOpacity ?? 1,
            textColor: f.style?.textColor ?? "#0f172a",
            textSize: f.style?.textSize ?? 12,
            radius: f.style?.radius ?? 6,
            z: f.z ?? 0,
            data: f.data ?? null,
          },
        };
      }),
    };
  };

  const syncSource = () => {
    if (!map.isStyleLoaded()) return;
    const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    const data = buildFeatureCollection();
    if (src) {
      src.setData(data as any);
    } else {
      map.addSource(SOURCE_ID, { type: "geojson", data: data as any });
      map.addLayer({
        id: FILL_LAYER,
        source: SOURCE_ID,
        type: "fill",
        filter: ["==", ["get", "kind"], "polygon"],
        paint: {
          "fill-color": ["get", "fill"],
          "fill-opacity": ["get", "fillOpacity"],
        },
      });
      map.addLayer({
        id: LINE_LAYER,
        source: SOURCE_ID,
        type: "line",
        filter: ["in", ["get", "kind"], ["literal", ["polygon", "line"]]],
        paint: {
          "line-color": ["get", "stroke"],
          "line-width": ["get", "strokeWidth"],
          "line-opacity": ["get", "strokeOpacity"],
        },
      });
      map.addLayer({
        id: POINT_LAYER,
        source: SOURCE_ID,
        type: "circle",
        filter: ["==", ["get", "kind"], "point"],
        paint: {
          "circle-radius": ["get", "radius"],
          "circle-color": ["get", "fill"],
          "circle-stroke-color": ["get", "stroke"],
          "circle-stroke-width": ["get", "strokeWidth"],
        },
      });
      map.addLayer({
        id: LABEL_LAYER,
        source: SOURCE_ID,
        type: "symbol",
        filter: ["!=", ["get", "label"], null],
        layout: {
          "text-field": ["get", "label"],
          "text-size": ["get", "textSize"],
          "text-font": ["Noto Sans Regular"],
        },
        paint: {
          "text-color": ["get", "textColor"],
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });
    }
  };

  map.on("load", () => {
    syncSource();
    emit({ type: "ready" });
  });

  map.on("click", (e) => {
    const feats = map.queryRenderedFeatures(e.point, {
      layers: [FILL_LAYER, LINE_LAYER, POINT_LAYER],
    });
    const first = feats[0];
    const feature =
      first && typeof first.properties?.id === "string"
        ? features.get(first.properties.id as string) ?? null
        : null;
    emit({
      type: "click",
      feature,
      latLng: { lat: e.lngLat.lat, lng: e.lngLat.lng },
    });
  });

  map.on("move", () => {
    emit({
      type: "camerachange",
      camera: {
        center: { lat: map.getCenter().lat, lng: map.getCenter().lng },
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      },
    });
  });

  const handle: RendererHandle = {
    addFeature(f) {
      features.set(f.id, f);
      syncSource();
    },
    addFeatures(fs) {
      for (const f of fs) features.set(f.id, f);
      syncSource();
    },
    removeFeature(id) {
      features.delete(id);
      syncSource();
    },
    clearFeatures() {
      features.clear();
      syncSource();
    },
    flyTo(center: LatLng, zoom?: number, o) {
      map.flyTo({
        center: [center.lng, center.lat],
        zoom: zoom ?? map.getZoom(),
        duration: o?.duration ?? 800,
      });
    },
    fitBBox(b: BBox, o) {
      map.fitBounds(
        [
          [b.minLng, b.minLat],
          [b.maxLng, b.maxLat],
        ],
        { padding: o?.padding ?? 40, duration: o?.duration ?? 800 },
      );
    },
    setBearing(deg, o) {
      if (o?.animate ?? true) map.rotateTo(deg, { duration: 400 });
      else map.setBearing(deg);
    },
    setPitch(deg, o) {
      if (o?.animate ?? true) map.easeTo({ pitch: deg, duration: 400 });
      else map.setPitch(deg);
    },
    getCamera() {
      return {
        center: { lat: map.getCenter().lat, lng: map.getCenter().lng },
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      };
    },
    featureAt(x, y) {
      const feats = map.queryRenderedFeatures({ x, y } as any, {
        layers: [FILL_LAYER, LINE_LAYER, POINT_LAYER],
      });
      const first = feats[0];
      if (first && typeof first.properties?.id === "string") {
        return features.get(first.properties.id as string) ?? null;
      }
      return null;
    },
    on(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    destroy() {
      handlers.clear();
      features.clear();
      map.remove();
    },
  };

  return handle;
}
