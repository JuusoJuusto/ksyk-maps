/**
 * Minimap — Figma/CAD-style campus overview in the bottom-left of
 * the builder. Renders every building outline into a small canvas,
 * plus a viewport rectangle showing where the user is currently
 * looking. Click anywhere on the minimap to fly the main map there.
 *
 * Pure canvas — no MapLibre instance overhead. Rebuilds whenever the
 * building list or the map's camera changes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MaplibreMap, LngLatLike } from "maplibre-gl";
import type { Building } from "@ksyk/shared";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";

const MINIMAP_W = 180;
const MINIMAP_H = 140;
const PAD = 8;

interface MinimapProps {
  map: MaplibreMap | null;
  buildings: Building[];
}

/** Compute lng/lat bounds around every building point + a fallback
 *  when no buildings exist yet. */
function boundsFor(buildings: Building[]): { minLng: number; maxLng: number; minLat: number; maxLat: number } | null {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  let any = false;
  for (const b of buildings) {
    if (!b.points) continue;
    for (const p of b.points) {
      any = true;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    }
  }
  if (!any) return null;
  // Small padding so the outer buildings don't hug the border.
  const dLng = (maxLng - minLng) * 0.08 || 0.0002;
  const dLat = (maxLat - minLat) * 0.08 || 0.0002;
  return {
    minLng: minLng - dLng, maxLng: maxLng + dLng,
    minLat: minLat - dLat, maxLat: maxLat + dLat,
  };
}

export default function Minimap({ map, buildings }: MinimapProps) {
  const { darkMode } = useDarkMode();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tick, setTick] = useState(0);

  // Re-paint on map camera changes (pan/zoom/rotate) so the viewport
  // rectangle stays in sync.
  useEffect(() => {
    if (!map) return;
    const bump = () => setTick((t) => t + 1);
    map.on("move", bump);
    map.on("rotate", bump);
    map.on("zoom", bump);
    return () => {
      map.off("move", bump);
      map.off("rotate", bump);
      map.off("zoom", bump);
    };
  }, [map]);

  // Paint whenever buildings, map, or tick changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bounds = boundsFor(buildings);
    // Retina — draw at devicePixelRatio then scale back via CSS.
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== MINIMAP_W * dpr || canvas.height !== MINIMAP_H * dpr) {
      canvas.width = MINIMAP_W * dpr;
      canvas.height = MINIMAP_H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);
    // Background — subtle so it reads as a "map card"
    ctx.fillStyle = darkMode ? "#0f172a" : "#f8fafc";
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);
    // Border
    ctx.strokeStyle = darkMode ? "#334155" : "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, MINIMAP_W - 1, MINIMAP_H - 1);

    if (!bounds) {
      ctx.fillStyle = darkMode ? "#64748b" : "#94a3b8";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No buildings yet", MINIMAP_W / 2, MINIMAP_H / 2);
      return;
    }
    const bw = bounds.maxLng - bounds.minLng;
    const bh = bounds.maxLat - bounds.minLat;
    const scale = Math.min((MINIMAP_W - PAD * 2) / bw, (MINIMAP_H - PAD * 2) / bh);
    const offsetX = (MINIMAP_W - bw * scale) / 2;
    const offsetY = (MINIMAP_H - bh * scale) / 2;
    // Lat flips (Y down on canvas, Y up on map).
    const project = (lng: number, lat: number): [number, number] => [
      offsetX + (lng - bounds.minLng) * scale,
      MINIMAP_H - (offsetY + (lat - bounds.minLat) * scale),
    ];

    // Draw each building as a filled polygon with an outline.
    for (const b of buildings) {
      if (!b.points || b.points.length < 3) continue;
      ctx.beginPath();
      let first = true;
      for (const p of b.points) {
        const [x, y] = project(p.lng, p.lat);
        if (first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = b.colorCode ?? "#2563eb";
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = b.colorCode ?? "#2563eb";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Viewport rectangle — project the map's visible bounds.
    if (map) {
      const vb = map.getBounds();
      const sw = project(vb.getWest(), vb.getSouth());
      const ne = project(vb.getEast(), vb.getNorth());
      const x = Math.min(sw[0], ne[0]);
      const y = Math.min(sw[1], ne[1]);
      const w = Math.abs(ne[0] - sw[0]);
      const h = Math.abs(ne[1] - sw[1]);
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "rgba(249, 115, 22, 0.1)";
      ctx.fillRect(x, y, w, h);
    }
  }, [buildings, map, tick, darkMode]);

  // Click → fly the main map to the projected lng/lat.
  const onClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!map) return;
    const bounds = boundsFor(buildings);
    if (!bounds) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const bw = bounds.maxLng - bounds.minLng;
    const bh = bounds.maxLat - bounds.minLat;
    const scale = Math.min((MINIMAP_W - PAD * 2) / bw, (MINIMAP_H - PAD * 2) / bh);
    const offsetX = (MINIMAP_W - bw * scale) / 2;
    const offsetY = (MINIMAP_H - bh * scale) / 2;
    const lng = bounds.minLng + (cx - offsetX) / scale;
    const lat = bounds.minLat + ((MINIMAP_H - cy) - offsetY) / scale;
    map.flyTo({
      center: [lng, lat] as LngLatLike,
      duration: 400,
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    });
  }, [map, buildings]);

  return (
    <div
      className={cn(
        "absolute bottom-4 left-3 z-30 rounded-2xl shadow-lg overflow-hidden border backdrop-blur-md",
        darkMode ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-200",
      )}
      role="region"
      aria-label="Campus minimap"
    >
      <div className={cn(
        "flex items-center justify-between px-2.5 py-1 border-b text-[9px] font-bold uppercase tracking-[0.18em]",
        darkMode ? "border-gray-800 text-gray-500" : "border-gray-100 text-gray-500",
      )}>
        <span>Minimap</span>
        <span className="text-orange-500">viewport</span>
      </div>
      <canvas
        ref={canvasRef}
        width={MINIMAP_W}
        height={MINIMAP_H}
        style={{ width: MINIMAP_W, height: MINIMAP_H }}
        onClick={onClick}
        className="cursor-pointer block"
      />
    </div>
  );
}
