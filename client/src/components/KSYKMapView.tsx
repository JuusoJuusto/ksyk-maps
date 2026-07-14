/**
 * KSYK Maps — main campus map view.
 *
 * Wraps the CampusMap (MapLibre GL) with app-specific chrome:
 *   - Floating 3D toggle + Center button (bottom-right)
 *   - Search-driven flyTo (parent passes searchQuery)
 *
 * The map engine handles rotation + pitch natively via MapLibre's
 * built-in bearing/pitch transforms. No CSS hacks, no tile buffer
 * over-render, no reflow schedule. Vector tiles render every
 * corner at every angle because they're drawn on a GPU canvas.
 */
import { useCallback, useRef, useState } from "react";
import CampusMap, { type CampusMapHandle } from "@/components/CampusMap";
import { useAppSettings, loadMapDefaultsFromServer } from "@/hooks/useAppSettings";
import { LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";

interface KSYKMapViewProps {
  /** From the header search input — used to focus the map on matches. */
  searchQuery?: string;
}

export default function KSYKMapView(_props: KSYKMapViewProps = {}) {
  const { settings, update } = useAppSettings();
  const handleRef = useRef<CampusMapHandle | null>(null);
  const [is3D, setIs3D] = useState<boolean>((settings.osmPitchDeg ?? 0) > 0);

  const onMapReady = useCallback((h: CampusMapHandle) => {
    handleRef.current = h;
  }, []);

  const toggle3D = useCallback(() => {
    const next = is3D ? 0 : 45;
    setIs3D(!is3D);
    handleRef.current?.setPitch(next);
    update("osmPitchDeg", next);
  }, [is3D, update]);

  const recenter = useCallback(async () => {
    // Re-fetch admin defaults so custom center/rotation/zoom are
    // honored even after they publish new defaults.
    try {
      await loadMapDefaultsFromServer();
    } catch { /* keep current settings */ }
    handleRef.current?.recenter();
  }, []);

  return (
    <div className="absolute inset-0">
      <CampusMap onReady={onMapReady} />

      {/* Floating controls — bottom-right, matches top-bar chrome */}
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
