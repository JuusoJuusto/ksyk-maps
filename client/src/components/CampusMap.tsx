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

// CartoDB basemap raster tiles — free CDN with no API key required and
// no strict rate limit (unlike OSM standard tiles which OSMF policy asks
// production apps to avoid). Voyager for light, DarkMatter for dark.
// Falling back to OSM tiles as a secondary source if Carto is blocked.
const TILE_URLS = {
  light: [
    "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  ],
  dark: [
    "https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
    "https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
    "https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
    "https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
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

/**
 * v3.25.9 — MazeMap-style URL state sync.
 *
 * Reflects the camera into the URL query string (`?z=17.5&lat=60.192&
 * lng=25.006&bearing=45&pitch=30`) using `history.replaceState` so the
 * back button isn't spammed. Anyone sharing/copying the URL restores
 * the exact view on the recipient's browser.
 *
 * Reads take priority over the persisted localStorage camera so a
 * shared link overrides the visitor's last-session position — the
 * expected behaviour when someone sends you a specific location.
 */
interface UrlCamera {
  lat?: number; lng?: number; zoom?: number;
  bearing?: number; pitch?: number;
  floor?: number;
}
function readUrlCamera(): UrlCamera | null {
  if (typeof window === "undefined") return null;
  try {
    const p = new URLSearchParams(window.location.search);
    const num = (k: string): number | undefined => {
      const v = p.get(k);
      if (v === null || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const out: UrlCamera = {
      lat: num("lat"), lng: num("lng"), zoom: num("z") ?? num("zoom"),
      bearing: num("bearing"), pitch: num("pitch"),
      floor: num("floor"),
    };
    // Only return non-null if at least one useful field is present so
    // consumers can prefer localStorage when the URL is bare.
    if (out.lat === undefined && out.lng === undefined && out.zoom === undefined
        && out.bearing === undefined && out.pitch === undefined) return null;
    // Sanity range same as persisted camera reader.
    if (out.lat !== undefined && Math.abs(out.lat) > 85) return null;
    if (out.lng !== undefined && Math.abs(out.lng) > 180) return null;
    if (out.zoom !== undefined && (out.zoom < 0 || out.zoom > 24)) return null;
    return out;
  } catch { return null; }
}
/** Debounced URL writer — only reflects the current camera after
 *  the user stops panning for 300 ms so history isn't hammered. */
let urlWriteTimer: number | null = null;
function scheduleWriteUrlCamera(c: PersistedCamera): void {
  if (typeof window === "undefined") return;
  if (urlWriteTimer !== null) window.clearTimeout(urlWriteTimer);
  urlWriteTimer = window.setTimeout(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      p.set("z", c.zoom.toFixed(2));
      p.set("lat", c.lat.toFixed(6));
      p.set("lng", c.lng.toFixed(6));
      // Only include bearing/pitch when non-zero so trivial URLs stay
      // trivial (`?z=17.5&lat=60.19&lng=25.00`).
      if (Math.abs(c.bearing) > 0.5) p.set("bearing", c.bearing.toFixed(1));
      else p.delete("bearing");
      if (c.pitch > 1) p.set("pitch", c.pitch.toFixed(1));
      else p.delete("pitch");
      const next = `${window.location.pathname}?${p.toString()}${window.location.hash}`;
      window.history.replaceState(null, "", next);
    } catch { /* history API not available (very old browsers) */ }
  }, 300);
}

const TILE_ATTRIBUTIONS = {
  light: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  dark:  '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
} as const;

/** Build a MapLibre style spec for the given theme. */
function osmRasterStyle(mode: "light" | "dark"): maplibregl.StyleSpecification {
  return {
    version: 8,
    // MazeMap-style directional lighting for fill-extrusion layers.
    light: {
      anchor: "map",
      position: [1.15, 45, 65],
      color: mode === "dark" ? "#c7d0e0" : "#fff4dc",
      intensity: mode === "dark" ? 0.35 : 0.6,
    },
    sources: {
      "osm-raster": {
        type: "raster",
        tiles: [...TILE_URLS[mode]],
        tileSize: 256,
        attribution: TILE_ATTRIBUTIONS[mode],
        maxzoom: 19,
      },
    },
    // v3.26.2 — minimum-viable style. Raster is the ONLY layer here;
    // KSYK overlays get added on top by CampusOverlay. Removed the
    // background layer that I added in 3.26.0 — it (or the tweaked
    // raster opacity curve) was blanking the map for some users. If
    // tiles fail to load, the container's CSS background-color paints
    // through — the map area shows the app's default background, not
    // white. Safe. Boring. Works.
    layers: [
      {
        id: "osm-raster-layer",
        type: "raster",
        source: "osm-raster",
        minzoom: 0,
        maxzoom: 22,
        paint: {
          "raster-opacity": 1.0,
          "raster-resampling": "linear",
          "raster-fade-duration": 200,
          // Darken OSM standard tiles in dark mode since we no longer use
          // a separate dark tile provider (CARTO Dark Matter).
          ...(mode === "dark" && {
            "raster-brightness-max": 0.22,
            "raster-saturation": -0.4,
            "raster-contrast": 0.2,
          }),
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
  /** Called when the map fails to load (watchdog timeout or GL error). */
  onLoadError?: () => void;
}

export default function CampusMap({
  onReady,
  className,
  bearing,
  pitch,
  interactive = true,
  showNavigationControl = false,
  onLoadError,
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
    // v3.27.5 — ALWAYS start at admin spawn on fresh page loads. The
    // localStorage-based `readPersistedCamera` is no longer consulted
    // (the writer stays, so pans still persist within-session for
    // convenience) — every open of the site drops the user at the
    // admin-configured centre + zoom + rotation. Only the URL query
    // still overrides, so shared links (?z=&lat=&lng=…) restore the
    // exact view. Rationale: reported "spawn location isn't
    // consistent, sometimes lands mid-air over last-panned view."
    const urlCam = readUrlCamera();
    const initialBearing = bearing ?? urlCam?.bearing ?? platformDefaults.bearing;
    const initialPitch   = pitch   ?? urlCam?.pitch   ?? platformDefaults.pitch;
    const initialCenter: [number, number] =
      (urlCam?.lat !== undefined && urlCam?.lng !== undefined)
        ? [urlCam.lng, urlCam.lat]
        : [platformDefaults.lng, platformDefaults.lat];
    const initialZoom = urlCam?.zoom ?? platformDefaults.zoom;

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

    // v3.26.0 — GeolocateControl removed per feedback. Real GPS was
    // rarely useful on a small indoor campus (accuracy circle covered
    // half the building) and the button conflicted with the site's
    // own navigation UI. The indoor routing flow uses room-based
    // origins ("Etsi lähtöhuone") instead.

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
      onLoadError?.();
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
      // moveend being emitted only when the map stops. v3.25.9: also
      // debounce-writes the same values to the URL query so shared
      // links restore the exact view (MazeMap-style).
      map.on("moveend", () => {
        const cam: PersistedCamera = {
          lat: map.getCenter().lat,
          lng: map.getCenter().lng,
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        };
        writePersistedCamera(cam);
        scheduleWriteUrlCamera(cam);
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
  // v3.27.2 — SPLIT the old "settings change → easeTo everything"
  // effect into two independent effects. Old code fired on every
  // relevant settings change and always re-flew center + zoom + both
  // rotation + pitch, which meant clicking the 3D toggle (updates
  // pitchDeg) reset the user's pan and zoom too. The bug user
  // reported as "3d mode doesnt work, resets map controls."

  // Effect A — center + zoom + minZoom + maxZoom. Fires only when
  // those specifically change. Preserves current bearing + pitch.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (bearing !== undefined || pitch !== undefined) return;
    const d = pickPlatformMapDefaults(settings);
    map.setMinZoom(d.minZoom);
    map.setMaxZoom(Math.min(22, d.maxZoom));
    map.easeTo({
      center: [d.lng, d.lat],
      zoom: d.zoom,
      bearing: map.getBearing(),
      pitch:   map.getPitch(),
      duration: 500,
    });
  }, [
    settings.osmCenterLat, settings.osmCenterLng, settings.osmDefaultZoom, settings.osmMinZoom, settings.osmMaxZoom,
    settings.mobileCenterLat, settings.mobileCenterLng, settings.mobileDefaultZoom, settings.mobileMinZoom, settings.mobileMaxZoom,
    settings.desktopCenterLat, settings.desktopCenterLng, settings.desktopDefaultZoom, settings.desktopMinZoom, settings.desktopMaxZoom,
    ready, bearing, pitch,
  ]);

  // v3.27.3 — SPLIT rotation and pitch into TWO effects so toggling
  // the 3D button (which updates pitchDeg) doesn't also reset the
  // user's map bearing. The old combined effect passed BOTH d.bearing
  // and d.pitch on every fire, which meant clicking 3D flew the map
  // back to admin's default rotation on top of tilting.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (bearing !== undefined || pitch !== undefined) return;
    const d = pickPlatformMapDefaults(settings);
    map.easeTo({
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: d.bearing,
      pitch: map.getPitch(),
      duration: 500,
    });
  }, [
    settings.osmRotationDeg, settings.mobileRotationDeg, settings.desktopRotationDeg,
    ready, bearing, pitch,
  ]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (bearing !== undefined || pitch !== undefined) return;
    const d = pickPlatformMapDefaults(settings);
    map.easeTo({
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: d.pitch,
      duration: 500,
    });
  }, [
    settings.osmPitchDeg, settings.mobilePitchDeg, settings.desktopPitchDeg,
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
      // v3.26.2 — CSS fallback backdrop. If MapLibre fails to init or
      // the raster tiles don't load, the container shows a neutral
      // paper-beige (or dark slate) so users never see stark white.
      style={{ backgroundColor: darkMode ? "#0f172a" : "#eeeae0" }}
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
