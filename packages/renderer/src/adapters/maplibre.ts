/**
 * @ksyk/renderer/adapters/maplibre — MapLibre GL adapter.
 *
 * Wraps a MapLibre `Map` and implements `RendererHandle` on top.
 * Features are batched into a single GeoJSON source per feature-kind,
 * then styled with fill/line/circle/symbol layers. This keeps DOM
 * churn low even for thousands of features because MapLibre
 * re-tessellates the whole source on update in a worker.
 *
 * Rotation-together comes for free: MapLibre rotates the entire
 * tile+layer pipeline via a shared bearing matrix, so labels, icons,
 * hallways, and polygons stay aligned.
 *
 * Selection + hover are separate line overlays on the same source,
 * filtered by feature id.
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
import type { BBox, LatLng, MapTheme } from "@ksyk/shared";

const SOURCE_ID = "ksyk-renderer-features";
const FILL_LAYER = "ksyk-renderer-fill";
const LINE_LAYER = "ksyk-renderer-line";
const POINT_LAYER = "ksyk-renderer-point";
const LABEL_LAYER = "ksyk-renderer-label";
const SELECT_LAYER = "ksyk-renderer-select";
const HOVER_LAYER = "ksyk-renderer-hover";

/** Sentinel value for `data-kind=... == "always-shown"` since MapLibre
 *  layer filters don't have a boolean literal we can compare against. */
const ALWAYS = "__always__";

