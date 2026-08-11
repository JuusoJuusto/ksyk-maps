/**
 * SelectionHandles — MapLibre-anchored edit gizmos for the builder.
 *
 * Installs three MapLibre layers on top of the selected feature:
 *   1. `selection-vertices` — draggable circles at each polygon corner.
 *   2. `selection-rotator`  — one draggable circle above the centroid
 *      with a stem connecting it to the shape.
 *   3. `selection-outline`  — highlighted polygon outline so the
 *      current selection reads clearly.
 *
 * Drag semantics:
 *   - Vertex drag: mutates that single point in the polygon, PATCHing
 *     the entity on `mouseup`.
 *   - Rotation drag: rotates all polygon points around the centroid,
 *     PATCHing `rotationDeg` + rotated `points` on `mouseup`.
 *
 * The component is headless (returns null) — everything renders inside
 * MapLibre's canvas so it stays perfectly aligned during pan / rotate /
 * pitch, unlike a DOM overlay.
 */
import { memo, useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Map as MaplibreMap, MapMouseEvent } from "maplibre-gl";
import type { Building, Room, LatLng } from "@ksyk/shared";
import { apiRequest } from "@/lib/queryClient";

export interface SelectionHandlesProps {
  map: MaplibreMap | null;
  /** The currently-selected entity. Only building/room polygons get
   *  handles — hallways/POIs are point features and use their own tool. */
  selection:
    | { kind: "building"; entity: Building }
    | { kind: "room"; entity: Room }
    | null;
}

const SRC_VERTS = "selection-vertices-src";
const SRC_ROTATOR = "selection-rotator-src";
const SRC_OUTLINE = "selection-outline-src";
const SRC_DIMS = "selection-dimensions-src";
const LAYER_VERTS = "selection-vertices";
const LAYER_ROTATOR = "selection-rotator";
const LAYER_ROTATOR_STEM = "selection-rotator-stem";
const LAYER_OUTLINE = "selection-outline";
// Invisible fill on the selected polygon — sole purpose is to catch
// pointerdown so users can drag the WHOLE shape by clicking inside it.
// Rendered nearly transparent so it doesn't visually interfere.
const LAYER_TRANSLATE_HIT = "selection-translate-hit";
const LAYER_DIMS_LINES = "selection-dimensions-lines";
const LAYER_DIMS_LABELS = "selection-dimensions-labels";

/** How many metres the rotator sits above the polygon centroid. Tuned
 *  visually — big enough to not overlap the shape, small enough to
 *  stay in-frame at typical builder zoom. */
const ROTATOR_OFFSET_METERS = 6;

