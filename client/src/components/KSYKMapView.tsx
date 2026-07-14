/**
 * KSYK Maps — main campus map view (MapLibre-based).
 *
 * Chrome around the CampusMap:
 *   - Floor selector (top-right)
 *   - Zoom in/out stack (bottom-right, above 3D/Center)
 *   - 3D toggle + Center button (bottom-right, above zoom)
 *   - North reset (only shows when map is rotated off north)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CampusMap, { type CampusMapHandle } from "@/components/CampusMap";
import { useAppSettings, loadMapDefaultsFromServer } from "@/hooks/useAppSettings";
import { LocateFixed, Plus, Minus, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface KSYKMapViewProps {
  /** From the header search input — used to focus the map on matches. */
  searchQuery?: string;
}

interface Building {
  id: string;
  name: string;
  floors?: number | null;
}

export default function KSYKMapView(_props: KSYKMapViewProps = {}) {
  const { settings, update } = useAppSettings();
  const handleRef = useRef<CampusMapHandle | null>(null);
  const [is3D, setIs3D] = useState<boolean>((settings.osmPitchDeg ?? 0) > 0);
  const [bearing, setBearing] = useState<number>(settings.osmRotationDeg ?? 0);
  const [selectedFloor, setSelectedFloor] = useState<number>(1);

  // Buildings from DB — used only to compute max floor for the selector.
  const buildingsQ = useQuery<Building[]>({ queryKey: ["/api/buildings"] });
  const buildings = buildingsQ.data ?? [];
  const maxFloor = Math.max(1, ...buildings.map((b) => b.floors ?? 1));

  const onMapReady = useCallback((h: CampusMapHandle) => {
    handleRef.current = h;
    // Update bearing state when the user rotates the map (drag/right-click).
    h.map.on("rotate", () => setBearing(h.map.getBearing()));
  }, []);

  const toggle3D = useCallback(() => {
    const next = is3D ? 0 : 45;
    setIs3D(!is3D);
    handleRef.current?.setPitch(next);
    update("osmPitchDeg", next);
  }, [is3D, update]);

  const recenter = useCallback(async () => {
    try {
      await loadMapDefaultsFromServer();
    } catch { /* keep current settings */ }
    handleRef.current?.recenter();
  }, []);

  const resetNorth = useCallback(() => {
    handleRef.current?.setBearing(0);
    setBearing(0);
  }, []);

  return (
    <div className="absolute inset-0">
      <CampusMap onReady={onMapReady} />

      {/* Floor selector — top-right. Hidden when there are no buildings. */}
      {maxFloor > 1 && (
        <div
          className="absolute right-3 z-30 flex flex-col gap-0.5 p-1.5 rounded-2xl border border-border bg-card shadow-sm"
          style={{ top: "max(0.75rem, calc(0.75rem + env(safe-area-inset-top)))" }}
          aria-label="Floor selector"
        >
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-center text-muted-foreground leading-none py-0.5">
            FL
          </p>
          {Array.from({ length: maxFloor }, (_, i) => maxFloor - i).map((floor) => (
            <button
              key={floor}
              type="button"
              aria-label={`Floor ${floor}`}
              aria-pressed={selectedFloor === floor}
              onClick={() => setSelectedFloor(floor)}
              className={cn(
                "min-w-[40px] h-10 px-1 rounded-xl text-sm font-bold transition-colors leading-none tabular-nums flex items-center justify-center",
                selectedFloor === floor
                  ? "bg-blue-600 text-white"
                  : "text-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
              )}
            >
              {floor}
            </button>
          ))}
        </div>
      )}

      {/* North reset — shows only when map is rotated off north.
       *  Top-left so it doesn't collide with the floor selector. */}
      {Math.abs(bearing) > 2 && (
        <button
          type="button"
          onClick={resetNorth}
          aria-label="Reset north"
          title="Reset to north-up"
          className="absolute left-3 z-30 h-11 w-11 rounded-2xl border border-border bg-card text-foreground shadow-sm flex items-center justify-center transition-colors active:scale-[0.97] hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
          style={{
            top: "max(0.75rem, calc(0.75rem + env(safe-area-inset-top)))",
          }}
        >
          <Navigation
            className="h-[19px] w-[19px]"
            strokeWidth={2}
            style={{ transform: `rotate(${-bearing}deg)` }}
          />
        </button>
      )}

      {/* Zoom in / out — bottom-right, above 3D/Center */}
      <div
        className="absolute right-3 z-30 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        style={{ bottom: "max(8rem, calc(7.5rem + env(safe-area-inset-bottom)))" }}
      >
        <button
          type="button"
          onClick={() => handleRef.current?.zoomIn()}
          aria-label="Zoom in"
          title="Zoom in"
          className="w-11 h-11 flex items-center justify-center text-foreground border-b border-border transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 active:scale-[0.97]"
        >
          <Plus className="h-[19px] w-[19px]" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={() => handleRef.current?.zoomOut()}
          aria-label="Zoom out"
          title="Zoom out"
          className="w-11 h-11 flex items-center justify-center text-foreground transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 active:scale-[0.97]"
        >
          <Minus className="h-[19px] w-[19px]" strokeWidth={2.25} />
        </button>
      </div>

      {/* 3D toggle + Center — bottom-right, above zoom */}
      <div
        className="absolute right-3 z-30 flex flex-col gap-2"
        style={{ bottom: "max(1.5rem, calc(1rem + env(safe-area-inset-bottom)))" }}
      >
        <button
          type="button"
          aria-label={is3D ? "Switch to flat 2D" : "Switch to 3D view"}
          aria-pressed={is3D}
          onClick={toggle3D}
          title={is3D ? "2D flat" : "3D view"}
          className={cn(
            "w-11 h-11 rounded-2xl border shadow-sm flex items-center justify-center transition-colors active:scale-[0.97]",
            is3D
              ? "bg-blue-600 text-white border-blue-700/40 shadow-blue-600/25"
              : "bg-card border-border text-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
          )}
        >
          <span className="text-[11px] font-bold tabular-nums">
            {is3D ? "3D" : "2D"}
          </span>
        </button>

        <button
          type="button"
          aria-label="Center"
          onClick={recenter}
          title="Recenter to campus defaults"
          className="w-11 h-11 rounded-2xl border border-border bg-card text-foreground shadow-sm flex items-center justify-center transition-colors active:scale-[0.97] hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
        >
          <LocateFixed className="h-[19px] w-[19px]" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
