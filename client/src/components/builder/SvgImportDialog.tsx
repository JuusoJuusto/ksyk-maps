/**
 * SvgImportDialog — Figma-to-KSYK bridge.
 *
 * Workflow:
 *   1. Designer creates a floor plan in Figma, exports as SVG.
 *   2. Admin opens this dialog, picks the file.
 *   3. We parse every <path>/<polygon>/<rect> into a normalised
 *      polygon list in SVG-local coordinates.
 *   4. Admin drags a bounding box on the map to say "the SVG spans
 *      THIS area" — we affine-map each SVG polygon into lat/lng.
 *   5. On confirm, the parent gets a list of {points} polygons ready
 *      to POST as rooms.
 *
 * This is a first-slice implementation: it handles axis-aligned SVGs
 * without rotation/skew, uses each parsed shape's bounding box for
 * mapping, and drops the shape as a rectangle (four corners) in
 * lat/lng space. It's enough to import a Figma floor plan and
 * refine the polygons vertex-by-vertex in the builder.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUp, X, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Map as MaplibreMap, LngLat } from "maplibre-gl";

export interface ParsedSvgShape {
  /** Polygon in SVG coordinates (viewBox units). */
  svgPoints: Array<{ x: number; y: number }>;
  /** Optional label from the source SVG (data-name, id, or aria-label). */
  label: string | null;
}

export interface ImportedPolygon {
  points: Array<{ lat: number; lng: number }>;
  label: string | null;
}

interface SvgImportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Map instance the user picks their bounding box on. */
  map: MaplibreMap | null;
  /** Fired when the user commits — parent decides whether to bulk-POST
   *  rooms or open each shape in the property panel. */
  onImport: (polygons: ImportedPolygon[]) => void;
}

/** Extract every polygonal shape from an SVG string. Handles
 *  <polygon>, <polyline>, <rect>, and simple <path> (M/L/Z only).
 *  Skips groups + transforms — sufficient for a floor-plan export
 *  where the designer's flatten-to-outlines pass produced clean
 *  top-level shapes. */
function parseSvg(svgText: string): { viewBox: { w: number; h: number }; shapes: ParsedSvgShape[] } {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.documentElement;
  const viewBoxAttr = svg.getAttribute("viewBox");
  let w = Number(svg.getAttribute("width") || 100);
  let h = Number(svg.getAttribute("height") || 100);
  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/\s+|,/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      w = parts[2]; h = parts[3];
    }
  }
  const shapes: ParsedSvgShape[] = [];

  const labelFor = (el: Element): string | null =>
    el.getAttribute("data-name")
    ?? el.getAttribute("aria-label")
    ?? el.getAttribute("id")
    ?? null;

  const pushShape = (points: Array<{ x: number; y: number }>, el: Element) => {
    if (points.length < 3) return;
    shapes.push({ svgPoints: points, label: labelFor(el) });
  };

  for (const el of Array.from(doc.querySelectorAll("polygon, polyline"))) {
    const raw = el.getAttribute("points") ?? "";
    const nums = raw.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
    pushShape(pts, el);
  }

  for (const el of Array.from(doc.querySelectorAll("rect"))) {
    const x = Number(el.getAttribute("x") ?? 0);
    const y = Number(el.getAttribute("y") ?? 0);
    const rw = Number(el.getAttribute("width") ?? 0);
    const rh = Number(el.getAttribute("height") ?? 0);
    if (rw > 0 && rh > 0) {
      pushShape([
        { x, y },
        { x: x + rw, y },
        { x: x + rw, y: y + rh },
        { x, y: y + rh },
      ], el);
    }
  }

  for (const el of Array.from(doc.querySelectorAll("path"))) {
    const d = el.getAttribute("d") ?? "";
    // Very small parser — only understands M/L/Z absolute commands
    // and treats m/l as relative. Skips curves silently (they'd need
    // sampling to approximate). Fine for Figma "export as SVG →
    // flatten" outputs.
    const tokens = d.match(/([MLmlZzHhVv])|(-?\d+(?:\.\d+)?)/g) ?? [];
    const pts: Array<{ x: number; y: number }> = [];
    let cx = 0, cy = 0;
    let cmd = "";
    let i = 0;
    while (i < tokens.length) {
      const t = tokens[i];
      if (/[A-Za-z]/.test(t)) { cmd = t; i++; continue; }
      const nx = Number(t);
      const ny = Number(tokens[i + 1] ?? 0);
      i += 2;
      if (cmd === "M") { cx = nx; cy = ny; pts.push({ x: cx, y: cy }); cmd = "L"; }
      else if (cmd === "L") { cx = nx; cy = ny; pts.push({ x: cx, y: cy }); }
      else if (cmd === "m") { cx += nx; cy += ny; pts.push({ x: cx, y: cy }); cmd = "l"; }
      else if (cmd === "l") { cx += nx; cy += ny; pts.push({ x: cx, y: cy }); }
      else if (cmd === "H") { cx = nx; pts.push({ x: cx, y: cy }); i--; }
      else if (cmd === "h") { cx += nx; pts.push({ x: cx, y: cy }); i--; }
      else if (cmd === "V") { cy = nx; pts.push({ x: cx, y: cy }); i--; }
      else if (cmd === "v") { cy += nx; pts.push({ x: cx, y: cy }); i--; }
    }
    pushShape(pts, el);
  }

  return { viewBox: { w, h }, shapes };
}

