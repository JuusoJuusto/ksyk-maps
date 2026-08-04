/**
 * ImageOverlay — floor-plan / reference-image tool for the builder.
 *
 * Lets the admin import a PNG/JPG (a floor plan scan, architect PDF
 * page, or a photo) and overlay it on the map at a controllable
 * position, size, rotation, and opacity. The typical workflow:
 *
 *   1. Import a floor plan image over the campus.
 *   2. Adjust its rotation + width so building edges line up with
 *      the OSM tiles or with an already-drawn building polygon.
 *   3. Drop the opacity to ~40 % so you can see BOTH the plan and
 *      the underlying OSM streets.
 *   4. Use the plan as tracing paper — draw walls / rooms on top.
 *
 * Overlays live in localStorage under `ksyk_builder_image_overlays_v1`
 * so they survive reloads. Server persistence is a follow-up; each
 * overlay is tiny (dataUrl of the source image + a few numbers) so
 * localStorage is fine for the drafting phase.
 *
 * Rendered as MapLibre `image` sources — the four corner lat/lngs are
 * recomputed on every change so rotation actually works. (MapLibre
 * image sources don't have a native rotation parameter.)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { Image as ImageIcon, RotateCw, Trash2, ChevronDown, ChevronUp, MapPin } from "lucide-react";

const STORAGE_KEY = "ksyk_builder_image_overlays_v1";

interface ImageOverlaySpec {
  id: string;
  dataUrl: string;
  centerLat: number;
  centerLng: number;
  widthMeters: number;
  rotationDeg: number;
  opacity: number;
  name: string;
}

function loadOverlays(): ImageOverlaySpec[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ImageOverlaySpec[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((o) =>
      typeof o.id === "string" && typeof o.dataUrl === "string"
      && Number.isFinite(o.centerLat) && Number.isFinite(o.centerLng)
      && Number.isFinite(o.widthMeters) && o.widthMeters > 0
      && Number.isFinite(o.rotationDeg)
      && Number.isFinite(o.opacity) && o.opacity >= 0 && o.opacity <= 1,
    );
  } catch { return []; }
}

function writeOverlays(o: ImageOverlaySpec[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); }
  catch { /* quota — reference image just won't persist */ }
}

/** Rotate a point (lng,lat offset in meters) around origin by `deg`. */
function rotate(dLng: number, dLat: number, deg: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [dLng * c - dLat * s, dLng * s + dLat * c];
}

/** Given a center + width + rotation + aspect ratio, return the four
 *  corner [lng,lat]s that MapLibre `image` sources want (in order:
 *  top-left, top-right, bottom-right, bottom-left). */
function cornersFor(
  centerLat: number, centerLng: number,
  widthMeters: number, aspect: number, rotationDeg: number,
): [[number, number], [number, number], [number, number], [number, number]] {
  const heightMeters = widthMeters / aspect;
  // Meters → degrees at this latitude.
  const dLat = heightMeters / 2 / 111320;
  const dLng = widthMeters / 2 / (111320 * Math.cos((centerLat * Math.PI) / 180));

  // Corners in local (dLng, dLat) space, then rotated, then translated.
  const local: [number, number][] = [
    [-dLng, +dLat],  // TL
    [+dLng, +dLat],  // TR
    [+dLng, -dLat],  // BR
    [-dLng, -dLat],  // BL
  ];
  return local.map(([lng, lat]) => {
    const [rx, ry] = rotate(lng, lat, rotationDeg);
    return [centerLng + rx, centerLat + ry] as [number, number];
  }) as [[number, number], [number, number], [number, number], [number, number]];
}

interface Props {
  map: MaplibreMap | null;
}

