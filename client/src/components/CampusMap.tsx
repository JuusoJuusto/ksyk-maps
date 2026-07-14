/**
 * KSYK Maps — CampusMap.
 *
 * MapLibre GL JS based campus map. Vector tiles from OpenFreeMap
 * (free, no API key, OpenStreetMap data). Native rotation + pitch:
 * MapLibre transforms the vector tiles internally so rotation always
 * renders every corner — no CSS `container.style.transform` hacks
 * and no tile buffer over-render. The renderer draws exactly what's
 * visible, at any bearing or pitch, at any zoom.
 *
 * Public API keeps it simple — pass in center/zoom/bearing/pitch and
 * a `onReady(map)` callback so callers can attach layers/handlers.
 * Buildings, rooms, hallways, and every overlay are drawn as
 * MapLibre GeoJSON sources, so they rotate + pitch WITH the map
 * automatically (no separate rotation logic).
 */
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MaplibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";

// OpenFreeMap — free vector tile hosting for the OpenMapTiles schema.
// Two styles: liberty (colored, OSM-styled) + positron (light neutral).
// Bright variant works well in dark mode; positron in light.
const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/liberty";

export interface CampusMapHandle {
  map: MaplibreMap;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitBounds: (
    sw: [number, number],
    ne: [number, number],
    opts?: { padding?: number }
  ) => void;
  setBearing: (deg: number) => void;
  setPitch: (deg: number) => void;
  recenter: () => void;
}

interface CampusMapProps {
  /** Fired once the map is loaded (styles + first frame) with the handle. */
  onReady?: (handle: CampusMapHandle) => void;
  /** Extra className on the outer container. */
  className?: string;
  /** Force a specific bearing (overrides `useAppSettings`). */
  bearing?: number;
  /** Force a specific pitch (overrides `useAppSettings`). */
  pitch?: number;
  /** Disable interaction — good for read-only previews. */
  interactive?: boolean;
  /** Show MapLibre's built-in nav control (compass + zoom). */
  showNavigationControl?: boolean;
}

export default function CampusMap({
  onReady,
  className,
  bearing,
  pitch,
  interactive = true,
  showNavigationControl = false,
}: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const { settings } = useAppSettings();
  const { darkMode } = useDarkMode();
  const [ready, setReady] = useState(false);

  // ── Init map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return; // already inited

    const initialBearing = bearing ?? settings.osmRotationDeg ?? 0;
    const initialPitch = pitch ?? settings.osmPitchDeg ?? 0;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: darkMode ? STYLE_DARK : STYLE_LIGHT,
      center: [settings.osmCenterLng, settings.osmCenterLat],
      zoom: settings.osmDefaultZoom,
      bearing: initialBearing,
      pitch: initialPitch,
      minZoom: settings.osmMinZoom,
      maxZoom: settings.osmMaxZoom,
      interactive,
      attributionControl: { compact: true },
      // Rotate/pitch with right-click drag on desktop; two-finger on touch.
      // Bearing snap tolerance so users can nudge back to north easily.
      bearingSnap: 8,
      // Retina rendering
      pixelRatio: window.devicePixelRatio || 1,
    });

    if (showNavigationControl) {
      map.addControl(
        new maplibregl.NavigationControl({ visualizePitch: true }),
        "top-right"
      );
    }

    map.on("load", () => {
      mapRef.current = map;
      setReady(true);
      const handle: CampusMapHandle = {
        map,
        flyTo: (lat, lng, zoom) =>
          map.flyTo({
            center: [lng, lat],
            zoom: zoom ?? map.getZoom(),
            duration: 800,
            essential: true,
          }),
        fitBounds: (sw, ne, opts) =>
          map.fitBounds(
            [
              [sw[1], sw[0]],
              [ne[1], ne[0]],
            ],
            { padding: opts?.padding ?? 40, duration: 800 }
          ),
        setBearing: (deg) => map.rotateTo(deg, { duration: 400 }),
        setPitch: (deg) => map.easeTo({ pitch: deg, duration: 400 }),
        recenter: () => {
          map.flyTo({
            center: [settings.osmCenterLng, settings.osmCenterLat],
            zoom: settings.osmDefaultZoom,
            bearing: settings.osmRotationDeg ?? 0,
            pitch: settings.osmPitchDeg ?? 0,
            duration: 800,
            essential: true,
          });
        },
      };
      onReady?.(handle);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // Intentionally only run once — later changes to settings flow through
    // separate effects below (theme, bearing, pitch, center).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── React to dark mode: swap style ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setStyle(darkMode ? STYLE_DARK : STYLE_LIGHT);
  }, [darkMode, ready]);

  // ── React to bearing prop overrides ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (bearing !== undefined && Math.abs(map.getBearing() - bearing) > 0.5) {
      map.setBearing(bearing);
    }
  }, [bearing, ready]);

  // ── React to pitch prop overrides ─────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (pitch !== undefined && Math.abs(map.getPitch() - pitch) > 0.5) {
      map.setPitch(pitch);
    }
  }, [pitch, ready]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-full relative",
        // Kill MapLibre's default focus outline — we manage focus states
        // in the surrounding UI. Also silence any inherited borders.
        "[&_.maplibregl-canvas]:outline-none",
        className,
      )}
    />
  );
}
