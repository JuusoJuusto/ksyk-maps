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

// Classic OpenStreetMap raster tiles — the colorful look users
// recognise from openstreetmap.org (yellow roads, green parks, blue
// water, beige buildings, pink hospitals). Served directly from OSM
// with a-c subdomain rotation for parallel fetches. Attribution is
// baked into MapLibre's AttributionControl.
//
// MapLibre eats raster styles as a bare style spec — same rotation +
// pitch as vector, tiles just look like classic OSM.org.
function osmRasterStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      "osm-raster": {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution:
          "© <a href=\"https://openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: "osm-raster-layer",
        type: "raster",
        source: "osm-raster",
        minzoom: 0,
        maxzoom: 22,
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  };
}

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
  zoomIn: () => void;
  zoomOut: () => void;
  getBearing: () => number;
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
      style: osmRasterStyle(),
      center: [settings.osmCenterLng, settings.osmCenterLat],
      zoom: settings.osmDefaultZoom,
      bearing: initialBearing,
      pitch: initialPitch,
      minZoom: settings.osmMinZoom,
      maxZoom: 19,
      maxPitch: 60,
      interactive,
      attributionControl: { compact: true },
      // Rotate: right-click drag (desktop), two-finger rotate (touch),
      // shift + drag also works via MapLibre defaults.
      bearingSnap: 5,
      // Retina rendering
      pixelRatio: window.devicePixelRatio || 1,
      // Snap zoom to whole levels — raster tiles look sharpest at
      // integer zoom (no half-zoom blur).
      dragRotate: true,
      touchZoomRotate: true,
      pitchWithRotate: false,
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
        zoomIn: () => map.zoomIn({ duration: 250 }),
        zoomOut: () => map.zoomOut({ duration: 250 }),
        getBearing: () => map.getBearing(),
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

  // ── Dark mode: no style swap (raster OSM tiles have one look). A
  //    CSS filter would work but distorts the classic OSM colors the
  //    user asked for. Leaving as-is; dark-mode users see the same
  //    colorful OSM as light-mode users.
  useEffect(() => {
    // no-op — kept as a hook slot in case we add a dark raster provider later
    void darkMode;
  }, [darkMode]);

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
