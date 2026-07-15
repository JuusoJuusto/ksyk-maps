/**
 * @ksyk/renderer/scene — high-level scene manager.
 *
 * Sits on top of the low-level `RendererHandle`. Owns:
 *   - A `SpatialIndex` over all features so we can send the renderer
 *     only what is (a) on the active floor and (b) inside the current
 *     viewport bbox.
 *   - LOD tiers — feature `data.lod` levels (0 = always, 1 = zoom ≥
 *     15, 2 = zoom ≥ 17). Adapters that can't reason about LOD skip
 *     this pass; the culling still runs.
 *   - A camera-change debounce (16 ms — one frame at 60 FPS) so
 *     scrolling the map doesn't thrash `addFeatures`.
 *
 * Consumers work in the scene layer, not the raw renderer, so the
 * public map + builder share culling behaviour.
 */
import type { RenderFeature, RendererHandle } from "./types";
import { SpatialIndex, type BBox, polygonBounds } from "@ksyk/shared";

/** Feature `data.lod` — 0 always drawn, 1 requires zoom ≥ threshold. */
const LOD_ZOOM_THRESHOLDS: Record<number, number> = { 0: 0, 1: 15, 2: 17, 3: 18.5 };

export interface RenderScene {
  /** Add or replace a feature in the scene. */
  add(feature: RenderFeature): void;
  addMany(features: RenderFeature[]): void;
  remove(id: string): void;
  clear(): void;
  /** Total features tracked. */
  get size(): number;
  /** Force a re-cull against the current camera. */
  refresh(): void;
  /** Tear down. */
  destroy(): void;
}

export function createScene(renderer: RendererHandle): RenderScene {
  const featureById = new Map<string, RenderFeature>();
  const spatial = new SpatialIndex();
  /** ids currently pushed to the renderer. */
  const pushed = new Set<string>();

  let refreshScheduled = false;
  const scheduleRefresh = () => {
    if (refreshScheduled) return;
    refreshScheduled = true;
    // Use requestAnimationFrame if we're in a DOM context, otherwise
    // setTimeout — the scene works both in-browser and in headless
    // tests.
    const raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (fn: () => void) => setTimeout(fn, 16);
    raf(() => {
      refreshScheduled = false;
      recull();
    });
  };

  const featureBBox = (f: RenderFeature): BBox => {
    if (f.coords.length === 0) {
      // Degenerate — treat as a zero-extent point at (0,0). Shouldn't
      // happen but don't crash the index.
      return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
    }
    if (f.kind === "point" || f.kind === "label") {
      return {
        minLat: f.coords[0].lat, maxLat: f.coords[0].lat,
        minLng: f.coords[0].lng, maxLng: f.coords[0].lng,
      };
    }
    const b = polygonBounds(f.coords);
    return b ?? {
      minLat: f.coords[0].lat, maxLat: f.coords[0].lat,
      minLng: f.coords[0].lng, maxLng: f.coords[0].lng,
    };
  };

  const viewportBBox = (): BBox => {
    // Approximate the viewport as ±0.5° around the current camera
    // centre — MapLibre queries in tiles behind the scenes so an
    // over-estimate here is fine (culled features are re-checked by
    // MapLibre anyway). Tuning this narrows the candidate set.
    const cam = renderer.getCamera();
    // ~ 2^(21-zoom) metres per pixel at equator, but we don't have the
    // viewport pixel size here. A conservative 500 m radius at
    // zoom 18, doubling every zoom step lower, works well in practice.
    const zoom = cam.zoom;
    const radiusMeters = 500 * Math.pow(2, Math.max(0, 18 - zoom));
    const dLat = radiusMeters / 111_320;
    const dLng = dLat / Math.max(0.1, Math.cos((cam.center.lat * Math.PI) / 180));
    return {
      minLat: cam.center.lat - dLat,
      maxLat: cam.center.lat + dLat,
      minLng: cam.center.lng - dLng,
      maxLng: cam.center.lng + dLng,
    };
  };

  const lodPassesForZoom = (f: RenderFeature, zoom: number): boolean => {
    const lod = typeof f.data?.lod === "number" ? (f.data.lod as number) : 0;
    const threshold = LOD_ZOOM_THRESHOLDS[lod] ?? 0;
    return zoom >= threshold;
  };

  const recull = () => {
    const cam = renderer.getCamera();
    const bbox = viewportBBox();
    const activeFloor = renderer.getActiveFloor();
    const candidateIds = new Set(spatial.queryBBox(bbox));

    const wanted = new Set<string>();
    for (const id of candidateIds) {
      const f = featureById.get(id);
      if (!f) continue;
      if (activeFloor !== null && f.floor != null && f.floor !== activeFloor) continue;
      if (!lodPassesForZoom(f, cam.zoom)) continue;
      wanted.add(id);
    }

    // Push new ones; drop the ones no longer in view.
    const toAdd: RenderFeature[] = [];
    for (const id of wanted) {
      if (!pushed.has(id)) {
        const f = featureById.get(id)!;
        toAdd.push(f);
      }
    }
    if (toAdd.length) renderer.addFeatures(toAdd);
    for (const id of pushed) {
      if (!wanted.has(id)) renderer.removeFeature(id);
    }
    pushed.clear();
    for (const id of wanted) pushed.add(id);
  };

  const unsubscribe = renderer.on((e) => {
    if (e.type === "camerachange") scheduleRefresh();
    if (e.type === "ready") scheduleRefresh();
  });

  return {
    add(f) {
      featureById.set(f.id, f);
      spatial.insert(f.id, featureBBox(f));
      scheduleRefresh();
    },
    addMany(fs) {
      for (const f of fs) {
        featureById.set(f.id, f);
        spatial.insert(f.id, featureBBox(f));
      }
      scheduleRefresh();
    },
    remove(id) {
      featureById.delete(id);
      spatial.remove(id);
      if (pushed.has(id)) {
        renderer.removeFeature(id);
        pushed.delete(id);
      }
    },
    clear() {
      featureById.clear();
      spatial.clear();
      renderer.clearFeatures();
      pushed.clear();
    },
    get size() { return featureById.size; },
    refresh() { recull(); },
    destroy() {
      unsubscribe();
      featureById.clear();
      spatial.clear();
      pushed.clear();
    },
  };
}