/** Map an SVG (x, y) point into lng/lat using the anchor rectangle
 *  the user painted on the map. SVG y-axis grows downward, world
 *  lat-axis grows upward → we flip. */
function svgToLngLat(
  pt: { x: number; y: number },
  viewBox: { w: number; h: number },
  sw: LngLat,
  ne: LngLat,
): { lat: number; lng: number } {
  const fx = pt.x / viewBox.w;
  const fy = pt.y / viewBox.h;
  return {
    lng: sw.lng + fx * (ne.lng - sw.lng),
    lat: ne.lat - fy * (ne.lat - sw.lat),
  };
}

export default function SvgImportDialog({ open, onClose, map, onImport }: SvgImportDialogProps) {
  const [parsed, setParsed] = useState<ReturnType<typeof parseSvg> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "anchor" | "confirm">("upload");
  // Anchor corners in lng/lat, sw + ne. Start = current map viewport
  // shrunk to central 60% so users immediately see something to drag.
  const [sw, setSw] = useState<LngLat | null>(null);
  const [ne, setNe] = useState<LngLat | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset on open/close so a re-open doesn't leak previous state.
  useEffect(() => {
    if (!open) {
      setParsed(null);
      setError(null);
      setStep("upload");
      setSw(null); setNe(null);
    } else if (map) {
      // Default anchor = central 60% of current viewport.
      const b = map.getBounds();
      const swLng = b.getWest() + (b.getEast() - b.getWest()) * 0.2;
      const swLat = b.getSouth() + (b.getNorth() - b.getSouth()) * 0.2;
      const neLng = b.getEast() - (b.getEast() - b.getWest()) * 0.2;
      const neLat = b.getNorth() - (b.getNorth() - b.getSouth()) * 0.2;
      setSw({ lng: swLng, lat: swLat } as LngLat);
      setNe({ lng: neLng, lat: neLat } as LngLat);
    }
  }, [open, map]);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const p = parseSvg(text);
      if (p.shapes.length === 0) {
        setError("No polygonal shapes found in the SVG. Try exporting from Figma with 'Outline stroke' applied.");
        return;
      }
      setParsed(p);
      setStep("anchor");
    } catch (e) {
      setError(`Could not parse SVG: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const commit = useCallback(() => {
    if (!parsed || !sw || !ne) return;
    const polygons: ImportedPolygon[] = parsed.shapes.map((s) => ({
      label: s.label,
      points: s.svgPoints.map((p) => svgToLngLat(p, parsed.viewBox, sw, ne)),
    }));
    onImport(polygons);
    onClose();
  }, [parsed, sw, ne, onImport, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileUp className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base">Import SVG floor plan</DialogTitle>
              <DialogDescription className="text-xs">
                From Figma, Illustrator, or any SVG editor.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1 — pick file */}
        {step === "upload" && (
          <div className="p-5 space-y-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-full h-32 rounded-xl border-2 border-dashed transition-colors",
                "border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50",
                "dark:border-blue-500/30 dark:hover:border-blue-500/60 dark:bg-blue-500/5",
                "flex flex-col items-center justify-center gap-2",
              )}
            >
              <FileUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-foreground">Choose SVG file</span>
              <span className="text-[11px] text-muted-foreground">Or drag &amp; drop</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Every <code className="bg-muted px-1 rounded">&lt;polygon&gt;</code>, <code className="bg-muted px-1 rounded">&lt;rect&gt;</code>,
              and simple <code className="bg-muted px-1 rounded">&lt;path&gt;</code> becomes a KSYK polygon.
              Tip: in Figma, select every shape → Object → Flatten before exporting so curves become straight edges.
            </p>
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}

        {/* Step 2 — anchor to map */}
        {step === "anchor" && parsed && (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3 flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">
                  Parsed {parsed.shapes.length} shape{parsed.shapes.length === 1 ? "" : "s"}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  viewBox {parsed.viewBox.w.toFixed(0)} × {parsed.viewBox.h.toFixed(0)} units
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2">
                <MapPin className="h-3 w-3" /> Anchor to campus
              </p>
              <p className="text-[12px] text-foreground leading-relaxed mb-3">
                We&apos;ll drop the SVG into the map&apos;s current viewport center (60% area).
                After import, drag individual vertices to refine.
              </p>
              {sw && ne && (
                <p className="text-[10.5px] font-mono text-muted-foreground">
                  SW {sw.lat.toFixed(6)}, {sw.lng.toFixed(6)}<br />
                  NE {ne.lat.toFixed(6)}, {ne.lng.toFixed(6)}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button size="sm" onClick={commit} disabled={!sw || !ne}>
                Import {parsed.shapes.length} shape{parsed.shapes.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
