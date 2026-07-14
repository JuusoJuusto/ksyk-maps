/**
 * Leaflet + OpenStreetMap basemap. Exposes an SVG element via `onOverlayReady`
 * that the caller can React-portal their existing campus SVG children into.
 *
 * Reads admin-controlled OSM config (center, zoom, rotation, tile provider) from
 * useAppSettings. The SVG overlay is anchored to a lat/lng bounds box computed
 * from osmCenterLat/Lng + osmCampusSpanMeters + the caller-supplied SVG viewBox.
 *
 * Rotation: applied via CSS transform on the .leaflet-map-pane. Tiles + overlay
 * rotate together. Leaflet handles all pan/zoom/wheel/pinch.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { OSM_TILE_PROVIDERS, OSM_TILE_THEMES } from "@/lib/appSettings";
import { safeLatLng, safeNum, safeZoom } from "@/lib/safeNum";

interface OsmBasemapProps {
  /** The viewBox the overlay SVG paints into (caller's SVG world coords). */
  svgViewBox: { x: number; y: number; w: number; h: number };
  /** Called once the overlay SVG element is mounted — caller portals their JSX in. */
  onOverlayReady?: (svgEl: SVGSVGElement) => void;
  onReady?: (map: L.Map) => void;
  onView?: (map: L.Map) => void;
  /** Fires when the tile layer first becomes idle (initial paint complete). */
  onTilesLoaded?: () => void;
  className?: string;
  /** Whether to mount the campus SVG overlay at all. When false, no SVG
   * element is added to Leaflet (no possible "ghost square" artifact).
   * Default false — caller flips this to true when it has rooms to draw. */
  enableOverlay?: boolean;
}

function metersToLatDeg(m: number) {
  return m / 111_320;
}
function metersToLngDeg(m: number, atLat: number) {
  return m / (111_320 * Math.cos((atLat * Math.PI) / 180));
}

