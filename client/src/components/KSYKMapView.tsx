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
import SearchResultsDropdown from "@/components/SearchResultsDropdown";
import { useAppSettings, loadMapDefaultsFromServer } from "@/hooks/useAppSettings";
import { LocateFixed, Plus, Minus, Navigation, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { polygonCentroid } from "@ksyk/shared";
import type { Room } from "@ksyk/shared";

interface KSYKMapViewProps {
  /** From the header search input — drives the dropdown + map focus. */
  searchQuery?: string;
}

/** Focus the map camera on a room. Uses the polygon centroid when
 *  points are available; falls back to the room's building center. */
function roomCenter(room: Room): { lat: number; lng: number } | null {
  if (room.points && room.points.length > 0) return polygonCentroid(room.points);
  return null;
}

interface Building {
  id: string;
  name: string;
  floors?: number | null;
}

export default function KSYKMapView(props: KSYKMapViewProps = {}) {
  const { searchQuery = "" } = props;
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

  const onPickResult = useCallback((room: Room) => {
    const centre = roomCenter(room);
    if (centre && handleRef.current) {
      handleRef.current.map.flyTo({
        center: [centre.lng, centre.lat],
        zoom: Math.max(handleRef.current.map.getZoom(), 18),
        duration: 800,
      });
    }
    if (typeof room.floor === "number") setSelectedFloor(room.floor);
  }, []);

  return (
    <div className="absolute inset-0">
      <CampusMap onReady={onMapReady} />

      {/* Search results overlay — anchored under the header search bar. */}
      <SearchResultsDropdown
        query={searchQuery}
        onSelect={(room) => onPickResult(room)}
      />

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

      {/* Right-side control rail — single vertical column with consistent
       *  spacing so buttons can't overlap the way they did when each stack
       *  had its own hardcoded `bottom` offset. Groups stay visually
       *  distinct via the border between them; flex-col gap-3 handles
       *  the between-group breathing room. */}
      <div
        className="absolute right-3 z-30 flex flex-col-reverse gap-3 items-end"
        style={{ bottom: "max(1.5rem, calc(1rem + env(safe-area-inset-bottom)))" }}
      >
        {/* 3D toggle + Center */}
        <div className="flex flex-col gap-2">
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

        {/* Zoom in / out — attached pair, one rounded chip. */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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

        {/* Rotate — click 30° CW, shift-click 30° CCW. */}
        <button
          type="button"
          onClick={(e) => {
            const dir = e.shiftKey ? -30 : 30;
            handleRef.current?.setBearing(bearing + dir);
            setBearing(bearing + dir);
          }}
          aria-label="Rotate 30° (shift-click to rotate the other way)"
          title="Rotate 30° · shift-click to reverse · right-click drag to free-rotate"
          className="w-11 h-11 rounded-2xl border border-border bg-card text-foreground shadow-sm flex items-center justify-center transition-colors active:scale-[0.97] hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
        >
          <RotateCw className="h-[19px] w-[19px]" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
