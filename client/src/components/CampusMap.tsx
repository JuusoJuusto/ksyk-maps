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

/** Camera persistence — remembers where the user last had the map
 *  positioned/rotated/tilted so opening the app on a subsequent
 *  session doesn't slam back to the admin default. Read once on mount,
 *  written on every `moveend` so it stays in sync without polling. */
const CAMERA_STORAGE_KEY = "ksyk_camera_v1";
interface PersistedCamera {
  lat: number;
  lng: number;
  zoom: number;
  bearing: number;
  pitch: number;
}
function readPersistedCamera(): PersistedCamera | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CAMERA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedCamera> | null;
    if (
      !parsed
      || typeof parsed.lat !== "number"
      || typeof parsed.lng !== "number"
      || typeof parsed.zoom !== "number"
      || typeof parsed.bearing !== "number"
      || typeof parsed.pitch !== "number"
    ) return null;
    // Sanity — reject any out-of-range values that would confuse
    // MapLibre and clamp the user into a corner of the world.
    if (Math.abs(parsed.lat) > 85 || Math.abs(parsed.lng) > 180) return null;
    if (parsed.zoom < 0 || parsed.zoom > 24) return null;
    return parsed as PersistedCamera;
  } catch {
    return null;
  }
}
function writePersistedCamera(c: PersistedCamera): void {
  try { window.localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(c)); }
  catch { /* quota / private mode — camera just won't persist */ }
}

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
    // "map" so shadows behave as world-space (the sun stays put as
    // the user rotates) — required for `fill-extrusion-cast-shadows`
    // to read as a real sun instead of a headlamp.
    light: {
      anchor: "map",
      // Position is [radial, azimuth°, polar°]. Southwest-ish light
      // at 65° above horizon → shadows cast north-east, which matches
      // the drop-shadow polygons in installBuildings.
      position: [1.15, 45, 65],
      color: mode === "dark" ? "#c7d0e0" : "#fff4dc",
      intensity: mode === "dark" ? 0.35 : 0.6,
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
          // v3.25.7 — much more aggressive fade past zoom 19 so the
          // (inevitably blurry) overzoomed raster stops distracting
          // from the crisp KSYK vector overlays. Past zoom 21 the
          // basemap is basically a ghost so the interior view is a
          // clean vector diagram. Below 18 the basemap stays 100% so
          // the campus reads in its neighborhood context.
          "raster-opacity": ["interpolate", ["linear"], ["zoom"], 15, 1.0, 18, 1.0, 19, 0.6, 20, 0.35, 21, 0.15, 22, 0.05],
          // Linear resampling smooths overzoomed pixels — trades
          // crispness for a less jagged blur. Combined with the low
          // opacity above, the eye stops trying to focus on it.
          "raster-resampling": "linear",
          // Slight saturation boost at low zooms so the basemap has
          // personality; back to 0 at high zoom where the vector
          // overlays are the focus.
          "raster-saturation": ["interpolate", ["linear"], ["zoom"], 15, 0.0, 18, 0.05, 22, -0.3],
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
    // Persisted camera — if the user rotated / tilted / panned in a
    // previous session, restore that view instead of snapping back to
    // the admin defaults. Fixes the "first login resets bearing to
    // north" bug reported v3.22.
    const persisted = readPersistedCamera();
    const initialBearing = bearing ?? persisted?.bearing ?? platformDefaults.bearing;
    const initialPitch   = pitch   ?? persisted?.pitch   ?? platformDefaults.pitch;
    const initialCenter: [number, number] = persisted
      ? [persisted.lng, persisted.lat]
      : [platformDefaults.lng, platformDefaults.lat];
    const initialZoom = persisted?.zoom ?? platformDefaults.zoom;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: osmRasterStyle(darkMode ? "dark" : "light"),
      center: initialCenter,
      zoom: initialZoom,
      bearing: initialBearing,
      pitch: initialPitch,
      // v3.25.7 — Raster CDN caps at zoom 19; we let MapLibre upscale
      // the last native tile up to zoom 22 so users can inspect
      // individual rooms/desks. The upscaled basemap fades out
      // aggressively past 20 (see raster-opacity above) so blurry
      // pixels don't distract from the crisp KSYK vector overlay.
      minZoom: platformDefaults.minZoom,
      maxZoom: Math.min(22, platformDefaults.maxZoom),
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

    // v3.25.3 — MazeMap-style "find me" puck. Adds a control that
    // requests the browser Geolocation API on click, drops a blue dot,
    // and (with trackUserLocation) keeps it in sync as the user walks.
    // MapLibre draws the accuracy ring + puck itself — no per-frame
    // animation code on our side.
    try {
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showAccuracyCircle: true,
          fitBoundsOptions: { maxZoom: 19 },
        }),
        "top-right",
      );
    } catch {
      // Non-fatal — some browsers reject the control silently. The map
      // still works; users just won't get the "find me" button.
    }

    // v3.25.3 — metric scale bar in the corner. Matches every consumer
    // map (Google Maps, MazeMap, Apple Maps) so users have a persistent
    // sense of "5 m vs 50 m across." Kept metric-only because the KSYK
    // campus is in Finland and switching units mid-view is more
    // confusing than helpful.
    try {
      map.addControl(
        new maplibregl.ScaleControl({ maxWidth: 90, unit: "metric" }),
        "bottom-left",
      );
    } catch {
      // Non-fatal — very old browsers may not have the necessary
      // canvas APIs. The map still renders fine.
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
      // Persist camera on every settle so the next session restores
      // exactly where the user left off. Throttled implicitly by
      // moveend being emitted only when the map stops.
      map.on("moveend", () => {
        writePersistedCamera({
          lat: map.getCenter().lat,
          lng: map.getCenter().lng,
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        });
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
          // lose the high-zoom raster fade.
          "raster-opacity": ["interpolate", ["linear"], ["zoom"], 15, 1.0, 18, 1.0, 19, 0.75, 20, 0.6, 22, 0.45],
          "raster-fade-duration": 200,
        },
      },
      firstOverlay,
    );
    // Re-apply the directional light so extrusion shading matches the
    // theme. Warm sun for light mode, cool moon for dark mode. Same
    // world-space anchor as the initial style spec so cast shadows
    // continue to behave correctly after a theme toggle.
    try {
      map.setLight({
        anchor: "map",
        position: [1.15, 45, 65],
        color: darkMode ? "#c7d0e0" : "#fff4dc",
        intensity: darkMode ? 0.35 : 0.6,
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
    map.setMaxZoom(Math.min(22, d.maxZoom));
    // v3.25.8 — first-visit fix: if the user has no persisted camera
    // (i.e. this is their first-ever load OR they've cleared
    // localStorage) AND has never moved the map (bearing/pitch still
    // at 0), it's safe to snap to the admin-set bearing + pitch.
    // Without this the map would boot facing north because
    // `loadMapDefaultsFromServer` finishes AFTER the map init effect,
    // so `platformDefaults.bearing` was 0 at init time and we never
    // re-applied it. The old easeTo below kept `map.getBearing()`
    // which was 0.
    const hasPersistedCamera = readPersistedCamera() !== null;
    const userHasMovedCamera = Math.abs(map.getBearing()) > 0.5 || map.getPitch() > 1;
    const shouldSnapBearing = !hasPersistedCamera && !userHasMovedCamera;
    // Then camera — explicit bearing + pitch so easeTo's zero-defaults
    // can't yank the user out of their rotated / tilted view.
    map.easeTo({
      center: [d.lng, d.lat],
      zoom: d.zoom,
      bearing: shouldSnapBearing ? d.bearing : map.getBearing(),
      pitch:   shouldSnapBearing ? d.pitch   : map.getPitch(),
      duration: 500,
    });
  }, [
    settings.osmCenterLat, settings.osmCenterLng, settings.osmDefaultZoom, settings.osmMinZoom, settings.osmMaxZoom,
    settings.osmRotationDeg, settings.osmPitchDeg,
    settings.mobileCenterLat, settings.mobileCenterLng, settings.mobileDefaultZoom, settings.mobileMinZoom, settings.mobileMaxZoom,
    settings.mobileRotationDeg, settings.mobilePitchDeg,
    settings.desktopCenterLat, settings.desktopCenterLng, settings.desktopDefaultZoom, settings.desktopMinZoom, settings.desktopMaxZoom,
    settings.desktopRotationDeg, settings.desktopPitchDeg,
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
      map.setMaxZoom(Math.min(22, d.maxZoom));
      // No animation here; just clamp for the new device orientation.
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
