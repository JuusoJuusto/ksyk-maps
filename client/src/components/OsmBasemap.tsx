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
  const { settings } = useAppSettings();
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

  // Compute geographic bounds — span scaled to SVG aspect ratio
  const campusBounds = useMemo<L.LatLngBoundsLiteral>(() => {
    const halfLatM = settings.osmCampusSpanMeters / 2;
    const halfLatDeg = metersToLatDeg(halfLatM);
    const aspect = svgViewBox.w / Math.max(1, svgViewBox.h);
    const halfLngM = halfLatM * aspect;
    const halfLngDeg = metersToLngDeg(halfLngM, settings.osmCenterLat);
    return [
      [settings.osmCenterLat - halfLatDeg, settings.osmCenterLng - halfLngDeg],
      [settings.osmCenterLat + halfLatDeg, settings.osmCenterLng + halfLngDeg],
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

    const map = L.map(containerRef.current, {
      center: [settings.osmCenterLat, settings.osmCenterLng],
      zoom: settings.osmDefaultZoom,
      maxZoom: settings.osmMaxZoom,
      minZoom: settings.osmMinZoom,
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
    const kick = () => {
      if (!mapRef.current) return;
      map.invalidateSize({ animate: false, pan: false });
    };
    const kickIds = [
      requestAnimationFrame(kick),
      window.setTimeout(kick, 80),
      window.setTimeout(kick, 250),
      window.setTimeout(kick, 600),
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
      const sw: L.LatLngTuple = [settings.osmMaxBoundsSouth, settings.osmMaxBoundsWest];
      const ne: L.LatLngTuple = [settings.osmMaxBoundsNorth, settings.osmMaxBoundsEast];
      // Skip if the box is degenerate (e.g. unedited zeros).
      if (sw[0] < ne[0] && sw[1] < ne[1]) {
        map.setMaxBounds(L.latLngBounds(sw, ne));
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
    map.setMinZoom(settings.osmMinZoom);
    map.setMaxZoom(settings.osmMaxZoom);
    const wasBounded = settings.osmMaxBoundsEnabled;
    if (wasBounded) map.setMaxBounds(null as unknown as L.LatLngBoundsExpression);
    map.flyTo([settings.osmCenterLat, settings.osmCenterLng], settings.osmDefaultZoom, {
      duration: 0.5,
    });
    if (wasBounded) {
      const t = setTimeout(() => {
        const sw: L.LatLngTuple = [settings.osmMaxBoundsSouth, settings.osmMaxBoundsWest];
        const ne: L.LatLngTuple = [settings.osmMaxBoundsNorth, settings.osmMaxBoundsEast];
        if (sw[0] < ne[0] && sw[1] < ne[1]) {
          map.setMaxBounds(L.latLngBounds(sw, ne));
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

  // CSS rotation + optional pitch (tilt).
  //
  // IMPORTANT: rotation is applied to the Leaflet CONTAINER div, NOT to
  // .leaflet-map-pane. Leaflet overrides mapPane.style.transform on every
  // pan event with its own translate3d(), which used to wipe the rotation.
  // The container's transform is never touched by Leaflet, so rotation now
  // survives all pan/zoom operations.
  //
  // Oversizing the container forces Leaflet to think its viewport is larger
  // than the visible area, so it loads tiles for the rotated corners that
  // would otherwise be blank.
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) return;

    const rotation = settings.osmRotationDeg || 0;
    const pitch = Math.max(0, Math.min(45, settings.osmPitchDeg ?? 0));

    // Rotated bounding box scale — for any rotation θ of a 1×1 rect,
    // bbox edges grow to |cos θ| + |sin θ|. Max √2 at 45°.
    const rad = (rotation * Math.PI) / 180;
    const scale = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad));
    const sizePct = Math.max(100, scale * 100 + 4);
    const offsetPct = -(sizePct - 100) / 2;

    container.style.position = "absolute";
    container.style.transformOrigin = "50% 50%";
    container.style.transition = [
      "width 300ms ease",
      "height 300ms ease",
      "left 300ms ease",
      "top 300ms ease",
      "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
    ].join(", ");
    container.style.width = `${sizePct}%`;
    container.style.height = `${sizePct}%`;
    container.style.left = `${offsetPct}%`;
    container.style.top = `${offsetPct}%`;
    container.style.transform =
      pitch > 0
        ? `perspective(1600px) rotateX(${pitch}deg) rotate(${rotation}deg)`
        : rotation !== 0
        ? `rotate(${rotation}deg)`
        : "";

    // Ensure mapPane has no stale rotation left over from old code.
    const pane = map.getPane("mapPane");
    if (pane) {
      pane.style.transition = "";
      pane.style.willChange = "";
      // Do NOT set pane.style.transform — Leaflet owns this for pan translation
    }

    // Debounced reflow — wait for the CSS transition to finish before telling
    // Leaflet to re-measure its container and reload edge tiles.
    const reflow = () => {
      if (!mapRef.current) return;
      map.invalidateSize({ animate: false });
      map.setView(map.getCenter(), map.getZoom(), { animate: false });
    };
    const debounce = window.setTimeout(reflow, 300);
    const settle = window.setTimeout(reflow, 720);
    return () => {
      window.clearTimeout(debounce);
      window.clearTimeout(settle);
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

  const ctrlBase = "pointer-events-auto flex items-center justify-center bg-white/92 dark:bg-gray-900/92 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700/70 shadow-md text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 transition-colors select-none";

  return (
    <div
      className={`${className ?? ""} relative overflow-hidden`}
      role="application"
      aria-label="OpenStreetMap campus view"
      style={{ width: "100%", height: "100%" }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {/* North compass indicator — visible when bearing ≠ 0 */}
      {bearing !== 0 && (
        <div
          className="absolute top-3 left-3 z-[500] pointer-events-none"
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
          can't push them off-screen. */}
      <div className="absolute bottom-4 right-3 z-[500] flex flex-col overflow-hidden rounded-xl shadow-lg border border-gray-200/80 dark:border-gray-700"
           style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)' }}>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={!canZoomIn}
          onClick={() => mapRef.current?.zoomIn()}
          className={`${ctrlBase} w-9 h-9 text-lg font-light border-b border-gray-200/80 dark:border-gray-700/70 rounded-t-xl rounded-b-none disabled:opacity-35 disabled:cursor-default disabled:hover:bg-transparent`}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={!canZoomOut}
          onClick={() => mapRef.current?.zoomOut()}
          className={`${ctrlBase} w-9 h-9 text-lg font-light rounded-t-none rounded-b-xl disabled:opacity-35 disabled:cursor-default disabled:hover:bg-transparent`}
        >
          −
        </button>
      </div>

      {/* ── React-based scale bar (bottom-left) ──────────────────── */}
      <div className="absolute bottom-4 left-3 z-[500] pointer-events-none"
           style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)' }}>
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