function SelectionHandlesInner({ map, selection }: SelectionHandlesProps) {
  const qc = useQueryClient();

  // Live copy of the polygon during a drag so we can update the
  // MapLibre source at 60 FPS without waiting for the network round-
  // trip. Reset on selection change.
  const localPointsRef = useRef<LatLng[] | null>(null);
  useEffect(() => {
    localPointsRef.current = selection?.entity.points ?? null;
  }, [selection]);

  const patchEntity = useMutation({
    mutationFn: async (body: Partial<Building & Room>) => {
      if (!selection) return null;
      const path = selection.kind === "building"
        ? `/api/buildings/${selection.entity.id}`
        : `/api/rooms/${selection.entity.id}`;
      const res = await apiRequest("PATCH", path, body);
      try { return await res.json(); } catch { return null; }
    },
    onSuccess: () => {
      if (!selection) return;
      qc.invalidateQueries({ queryKey: [selection.kind === "building" ? "/api/buildings" : "/api/rooms"] });
    },
  });
  // Mirror patchEntity into a ref so the stable drag effect (which has
  // patchEntity removed from its deps) always calls the latest mutate
  // without re-registering its event listeners on every render.
  const patchEntityRef = useRef(patchEntity);
  patchEntityRef.current = patchEntity;

  // Refresh the source data on the map from either the drag-live copy
  // or the entity's canonical points.
  const refreshSources = useCallback((m: MaplibreMap) => {
    if (!m.isStyleLoaded()) return;
    const pts = localPointsRef.current;
    if (!pts || pts.length < 3) {
      // Clear
      for (const [srcId, layerId] of [
        [SRC_VERTS, LAYER_VERTS],
        [SRC_ROTATOR, LAYER_ROTATOR],
        [SRC_OUTLINE, LAYER_OUTLINE],
      ] as const) {
        if (m.getLayer(layerId)) m.removeLayer(layerId);
        if (m.getSource(srcId)) m.removeSource(srcId);
      }
      if (m.getLayer(LAYER_ROTATOR_STEM)) m.removeLayer(LAYER_ROTATOR_STEM);
      return;
    }
    const centroid = polygonCentroid(pts);
    const rotator = offsetLatLng(centroid, ROTATOR_OFFSET_METERS, 0); // due north

    const vertexFC = {
      type: "FeatureCollection" as const,
      features: pts.map((p, i) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: { idx: i },
      })),
    };
    const rotatorFC = {
      type: "FeatureCollection" as const,
      features: [
        { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [rotator.lng, rotator.lat] }, properties: { role: "handle" } },
        { type: "Feature" as const, geometry: { type: "LineString" as const, coordinates: [[centroid.lng, centroid.lat], [rotator.lng, rotator.lat]] }, properties: { role: "stem" } },
      ],
    };
    const outlineFC = {
      type: "FeatureCollection" as const,
      features: [{
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[...pts.map((p) => [p.lng, p.lat]), [pts[0].lng, pts[0].lat]]],
        },
        properties: {},
      }],
    };
    // CAD-style edge dimensions — one Point feature at each edge
    // midpoint carrying the edge length in metres (formatted with 2
    // decimals under 10 m, 1 decimal otherwise). Users editing polygons
    // now see live length feedback like in AutoCAD or SketchUp.
    const dimFeatures = [] as unknown[];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const midLat = (a.lat + b.lat) / 2;
      const midLng = (a.lng + b.lng) / 2;
      // Haversine — good enough at campus scale, no external dep.
      const R = 6371000;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const s2 =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
      const dist = 2 * R * Math.asin(Math.sqrt(s2));
      const label = dist < 10
        ? `${dist.toFixed(2)} m`
        : dist < 1000
          ? `${dist.toFixed(1)} m`
          : `${(dist / 1000).toFixed(2)} km`;
      dimFeatures.push({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [midLng, midLat] },
        properties: { label, edge: i },
      });
    }
    const dimFC = { type: "FeatureCollection" as const, features: dimFeatures };

    upsert(m, SRC_OUTLINE, outlineFC);
    if (!m.getLayer(LAYER_TRANSLATE_HIT)) {
      m.addLayer({
        id: LAYER_TRANSLATE_HIT, source: SRC_OUTLINE, type: "fill",
        paint: {
          // Barely-visible tint hints "this shape is selected + draggable"
          // without competing with the actual entity fill underneath.
          "fill-color": "#2563eb",
          "fill-opacity": 0.05,
        },
      });
    }
    if (!m.getLayer(LAYER_OUTLINE)) {
      m.addLayer({
        id: LAYER_OUTLINE, source: SRC_OUTLINE, type: "line",
        paint: { "line-color": "#2563eb", "line-width": 2.5, "line-dasharray": [2, 1], "line-opacity": 0.9 },
      });
    }
    upsert(m, SRC_ROTATOR, rotatorFC);
    if (!m.getLayer(LAYER_ROTATOR_STEM)) {
      m.addLayer({
        id: LAYER_ROTATOR_STEM, source: SRC_ROTATOR, type: "line",
        filter: ["==", ["get", "role"], "stem"],
        paint: { "line-color": "#2563eb", "line-width": 1.5, "line-opacity": 0.7 },
      });
    }
    if (!m.getLayer(LAYER_ROTATOR)) {
      m.addLayer({
        id: LAYER_ROTATOR, source: SRC_ROTATOR, type: "circle",
        filter: ["==", ["get", "role"], "handle"],
        paint: {
          "circle-radius": 8,
          "circle-color": "#2563eb",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
    }
    upsert(m, SRC_VERTS, vertexFC);
    if (!m.getLayer(LAYER_VERTS)) {
      m.addLayer({
        id: LAYER_VERTS, source: SRC_VERTS, type: "circle",
        paint: {
          "circle-radius": 9,
          "circle-color": "#ffffff",
          "circle-stroke-color": "#2563eb",
          "circle-stroke-width": 2.5,
        },
      });
    }
    // Dimension labels — a symbol layer + a subtle background pill so
    // the number reads over any basemap. Draws AFTER the vertex layer
    // so the labels sit on top.
    upsert(m, SRC_DIMS, dimFC);
    if (!m.getLayer(LAYER_DIMS_LABELS)) {
      m.addLayer({
        id: LAYER_DIMS_LABELS, source: SRC_DIMS, type: "symbol",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 11,
          "text-font": ["Noto Sans Regular"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-anchor": "center",
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2.2,
          "text-halo-blur": 0.2,
        },
      });
    }
  }, []);

  useEffect(() => {
    if (!map) return;
    if (map.isStyleLoaded()) {
      refreshSources(map);
    } else {
      const onLoad = () => refreshSources(map);
      map.once("styledata", onLoad);
      return () => { map.off("styledata", onLoad); };
    }
    return () => {
      try {
        if (!map.isStyleLoaded()) return;
        for (const layerId of [LAYER_VERTS, LAYER_ROTATOR, LAYER_ROTATOR_STEM, LAYER_OUTLINE, LAYER_TRANSLATE_HIT, LAYER_DIMS_LINES, LAYER_DIMS_LABELS]) {
          try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch { /* layer gone */ }
        }
        for (const srcId of [SRC_VERTS, SRC_ROTATOR, SRC_OUTLINE, SRC_DIMS]) {
          try { if (map.getSource(srcId)) map.removeSource(srcId); } catch { /* source gone */ }
        }
      } catch { /* map destroyed */ }
    };
  }, [map, selection, refreshSources]);

  // Drag interactions. We intercept mousedown on either handle set,
  // disable map panning while dragging, and follow the mouse until
  // release.
  useEffect(() => {
    if (!map || !selection) return;

    type DragTranslate = { kind: "translate"; startLat: number; startLng: number; startPoints: LatLng[] };
    let dragging:
      | null
      | { kind: "vertex"; idx: number }
      | { kind: "rotator"; startAngleDeg: number; startPoints: LatLng[] }
      | DragTranslate = null;

    // Hit-test radius in px — used as a bbox around e.point so that a
    // click slightly off-center still activates the handle.
    const HIT_PX = 10;

    const onDown = (e: MapMouseEvent) => {
      // Rank hits: handles > outline (polygon body). Handles first so a
      // click precisely on a vertex still drags the vertex, not the whole
      // polygon.
      // Use a small bbox rather than a single point to give a few pixels
      // of forgiveness around the handle circle.
      const bbox: [import("maplibre-gl").PointLike, import("maplibre-gl").PointLike] = [
        [e.point.x - HIT_PX, e.point.y - HIT_PX],
        [e.point.x + HIT_PX, e.point.y + HIT_PX],
      ];
      const activeHandleLayers = [LAYER_VERTS, LAYER_ROTATOR].filter((id) => map.getLayer(id));
      const handleFeats = activeHandleLayers.length
        ? map.queryRenderedFeatures(bbox, { layers: activeHandleLayers })
        : [];
      const hit = handleFeats[0];
      if (hit) {
        e.preventDefault();
        map.dragPan.disable();
        map.touchZoomRotate.disable();
        if (hit.layer.id === LAYER_VERTS) {
          const idx = Number(hit.properties?.idx ?? -1);
          if (idx < 0) return;
          dragging = { kind: "vertex", idx };
        } else {
          const pts = localPointsRef.current ?? [];
          if (pts.length < 3) return;
          const centroid = polygonCentroid(pts);
          const startAngleDeg = angleDeg(centroid, { lat: e.lngLat.lat, lng: e.lngLat.lng });
          dragging = { kind: "rotator", startAngleDeg, startPoints: pts.map((p) => ({ ...p })) };
        }
        return;
      }
      // No handle → check for a hit on the selection's translate-hit
      // fill (an invisible fill covering the whole selected polygon).
      // Drag-to-move translates the whole shape.
      const activeFillLayers = [LAYER_TRANSLATE_HIT].filter((id) => map.getLayer(id));
      const bodyFeats = activeFillLayers.length
        ? map.queryRenderedFeatures(e.point, { layers: activeFillLayers })
        : [];
      if (bodyFeats.length === 0) return;
      const pts = localPointsRef.current ?? [];
      if (pts.length < 3) return;
      e.preventDefault();
      map.dragPan.disable();
      map.touchZoomRotate.disable();
      dragging = {
        kind: "translate",
        startLat: e.lngLat.lat,
        startLng: e.lngLat.lng,
        startPoints: pts.map((p) => ({ ...p })),
      };
    };

    const onMove = (e: MapMouseEvent) => {
      if (!dragging) return;
      const pts = localPointsRef.current;
      if (!pts) return;
      if (dragging.kind === "vertex") {
        const next = pts.slice();
        let nx = e.lngLat.lng, ny = e.lngLat.lat;
        // CAD axis-lock — hold Shift to constrain vertex movement to
        // horizontal or vertical relative to the ORIGINAL vertex
        // position. Whichever axis the cursor deviated more on wins.
        if (e.originalEvent instanceof MouseEvent && e.originalEvent.shiftKey) {
          const orig = selection.entity.points?.[dragging.idx];
          if (orig) {
            const dx = Math.abs(nx - orig.lng);
            const dy = Math.abs(ny - orig.lat);
            if (dx > dy) ny = orig.lat; else nx = orig.lng;
          }
        }
        next[dragging.idx] = { lat: ny, lng: nx };
        localPointsRef.current = next;
      } else if (dragging.kind === "rotator") {
        const centroid = polygonCentroid(dragging.startPoints);
        const cur = angleDeg(centroid, { lat: e.lngLat.lat, lng: e.lngLat.lng });
        let delta = cur - dragging.startAngleDeg;
        // CAD-style angle snap — hold Shift to constrain rotation to
        // 15° increments. Standard drafting behaviour; users expect it.
        if (e.originalEvent instanceof MouseEvent && e.originalEvent.shiftKey) {
          delta = Math.round(delta / 15) * 15;
        }
        localPointsRef.current = rotatePolygon(dragging.startPoints, centroid, delta);
      } else {
        // translate — shift every start point by the cursor delta.
        const dLat = e.lngLat.lat - dragging.startLat;
        const dLng = e.lngLat.lng - dragging.startLng;
        localPointsRef.current = dragging.startPoints.map((p) => ({
          lat: p.lat + dLat,
          lng: p.lng + dLng,
        }));
      }
      refreshSources(map);
    };

    const commitDrag = (wasRotator: boolean) => {
      map.dragPan.enable();
      map.touchZoomRotate.enable();
      const pts = localPointsRef.current;
      if (!pts) return;
      const body: Partial<Building & Room> = { points: pts };
      if (wasRotator && selection.entity.rotationDeg !== undefined) {
        const start = selection.entity.points ?? [];
        const c = polygonCentroid(start);
        const startAngle = start[0] ? angleDeg(c, start[0]) : 0;
        const endAngle = pts[0] ? angleDeg(c, pts[0]) : 0;
        body.rotationDeg = ((selection.entity.rotationDeg ?? 0) + (endAngle - startAngle) + 360) % 360;
      }
      patchEntityRef.current.mutate(body);
    };

    const onUp = () => {
      if (!dragging) return;
      const wasRotator = dragging.kind === "rotator";
      dragging = null;
      commitDrag(wasRotator);
    };

    // Window-level mouseup catches drag-release when the cursor leaves
    // the map canvas mid-drag (e.g. user drags fast to the sidebar).
    // Without this, `dragPan` can stay disabled permanently.
    const onWindowUp = () => {
      if (!dragging) return;
      const wasRotator = dragging.kind === "rotator";
      dragging = null;
      commitDrag(wasRotator);
    };

    map.on("mousedown", onDown);
    map.on("mousemove", onMove);
    map.on("mouseup", onUp);
    window.addEventListener("mouseup", onWindowUp);
    window.addEventListener("touchend", onWindowUp);

    return () => {
      map.off("mousedown", onDown);
      map.off("mousemove", onMove);
      map.off("mouseup", onUp);
      window.removeEventListener("mouseup", onWindowUp);
      window.removeEventListener("touchend", onWindowUp);
      // Ensure dragPan is always re-enabled on cleanup, even if a drag
      // was interrupted by React unmounting the component.
      map.dragPan.enable();
      map.touchZoomRotate.enable();
    };
  // patchEntity intentionally excluded — patchEntityRef.current is used
  // inside commitDrag so the stable closure always calls the latest mutate.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selection, refreshSources]);

  return null;
}

// Wrap with memo so re-renders from the parent (builder) don't cause
// SelectionHandles to re-render when map + selection props are stable.
// This is the root fix for vertex handle flashing: the drag-effect deps
// are now truly stable and won't re-register on every mousemove.
export default memo(SelectionHandlesInner);

// ── Geometry helpers ─────────────────────────────────────────────

function upsert(map: MaplibreMap, id: string, data: unknown) {
  const s = map.getSource(id) as import("maplibre-gl").GeoJSONSource | undefined;
  if (s) s.setData(data as never);
  else map.addSource(id, { type: "geojson", data: data as never });
}

function polygonCentroid(pts: LatLng[]): LatLng {
  let lat = 0, lng = 0;
  for (const p of pts) { lat += p.lat; lng += p.lng; }
  return { lat: lat / pts.length, lng: lng / pts.length };
}

function angleDeg(from: LatLng, to: LatLng): number {
  // Screen-space angle in degrees, 0 = east, 90 = north (positive Y up).
  // Good enough for rotation UI at campus scale.
  const dx = to.lng - from.lng;
  const dy = to.lat - from.lat;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function rotatePolygon(pts: LatLng[], centre: LatLng, deltaDeg: number): LatLng[] {
  const cos = Math.cos((deltaDeg * Math.PI) / 180);
  const sin = Math.sin((deltaDeg * Math.PI) / 180);
  // Compensate for lat/lng scale so rotations look uniform on-screen.
  const kx = 1 / Math.cos((centre.lat * Math.PI) / 180);
  return pts.map((p) => {
    const dx = (p.lng - centre.lng) / kx;
    const dy = p.lat - centre.lat;
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return { lng: centre.lng + rx * kx, lat: centre.lat + ry };
  });
}

/** Move `from` a straight-line offset in metres. Positive north = +Y.
 *  We only need a small distance (< 20 m) so the small-angle approx
 *  is fine. */
function offsetLatLng(from: LatLng, meters: number, bearingRad: number): LatLng {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((from.lat * Math.PI) / 180);
  const dy = Math.cos(bearingRad) * meters;
  const dx = Math.sin(bearingRad) * meters;
  return {
    lat: from.lat + dy / metersPerDegLat,
    lng: from.lng + dx / metersPerDegLng,
  };
}
