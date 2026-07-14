/**
 * MapSettingsPanel v2 — MapLibre-based admin map defaults.
 *
 * Lives inside the admin Settings ("Map" tab) and the Builder sidebar.
 * Shows a live MapLibre preview + inputs for center/zoom/rotation/pitch,
 * plus a Publish button that saves defaults to the server so every
 * user's map starts from the admin-configured view.
 *
 * Uses the CampusMap handle to `flyTo` when inputs change so the
 * preview reflects the current settings in real time.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import CampusMap, { type CampusMapHandle } from "@/components/CampusMap";
import {
  useAppSettings,
  saveMapDefaultsToServer,
} from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Compass, Loader2, Check, Upload, RotateCcw, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapSettingsPanelProps {
  /** Set false to hide the "Publish for all users" section. */
  showPublish?: boolean;
  /** Set "embed" to strip the outer Card chrome for sidebar use. */
  variant?: "card" | "embed";
  className?: string;
}

export default function MapSettingsPanel({
  showPublish = false,
  variant = "card",
  className,
}: MapSettingsPanelProps) {
  const { settings, update } = useAppSettings();
  const handleRef = useRef<CampusMapHandle | null>(null);
  const [publishState, setPublishState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // ── React map back to input changes ─────────────────────────────────────
  useEffect(() => {
    const h = handleRef.current;
    if (!h) return;
    h.flyTo(settings.osmCenterLat, settings.osmCenterLng, settings.osmDefaultZoom);
  }, [settings.osmCenterLat, settings.osmCenterLng, settings.osmDefaultZoom]);

  useEffect(() => {
    const h = handleRef.current;
    if (!h) return;
    h.setBearing(settings.osmRotationDeg ?? 0);
  }, [settings.osmRotationDeg]);

  useEffect(() => {
    const h = handleRef.current;
    if (!h) return;
    h.setPitch(settings.osmPitchDeg ?? 0);
  }, [settings.osmPitchDeg]);

  // ── Click preview to set center ─────────────────────────────────────────
  const onMapReady = useCallback((h: CampusMapHandle) => {
    handleRef.current = h;
    h.map.on("click", (e) => {
      update("osmCenterLat", +e.lngLat.lat.toFixed(6));
      update("osmCenterLng", +e.lngLat.lng.toFixed(6));
    });
  }, [update]);

  const onPublish = useCallback(async () => {
    setPublishState("saving");
    try {
      await saveMapDefaultsToServer(settings);
      setPublishState("saved");
      setTimeout(() => setPublishState("idle"), 2500);
    } catch {
      setPublishState("error");
      setTimeout(() => setPublishState("idle"), 3000);
    }
  }, [settings]);

  const onResetToKSYK = useCallback(() => {
    update("osmCenterLat", 60.1859);
    update("osmCenterLng", 25.0289);
    update("osmDefaultZoom", 17);
    update("osmRotationDeg", 0);
    update("osmPitchDeg", 0);
  }, [update]);

  const body = (
    <div className="space-y-4">
      {/* Live preview */}
      <div className="relative rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5 shadow-sm">
        <div className="h-[240px] w-full relative">
          <CampusMap onReady={onMapReady} />
          {/* Center pin overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-6 w-6 rounded-full bg-blue-600 ring-4 ring-white shadow-lg" />
          </div>
        </div>
        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-mono px-2 py-1 rounded-md tabular-nums pointer-events-none">
          {settings.osmCenterLat.toFixed(5)}, {settings.osmCenterLng.toFixed(5)} · z{settings.osmDefaultZoom}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground px-1">
        Click the map to set the campus centre. All other users see this on load.
      </p>

      {/* Position + zoom */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          Position &amp; zoom
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Latitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={settings.osmCenterLat}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) update("osmCenterLat", v);
              }}
              className="h-10 text-sm font-mono mt-1"
              inputMode="decimal"
            />
          </div>
          <div>
            <Label className="text-xs">Longitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={settings.osmCenterLng}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) update("osmCenterLng", v);
              }}
              className="h-10 text-sm font-mono mt-1"
              inputMode="decimal"
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <Label className="text-xs">Default zoom</Label>
            <span className="text-xs font-mono tabular-nums">{settings.osmDefaultZoom}</span>
          </div>
          <Slider
            value={[settings.osmDefaultZoom]}
            min={settings.osmMinZoom ?? 1}
            max={settings.osmMaxZoom ?? 22}
            step={0.5}
            onValueChange={([v]) => update("osmDefaultZoom", v)}
          />
        </div>
      </div>

      {/* Rotation + pitch */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground flex items-center gap-1.5">
          <Compass className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          Orientation
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-2">
            <Label className="text-xs">Bearing (rotation)</Label>
            <span className="text-xs font-mono tabular-nums">
              {(((settings.osmRotationDeg ?? 0) % 360) + 360) % 360}°
            </span>
          </div>
          <Slider
            value={[settings.osmRotationDeg ?? 0]}
            min={-180}
            max={180}
            step={1}
            onValueChange={([v]) => update("osmRotationDeg", v)}
          />
          {(settings.osmRotationDeg ?? 0) !== 0 && (
            <button
              type="button"
              onClick={() => update("osmRotationDeg", 0)}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50"
            >
              <RotateCcw className="h-3 w-3" /> Reset to north
            </button>
          )}
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-2">
            <Label className="text-xs">Pitch (tilt)</Label>
            <span className="text-xs font-mono tabular-nums">{settings.osmPitchDeg ?? 0}°</span>
          </div>
          <Slider
            value={[settings.osmPitchDeg ?? 0]}
            min={0}
            max={60}
            step={1}
            onValueChange={([v]) => update("osmPitchDeg", v)}
          />
        </div>
      </div>

      {/* Publish */}
      {showPublish && (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-2">
          <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">
            Publish to all users
          </div>
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            Saves the current center, zoom, bearing and pitch to the server.
            Every user's map loads these on next visit.
          </p>
          <button
            type="button"
            onClick={onPublish}
            disabled={publishState === "saving"}
            className={cn(
              "w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-colors active:scale-[0.98]",
              publishState === "saved"
                ? "bg-emerald-600"
                : publishState === "error"
                ? "bg-red-600"
                : "bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25 disabled:opacity-60",
            )}
          >
            {publishState === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : publishState === "saved" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {publishState === "saving"
              ? "Publishing…"
              : publishState === "saved"
              ? "Published!"
              : publishState === "error"
              ? "Failed — try again"
              : "Publish to server"}
          </button>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={onResetToKSYK}
        className="w-full h-10 rounded-xl text-xs"
      >
        Reset to KSYK defaults
      </Button>
    </div>
  );

  if (variant === "embed") {
    return <div className={className}>{body}</div>;
  }
  return (
    <div className={cn("bg-card border border-border rounded-2xl shadow-sm p-5", className)}>
      {body}
    </div>
  );
}
