/**
 * ImportExportDialog — modal for round-tripping MapPackages.
 *
 * Two tabs:
 *   - Export → downloads the current published package as JSON or
 *     GeoJSON via `packageToBlob`. File name from
 *     `packageDefaultFilename`.
 *   - Import → drop / choose a `.json` / `.geojson` file. Parses via
 *     `packageFromJSON` or `geoJSONToPackage`. On success, calls
 *     `onImport(pkg)` — the parent is responsible for pushing the
 *     entities to the server.
 *
 * Import is destructive at the parent level (replaces the whole
 * campus), so the dialog surfaces a big confirmation checkbox before
 * enabling the "Apply" button.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  packageToBlob,
  packageDefaultFilename,
  packageFromJSON,
  geoJSONToPackage,
} from "@ksyk/shared";
import type { MapPackage, Building } from "@ksyk/shared";
import { X, Upload, Download, AlertTriangle, Check, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { parseSvgToPolygons } from "@/lib/svgImport";
import { useAppSettings, pickPlatformMapDefaults } from "@/hooks/useAppSettings";

export interface ImportExportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (pkg: MapPackage) => Promise<void>;
}

type Tab = "export" | "import";
type Format = "json" | "geojson";

export default function ImportExportDialog({ open, onClose, onImport }: ImportExportDialogProps) {
  const { darkMode } = useDarkMode();
  const [tab, setTab] = useState<Tab>("export");

  if (!open) return null;

  return (
    <>
      <div aria-hidden onClick={onClose} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-labelledby="ie-dialog-title"
        aria-modal="true"
        className={cn(
          "fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-[min(32rem,95vw)] rounded-2xl border shadow-2xl overflow-hidden",
          darkMode ? "bg-gray-900 border-gray-800 text-gray-100" : "bg-white border-gray-200 text-gray-900",
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center justify-between px-4 py-3 border-b", darkMode ? "border-gray-800" : "border-gray-200")}>
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-blue-500" />
            <p id="ie-dialog-title" className="text-sm font-semibold">Import / Export</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn("h-8 w-8 rounded-lg flex items-center justify-center", darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100")}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className={cn("grid grid-cols-2 border-b", darkMode ? "border-gray-800" : "border-gray-200")}>
          {(["export", "import"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={cn(
                "py-3 text-sm font-semibold transition-colors border-b-2 flex items-center justify-center gap-2",
                tab === t
                  ? "border-blue-600 text-blue-700 dark:text-blue-300"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "export" ? <Download className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {t === "export" ? "Export" : "Import"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4">
          {tab === "export" ? <ExportTab onDone={onClose} /> : <ImportTab onDone={onClose} onImport={onImport} />}
        </div>
      </div>
    </>
  );
}

// ── Export tab ────────────────────────────────────────────────────

function ExportTab({ onDone }: { onDone: () => void }) {
  const { data: pkg, isLoading, error } = useQuery<MapPackage>({
    queryKey: ["/api/map-package"],
    queryFn: async () => {
      const r = await fetch("/api/map-package");
      if (!r.ok) throw new Error(`Failed to load map package (${r.status})`);
      return r.json();
    },
  });

  const download = useCallback((format: Format) => {
    if (!pkg) return;
    const blob = packageToBlob(pkg, format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = packageDefaultFilename(pkg, format);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onDone();
  }, [pkg, onDone]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading current campus…</p>;
  if (error) return <p className="text-sm text-red-500">{(error as Error).message}</p>;
  if (!pkg) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground bg-muted/40">
        <p><span className="font-semibold text-foreground">{pkg.buildings.length}</span> buildings · <span className="font-semibold text-foreground">{pkg.rooms.length}</span> rooms · <span className="font-semibold text-foreground">{pkg.hallways.length}</span> hallways · <span className="font-semibold text-foreground">{pkg.doors.length}</span> doors</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => download("json")}
          className="h-11 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98]"
        >
          <Download className="h-4 w-4 inline mr-2" />
          Download JSON
        </button>
        <button
          type="button"
          onClick={() => download("geojson")}
          className="h-11 rounded-xl font-semibold border border-border hover:bg-muted"
        >
          <Download className="h-4 w-4 inline mr-2" />
          Download GeoJSON
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        JSON is loss-free and preferred for backups. GeoJSON works with QGIS, Mapbox Studio, tippecanoe, etc.
      </p>
    </div>
  );
}

// ── Import tab ────────────────────────────────────────────────────

function ImportTab({
  onDone, onImport,
}: {
  onDone: () => void;
  onImport: (pkg: MapPackage) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<MapPackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [svgScale, setSvgScale] = useState(0.1); // 10 cm per SVG unit — safe default
  const inputRef = useRef<HTMLInputElement>(null);
  const { settings } = useAppSettings();

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setWarnings([]);
    setParsed(null);
    try {
      const text = await f.text();
      const isSvg = f.name.toLowerCase().endsWith(".svg") || text.trimStart().startsWith("<svg");
      if (isSvg) {
        // Anchor the imported floorplan on the current platform-default
        // camera centre so it lands under the user's view. They can
        // adjust the metres-per-unit scale before applying.
        const camera = pickPlatformMapDefaults(settings);
        const { shapes, warnings: w } = parseSvgToPolygons(text, {
          anchor: { lat: camera.lat, lng: camera.lng },
          metersPerUnit: svgScale,
        });
        setWarnings(w);
        if (shapes.length === 0) {
          setError("No <rect>, <polygon>, or <path M/L> elements found in the SVG.");
          return;
        }
        // Convert every shape into a fresh building. Users can re-type
        // any as a room from the PropertyPanel after import.
        const buildings: Building[] = shapes.map((s, i) => ({
          id: `svg-${Date.now()}-${i}`,
          name: s.label ?? String.fromCharCode(65 + (i % 26)),
          colorCode: "#2563eb",
          floors: 1,
          points: s.polygon,
        }));
        setParsed({
          manifest: {
            version: "1.0.0",
            title: `Imported floorplan (${f.name})`,
            publishedAt: new Date().toISOString(),
          },
          mapDefaults: {
            center: { lat: camera.lat, lng: camera.lng },
            zoom: camera.zoom, bearing: camera.bearing, pitch: camera.pitch,
            minZoom: camera.minZoom, maxZoom: camera.maxZoom,
          },
          buildings,
          floors: [], rooms: [], hallways: [], doors: [], stairs: [], elevators: [],
        });
        return;
      }
      // JSON / GeoJSON path — auto-detect via the top-level type field.
      const raw = JSON.parse(text) as { type?: string };
      const pkg = raw.type === "FeatureCollection"
        ? geoJSONToPackage(raw)
        : packageFromJSON(text);
      setParsed(pkg);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [settings, svgScale]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) void handleFile(f);
  }, [handleFile]);

  const stats = useMemo(() => {
    if (!parsed) return null;
    return `${parsed.buildings.length} buildings · ${parsed.rooms.length} rooms · ${parsed.hallways.length} hallways · ${parsed.doors.length} doors`;
  }, [parsed]);

  const apply = useCallback(async () => {
    if (!parsed) return;
    setSubmitting(true);
    try {
      await onImport(parsed);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [parsed, onImport, onDone]);

  return (
    <div className="space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
        role="button"
        tabIndex={0}
      >
        <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
        <p className="text-sm font-medium mt-2">
          {file ? file.name : "Drop a .json / .geojson / .svg file"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".json,.geojson,.svg,application/json,application/geo+json,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>

      {/* SVG scale control — only surfaces when the currently-loaded file
       *  is an SVG. Units in metres per SVG unit. Users can retry with
       *  a different scale without picking the file again. */}
      {file?.name.toLowerCase().endsWith(".svg") && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-foreground">SVG scale</label>
            <span className="font-mono tabular-nums text-muted-foreground">{svgScale} m / unit</span>
          </div>
          <input
            type="range"
            min={0.01} max={2} step={0.01}
            value={svgScale}
            onChange={(e) => {
              const next = Number(e.target.value);
              setSvgScale(next);
              // Re-parse with the fresh scale so the preview updates live.
              if (file) void handleFile(file);
            }}
            className="w-full"
          />
          <p className="text-[10px] text-muted-foreground">
            Anchored on the current map centre. Tune until the preview polygons look right in the campus, then apply.
          </p>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs space-y-1">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Warnings
          </div>
          <ul className="text-muted-foreground list-disc list-inside">
            {warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
          </ul>
          {warnings.length > 5 && <p className="text-[10px] text-muted-foreground">+{warnings.length - 5} more</p>}
        </div>
      )}

      {parsed && stats && (
        <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 p-3 text-xs">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold">
            <Check className="h-4 w-4" />
            Parsed
          </div>
          <p className="text-muted-foreground mt-1">{stats}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 text-xs">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Failed to parse
          </div>
          <p className="text-muted-foreground mt-1 font-mono">{error}</p>
        </div>
      )}

      {parsed && (
        <>
          <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded"
            />
            <span>
              I understand this replaces the entire campus. Any un-exported changes will be lost.
            </span>
          </label>
          <button
            type="button"
            onClick={apply}
            disabled={!confirmed || submitting}
            className={cn(
              "w-full h-11 rounded-xl font-semibold transition-colors",
              "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            {submitting ? "Applying…" : "Apply import"}
          </button>
        </>
      )}
    </div>
  );
}