export function createMaplibreRenderer(opts: CreateRendererOptions): RendererHandle {
  const { container, initialCamera, style, theme } = opts;

  if (!initialCamera?.center) {
    throw new Error(
      "[renderer] createRenderer('maplibre') requires initialCamera.center. " +
        "Fetch MapDefaults from the API and pass it in — no hardcoded fallbacks."
    );
  }

  const map = new maplibregl.Map({
    container,
    style: (style as maplibregl.StyleSpecification | string | undefined) ?? {
      version: 8,
      sources: {},
      layers: [
        {
          id: "background",
          type: "background",
          paint: { "background-color": "#f8fafc" },
        },
      ],
    },
    center: [initialCamera.center.lng, initialCamera.center.lat],
    zoom: initialCamera.zoom ?? 16,
    bearing: initialCamera.bearing ?? 0,
    pitch: initialCamera.pitch ?? 0,
  });

  const features = new Map<string, RenderFeature>();
  const handlers = new Set<RendererEventHandler>();
  const emit = (e: RendererEvent) => handlers.forEach((h) => h(e));

  let activeFloor: number | null = null;
  let selectionId: string | null = null;
  let hoverId: string | null = null;
  let currentTheme: MapTheme = theme ?? {
    mode: "light",
    schoolColor: "#1e40af",
    accentColor: "#2563eb",
    selectionColor: "#f59e0b",
    hoverColor: "#38bdf8",
  };

  const buildFeatureCollection = () => {
    return {
      type: "FeatureCollection" as const,
      features: Array.from(features.values())
        .filter((f) => activeFloor === null || f.floor == null || f.floor === activeFloor)
        .map((f) => {
          const coords = f.coords.map((c) => [c.lng, c.lat]);
          let geometry: unknown;
          if (f.kind === "polygon") {
            const ring = coords.length > 0 && (
              coords[0][0] !== coords[coords.length - 1][0] ||
              coords[0][1] !== coords[coords.length - 1][1]
            )
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
              fill: f.style?.fill ?? currentTheme.accentColor ?? "#2563eb",
              fillOpacity: f.style?.fillOpacity ?? 0.2,
              stroke: f.style?.stroke ?? currentTheme.accentColor ?? "#2563eb",
              strokeWidth: f.style?.strokeWidth ?? 2,
              strokeOpacity: f.style?.strokeOpacity ?? 1,
              textColor: f.style?.textColor ?? (currentTheme.mode === "dark" ? "#f8fafc" : "#0f172a"),
              textSize: f.style?.textSize ?? 12,
              radius: f.style?.radius ?? 6,
              selectable: f.selectable !== false ? ALWAYS : "no",
              z: f.z ?? 0,
              data: f.data ?? null,
            },
          };
        }),
    };
  };

  const applyThemeBackground = () => {
    if (!map.isStyleLoaded()) return;
    const bg = map.getLayer("background") as maplibregl.BackgroundLayerSpecification | undefined;
    if (bg) {
      map.setPaintProperty(
        "background",
        "background-color",
        currentTheme.mode === "dark" ? "#0f172a" : "#f8fafc",
      );
    }
  };

  const syncSource = () => {
    if (!map.isStyleLoaded()) return;
    const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    const data = buildFeatureCollection();
    if (src) {
      src.setData(data as unknown as maplibregl.GeoJSONSourceSpecification["data"]);
      updateSelectionFilters();
      return;
    }
    map.addSource(SOURCE_ID, { type: "geojson", data: data as unknown as maplibregl.GeoJSONSourceSpecification["data"] });
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
      id: SELECT_LAYER,
      source: SOURCE_ID,
      type: "line",
      filter: ["==", ["get", "id"], ""],
      paint: {
        "line-color": currentTheme.selectionColor ?? "#f59e0b",
        "line-width": 4,
      },
    });
    map.addLayer({
      id: HOVER_LAYER,
      source: SOURCE_ID,
      type: "line",
      filter: ["==", ["get", "id"], ""],
      paint: {
        "line-color": currentTheme.hoverColor ?? "#38bdf8",
        "line-width": 3,
        "line-dasharray": [2, 2],
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
        "text-allow-overlap": false,
        "text-optional": true,
      },
      paint: {
        "text-color": ["get", "textColor"],
        "text-halo-color": currentTheme.mode === "dark" ? "#0f172a" : "#ffffff",
        "text-halo-width": 1.5,
      },
    });
    applyThemeBackground();
    updateSelectionFilters();
  };

  const updateSelectionFilters = () => {
    if (!map.getLayer(SELECT_LAYER)) return;
    map.setFilter(SELECT_LAYER, ["==", ["get", "id"], selectionId ?? ""]);
    map.setFilter(HOVER_LAYER, ["==", ["get", "id"], hoverId ?? ""]);
  };

  map.on("load", () => {
    syncSource();
    emit({ type: "ready" });
  });

  const featureFromRendered = (
    rendered: maplibregl.MapGeoJSONFeature[] | undefined,
  ): RenderFeature | null => {
    const first = rendered?.[0];
    if (!first) return null;
    const id = first.properties?.id;
    if (typeof id !== "string") return null;
    return features.get(id) ?? null;
  };

  map.on("click", (e) => {
    const rendered = map.queryRenderedFeatures(e.point, {
      layers: [FILL_LAYER, LINE_LAYER, POINT_LAYER],
    });
    emit({
      type: "click",
      feature: featureFromRendered(rendered),
      latLng: { lat: e.lngLat.lat, lng: e.lngLat.lng },
    });
  });

  map.on("mousemove", (e) => {
    const rendered = map.queryRenderedFeatures(e.point, {
      layers: [FILL_LAYER, LINE_LAYER, POINT_LAYER],
    });
    const f = featureFromRendered(rendered);
    emit({ type: "hover", feature: f, latLng: { lat: e.lngLat.lat, lng: e.lngLat.lng } });
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

  map.on("error", (e) => {
    emit({ type: "error", message: (e as unknown as { error?: { message?: string } }).error?.message ?? "renderer error" });
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
      if (selectionId === id) selectionId = null;
      if (hoverId === id) hoverId = null;
      syncSource();
    },
    clearFeatures() {
      features.clear();
      selectionId = null;
      hoverId = null;
      syncSource();
    },
    setActiveFloor(floor) {
      activeFloor = floor;
      syncSource();
    },
    getActiveFloor() { return activeFloor; },
    setSelection(id) {
      selectionId = id;
      updateSelectionFilters();
    },
    getSelection() { return selectionId; },
    setHover(id) {
      hoverId = id;
      updateSelectionFilters();
    },
    flyTo(center: LatLng, zoom?: number, o?: { duration?: number }) {
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
    setTheme(t) {
      currentTheme = { ...currentTheme, ...t };
      // Rebuild everything so the theme colours propagate through
      // text-color / stroke-color expressions that reference feature
      // props.
      syncSource();
      if (map.getLayer(SELECT_LAYER)) {
        map.setPaintProperty(SELECT_LAYER, "line-color", currentTheme.selectionColor ?? "#f59e0b");
      }
      if (map.getLayer(HOVER_LAYER)) {
        map.setPaintProperty(HOVER_LAYER, "line-color", currentTheme.hoverColor ?? "#38bdf8");
      }
      applyThemeBackground();
    },
    featureAt(x, y) {
      const rendered = map.queryRenderedFeatures({ x, y } as maplibregl.PointLike, {
        layers: [FILL_LAYER, LINE_LAYER, POINT_LAYER],
      });
      return featureFromRendered(rendered);
    },
    on(handler) {
      handlers.add(handler);
      return () => { handlers.delete(handler); };
    },
    destroy() {
      handlers.clear();
      features.clear();
      map.remove();
    },
  };

  return handle;
}

/** Exported so tests / callers can inspect the sentinel. Not for
 *  production consumption. */
export const __ALWAYS = ALWAYS;

/** Silence unused-warning on MaplibreMap import (kept for downstream
 *  typing consumers). */
export type { MaplibreMap };