export default function ImageOverlay({ map }: Props) {
  const [overlays, setOverlays] = useState<ImageOverlaySpec[]>(() => loadOverlays());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [aspectMap, setAspectMap] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState(false);

  // Persist to localStorage on every change so a reload restores them.
  useEffect(() => { writeOverlays(overlays); }, [overlays]);

  // Measure aspect ratio (width/height) of every image whose ratio
  // we don't know yet. The corners math needs it to keep the image
  // undistorted.
  useEffect(() => {
    for (const o of overlays) {
      if (aspectMap[o.id]) continue;
      const img = new window.Image();
      img.onload = () => {
        if (img.width > 0 && img.height > 0) {
          setAspectMap((m) => ({ ...m, [o.id]: img.width / img.height }));
        }
      };
      img.src = o.dataUrl;
    }
  }, [overlays, aspectMap]);

  // ── Sync every overlay into MapLibre as a raster layer ──────────
  useEffect(() => {
    if (!map) return;
    // Track which ids currently exist so we can garbage-collect any
    // sources/layers whose overlay was deleted.
    const wantedIds = new Set(overlays.map((o) => o.id));

    for (const o of overlays) {
      const aspect = aspectMap[o.id] ?? 1;  // fallback until measured
      const corners = cornersFor(o.centerLat, o.centerLng, o.widthMeters, aspect, o.rotationDeg);
      const srcId = `img-overlay-${o.id}`;
      const layerId = `img-overlay-layer-${o.id}`;
      const existing = map.getSource(srcId) as maplibregl.ImageSource | undefined;
      if (existing) {
        existing.updateImage({ url: o.dataUrl, coordinates: corners });
      } else {
        map.addSource(srcId, {
          type: "image",
          url: o.dataUrl,
          coordinates: corners,
        });
        map.addLayer({
          id: layerId,
          source: srcId,
          type: "raster",
          paint: { "raster-opacity": o.opacity },
        });
      }
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", o.opacity);
      }
    }

    // Remove sources/layers for overlays that were deleted.
    const style = map.getStyle();
    if (style?.sources) {
      for (const srcKey of Object.keys(style.sources)) {
        if (!srcKey.startsWith("img-overlay-")) continue;
        const idPart = srcKey.replace("img-overlay-", "");
        if (wantedIds.has(idPart)) continue;
        const layerKey = `img-overlay-layer-${idPart}`;
        if (map.getLayer(layerKey)) map.removeLayer(layerKey);
        if (map.getSource(srcKey)) map.removeSource(srcKey);
      }
    }
  }, [overlays, aspectMap, map]);

  // ── Import a new image via a hidden file input ──────────────────
  const onImport = useCallback(() => {
    if (!map) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const c = map.getCenter();
        const spec: ImageOverlaySpec = {
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          dataUrl,
          centerLat: c.lat,
          centerLng: c.lng,
          widthMeters: 50,   // Reasonable starting size for a building floor plan
          rotationDeg: 0,
          opacity: 0.6,
          name: file.name,
        };
        setOverlays((prev) => [...prev, spec]);
        setActiveId(spec.id);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [map]);

  const active = useMemo(() => overlays.find((o) => o.id === activeId) ?? null, [overlays, activeId]);

  const patchActive = useCallback((patch: Partial<ImageOverlaySpec>) => {
    setOverlays((prev) => prev.map((o) => (o.id === activeId ? { ...o, ...patch } : o)));
  }, [activeId]);

  const deleteActive = useCallback(() => {
    if (!activeId) return;
    if (!confirm("Delete this reference image?")) return;
    setOverlays((prev) => prev.filter((o) => o.id !== activeId));
    setActiveId(null);
  }, [activeId]);

  const recenterActive = useCallback(() => {
    if (!activeId || !map) return;
    const c = map.getCenter();
    patchActive({ centerLat: c.lat, centerLng: c.lng });
  }, [activeId, map, patchActive]);

  return (
    <div className="absolute top-3 left-16 z-30 flex flex-col gap-2 pointer-events-none">
      {/* Import button — always visible */}
      <div className="pointer-events-auto">
        <button
          type="button"
          onClick={onImport}
          title="Import reference image"
          className="h-9 px-3 rounded-xl border border-border bg-card shadow-sm text-xs font-semibold text-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 flex items-center gap-1.5"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Import image
        </button>
      </div>

      {/* Overlay list + controls */}
      {overlays.length > 0 && (
        <div className="pointer-events-auto rounded-2xl border border-border bg-card/95 backdrop-blur shadow-md w-64 overflow-hidden">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            <span>Reference images ({overlays.length})</span>
            {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
          {!collapsed && (
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Row per overlay */}
              <div className="border-t border-border">
                {overlays.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setActiveId(o.id === activeId ? null : o.id)}
                    className={
                      "w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 hover:bg-muted/40 transition-colors " +
                      (activeId === o.id ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300" : "")
                    }
                  >
                    <ImageIcon className="h-3 w-3 opacity-70 shrink-0" />
                    <span className="truncate">{o.name}</span>
                  </button>
                ))}
              </div>

              {active && (
                <div className="border-t border-border p-3 space-y-3">
                  <SliderRow
                    label="Opacity"
                    value={active.opacity}
                    min={0} max={1} step={0.05}
                    format={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => patchActive({ opacity: v })}
                  />
                  <SliderRow
                    label="Width"
                    value={active.widthMeters}
                    min={5} max={500} step={1}
                    format={(v) => `${v.toFixed(0)} m`}
                    onChange={(v) => patchActive({ widthMeters: v })}
                  />
                  <SliderRow
                    label="Rotation"
                    icon={<RotateCw className="h-3 w-3" />}
                    value={active.rotationDeg}
                    min={-180} max={180} step={1}
                    format={(v) => `${v.toFixed(0)}°`}
                    onChange={(v) => patchActive({ rotationDeg: v })}
                  />
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={recenterActive}
                      title="Move to current map center"
                      className="flex-1 h-7 rounded-lg border border-border bg-background text-[11px] font-semibold hover:bg-muted/40 flex items-center justify-center gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      Recenter
                    </button>
                    <button
                      type="button"
                      onClick={deleteActive}
                      title="Delete this overlay"
                      className="h-7 px-2 rounded-lg border border-red-300 bg-red-50 text-[11px] font-semibold text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300 flex items-center justify-center"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number; max: number; step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
}

function SliderRow({ label, value, min, max, step, format, onChange, icon }: SliderRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          {icon} {label}
        </span>
        <span className="tabular-nums text-foreground">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  );
}
