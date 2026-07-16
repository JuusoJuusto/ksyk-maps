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
import { Compass, Loader2, Check, Upload, RotateCcw, MapPin, ZoomIn, Smartphone, Laptop } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppSettings } from "@/lib/appSettings";

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

  /** Fetch the published Map Defaults and use them as the reset target.
   *  No hardcoded coordinates: the source of truth is /api/map-defaults,
   *  which the admin publishes from the Builder. */
  const onResetToKSYK = useCallback(async () => {
    try {
      const res = await fetch("/api/map-defaults");
      if (res.ok) {
        const defaults = await res.json() as {
          center?: { lat: number; lng: number };
          zoom?: number;
          bearing?: number;
          pitch?: number;
        };
        if (defaults.center) {
          update("osmCenterLat", defaults.center.lat);
          update("osmCenterLng", defaults.center.lng);
        }
        if (typeof defaults.zoom === "number") update("osmDefaultZoom", defaults.zoom);
        if (typeof defaults.bearing === "number") update("osmRotationDeg", defaults.bearing);
        if (typeof defaults.pitch === "number") update("osmPitchDeg", defaults.pitch);
      }
    } catch {
      // Network / parse error — leave the current settings alone rather
      // than overwrite with a hardcoded fallback.
    }
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

      {/* Zoom bounds — min / max the user can zoom to. Restored so
       *  admins can lock a range without hunting through Advanced. */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground flex items-center gap-1.5">
          <ZoomIn className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          Zoom range
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <Label className="text-xs">Min zoom</Label>
              <span className="text-xs font-mono tabular-nums">{settings.osmMinZoom}</span>
            </div>
            <Slider
              value={[settings.osmMinZoom]}
              min={1}
              max={22}
              step={1}
              onValueChange={([v]) => update("osmMinZoom", v)}
            />
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <Label className="text-xs">Max zoom</Label>
              <span className="text-xs font-mono tabular-nums">{settings.osmMaxZoom}</span>
            </div>
            <Slider
              value={[settings.osmMaxZoom]}
              min={1}
              max={22}
              step={1}
              onValueChange={([v]) => update("osmMaxZoom", v)}
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          OSM raster tiles cap at 19 — going higher may 404.
        </p>
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

      {/* Platform-specific defaults — mobile + laptop. Empty inputs mean
       *  "inherit the shared value above". Great for tuning a tighter
       *  zoom on phones without changing the desktop landing view. */}
      <PlatformOverrides
        icon={<Smartphone className="h-3 w-3 text-blue-600 dark:text-blue-400" />}
        title="Mobile defaults"
        subtitle="Applied when the viewport is under 768 px wide."
        prefix="mobile"
        settings={settings}
        update={update}
      />
      <PlatformOverrides
        icon={<Laptop className="h-3 w-3 text-blue-600 dark:text-blue-400" />}
        title="Laptop / desktop defaults"
        subtitle="Applied when the viewport is 768 px wide or more."
        prefix="desktop"
        settings={settings}
        update={update}
      />

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

// ── Platform overrides subcomponent ─────────────────────────────────

interface PlatformOverridesProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  prefix: "mobile" | "desktop";
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

/** One collapsible-ish block per platform. Every field is nullable — an
 *  empty input clears the override and falls back to the shared value. */
function PlatformOverrides({ icon, title, subtitle, prefix, settings, update }: PlatformOverridesProps) {
  const k = (suffix: string) => (`${prefix}${suffix}` as keyof AppSettings);
  const get = (suffix: string) => settings[k(suffix)] as number | null;
  const set = (suffix: string, v: number | null) => update(k(suffix), v as AppSettings[keyof AppSettings]);

  const NullableNumber = ({ label, suffix, step = 1, min, max, placeholder }: {
    label: string; suffix: string; step?: number; min?: number; max?: number; placeholder: string;
  }) => {
    const v = get(suffix);
    return (
      <div>
        <Label className="text-xs">{label}</Label>
        <Input
          type="number"
          step={step}
          min={min}
          max={max}
          value={v === null ? "" : v}
          placeholder={placeholder}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") { set(suffix, null); return; }
            const n = parseFloat(raw);
            if (Number.isFinite(n)) set(suffix, n);
          }}
          className="h-9 text-sm font-mono mt-1"
          inputMode="decimal"
        />
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <div>
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground flex items-center gap-1.5">
          {icon}
          {title}
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NullableNumber label="Center lat"   suffix="CenterLat"    step={0.000001} placeholder={settings.osmCenterLat.toFixed(5)} />
        <NullableNumber label="Center lng"   suffix="CenterLng"    step={0.000001} placeholder={settings.osmCenterLng.toFixed(5)} />
        <NullableNumber label="Default zoom" suffix="DefaultZoom"  step={0.5} min={1} max={22} placeholder={String(settings.osmDefaultZoom)} />
        <NullableNumber label="Rotation °"   suffix="RotationDeg"  step={1} min={-180} max={180} placeholder={String(settings.osmRotationDeg ?? 0)} />
        <NullableNumber label="Min zoom"     suffix="MinZoom"      step={1} min={1} max={22} placeholder={String(settings.osmMinZoom)} />
        <NullableNumber label="Max zoom"     suffix="MaxZoom"      step={1} min={1} max={22} placeholder={String(settings.osmMaxZoom)} />
        <NullableNumber label="Pitch °"      suffix="PitchDeg"     step={1} min={0} max={60} placeholder={String(settings.osmPitchDeg ?? 0)} />
      </div>
      <button
        type="button"
        onClick={() => {
          set("CenterLat", null); set("CenterLng", null); set("DefaultZoom", null);
          set("MinZoom", null); set("MaxZoom", null); set("RotationDeg", null); set("PitchDeg", null);
        }}
        className="w-full h-8 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
      >
        Clear all {prefix} overrides
      </button>
    </div>
  );
}
