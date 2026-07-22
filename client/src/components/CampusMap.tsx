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
import { useAppSettings, pickPlatformMapDefaults } from "@/hooks/useAppSettings";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";

// Raster tile providers — the light theme uses CARTO's Voyager style
// (crisp @2x retina tiles, MazeMap-adjacent palette). Falls back to
// classic OSM only when Voyager can't serve a tile. Dark mode swaps in
// Carto Dark Matter which reads well as a background under the KSYK
// blue building overlays. Both providers are free + no-API-key.
const TILE_URLS = {
  light: [
    // CARTO Voyager @2x — retina detail at zoom 19+, cleaner labels,
    // MazeMap-style muted palette so the KSYK overlays pop on top.
    "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
    "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
    "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
    "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
  ],
  dark: [
    // Retina dark tiles too — matches the light-mode DPR so switching
    // themes doesn't visibly change tile crispness.
    "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
    "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
    "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
    "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
  ],
} as const;

const TILE_ATTRIBUTIONS = {
  light: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
  dark:  '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
} as const;

/** Build a MapLibre style spec for the given theme. */
function osmRasterStyle(mode: "light" | "dark"): maplibregl.StyleSpecification {
  return {
    version: 8,
    // MazeMap-style directional lighting. The `light` block controls
    // shading on every fill-extrusion layer (buildings, walls, room
    // slabs). Setting a warm color + a fixed low-angle position makes
    // buildings read as "sunlit" instead of the flat default. Anchor
    // "viewport" keeps the light angle stable as the user rotates.
    light: {
      anchor: "viewport",
      // Slightly northeast + low. Casts a soft warm tint on faces
      // facing east; opposite faces darker for depth.
      position: [1.15, 210, 30],
      color: mode === "dark" ? "#c7d0e0" : "#fff4dc",
      intensity: mode === "dark" ? 0.35 : 0.55,
    },
    sources: {
      "osm-raster": {
        type: "raster",
        tiles: [...TILE_URLS[mode]],
        // @2x tiles are still 512 px but we render them as 256 for
        // pixel-perfect sharpness at DPR≥2 displays.
        tileSize: 256,
        attribution: TILE_ATTRIBUTIONS[mode],
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
        paint: {
          // Fade the basemap slightly at high zoom so the KSYK vector
          // overlay (rooms, hallways, POIs) reads as the "real content"
          // and the OSM streets recede into a diagram-like backdrop.
          // Below zoom 18 we stay 100% so context (streets, districts)
          // still guides the user's mental map.
          "raster-opacity": ["interpolate", ["linear"], ["zoom"], 15, 1.0, 18, 1.0, 19, 0.75, 20, 0.6, 22, 0.45],
          // MazeMap-like vibrancy — modest saturation + contrast bump
          // so the OSM greens/blues/parks pop as "colorful diagram" not
          // "dull government print". Values are conservative so the
          // map still reads correctly at low zoom.
          "raster-saturation": mode === "light" ? 0.15 : -0.1,
          "raster-contrast": mode === "light" ? 0.08 : 0.05,
          "raster-brightness-min": 0,
          "raster-brightness-max": 1,
          // Turn off the raster's default cross-fade so labels don't
          // flicker during zoom.
          "raster-fade-duration": 200,
        },
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

    // Platform-aware camera — mobile vs laptop defaults live under
    // their own keys and fall back to the shared osm* values when unset.
    const platformDefaults = pickPlatformMapDefaults(settings);
    const initialBearing = bearing ?? platformDefaults.bearing;
    const initialPitch = pitch ?? platformDefaults.pitch;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: osmRasterStyle(darkMode ? "dark" : "light"),
      center: [platformDefaults.lng, platformDefaults.lat],
      zoom: platformDefaults.zoom,
      bearing: initialBearing,
      pitch: initialPitch,
      // Raster CDN caps at zoom 19; we let MapLibre upscale the last
      // native tile up to zoom 21 so the vector overlay (rooms, room
      // labels, POI chips) can shine at close-in inspection. The
      // upscaled basemap fades out via raster-opacity so it doesn't
      // pixelate the view.
      minZoom: platformDefaults.minZoom,
      maxZoom: Math.min(21, platformDefaults.maxZoom),
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

    // Watchdog — if MapLibre's `load` event doesn't fire within 6s
    // (bad WebGL context, tile CDN slow, stale style spec, etc.), tear
    // the map down and re-init. Without this the splash + overlays
    // would wait forever on a silently-broken map.
    let loadFired = false;
    const watchdog = window.setTimeout(() => {
      if (loadFired) return;
      console.warn("CampusMap: load event didn't fire within 6s — recovering.");
      try { map.remove(); } catch { /* already gone */ }
      mapRef.current = null;
      // Fire the boot signal anyway so the splash can proceed; the map
      // effect will re-run on next mount cycle.
      try { window.dispatchEvent(new CustomEvent("ksyk:map-ready")); }
      catch { /* non-fatal */ }
    }, 6000);

    map.on("error", (e) => {
      // Non-fatal — swallow tile 404s and log so we see them, but don't
      // let one bad tile pull the whole overlay down.
      const err = (e as { error?: Error }).error;
      if (err) console.warn("MapLibre error:", err.message);
    });

    map.on("load", () => {
      loadFired = true;
      window.clearTimeout(watchdog);
      mapRef.current = map;
      setReady(true);
      // Fire boot-ready once the first frame paints so SplashScreen can
      // fade even if data queries are already resolved.
      map.once("idle", () => {
        try { window.dispatchEvent(new CustomEvent("ksyk:map-ready")); }
        catch { /* SSR / old browser — non-fatal */ }
      });
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
          const d = pickPlatformMapDefaults(settings);
          map.flyTo({
            center: [d.lng, d.lat],
            zoom: d.zoom,
            // Preserve current bearing / pitch — the wrapper in
            // KSYKMapView already does this too; keeping the handle
            // signature honest for any other caller.
            bearing: map.getBearing(),
            pitch: map.getPitch(),
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

  // ── Dark mode: swap the tile source in place. Full setStyle() would
  //    also work but it re-installs every KSYK GeoJSON layer, so we
  //    just update the source's tile URLs + attribution and let
  //    MapLibre re-fetch. This preserves camera state + user overlays.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const mode = darkMode ? "dark" : "light";
    const src = map.getStyle().sources["osm-raster"];
    if (!src) return;
    // MapLibre doesn't expose a mutable "setTiles" on raster sources —
    // the safest reliable path is remove + re-add the source and
    // re-add the layer. Both are cheap on raster.
    const layerBefore = map.getLayer("osm-raster-layer");
    if (layerBefore) map.removeLayer("osm-raster-layer");
    if (map.getSource("osm-raster")) map.removeSource("osm-raster");
    map.addSource("osm-raster", {
      type: "raster",
      tiles: [...TILE_URLS[mode]],
      tileSize: 256,
      attribution: TILE_ATTRIBUTIONS[mode],
      maxzoom: 19,
    });
    // Insert BELOW the first non-basemap layer so KSYK overlays stay on top.
    const layers = map.getStyle().layers ?? [];
    const firstOverlay = layers.find((l) => l.id !== "osm-raster-layer")?.id;
    map.addLayer(
      {
        id: "osm-raster-layer", type: "raster", source: "osm-raster",
        minzoom: 0, maxzoom: 22,
        paint: {
          // Match the initial-style paint so a dark-mode toggle doesn't
          // lose the high-zoom raster fade OR the saturation bump.
          "raster-opacity": ["interpolate", ["linear"], ["zoom"], 15, 1.0, 18, 1.0, 19, 0.75, 20, 0.6, 22, 0.45],
          "raster-saturation": darkMode ? -0.1 : 0.15,
          "raster-contrast": darkMode ? 0.05 : 0.08,
          "raster-brightness-min": 0,
          "raster-brightness-max": 1,
          "raster-fade-duration": 200,
        },
      },
      firstOverlay,
    );
    // Re-apply the directional light so extrusion shading matches the
    // theme. Warm sun for light mode, cool moon for dark mode.
    try {
      map.setLight({
        anchor: "viewport",
        position: [1.15, 210, 30],
        color: darkMode ? "#c7d0e0" : "#fff4dc",
        intensity: darkMode ? 0.35 : 0.55,
      });
    } catch { /* light spec not supported — skip */ }
  }, [darkMode, ready]);

  // ── React to platform-scoped map defaults changing at runtime.
  //    e.g. admin tweaks mobileDefaultZoom in the settings panel — the
  //    currently-shown map should re-fly to the new values, not wait
  //    for a reload.
  //
  //    The min/max zoom also need to be re-applied because MapLibre
  //    only respects them at init unless setMinZoom/setMaxZoom is
  //    called.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    // Only re-apply when the CALLER isn't force-controlling bearing/pitch,
    // otherwise a prop-controlled preview would fight us.
    if (bearing !== undefined || pitch !== undefined) return;
    const d = pickPlatformMapDefaults(settings);
    // Zoom bounds first — MapLibre will clamp current zoom if needed.
    map.setMinZoom(d.minZoom);
    map.setMaxZoom(Math.min(21, d.maxZoom));
    // Then camera — explicit bearing + pitch so easeTo's zero-defaults
    // can't yank the user out of their rotated / tilted view.
    map.easeTo({
      center: [d.lng, d.lat],
      zoom: d.zoom,
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      duration: 500,
    });
  }, [
    settings.osmCenterLat, settings.osmCenterLng, settings.osmDefaultZoom, settings.osmMinZoom, settings.osmMaxZoom,
    settings.mobileCenterLat, settings.mobileCenterLng, settings.mobileDefaultZoom, settings.mobileMinZoom, settings.mobileMaxZoom,
    settings.desktopCenterLat, settings.desktopCenterLng, settings.desktopDefaultZoom, settings.desktopMinZoom, settings.desktopMaxZoom,
    ready, bearing, pitch,
  ]);

  // Track viewport width changes so a phone rotated to landscape (which
  // can cross the 768px breakpoint) picks up the desktop overrides,
  // and vice-versa.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (typeof window === "undefined") return;
    const onResize = () => {
      const d = pickPlatformMapDefaults(settings);
      map.setMinZoom(d.minZoom);
      map.setMaxZoom(Math.min(21, d.maxZoom));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [settings, ready]);

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
