/**
 * FeatureHighlight — MazeMap-style pulsing outline on a picked feature.
 *
 * Mounted by KSYKMapView with the polygon/line of a feature the user
 * just picked (via search or the info-sheet handoff). Renders THREE
 * overlapping layers via a MapLibre GeoJSON source:
 *   1. A soft breathing filled polygon (glow underneath)
 *   2. A steady inner outline
 *   3. An expanding pulse ring that repeats 3 times
 *
 * Total lifetime: ~3.6 s (3 pulses × 1.2 s), then self-clears via
 * `onFinished`. Headless — no DOM output. Cleans its map layers on
 * unmount.
 */
import { useEffect, useRef } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { LatLng } from "@ksyk/shared";

interface FeatureHighlightProps {
  map: MaplibreMap | null;
  /** Ring of points (closed loop; last-to-first connects). Null → no-op. */
  polygon: LatLng[] | null;
  /** Called once the pulse animation completes so the parent can clear
   *  the highlight state and free the source. */
  onFinished: () => void;
}

const SOURCE_ID = "feature-highlight-src";
const FILL_ID = "feature-highlight-fill";
const OUTLINE_ID = "feature-highlight-line";
const PULSE_ID = "feature-highlight-pulse";
const PULSE_MS = 1200;
const PULSES = 3;
const DURATION_MS = PULSE_MS * PULSES;

export default function FeatureHighlight({ map, polygon, onFinished }: FeatureHighlightProps) {
  const rafRef = useRef<number | null>(null);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  useEffect(() => {
    if (!map || !polygon || polygon.length < 2) return;
    // We need a Polygon feature for the fill, PLUS a LineString for the
    // outline + pulse. Both live on the same source so a single setData
    // updates all three layers.
    const ring = polygon.map((p) => [p.lng, p.lat] as [number, number]);
    const closedRing = [...ring, ring[0]];
    const data = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: { type: "Polygon" as const, coordinates: [closedRing] },
          properties: { kind: "fill" },
        },
        {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: closedRing },
          properties: { kind: "line" },
        },
      ],
    };
    const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data as never);
    else map.addSource(SOURCE_ID, { type: "geojson", data: data as never });

    if (!map.getLayer(FILL_ID)) {
      map.addLayer({
        id: FILL_ID,
        source: SOURCE_ID,
        type: "fill",
        filter: ["==", ["get", "kind"], "fill"],
        paint: {
          "fill-color": "#2563eb",
          "fill-opacity": 0.15,
        },
      });
    }
    if (!map.getLayer(OUTLINE_ID)) {
      map.addLayer({
        id: OUTLINE_ID,
        source: SOURCE_ID,
        type: "line",
        filter: ["==", ["get", "kind"], "line"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#2563eb",
          "line-width": 3,
          "line-opacity": 0.9,
        },
      });
    }
    if (!map.getLayer(PULSE_ID)) {
      map.addLayer({
        id: PULSE_ID,
        source: SOURCE_ID,
        type: "line",
        filter: ["==", ["get", "kind"], "line"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#60a5fa",
          "line-width": 3,
          "line-opacity": 0.9,
        },
      });
    }

    // Repeating pulse — 3 loops of the expanding ring so users have
    // multiple chances to notice which feature was picked.
    const start = performance.now();
    const tick = () => {
      const now = performance.now();
      const elapsed = now - start;
      if (elapsed >= DURATION_MS) {
        for (const id of [PULSE_ID, OUTLINE_ID, FILL_ID]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
        finishedRef.current();
        return;
      }
      // Position inside the current pulse cycle (0..1).
      const t = (elapsed % PULSE_MS) / PULSE_MS;
      const eased = 1 - Math.pow(1 - t, 3);
      const pulseWidth = 3 + eased * 22;
      const pulseOpacity = 0.8 * (1 - eased);
      // Fill breathes gently on the SAME 1.2s clock, subtler amplitude.
      const fillOpacity = 0.12 + Math.sin(t * Math.PI) * 0.08;
      try {
        map.setPaintProperty(PULSE_ID, "line-width", pulseWidth);
        map.setPaintProperty(PULSE_ID, "line-opacity", pulseOpacity);
        map.setPaintProperty(FILL_ID, "fill-opacity", fillOpacity);
      } catch {
        return;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      for (const id of [PULSE_ID, OUTLINE_ID, FILL_ID]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, polygon]);

  return null;
}
