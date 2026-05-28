/**
 * Lightweight live-preview Leaflet map for the admin OSM config panel.
 * Reflects current osmCenter/zoom/rotation/pitch/tile-provider settings.
 *
 * Two interaction modes:
 *   - "center" (default): click sets osmCenter to clicked lat/lng.
 *   - "bounds": shift-drag (or pointer-drag in bounds mode) defines a
 *     rectangle that becomes the new osmMaxBounds*.
 *
 * Renders the saved maxBounds as a translucent blue rectangle so admins
 * always see the active restriction.
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAppSettings } from "@/hooks/useAppSettings";
import { OSM_TILE_PROVIDERS, OSM_TILE_THEMES } from "@/lib/appSettings";
import { useDarkMode } from "@/contexts/DarkModeContext";

interface OsmPreviewMapProps {
  /** Click handler when in "center" mode. */
  onPick?: (lat: number, lng: number) => void;
  /** Drag handler when in "bounds" mode. Receives N/E/S/W. */
  onBounds?: (b: { north: number; east: number; south: number; west: number }) => void;
  /** Which interaction mode is active. */
  mode?: "center" | "bounds";
  height?: number;
}

export default function OsmPreviewMap({
  onPick,
  onBounds,
  mode = "center",
  height = 220,
}: OsmPreviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const centerMarkerRef = useRef<L.CircleMarker | null>(null);
  const boundsRectRef = useRef<L.Rectangle | null>(null);
  const dragRectRef = useRef<L.Rectangle | null>(null);
  const dragStartRef = useRef<L.LatLng | null>(null);
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
      detectRetina: false,
      crossOrigin: true,
    }).addTo(map);

    centerMarkerRef.current = L.circleMarker([settings.osmCenterLat, settings.osmCenterLng], {
      radius: 8,
      color: "#2563eb",
      fillColor: "#3b82f6",
      fillOpacity: 0.9,
      weight: 3,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      centerMarkerRef.current = null;
      boundsRectRef.current = null;
      dragRectRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click + drag handlers depend on `mode`, so re-bind when it changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onClick = (e: L.LeafletMouseEvent) => {
      if (mode !== "center") return;
      onPick?.(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6));
    };

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      if (mode !== "bounds") return;
      map.dragging.disable();
      dragStartRef.current = e.latlng;
      dragRectRef.current = L.rectangle(L.latLngBounds(e.latlng, e.latlng), {
        color: "#10b981",
        weight: 2,
        fillColor: "#10b981",
        fillOpacity: 0.15,
        dashArray: "6 4",
      }).addTo(map);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (mode !== "bounds" || !dragStartRef.current || !dragRectRef.current) return;
      dragRectRef.current.setBounds(L.latLngBounds(dragStartRef.current, e.latlng));
    };

    const onMouseUp = (e: L.LeafletMouseEvent) => {
      if (mode !== "bounds" || !dragStartRef.current) return;
      map.dragging.enable();
      const b = L.latLngBounds(dragStartRef.current, e.latlng);
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      if (Math.abs(ne.lat - sw.lat) > 1e-4 && Math.abs(ne.lng - sw.lng) > 1e-4) {
        onBounds?.({
          north: +ne.lat.toFixed(6),
          east: +ne.lng.toFixed(6),
          south: +sw.lat.toFixed(6),
          west: +sw.lng.toFixed(6),
        });
      }
      dragRectRef.current?.remove();
      dragRectRef.current = null;
      dragStartRef.current = null;
    };

    map.on("click", onClick);
    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);
    return () => {
      map.off("click", onClick);
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
    };
  }, [mode, onPick, onBounds]);

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
      detectRetina: false,
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
    if (isFinite(settings.osmCenterLat) && isFinite(settings.osmCenterLng)) {
      map.flyTo([settings.osmCenterLat, settings.osmCenterLng], settings.osmDefaultZoom, {
        duration: 0.35,
      });
      centerMarkerRef.current?.setLatLng([settings.osmCenterLat, settings.osmCenterLng]);
    }
  }, [
    settings.osmCenterLat,
    settings.osmCenterLng,
    settings.osmDefaultZoom,
    settings.osmMinZoom,
    settings.osmMaxZoom,
  ]);

  // Live bounds rectangle — shows the saved maxBounds when enabled
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    boundsRectRef.current?.remove();
    boundsRectRef.current = null;
    if (!settings.osmMaxBoundsEnabled) return;
    const sw: L.LatLngTuple = [settings.osmMaxBoundsSouth, settings.osmMaxBoundsWest];
    const ne: L.LatLngTuple = [settings.osmMaxBoundsNorth, settings.osmMaxBoundsEast];
    if (sw[0] >= ne[0] || sw[1] >= ne[1]) return;
    boundsRectRef.current = L.rectangle(L.latLngBounds(sw, ne), {
      color: "#2563eb",
      weight: 2,
      fillColor: "#3b82f6",
      fillOpacity: 0.08,
      dashArray: "6 4",
      interactive: false,
    }).addTo(map);
  }, [
    settings.osmMaxBoundsEnabled,
    settings.osmMaxBoundsNorth,
    settings.osmMaxBoundsEast,
    settings.osmMaxBoundsSouth,
    settings.osmMaxBoundsWest,
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
      style={{ width: "100%", height, cursor: mode === "bounds" ? "crosshair" : undefined }}
    />
  );
}
