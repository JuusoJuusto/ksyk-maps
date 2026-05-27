/**
 * Reusable OSM map configuration panel. Used by the user-facing
 * CampusSettingsPanel ("Map" tab) and by the admin Builder tab so admins
 * can edit the global defaults without leaving the builder workspace.
 *
 * Reads/writes through useAppSettings, which is backed by a shared store
 * (see hooks/useAppSettings) — every change is applied to the live map.
 */

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { OSM_TILE_PROVIDERS, OSM_TILE_THEMES, DEFAULT_APP_SETTINGS } from "@/lib/appSettings";
import type { OsmTileTheme } from "@/lib/appSettings";
import OsmPreviewMap from "@/components/OsmPreviewMap";
import { cn } from "@/lib/utils";
import { Map as MapIcon, Compass, Maximize2, RotateCcw, Check } from "lucide-react";

interface MapSettingsPanelProps {
  /** Whether to render the card chrome (title bar etc.). Set false to embed flat. */
  variant?: "card" | "embed";
  /** Optional className for the outer container. */
  className?: string;
}

export default function MapSettingsPanel({ variant = "card", className }: MapSettingsPanelProps) {
  const { i18n } = useTranslation();
  const isFi = i18n.language === "fi";
  const { darkMode } = useDarkMode();
  const { settings, update } = useAppSettings();
  const [previewMode, setPreviewMode] = useState<"center" | "bounds">("center");

  // Save indicator — flashes "Saved ✓" briefly when any setting changes.
  // First render is suppressed so the badge doesn't flash on mount.
  const [savedFlash, setSavedFlash] = useState(false);
  const firstRenderRef = useRef(true);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    setSavedFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setSavedFlash(false), 1800);
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [
    settings.osmCenterLat,
    settings.osmCenterLng,
    settings.osmDefaultZoom,
    settings.osmMinZoom,
    settings.osmMaxZoom,
    settings.osmRotationDeg,
    settings.osmPitchDeg,
    settings.osmTileTheme,
    settings.osmCampusSpanMeters,
    settings.osmMaxBoundsEnabled,
    settings.osmMaxBoundsNorth,
    settings.osmMaxBoundsEast,
    settings.osmMaxBoundsSouth,
    settings.osmMaxBoundsWest,
  ]);

  const SettingRow = ({
    label,
    description,
    children,
  }: {
    label: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-3 px-3.5 rounded-xl transition-colors",
        darkMode ? "bg-gray-800/50 hover:bg-gray-800/70" : "bg-slate-50/90 hover:bg-white"
      )}
    >
      <div className="min-w-0 flex-1">
        <Label className="text-sm font-semibold">{label}</Label>
        {description && (
          <p className={cn("text-xs mt-0.5 leading-relaxed", darkMode ? "text-gray-400" : "text-gray-500")}>
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  const body = (
    <div className="space-y-4">
      {/* ── Live preview + center/bounds editor ────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <MapIcon className="h-3.5 w-3.5 text-blue-500" />
            {isFi ? "Esikatselu" : "Live preview"}
          </Label>
          <div className="flex gap-1 rounded-lg bg-gray-200/60 dark:bg-gray-800/60 p-0.5">
            {(["center", "bounds"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPreviewMode(m)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors",
                  previewMode === m
                    ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                )}
                aria-pressed={previewMode === m}
              >
                {m === "center"
                  ? isFi ? "Keskipiste" : "Center"
                  : isFi ? "Rajat" : "Bounds"}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
          {previewMode === "center"
            ? isFi
              ? "Napauta karttaa asettaaksesi keskipisteen."
              : "Click the map to set the centre."
            : isFi
            ? "Vedä karttaa rajataksesi alueen, johon käyttäjät voivat panoroida."
            : "Drag a rectangle to define where users are allowed to pan."}
        </p>
        <OsmPreviewMap
          height={260}
          mode={previewMode}
          onPick={(lat, lng) => {
            // Shift the maxBounds box so it stays centred on the new
            // location. Otherwise the home/reset button can't fly to a
            // centre that lives outside stale bounds.
            const dLat = lat - settings.osmCenterLat;
            const dLng = lng - settings.osmCenterLng;
            update("osmCenterLat", lat);
            update("osmCenterLng", lng);
            if (settings.osmMaxBoundsEnabled) {
              update("osmMaxBoundsNorth", +(settings.osmMaxBoundsNorth + dLat).toFixed(6));
              update("osmMaxBoundsSouth", +(settings.osmMaxBoundsSouth + dLat).toFixed(6));
              update("osmMaxBoundsEast", +(settings.osmMaxBoundsEast + dLng).toFixed(6));
              update("osmMaxBoundsWest", +(settings.osmMaxBoundsWest + dLng).toFixed(6));
            }
          }}
          onBounds={(b) => {
            update("osmMaxBoundsNorth", b.north);
            update("osmMaxBoundsEast", b.east);
            update("osmMaxBoundsSouth", b.south);
            update("osmMaxBoundsWest", b.west);
            update("osmMaxBoundsEnabled", true);
          }}
        />
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground px-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 shrink-0" />
          {settings.osmCenterLat.toFixed(5)}, {settings.osmCenterLng.toFixed(5)}
        </div>
      </div>

      {/* ── Tile theme ────────────────────────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-gray-900/50 space-y-3">
        <div>
          <Label className="mb-2 text-xs flex items-center gap-1.5">
            <span>{isFi ? "Karttatyyli" : "Tile theme"}</span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              {isFi ? "Vaihtuu teeman mukaan" : "Auto light/dark"}
            </Badge>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(OSM_TILE_THEMES) as [OsmTileTheme, typeof OSM_TILE_THEMES[OsmTileTheme]][]).map(([id, pack]) => {
              const z = 14;
              const lat = settings.osmCenterLat;
              const lng = settings.osmCenterLng;
              const tileX = Math.floor(((lng + 180) / 360) * Math.pow(2, z));
              const tileY = Math.floor(
                ((1 -
                  Math.log(
                    Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
                  ) / Math.PI) / 2) * Math.pow(2, z)
              );
              const thumb = (key: typeof pack.light) =>
                OSM_TILE_PROVIDERS[key].url
                  .replace("{z}", String(z))
                  .replace("{x}", String(tileX))
                  .replace("{y}", String(tileY))
                  .replace("{r}", "")
                  .replace("{s}", "a");
              const selected = settings.osmTileTheme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => update("osmTileTheme", id)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border-2 transition-all duration-200 text-left",
                    selected
                      ? "border-blue-500 ring-2 ring-blue-500/30 shadow-md"
                      : "border-gray-200/70 dark:border-gray-700/60 hover:border-blue-300 dark:hover:border-blue-500/50"
                  )}
                  aria-pressed={selected}
                  title={pack.description}
                >
                  <div className="grid grid-cols-2 aspect-[4/3]">
                    <img
                      src={thumb(pack.light)}
                      alt=""
                      loading="lazy"
                      crossOrigin="anonymous"
                      className="block w-full h-full object-cover"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                    <img
                      src={thumb(pack.dark)}
                      alt=""
                      loading="lazy"
                      crossOrigin="anonymous"
                      className="block w-full h-full object-cover"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                  </div>
                  <div className="px-2 py-1 text-[10px] font-semibold bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-gray-100 truncate">
                    {isFi ? pack.nameFi : pack.name}
                  </div>
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-900" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed px-1">
            {isFi
              ? "Vasen puoli näyttää vaalean tilan, oikea tumman."
              : "Left half is the light variant, right is the dark."}
          </p>
        </div>
      </div>

      {/* ── Center coordinates ─────────────────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-gray-900/50 space-y-3">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Compass className="h-3.5 w-3.5 text-blue-500" />
          {isFi ? "Sijainti ja zoomi" : "Position & zoom"}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1 block text-xs">Lat</Label>
            <Input
              type="number"
              step="0.0001"
              min={-90}
              max={90}
              value={settings.osmCenterLat}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isFinite(v)) return;
                const next = Math.max(-90, Math.min(90, v));
                const d = next - settings.osmCenterLat;
                update("osmCenterLat", next);
                if (settings.osmMaxBoundsEnabled) {
                  update("osmMaxBoundsNorth", +(settings.osmMaxBoundsNorth + d).toFixed(6));
                  update("osmMaxBoundsSouth", +(settings.osmMaxBoundsSouth + d).toFixed(6));
                }
              }}
              className="h-9 text-sm font-mono"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Lng</Label>
            <Input
              type="number"
              step="0.0001"
              min={-180}
              max={180}
              value={settings.osmCenterLng}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isFinite(v)) return;
                const next = Math.max(-180, Math.min(180, v));
                const d = next - settings.osmCenterLng;
                update("osmCenterLng", next);
                if (settings.osmMaxBoundsEnabled) {
                  update("osmMaxBoundsEast", +(settings.osmMaxBoundsEast + d).toFixed(6));
                  update("osmMaxBoundsWest", +(settings.osmMaxBoundsWest + d).toFixed(6));
                }
              }}
              className="h-9 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-2">
            <Label className="text-xs">{isFi ? "Oletuszoomi" : "Default zoom"}</Label>
            <span className="text-xs font-mono">{settings.osmDefaultZoom}</span>
          </div>
          <Slider
            value={[settings.osmDefaultZoom]}
            min={settings.osmMinZoom}
            max={settings.osmMaxZoom}
            step={0.5}
            onValueChange={([v]) => update("osmDefaultZoom", v)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1 block text-xs">{isFi ? "Min zoom" : "Min zoom"}</Label>
            <Input
              type="number"
              min={1}
              max={22}
              value={settings.osmMinZoom}
              onChange={(e) =>
                update("osmMinZoom", Math.max(1, Math.min(22, parseInt(e.target.value) || 1)))
              }
              className="h-9 text-sm font-mono"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">{isFi ? "Max zoom" : "Max zoom"}</Label>
            <Input
              type="number"
              min={1}
              max={22}
              value={settings.osmMaxZoom}
              onChange={(e) =>
                update("osmMaxZoom", Math.max(1, Math.min(22, parseInt(e.target.value) || 19)))
              }
              className="h-9 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* ── Orientation ───────────────────────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-gray-900/50 space-y-3">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
          {isFi ? "Suunta ja kallistus" : "Orientation"}
        </Label>

        <div>
          <div className="flex justify-between items-baseline mb-2">
            <Label className="text-xs">{isFi ? "Kierto (bearing)" : "Rotation (bearing)"}</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono">{settings.osmRotationDeg}°</span>
              {settings.osmRotationDeg !== 0 && (
                <button
                  type="button"
                  onClick={() => update("osmRotationDeg", 0)}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {isFi ? "Pohj." : "Reset"}
                </button>
              )}
            </div>
          </div>
          <Slider
            value={[settings.osmRotationDeg]}
            min={-180}
            max={180}
            step={1}
            onValueChange={([v]) => update("osmRotationDeg", v)}
          />
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-2">
            <Label className="text-xs">{isFi ? "Kallistus (pitch)" : "Tilt / pitch"}</Label>
            <span className="text-xs font-mono">{settings.osmPitchDeg ?? 0}°</span>
          </div>
          <Slider
            value={[settings.osmPitchDeg ?? 0]}
            min={0}
            max={45}
            step={1}
            onValueChange={([v]) => update("osmPitchDeg", v)}
          />
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
            {isFi ? "Kokeellinen — yli 25° voi vääristää tarttumakohtia." : "Experimental — over 25° may misalign hits."}
          </p>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-2">
            <Label className="text-xs">{isFi ? "Kampuksen leveys (m)" : "Campus span (m)"}</Label>
            <span className="text-xs font-mono">{settings.osmCampusSpanMeters} m</span>
          </div>
          <Slider
            value={[settings.osmCampusSpanMeters]}
            min={50}
            max={500}
            step={10}
            onValueChange={([v]) => update("osmCampusSpanMeters", v)}
          />
        </div>
      </div>

      {/* ── Bounds restriction ─────────────────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-gray-900/50 space-y-3">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Maximize2 className="h-3.5 w-3.5 text-blue-500" />
          {isFi ? "Panoroinnin rajat" : "Pan bounds"}
        </Label>
        <SettingRow
          label={isFi ? "Rajoita panorointi" : "Restrict panning"}
          description={
            isFi
              ? "Estä käyttäjiä panoroimasta määritettyjen rajojen ulkopuolelle"
              : "Stop users from panning outside the defined bounds"
          }
        >
          <Switch
            checked={settings.osmMaxBoundsEnabled}
            onCheckedChange={(v) => update("osmMaxBoundsEnabled", v)}
          />
        </SettingRow>
        {settings.osmMaxBoundsEnabled && (
          <div className="grid grid-cols-2 gap-2">
            {([
              ["osmMaxBoundsNorth", "N"],
              ["osmMaxBoundsEast", "E"],
              ["osmMaxBoundsSouth", "S"],
              ["osmMaxBoundsWest", "W"],
            ] as const).map(([k, lbl]) => (
              <div key={k}>
                <Label className="mb-1 block text-[10px] font-mono">{lbl}</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={settings[k]}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) update(k, v);
                  }}
                  className="h-8 text-xs font-mono"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* ── Live-applied + save indicator ──────────────────────────── */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/70 dark:border-emerald-800/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            {isFi
              ? "Muutokset tallentuvat heti."
              : "Changes save live."}
          </span>
        </div>
        <div
          aria-live="polite"
          className={cn(
            "flex items-center gap-1 text-[11px] font-semibold transition-all duration-200",
            savedFlash
              ? "opacity-100 translate-y-0 text-emerald-700 dark:text-emerald-300"
              : "opacity-0 translate-y-1 pointer-events-none"
          )}
        >
          <Check className="h-3 w-3" />
          {isFi ? "Tallennettu" : "Saved"}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs rounded-xl"
        onClick={() => {
          if (
            typeof window !== "undefined" &&
            !window.confirm(
              isFi
                ? "Palauta KSYK-oletukset (sijainti, zoomi, kierto, kallistus, rajat, tyyli)?"
                : "Reset all map defaults (center, zoom, rotation, pitch, bounds, style)?"
            )
          )
            return;
          (
            [
              "osmCenterLat",
              "osmCenterLng",
              "osmDefaultZoom",
              "osmMinZoom",
              "osmMaxZoom",
              "osmRotationDeg",
              "osmPitchDeg",
              "osmCampusSpanMeters",
              "osmTileTheme",
              "osmTileProvider",
              "osmTileProviderDark",
              "osmMaxBoundsEnabled",
              "osmMaxBoundsNorth",
              "osmMaxBoundsEast",
              "osmMaxBoundsSouth",
              "osmMaxBoundsWest",
            ] as const
          ).forEach((k) => update(k, DEFAULT_APP_SETTINGS[k] as never));
        }}
      >
        {isFi ? "Palauta KSYK-oletukset" : "Reset to KSYK defaults"}
      </Button>
    </div>
  );

  if (variant === "embed") {
    return <div className={className}>{body}</div>;
  }

  return (
    <Card className={cn("border-0 shadow-xl", darkMode ? "bg-gray-800/80" : "bg-white/90", className)}>
      <CardHeader>
        <CardTitle>{isFi ? "Karttapohjan oletukset" : "Map defaults"}</CardTitle>
        <CardDescription>
          {isFi
            ? "Globaalit asetukset. Muutokset näkyvät heti kaikilla käyttäjillä."
            : "Global settings. Changes apply live for everyone."}
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
