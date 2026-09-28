/**
 * FeatureHighlight — Apple-Maps-style highlight on a picked feature.
 *
 * When the user picks a room (via search or the info-sheet handoff),
 * we do two things at once:
 *
 *   1. A soft blue fill inside the polygon that fades in and stays
 *      for the sheet's lifetime — this is the "you are looking at
 *      this room" resting state.
 *   2. A single clean pulse ring that expands from the polygon's
 *      outline once, then fades out (~1.2s). One pulse, not three;
 *      Apple Maps' "one confirmation, then quiet" pattern.
 *
 * Headless — no DOM output. Cleans its map layers on unmount so the
 * parent can just conditionally mount/unmount this component.
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

const FILL_SRC   = "feature-highlight-fill-src";
const FILL_LAYER = "feature-highlight-fill";
const LINE_SRC   = "feature-highlight-line-src";
const RING_LAYER = "feature-highlight-ring";
const EDGE_LAYER = "feature-highlight-edge";
const PULSE_MS   = 1200;

export default function FeatureHighlight({ map, polygon, onFinished }: FeatureHighlightProps) {
  const rafRef = useRef<number | null>(null);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  useEffect(() => {
    if (!map || !polygon || polygon.length < 3) return;
    const closed = [...polygon, polygon[0]];
    const coords = closed.map((p) => [p.lng, p.lat]);

    // Polygon source for the resting fill + edge.
    const fillData = {
      type: "FeatureCollection" as const,
      features: [{
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [coords] },
        properties: {},
      }],
    };
    // Line source for the expanding pulse ring.
    const lineData = {
      type: "FeatureCollection" as const,
      features: [{
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: coords },
        properties: {},
      }],
    };

    const upsertSource = (id: string, data: any) => {
      const s = map.getSource(id) as any;
      if (s) s.setData(data);
      else map.addSource(id, { type: "geojson", data });
    };
    upsertSource(FILL_SRC, fillData);
    upsertSource(LINE_SRC, lineData);

    // Resting fill — soft blue tint. Starts invisible and fades in.
    if (!map.getLayer(FILL_LAYER)) {
      map.addLayer({
        id: FILL_LAYER,
        source: FILL_SRC,
        type: "fill",
        paint: {
          "fill-color": "#2563eb",
          "fill-opacity": 0,
        },
      });
    }
    // Persistent hairline edge — reads as "selected".
    if (!map.getLayer(EDGE_LAYER)) {
      map.addLayer({
        id: EDGE_LAYER,
        source: LINE_SRC,
        type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#2563eb",
          "line-width": 2,
          "line-opacity": 0,
        },
      });
    }
    // Pulse ring — expands outward from the edge, one clean beat.
    if (!map.getLayer(RING_LAYER)) {
      map.addLayer({
        id: RING_LAYER,
        source: LINE_SRC,
        type: "line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#3b82f6",
          "line-width": 3,
          "line-opacity": 0.75,
        },
      });
    }

    // Fade-in for the resting fill + edge (200ms), then run the pulse
    // ring animation over PULSE_MS. Fill + edge stay put; only the ring
    // fades out at the end.
    const start = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = now - start;
      // Ease-out for the fade-in curve; ease-out cubic for pulse expand.
      const restEase = Math.min(1, dt / 200);
      const pulseT = Math.min(1, dt / PULSE_MS);
      const pulseEase = 1 - Math.pow(1 - pulseT, 3);
      const ringWidth = 3 + pulseEase * 18;
      const ringOpacity = 0.75 * (1 - pulseEase);

      try {
        map.setPaintProperty(FILL_LAYER, "fill-opacity", 0.16 * restEase);
        map.setPaintProperty(EDGE_LAYER, "line-opacity", 0.85 * restEase);
        map.setPaintProperty(RING_LAYER, "line-width", ringWidth);
        map.setPaintProperty(RING_LAYER, "line-opacity", ringOpacity);
      } catch {
        return; // layer removed under us
      }

      if (pulseT >= 1) {
        // Pulse done — drop the ring layer, keep fill + edge as the
        // resting selection state. Parent decides when to unmount us.
        if (map.getLayer(RING_LAYER)) map.removeLayer(RING_LAYER);
        finishedRef.current();
        return;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      // Remove all layers + sources on unmount.
      for (const id of [RING_LAYER, EDGE_LAYER, FILL_LAYER]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      for (const id of [LINE_SRC, FILL_SRC]) {
        if (map.getSource(id)) map.removeSource(id);
      }
    };
  }, [map, polygon]);

  return null;
}
