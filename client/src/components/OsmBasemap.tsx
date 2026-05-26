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
  className?: string;
}

function metersToLatDeg(m: number) {
  return m / 111_320;
}
function metersToLngDeg(m: number, atLat: number) {
  return m / (111_320 * Math.cos((atLat * Math.PI) / 180));
}

export default function OsmBasemap({ svgViewBox, onOverlayReady, onReady, onView, className }: OsmBasemapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.SVGOverlay | null>(null);
  const overlaySvgRef = useRef<SVGSVGElement | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const { settings } = useAppSettings();
  const { darkMode } = useDarkMode();
  const [, setReady] = useState(false);

  // Pick the right tile provider based on the active theme. The tile-theme
  // pack is the source of truth; the legacy per-mode providers are kept as a
  // fallback for old settings.
  const activeProvider = useMemo(() => {
    const pack = OSM_TILE_THEMES[settings.osmTileTheme] ?? OSM_TILE_THEMES.default;
    const key = darkMode ? pack.dark : pack.light;
    return OSM_TILE_PROVIDERS[key] ?? OSM_TILE_PROVIDERS["carto-voyager"];
  }, [darkMode, settings.osmTileTheme]);

  // Build SVG element once
  if (!overlaySvgRef.current) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
    el.setAttribute("viewBox", `${svgViewBox.x} ${svgViewBox.y} ${svgViewBox.w} ${svgViewBox.h}`);
    el.setAttribute("preserveAspectRatio", "xMidYMid meet");
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.overflow = "visible";
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
      inertiaDeceleration: 2200,
      inertiaMaxSpeed: 1500,
      worldCopyJump: false,
    });

    // Native Leaflet zoom + scale controls (styled in index.css to match the app).
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ position: "bottomleft", imperial: false, maxWidth: 140 }).addTo(map);

    tileLayerRef.current = L.tileLayer(provider.url, {
      maxZoom: settings.osmMaxZoom,
      maxNativeZoom: provider.maxNativeZoom,
      attribution: provider.attribution,
      subdomains: "abcd",
      detectRetina: true,
      crossOrigin: true,
    }).addTo(map);

    if (overlaySvgRef.current) {
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
    if (overlaySvgRef.current) onOverlayReady?.(overlaySvgRef.current);

    const view = () => onView?.(map);
    map.on("move zoom", view);
    view(); // fire once immediately so callers have the initial scale

    return () => {
      map.off("move zoom", view);
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
      detectRetina: true,
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

  // Center / zoom updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setMinZoom(settings.osmMinZoom);
    map.setMaxZoom(settings.osmMaxZoom);
    map.flyTo([settings.osmCenterLat, settings.osmCenterLng], settings.osmDefaultZoom, {
      duration: 0.5,
    });
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

  // CSS rotation + optional pitch (tilt) — pitch is purely visual, Leaflet hit-testing
  // stays in 2D so values above ~30° will start to mis-align overlays.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pane = map.getPane("mapPane");
    if (!pane) return;
    pane.style.transformOrigin = "50% 50%";
    pane.style.transition = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
    const pitch = Math.max(0, Math.min(45, settings.osmPitchDeg ?? 0));
    pane.style.transform = pitch > 0
      ? `perspective(1600px) rotateX(${pitch}deg) rotate(${settings.osmRotationDeg}deg)`
      : `rotate(${settings.osmRotationDeg}deg)`;
    map.invalidateSize();
  }, [settings.osmRotationDeg, settings.osmPitchDeg]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="application"
      aria-label="OpenStreetMap campus view"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
