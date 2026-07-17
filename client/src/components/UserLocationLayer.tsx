/**
 * UserLocationLayer — pulsing "you are here" dot + Locate button.
 *
 * Headless (renders a small toolbar button, everything else goes on
 * the MapLibre canvas). On first Locate click we ask for
 * geolocation, then start `watchPosition` so the dot follows the
 * user. On second click we recenter to the current position.
 *
 * Accuracy circle: if the fix has an `accuracy` in metres, we draw
 * a translucent blue circle sized to that radius so users understand
 * how confident the fix is (indoor GPS is usually 20–50 m off).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { Crosshair, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserLocationLayerProps {
  map: MaplibreMap | null;
}

const SRC_DOT = "user-loc-dot";
const SRC_ACC = "user-loc-accuracy";
const LAYER_DOT_OUTER = "user-loc-dot-outer";
const LAYER_DOT_INNER = "user-loc-dot-inner";
const LAYER_ACC = "user-loc-accuracy-fill";

export default function UserLocationLayer({ map }: UserLocationLayerProps) {
  const [state, setState] = useState<"idle" | "requesting" | "tracking" | "denied" | "error">("idle");
  const [fix, setFix] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setState("error");
      return;
    }
    setState("requesting");
    // getCurrentPosition first so we can center immediately; then
    // watchPosition to keep the dot updating.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy || 25 };
        setFix(next);
        setState("tracking");
        // Fly to the fix — keep user's bearing/pitch.
        if (map) {
          map.flyTo({
            center: [next.lng, next.lat],
            zoom: Math.max(map.getZoom(), 18),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
            duration: 800,
            essential: true,
          });
        }
        // Now watch — cheap enough on modern browsers, gives us live updates.
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy || 25 }),
          () => { /* silent — the initial fix is what matters */ },
          { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
        );
      },
      (err) => {
        setState(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }, [map]);

  // Re-center on repeat clicks once tracking is active.
  const onClick = useCallback(() => {
    if (state === "tracking" && fix && map) {
      map.flyTo({
        center: [fix.lng, fix.lat],
        zoom: Math.max(map.getZoom(), 18),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        duration: 500,
        essential: true,
      });
      return;
    }
    start();
  }, [state, fix, map, start]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Draw / update the location markers.
  useEffect(() => {
    if (!map || !fix) return;
    const dot = {
      type: "FeatureCollection" as const,
      features: [{
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [fix.lng, fix.lat] },
        properties: {},
      }],
    };
    const acc = {
      type: "FeatureCollection" as const,
      features: [{
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [fix.lng, fix.lat] },
        properties: { accuracy: fix.accuracy },
      }],
    };
    const draw = () => {
      // Accuracy circle (drawn under the dot).
      const srcAcc = map.getSource(SRC_ACC) as maplibregl.GeoJSONSource | undefined;
      if (srcAcc) srcAcc.setData(acc as never);
      else {
        map.addSource(SRC_ACC, { type: "geojson", data: acc as never });
        map.addLayer({
          id: LAYER_ACC,
          source: SRC_ACC,
          type: "circle",
          paint: {
            // Radius in pixels — we approximate by scaling accuracy
            // to zoom. Not geodesic but readable enough.
            "circle-radius": [
              "interpolate", ["exponential", 2], ["zoom"],
              14, ["/", ["get", "accuracy"], 8],
              20, ["*", ["get", "accuracy"], 1.2],
            ],
            "circle-color": "#3b82f6",
            "circle-opacity": 0.15,
            "circle-stroke-color": "#3b82f6",
            "circle-stroke-opacity": 0.3,
            "circle-stroke-width": 1,
          },
        });
      }
      // The dot itself.
      const srcDot = map.getSource(SRC_DOT) as maplibregl.GeoJSONSource | undefined;
      if (srcDot) srcDot.setData(dot as never);
      else {
        map.addSource(SRC_DOT, { type: "geojson", data: dot as never });
        map.addLayer({
          id: LAYER_DOT_OUTER,
          source: SRC_DOT,
          type: "circle",
          paint: {
            "circle-radius": 12,
            "circle-color": "#3b82f6",
            "circle-opacity": 0.25,
          },
        });
        map.addLayer({
          id: LAYER_DOT_INNER,
          source: SRC_DOT,
          type: "circle",
          paint: {
            "circle-radius": 7,
            "circle-color": "#2563eb",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 3,
          },
        });
      }
    };
    if (map.isStyleLoaded()) draw();
    else map.once("styledata", draw);
  }, [map, fix]);

  // Cleanup layers on unmount.
  useEffect(() => {
    return () => {
      if (!map) return;
      for (const l of [LAYER_ACC, LAYER_DOT_INNER, LAYER_DOT_OUTER]) {
        if (map.getLayer(l)) map.removeLayer(l);
      }
      for (const s of [SRC_ACC, SRC_DOT]) {
        if (map.getSource(s)) map.removeSource(s);
      }
    };
  }, [map]);

  const busy = state === "requesting";
  const title =
    state === "denied" ? "Location permission denied — enable in your browser"
    : state === "error" ? "Location unavailable"
    : state === "tracking" ? "Center on my location"
    : "Show my location";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={title}
      aria-pressed={state === "tracking"}
      title={title}
      className={cn(
        "w-11 h-11 rounded-2xl border shadow-sm flex items-center justify-center transition-colors active:scale-[0.97]",
        state === "tracking"
          ? "bg-blue-600 text-white border-blue-700/40 shadow-blue-600/25"
          : state === "denied" || state === "error"
          ? "bg-card border-border text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          : "bg-card border-border text-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
      )}
    >
      {busy
        ? <LoaderCircle className="h-[19px] w-[19px] animate-spin" strokeWidth={2.25} />
        : <Crosshair className="h-[19px] w-[19px]" strokeWidth={2.25} />}
    </button>
  );
}
