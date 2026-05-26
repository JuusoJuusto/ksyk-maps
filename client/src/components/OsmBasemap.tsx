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
import { OSM_TILE_PROVIDERS } from "@/lib/appSettings";

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
  const [, setReady] = useState(false);

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
    const provider =
      OSM_TILE_PROVIDERS[settings.osmTileProvider] ?? OSM_TILE_PROVIDERS["carto-voyager"];

    const map = L.map(containerRef.current, {
      center: [settings.osmCenterLat, settings.osmCenterLng],
      zoom: settings.osmDefaultZoom,
      maxZoom: settings.osmMaxZoom,
      minZoom: settings.osmMinZoom,
      zoomControl: false,
      attributionControl: true,
      wheelPxPerZoomLevel: 80,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });

    tileLayerRef.current = L.tileLayer(provider.url, {
      maxZoom: settings.osmMaxZoom,
      maxNativeZoom: provider.maxNativeZoom,
      attribution: provider.attribution,
      subdomains: "abcd",
      detectRetina: true,
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

  // Tile provider / max-zoom changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileLayerRef.current) return;
    map.removeLayer(tileLayerRef.current);
    const provider =
      OSM_TILE_PROVIDERS[settings.osmTileProvider] ?? OSM_TILE_PROVIDERS["carto-voyager"];
    tileLayerRef.current = L.tileLayer(provider.url, {
      maxZoom: settings.osmMaxZoom,
      maxNativeZoom: provider.maxNativeZoom,
      attribution: provider.attribution,
      subdomains: "abcd",
      detectRetina: true,
    }).addTo(map);
  }, [settings.osmTileProvider, settings.osmMaxZoom]);

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

  // CSS rotation
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pane = map.getPane("mapPane");
    if (!pane) return;
    pane.style.transformOrigin = "50% 50%";
    pane.style.transform = `rotate(${settings.osmRotationDeg}deg)`;
    map.invalidateSize();
  }, [settings.osmRotationDeg]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", background: "#dde6ef" }}
    />
  );
}
