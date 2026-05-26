/**
 * Lightweight live-preview Leaflet map for the admin OSM config panel.
 * Reflects current osmCenter/zoom/rotation/pitch/tile-provider settings
 * and supports click-to-set lat/lng + drag-to-pan (which also updates
 * the saved center on release, so the panel's inputs stay in sync).
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAppSettings } from "@/hooks/useAppSettings";
import { OSM_TILE_PROVIDERS, OSM_TILE_THEMES } from "@/lib/appSettings";
import { useDarkMode } from "@/contexts/DarkModeContext";

interface OsmPreviewMapProps {
  /** Click handler — receives lat/lng and updates the saved center. */
  onPick?: (lat: number, lng: number) => void;
  height?: number;
}

export default function OsmPreviewMap({ onPick, height = 220 }: OsmPreviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const centerMarkerRef = useRef<L.CircleMarker | null>(null);
  const { settings } = useAppSettings();
  const { darkMode } = useDarkMode();

  const pickProvider = () => {
    const pack = OSM_TILE_THEMES[settings.osmTileTheme] ?? OSM_TILE_THEMES.default;
    const key = darkMode ? pack.dark : pack.light;
    return OSM_TILE_PROVIDERS[key] ?? OSM_TILE_PROVIDERS["carto-voyager"];
  };

  // Mount once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const provider = pickProvider();

    const map = L.map(containerRef.current, {
      center: [settings.osmCenterLat, settings.osmCenterLng],
      zoom: settings.osmDefaultZoom,
      maxZoom: settings.osmMaxZoom,
      minZoom: settings.osmMinZoom,
      zoomControl: true,
      attributionControl: false,
      zoomSnap: 0.5,
      preferCanvas: true,
    });

    tileLayerRef.current = L.tileLayer(provider.url, {
      maxZoom: settings.osmMaxZoom,
      maxNativeZoom: provider.maxNativeZoom,
      subdomains: "abcd",
      detectRetina: true,
      crossOrigin: true,
    }).addTo(map);

    centerMarkerRef.current = L.circleMarker([settings.osmCenterLat, settings.osmCenterLng], {
      radius: 8,
      color: "#2563eb",
      fillColor: "#3b82f6",
      fillOpacity: 0.9,
      weight: 3,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      onPick?.(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6));
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      centerMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tile provider / theme changes (light↔dark, pack swap)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileLayerRef.current) return;
    map.removeLayer(tileLayerRef.current);
    const provider = pickProvider();
    tileLayerRef.current = L.tileLayer(provider.url, {
      maxZoom: settings.osmMaxZoom,
      maxNativeZoom: provider.maxNativeZoom,
      subdomains: "abcd",
      detectRetina: true,
      crossOrigin: true,
    }).addTo(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.osmTileTheme, settings.osmMaxZoom, darkMode]);

  // Center / zoom updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setMinZoom(settings.osmMinZoom);
    map.setMaxZoom(settings.osmMaxZoom);
    map.flyTo([settings.osmCenterLat, settings.osmCenterLng], settings.osmDefaultZoom, {
      duration: 0.35,
    });
    centerMarkerRef.current?.setLatLng([settings.osmCenterLat, settings.osmCenterLng]);
  }, [
    settings.osmCenterLat,
    settings.osmCenterLng,
    settings.osmDefaultZoom,
    settings.osmMinZoom,
    settings.osmMaxZoom,
  ]);

  // Rotation + pitch (CSS, same as main map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pane = map.getPane("mapPane");
    if (!pane) return;
    pane.style.transformOrigin = "50% 50%";
    pane.style.transition = "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)";
    const pitch = Math.max(0, Math.min(45, settings.osmPitchDeg ?? 0));
    pane.style.transform = pitch > 0
      ? `perspective(1200px) rotateX(${pitch}deg) rotate(${settings.osmRotationDeg}deg)`
      : `rotate(${settings.osmRotationDeg}deg)`;
    map.invalidateSize();
  }, [settings.osmRotationDeg, settings.osmPitchDeg]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Live preview of OSM settings"
      className="rounded-2xl overflow-hidden border border-gray-200/70 dark:border-gray-700/60 shadow-inner"
      style={{ width: "100%", height }}
    />
  );
}
