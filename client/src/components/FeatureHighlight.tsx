/**
 * FeatureHighlight — temporary pulsing outline on a picked feature.
 *
 * Mounted by KSYKMapView with the polygon/line of a feature the user
 * just picked (via search or the info-sheet handoff). Renders a
 * blue outline via a MapLibre GeoJSON source, animates its width +
 * opacity on a rAF loop for ~2.5s, then unmounts itself via the
 * `onFinished` callback.
 *
 * Headless — no DOM output. Cleans its map layers on unmount.
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
const LAYER_ID = "feature-highlight-line";
const DURATION_MS = 2500;

export default function FeatureHighlight({ map, polygon, onFinished }: FeatureHighlightProps) {
  const rafRef = useRef<number | null>(null);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  useEffect(() => {
    if (!map || !polygon || polygon.length < 2) return;
    const closed = [...polygon, polygon[0]];
    const data = {
      type: "FeatureCollection" as const,
      features: [{
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: closed.map((p) => [p.lng, p.lat]),
        },
        properties: {},
      }],
    };
    const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data as never);
    else map.addSource(SOURCE_ID, { type: "geojson", data: data as never });

    if (!map.getLayer(LAYER_ID)) {
      map.addLayer({
        id: LAYER_ID,
        source: SOURCE_ID,
        type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#2563eb",
          "line-width": 6,
          "line-opacity": 0.9,
        },
      });
    }

    // Animate line width + opacity over DURATION_MS.
    const start = performance.now();
    const tick = () => {
      const now = performance.now();
      const t = (now - start) / DURATION_MS;
      if (t >= 1) {
        // Fade complete — clear + notify parent.
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
        finishedRef.current();
        return;
      }
      // Two overlapping animations:
      //   - outer pulse: width grows from 6 → 22 while opacity 0.9 → 0
      //   - to make it look like an expanding ring, we use easeOut
      const eased = 1 - Math.pow(1 - t, 3);
      const width = 6 + eased * 16;
      const opacity = 0.9 * (1 - eased);
      try {
        map.setPaintProperty(LAYER_ID, "line-width", width);
        map.setPaintProperty(LAYER_ID, "line-opacity", opacity);
      } catch {
        // Layer removed under us (map re-init) — bail.
        return;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, polygon]);

  return null;
}