export default function OsmBasemap({
  svgViewBox,
  onOverlayReady,
  onReady,
  onView,
  onTilesLoaded,
  className,
  enableOverlay = false,
}: OsmBasemapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.SVGOverlay | null>(null);
  const overlaySvgRef = useRef<SVGSVGElement | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const { settings, setSettings } = useAppSettings();
  const { darkMode } = useDarkMode();
  const [, setReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(settings.osmDefaultZoom);
  const [currentLat, setCurrentLat] = useState(settings.osmCenterLat);
  const [canZoomIn, setCanZoomIn] = useState(true);
  const [canZoomOut, setCanZoomOut] = useState(true);

  // Pick the right tile provider based on the active theme. The tile-theme
  // pack is the source of truth; the legacy per-mode providers are kept as a
  // fallback for old settings.
  const activeProvider = useMemo(() => {
    const pack = OSM_TILE_THEMES[settings.osmTileTheme] ?? OSM_TILE_THEMES.default;
    const key = darkMode ? pack.dark : pack.light;
    return OSM_TILE_PROVIDERS[key] ?? OSM_TILE_PROVIDERS["carto-voyager"];
  }, [darkMode, settings.osmTileTheme]);

  // Build SVG element once. Explicitly invisible by default — only the
  // children React portals into it should ever draw pixels.
  if (!overlaySvgRef.current) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
    el.setAttribute("viewBox", `${svgViewBox.x} ${svgViewBox.y} ${svgViewBox.w} ${svgViewBox.h}`);
    el.setAttribute("preserveAspectRatio", "xMidYMid meet");
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", "none");
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.overflow = "visible";
    el.style.background = "transparent";
    overlaySvgRef.current = el;
  }

  // Keep viewBox in sync
  useEffect(() => {
    overlaySvgRef.current?.setAttribute(
      "viewBox",
      `${svgViewBox.x} ${svgViewBox.y} ${svgViewBox.w} ${svgViewBox.h}`
    );
  }, [svgViewBox.x, svgViewBox.y, svgViewBox.w, svgViewBox.h]);

  // Compute geographic bounds — span scaled to SVG aspect ratio.
  // Every numeric input is sanitised first so the resulting bounds can never
  // be NaN (which Leaflet rejects with an Invalid LatLng error).
  const campusBounds = useMemo<L.LatLngBoundsLiteral>(() => {
    const [centerLat, centerLng] = safeLatLng(settings.osmCenterLat, settings.osmCenterLng);
    const span = safeNum(settings.osmCampusSpanMeters, 220);
    const halfLatM = span / 2;
    const halfLatDeg = metersToLatDeg(halfLatM);
    const aspect = svgViewBox.w / Math.max(1, svgViewBox.h);
    const halfLngM = halfLatM * aspect;
    const halfLngDeg = metersToLngDeg(halfLngM, centerLat);
    return [
      [centerLat - halfLatDeg, centerLng - halfLngDeg],
      [centerLat + halfLatDeg, centerLng + halfLngDeg],
    ];
  }, [
    settings.osmCenterLat,
    settings.osmCenterLng,
    settings.osmCampusSpanMeters,
    svgViewBox.w,
    svgViewBox.h,
  ]);

  // Mount Leaflet once
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;
    const provider = activeProvider;

    const [initLat, initLng] = safeLatLng(settings.osmCenterLat, settings.osmCenterLng);
    const initZoom = safeZoom(settings.osmDefaultZoom);
    const map = L.map(containerRef.current, {
      center: [initLat, initLng],
      zoom: initZoom,
      maxZoom: safeZoom(settings.osmMaxZoom, 19),
      minZoom: safeZoom(settings.osmMinZoom, 15),
      zoomControl: false,
      attributionControl: true,
      wheelPxPerZoomLevel: 60,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      zoomAnimation: true,
      zoomAnimationThreshold: 6,
      fadeAnimation: true,
      markerZoomAnimation: true,
      preferCanvas: true,
      inertia: true,
      inertiaDeceleration: 2800,     // slightly more friction on mobile feel
      inertiaMaxSpeed: 1400,
      worldCopyJump: false,
      bounceAtZoomLimits: false,
      tap: false,   // disables Leaflet's 300 ms tap shim; @types/leaflet omits it → cast below
    } as unknown as L.MapOptions);

    // Native Leaflet controls are NOT added — they'd drift outside the visible
    // viewport when the map is rotated (the Leaflet container is intentionally
    // oversized to cover rotated corners, so "bottomright" of the container is
    // off-screen). React-based controls below are anchored to the outer div instead.

    tileLayerRef.current = L.tileLayer(provider.url, {
      maxZoom: settings.osmMaxZoom,
      maxNativeZoom: provider.maxNativeZoom,
      attribution: provider.attribution,
      subdomains: "abcd",
      // detectRetina was forcing Leaflet to request zoom+1 tiles, which
      // 404s past the provider's maxNativeZoom and broke the map on
      // high-DPR phones at max zoom. The `{r}` placeholder in the tile
      // URL gives us @2x crispness without bumping zoom.
      detectRetina: false,
      // Larger keepBuffer so rotation/pitch don't blank the corners that
      // poke outside Leaflet's axis-aligned viewport. Cheap on mobile too —
      // a few extra 256 px tiles.
      keepBuffer: 6,
      updateWhenIdle: false,
      updateWhenZooming: false,
      crossOrigin: true,
    }).addTo(map);

    if (enableOverlay && overlaySvgRef.current) {
      overlayRef.current = L.svgOverlay(overlaySvgRef.current, campusBounds, {
        interactive: true,
        bubblingMouseEvents: false,
        opacity: 1,
        className: "ksyk-campus-svg-overlay",
      }).addTo(map);
    }

    mapRef.current = map;
    setReady(true);
    onReady?.(map);
    if (enableOverlay && overlaySvgRef.current) onOverlayReady?.(overlaySvgRef.current);

    const view = () => onView?.(map);
    map.on("move zoom", view);
    view(); // fire once immediately so callers have the initial scale

    // Track zoom + lat so we can render the React-based scale bar
    const onZoomEnd = () => {
      const z = map.getZoom();
      const lat = map.getCenter().lat;
      setCurrentZoom(z);
      setCurrentLat(lat);
      setCanZoomIn(z < map.getMaxZoom());
      setCanZoomOut(z > map.getMinZoom());
    };
    map.on("zoomend moveend", onZoomEnd);
    onZoomEnd(); // initial state

    // First-paint signal — used by callers to dismiss skeleton overlays.
    let firedTilesLoaded = false;
    const fireTilesLoaded = () => {
      if (firedTilesLoaded) return;
      firedTilesLoaded = true;
      onTilesLoaded?.();
    };
    tileLayerRef.current?.once("load", fireTilesLoaded);
    // Hard safety net — even if the load event never fires (cached tiles,
    // offline, etc.) drop the skeleton after 6 s so we never block the UI.
    const safety = window.setTimeout(fireTilesLoaded, 6000);

    // Tile error recovery — when a tile fails (timeout / 5xx / CORS), redraw
    // the layer up to 3 times then give up gracefully. Without this, a
    // single transient network blip can leave permanent grey squares on
    // the map. The retry runs the URL through Leaflet again, which on most
    // CDNs hits a different shard.
    const retries = new Map<string, number>();
    const onTileError = (e: L.TileErrorEvent) => {
      const key = `${e.coords.z}/${e.coords.x}/${e.coords.y}`;
      const tries = (retries.get(key) ?? 0) + 1;
      retries.set(key, tries);
      if (tries > 3) return;
      // Re-set the same URL — Leaflet treats it as a fresh load attempt
      // and the CDN often serves it from a different shard.
      const img = e.tile as HTMLImageElement;
      window.setTimeout(() => {
        if (!mapRef.current) return;
        const src = img.src;
        // Force reload by bouncing through about:blank — bypasses HTTP cache
        // for failed requests on some browsers.
        img.src = "";
        img.src = src;
      }, 400 * tries);
    };
    tileLayerRef.current?.on("tileerror", onTileError);

    // Last-ditch: if NO tiles have rendered after 8 s, hard-redraw the
    // layer (remove + re-add). Catches cases where the network came back
    // online after the initial requests already failed.
    const hardRedraw = window.setTimeout(() => {
      const t = tileLayerRef.current;
      if (!t || !mapRef.current) return;
      // _tiles is Leaflet-internal; if any are "loaded" we're good.
      const internal = t as unknown as { _tiles?: Record<string, { loaded?: boolean }> };
      const anyLoaded = Object.values(internal._tiles ?? {}).some((tile) => tile.loaded);
      if (!anyLoaded) {
        map.removeLayer(t);
        t.addTo(map);
      }
    }, 8000);

    // Mobile / first-paint resilience — Leaflet needs to know its container
    // size to load tiles. On mobile the container often reports 0×0 at
    // mount (hidden / animating / safe-area), so kick it a few times.
    // We spread kicks across 2 s to cover slow devices + iOS Safari's
    // deferred layout passes.
    const kick = () => {
      if (!mapRef.current) return;
      map.invalidateSize({ animate: false, pan: false });
    };
    const kickIds = [
      requestAnimationFrame(kick),
      window.setTimeout(kick, 50),
      window.setTimeout(kick, 150),
      window.setTimeout(kick, 350),
      window.setTimeout(kick, 700),
      window.setTimeout(kick, 1500),
    ];

    // Live resize observer + orientation change — also covers the case
    // where the device is rotated (portrait↔landscape).
    const ro = new ResizeObserver(kick);
    if (containerRef.current) ro.observe(containerRef.current);
    const onOrient = () => kick();
    window.addEventListener("orientationchange", onOrient);
    window.addEventListener("resize", onOrient);

    return () => {
      cancelAnimationFrame(kickIds[0] as number);
      (kickIds.slice(1) as number[]).forEach((id) => window.clearTimeout(id));
      window.clearTimeout(safety);
      window.clearTimeout(hardRedraw);
      tileLayerRef.current?.off("tileerror", onTileError);
      ro.disconnect();
      window.removeEventListener("orientationchange", onOrient);
      window.removeEventListener("resize", onOrient);
      map.off("move zoom", view);
      map.off("zoomend moveend", onZoomEnd);
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
      tileLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tile provider / max-zoom / dark-mode changes — swap the tile layer
  // smoothly: add the new layer first, fade out the old one, then remove it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileLayerRef.current) return;
    const provider = activeProvider;
    const newLayer = L.tileLayer(provider.url, {
      maxZoom: settings.osmMaxZoom,
      maxNativeZoom: provider.maxNativeZoom,
      attribution: provider.attribution,
      subdomains: "abcd",
      // detectRetina was forcing Leaflet to request zoom+1 tiles, which
      // 404s past the provider's maxNativeZoom and broke the map on
      // high-DPR phones at max zoom. The `{r}` placeholder in the tile
      // URL gives us @2x crispness without bumping zoom.
      detectRetina: false,
      // Larger keepBuffer so rotation/pitch don't blank the corners that
      // poke outside Leaflet's axis-aligned viewport. Cheap on mobile too —
      // a few extra 256 px tiles.
      keepBuffer: 6,
      updateWhenIdle: false,
      updateWhenZooming: false,
      crossOrigin: true,
      opacity: 0,
    }).addTo(map);

    const oldLayer = tileLayerRef.current;
    tileLayerRef.current = newLayer;

    // Fade in once tiles are ready, then fade out + remove the old layer.
    const fadeIn = () => {
      newLayer.setOpacity(1);
      setTimeout(() => {
        oldLayer.setOpacity(0);
        setTimeout(() => map.removeLayer(oldLayer), 260);
      }, 180);
    };
    if ((newLayer as unknown as { _loading?: boolean })._loading) {
      newLayer.once("load", fadeIn);
      // Failsafe in case load never fires (e.g. provider returns errors)
      setTimeout(fadeIn, 1200);
    } else {
      fadeIn();
    }
  }, [activeProvider, settings.osmMaxZoom]);

  // maxBounds (pan restriction) — applied separately so the values can be
  // changed live without rebuilding the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (settings.osmMaxBoundsEnabled) {
      const south = safeNum(settings.osmMaxBoundsSouth, NaN);
      const west = safeNum(settings.osmMaxBoundsWest, NaN);
      const north = safeNum(settings.osmMaxBoundsNorth, NaN);
      const east = safeNum(settings.osmMaxBoundsEast, NaN);
      // Skip if the box is degenerate (e.g. unedited zeros) or NaN.
      if (
        Number.isFinite(south) && Number.isFinite(west) &&
        Number.isFinite(north) && Number.isFinite(east) &&
        south < north && west < east
      ) {
        map.setMaxBounds(L.latLngBounds([south, west], [north, east]));
        map.options.maxBoundsViscosity = 0.8;
      }
    } else {
      // setMaxBounds(null) is the official "remove restriction" call.
      map.setMaxBounds(null as unknown as L.LatLngBoundsExpression);
    }
  }, [
    settings.osmMaxBoundsEnabled,
    settings.osmMaxBoundsNorth,
    settings.osmMaxBoundsEast,
    settings.osmMaxBoundsSouth,
    settings.osmMaxBoundsWest,
  ]);

  // Center / zoom updates — lifts the maxBounds restriction during flight
  // so we can reach a centre that lives outside the previous bounds (e.g.
  // when admin drags the centre to a new spot before re-defining bounds).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Every numeric input goes through safeNum — if any settings value is
    // NaN/null/undefined (corrupt localStorage, server returned junk, etc.)
    // we fall back to the KSYK defaults and never call Leaflet with NaN.
    const minZ = safeZoom(settings.osmMinZoom, 15);
    const maxZ = safeZoom(settings.osmMaxZoom, 19);
    map.setMinZoom(minZ);
    map.setMaxZoom(maxZ);
    const wasBounded = settings.osmMaxBoundsEnabled;
    if (wasBounded) map.setMaxBounds(null as unknown as L.LatLngBoundsExpression);
    const [lat, lng] = safeLatLng(settings.osmCenterLat, settings.osmCenterLng);
    const zoom = safeZoom(settings.osmDefaultZoom);
    try {
      map.flyTo([lat, lng], zoom, { duration: 0.5 });
    } catch {
      // Last-ditch — swallow Leaflet's internal LatLng error so the map
      // keeps rendering. Silent (no console.warn) because this fires
      // every settings hop and the setView below recovers cleanly.
      try { map.setView([lat, lng], zoom, { animate: false }); } catch { /* give up */ }
    }
    if (wasBounded) {
      const t = setTimeout(() => {
        const south = safeNum(settings.osmMaxBoundsSouth, NaN);
        const west = safeNum(settings.osmMaxBoundsWest, NaN);
        const north = safeNum(settings.osmMaxBoundsNorth, NaN);
        const east = safeNum(settings.osmMaxBoundsEast, NaN);
        if (
          Number.isFinite(south) && Number.isFinite(west) &&
          Number.isFinite(north) && Number.isFinite(east) &&
          south < north && west < east
        ) {
          map.setMaxBounds(L.latLngBounds([south, west], [north, east]));
        }
      }, 700);
      return () => clearTimeout(t);
    }
  }, [
    settings.osmCenterLat,
    settings.osmCenterLng,
    settings.osmDefaultZoom,
    settings.osmMinZoom,
    settings.osmMaxZoom,
  ]);

  // Overlay bounds (when span changes)
  useEffect(() => {
    overlayRef.current?.setBounds(L.latLngBounds(campusBounds));
  }, [campusBounds]);

  // Latest rotation snapshot — read in gesture handlers without re-binding
  // listeners every degree change. Used by both desktop and touch rotation.
  const rotationRef = useRef(settings.osmRotationDeg ?? 0);
  useEffect(() => {
    rotationRef.current = settings.osmRotationDeg ?? 0;
  }, [settings.osmRotationDeg]);

  // Desktop rotation — Shift + drag rotates the map around its centre.
  // We paint the CSS transform imperatively on every pointer move (via
  // rAF) so the map tracks the cursor smoothly, and only commit to the
  // shared settings store when the gesture ends. That keeps React
  // re-renders out of the hot path entirely — pointer moves used to spam
  // setSettings on every pixel, forcing every subscriber to re-render.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let startAngleDeg: number | null = null;
    let startSettingsDeg = 0;
    let currentDeg = 0;
    let rafId = 0;

    const angleTo = (e: MouseEvent): number => {
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    };

    // Paint the container transform without touching React state.
    // Mid-gesture we keep the pre-gesture size/offset (which is oversized
    // enough for the eventual rotation up to any degree), so no reflow.
    const paint = () => {
      rafId = 0;
      const pitch = Math.max(0, Math.min(45, safeNum(settings.osmPitchDeg, 0)));
      container.style.transform =
        pitch > 0
          ? `perspective(1600px) translateZ(0) rotateX(${pitch}deg) rotate(${currentDeg}deg)`
          : `translateZ(0) rotate(${currentDeg}deg)`;
    };

    const onDown = (e: MouseEvent) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      startAngleDeg = angleTo(e);
      startSettingsDeg = rotationRef.current;
      currentDeg = startSettingsDeg;
      // Kill the CSS transition so drag feels 1-to-1 with the cursor.
      container.style.transition = "none";
      // Pause Leaflet panning during the gesture.
      mapRef.current?.dragging?.disable();
      document.body.style.cursor = "grabbing";
    };
    const onMove = (e: MouseEvent) => {
      if (startAngleDeg === null) return;
      const ang = angleTo(e);
      const delta = ang - startAngleDeg;
      let next = startSettingsDeg + delta;
      while (next > 180) next -= 360;
      while (next < -180) next += 360;
      currentDeg = next;
      if (!rafId) rafId = requestAnimationFrame(paint);
    };
    const onUp = () => {
      if (startAngleDeg === null) return;
      startAngleDeg = null;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      mapRef.current?.dragging?.enable();
      document.body.style.cursor = "";
      // Commit once when the gesture ends — this is the only React state
      // update the whole drag produces. The rotation effect below will
      // then re-apply the transition + reflow-and-invalidate cycle.
      setSettings((s) => ({ ...s, osmRotationDeg: Math.round(currentDeg * 10) / 10 }));
    };

    container.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };
    // Intentionally only bind once — pointer handlers read rotationRef +
    // settings.osmPitchDeg via closure snapshot; pitch changes are rare
    // enough that a stale closure would only miss a fresh pitch value
    // mid-drag, which is a non-issue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSettings]);

  // Two-finger touch rotation — same pattern as desktop: paint the CSS
  // transform imperatively during the gesture (rAF-throttled), commit to
  // React state only on touchend. Keeps mid-gesture pointer moves off
  // React's re-render path.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let startAngleDeg: number | null = null;
    let startSettingsDeg = 0;
    let currentDeg = 0;
    let rafId = 0;

    const twoFingerAngleDeg = (e: TouchEvent): number | null => {
      if (e.touches.length !== 2) return null;
      const a = e.touches[0];
      const b = e.touches[1];
      return (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI;
    };

    const paint = () => {
      rafId = 0;
      const pitch = Math.max(0, Math.min(45, safeNum(settings.osmPitchDeg, 0)));
      container.style.transform =
        pitch > 0
          ? `perspective(1600px) translateZ(0) rotateX(${pitch}deg) rotate(${currentDeg}deg)`
          : `translateZ(0) rotate(${currentDeg}deg)`;
    };

    const onStart = (e: TouchEvent) => {
      const ang = twoFingerAngleDeg(e);
      if (ang === null) return;
      startAngleDeg = ang;
      startSettingsDeg = rotationRef.current;
      currentDeg = startSettingsDeg;
      container.style.transition = "none";
    };
    const onMove = (e: TouchEvent) => {
      if (startAngleDeg === null) return;
      const ang = twoFingerAngleDeg(e);
      if (ang === null) return;
      const delta = ang - startAngleDeg;
      // Normalize into -180…+180 so a 359° jump doesn't snap.
      let next = startSettingsDeg + delta;
      while (next > 180) next -= 360;
      while (next < -180) next += 360;
      currentDeg = next;
      if (!rafId) rafId = requestAnimationFrame(paint);
    };
    const onEnd = () => {
      if (startAngleDeg === null) return;
      startAngleDeg = null;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      setSettings((s) => ({ ...s, osmRotationDeg: Math.round(currentDeg * 10) / 10 }));
    };

    container.addEventListener("touchstart", onStart, { passive: true });
    container.addEventListener("touchmove", onMove, { passive: true });
    container.addEventListener("touchend", onEnd, { passive: true });
    container.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener("touchstart", onStart);
      container.removeEventListener("touchmove", onMove);
      container.removeEventListener("touchend", onEnd);
      container.removeEventListener("touchcancel", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSettings]);

  // CSS rotation + optional pitch (tilt) — Google-Maps-style continuous coverage.
  //
  // IMPORTANT: rotation is applied to the Leaflet CONTAINER div, NOT to
  // .leaflet-map-pane. Leaflet overrides mapPane.style.transform on every
  // pan event with its own translate3d(), which used to wipe the rotation.
  // The container's transform is never touched by Leaflet, so rotation now
  // survives all pan/zoom operations.
  //
  // Coverage strategy: container is oversized to a FIXED 150 % of the visible
  // viewport in both axes (30 % more when pitched). Rotating a rectangle by
  // any angle θ grows its axis-aligned bbox by up to √2 (≈ 141 %), so 150 %
  // gives comfortable margin at every angle without any per-frame reflow.
  //
  //   viewport width  = W                container width  = 1.50 * W
  //   viewport height = H                container height = 1.50 * H  (+ 30 % if pitched)
  //   container left  = -0.25 * W        container top    = -0.25 * H (- 15 % if pitched)
  //   → viewport center in container coords = (0.25 W + 0.5 W) / 1.5 W = 50 %
  //   → transform-origin: 50 % 50 %  (symmetric expansion keeps viewport centered)
  //
  // Because the size never depends on rotation, we don't have to reflow / re-
  // request tiles every degree — Leaflet renders the full 1.5×1.5 tile grid
  // once and the transform rotates the whole GPU layer.
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) return;

    // safeNum gracefully turns NaN/string/null into 0 so the CSS transform
    // never receives `rotate(NaNdeg)` (which silently breaks the whole map).
    const rotation = safeNum(settings.osmRotationDeg, 0);
    const pitch = Math.max(0, Math.min(45, safeNum(settings.osmPitchDeg, 0)));

    // Fixed oversize factors — 150% barely covered the √2 diagonal at 45°,
    // leaving corners under-buffered on real devices where Leaflet fetches
    // slightly conservatively. Bumped to 200%/250% for a generous safety
    // margin: tiles fill in for any rotation angle AND for pitched views
    // where the perspective "horizon" pushes the top tiles further out.
    const widthPct = 200;
    const heightPct = pitch > 0 ? 250 : 200;
    // Symmetric expansion around viewport → left/top = -(size - 100) / 2.
    const leftPct = -(widthPct - 100) / 2;
    const topPct = -(heightPct - 100) / 2;

    container.style.position = "absolute";
    // Container is symmetric around the viewport, so 50 %/50 % of container
    // == geographic centre of viewport. This is the whole point of the
    // symmetric expansion: rotation pivots on the visible centre, not on
    // some off-screen point.
    container.style.transformOrigin = "50% 50%";
    // GPU-composite the transformed container so rotation + pitch don't
    // re-lay-out the whole tile grid every frame. Only the transform
    // property gets a transition — layout metrics jump straight to the
    // new size, avoiding a 300 ms reflow storm on every button press.
    // `backface-visibility: hidden` + a translateZ(0) in the transform
    // chain force the browser to promote the element to its own GPU
    // layer, matching what Chrome/Safari do for accelerated animations.
    container.style.willChange = "transform";
    container.style.backfaceVisibility = "hidden";
    container.style.transition = "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
    container.style.width = `${widthPct}%`;
    container.style.height = `${heightPct}%`;
    container.style.left = `${leftPct}%`;
    container.style.top = `${topPct}%`;
    // translateZ(0) forces a compositor layer even when rotation is 0.
    container.style.transform =
      pitch > 0
        ? `perspective(1600px) translateZ(0) rotateX(${pitch}deg) rotate(${rotation}deg)`
        : rotation !== 0
        ? `translateZ(0) rotate(${rotation}deg)`
        : "translateZ(0)";

    // Ensure mapPane has no stale rotation left over from old code.
    const pane = map.getPane("mapPane");
    if (pane) {
      pane.style.transition = "";
      pane.style.willChange = "";
      // Do NOT set pane.style.transform — Leaflet owns this for pan translation
    }

    // After the geometry changes (rotation, pitch toggle, initial mount)
    // we need to tell Leaflet "your visible viewport is bigger now, go
    // fetch tiles for it". The reflow function runs invalidateSize +
    // setView which kicks Leaflet's _update() to prefetch tiles for the
    // enlarged container. Also force-nudges the tile layer's _update to
    // request tiles at the container's true bounds even before the CSS
    // transition finishes.
    const reflow = () => {
      if (!mapRef.current) return;
      map.invalidateSize({ animate: false, pan: false });
      try {
        map.setView(map.getCenter(), map.getZoom(), { animate: false });
        // Additionally ping every tile layer to prefetch anything the
        // enlarged viewport now needs — invalidateSize alone doesn't
        // always trigger tile requests on rotated maps.
        map.eachLayer((layer: any) => {
          if (layer && typeof layer._update === "function") {
            try { layer._update(); } catch { /* noop */ }
          }
        });
      } catch { /* map may have been torn down between the timeout being scheduled and firing */ }
    };
    // Fire IMMEDIATELY so tiles start loading before the CSS transition
    // finishes, then again at 320 ms and 900 ms to catch slow devices +
    // any tiles that didn't finish rendering during the transition.
    const t0 = window.setTimeout(reflow, 0);
    const t1 = window.setTimeout(reflow, 320);
    const t2 = window.setTimeout(reflow, 900);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [settings.osmRotationDeg, settings.osmPitchDeg]);

  // Current rotation for the north indicator
  const rotation = settings.osmRotationDeg || 0;
  // Normalise to 0-360 for display
  const bearing = ((rotation % 360) + 360) % 360;
  // The north indicator counter-rotates: when map rotates CW, "N" points CCW
  const northIndicatorRotation = -rotation;

  // Scale bar calculation — mirror Leaflet's logic
  // metersPerPx at current zoom + lat
  const mpp = (156_543.034 * Math.cos((currentLat * Math.PI) / 180)) / Math.pow(2, currentZoom);
  const maxBarPx = 100; // max pixel width for the bar
  const maxM = mpp * maxBarPx;
  // Round to a nice number
  const niceM = (() => {
    const steps = [1,2,5,10,20,50,100,200,500,1000,2000,5000];
    return steps.find(s => s >= maxM / 3) ?? steps[steps.length - 1];
  })();
  const barPx = Math.round(niceM / mpp);
  const barLabel = niceM >= 1000 ? `${niceM / 1000} km` : `${niceM} m`;

  // Uses the same theme vars as the top-bar Header + map controls so
  // every button on the map matches: bg-card, border-border, no opacity.
  const ctrlBase = "pointer-events-auto flex items-center justify-center bg-card border border-border text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 transition-colors select-none";

  return (
    <div
      className={`${className ?? ""} relative overflow-hidden`}
      role="application"
      aria-label="OpenStreetMap campus view"
      style={{ width: "100%", height: "100%" }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {/* North compass — hidden on mobile to keep the canvas clean per
       *  the user's "4 buttons only" rule; still shown on desktop where
       *  the extra chrome doesn't crowd the view. */}
      {bearing !== 0 && (
        <div
          className="hidden sm:block absolute top-3 left-3 z-[500] pointer-events-none"
          aria-label={`Map bearing ${bearing}°`}
        >
          <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-white/90 dark:bg-gray-900/90 shadow-md border border-white/60 dark:border-gray-700/60 backdrop-blur-sm">
            <svg
              width="28" height="28"
              viewBox="0 0 28 28"
              style={{ transform: `rotate(${northIndicatorRotation}deg)`, transition: "transform 280ms cubic-bezier(0.22,1,0.36,1)" }}
            >
              <circle cx="14" cy="14" r="13" fill="none" stroke="#e5e7eb" strokeWidth="1" />
              {/* North tip — red */}
              <polygon points="14,3 11,14 14,12 17,14" fill="#ef4444" />
              {/* South tip — gray */}
              <polygon points="14,25 11,14 14,16 17,14" fill="#94a3b8" />
              <circle cx="14" cy="14" r="2.5" fill="#1e293b" />
              <circle cx="14" cy="14" r="1" fill="white" />
            </svg>
            <span className="text-[8px] font-bold font-mono text-gray-500 dark:text-gray-400 leading-none">
              {bearing}°
            </span>
          </div>
        </div>
      )}

      {/* ── React-based zoom controls (bottom-right) ─────────────── */}
      {/* Anchored to the OUTER div so rotation of the inner Leaflet container
          can't push them off-screen. Uses safe-area-inset to stay above
          iOS home bar on all devices. */}
      <div
        className="absolute right-3 z-[500] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        style={{ bottom: 'max(1rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <button
          type="button"
          aria-label="Zoom in"
          disabled={!canZoomIn}
          onClick={() => mapRef.current?.zoomIn()}
          className={`${ctrlBase} w-11 h-11 text-xl font-light border-0 border-b border-border rounded-none disabled:opacity-35 disabled:cursor-default disabled:hover:bg-card disabled:hover:text-foreground`}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={!canZoomOut}
          onClick={() => mapRef.current?.zoomOut()}
          className={`${ctrlBase} w-11 h-11 text-xl font-light border-0 rounded-none disabled:opacity-35 disabled:cursor-default disabled:hover:bg-card disabled:hover:text-foreground`}
        >
          −
        </button>
      </div>

      {/* Scale bar removed on mobile — the user requested a clean map
       *  canvas with only the 4 control buttons + floor selector. Kept
       *  visible on desktop where the extra chrome doesn't get in the
       *  way; hidden below sm breakpoint. */}
      <div
        className="hidden sm:block absolute left-3 z-[500] pointer-events-none"
        style={{ bottom: 'max(1rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[9px] font-bold font-mono text-gray-600 dark:text-gray-300 bg-white/85 dark:bg-gray-900/85 px-1 rounded-sm leading-none backdrop-blur-sm">
            {barLabel}
          </span>
          <div
            className="h-[3px] bg-gray-700 dark:bg-gray-200 rounded-full"
            style={{ width: `${barPx}px` }}
            aria-label={`Scale: ${barLabel}`}
          />
        </div>
      </div>
    </div>
  );
}
