/**
 * StatusBar — Builder bottom status bar.
 *
 * Fixed strip along the bottom of the Builder viewport. Live-updates
 * from a `StatusBarState` prop the parent recomputes on:
 *   - map move / zoom (coords + zoom + rotation)
 *   - selection change
 *   - a per-frame rAF ticker (fps — cheap, doesn't touch React state
 *     if the value hasn't changed by ≥ 1)
 *   - autosave state (dirty flag)
 *   - validation state (warnings + errors)
 *
 * The bar is purely informational — clicks on the warnings segment
 * emit `onOpenValidation` so the parent can pop the validation panel.
 */
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { AlertTriangle, XOctagon, Layers, Compass, Gauge, MousePointer2 } from "lucide-react";

export interface StatusBarState {
  /** Latitude cursor is over (from mousemove on the canvas). */
  cursorLat: number | null;
  cursorLng: number | null;
  zoom: number;
  bearingDeg: number;
  activeFloor: number | null;
  activeLayer: string | null;
  selectionCount: number;
  fps: number | null;
  errorCount: number;
  warningCount: number;
  saveState: "saved" | "saving" | "dirty" | "error";
}

export interface StatusBarProps {
  state: StatusBarState;
  onOpenValidation?: () => void;
}

export default function StatusBar({ state, onOpenValidation }: StatusBarProps) {
  const { darkMode } = useDarkMode();

  return (
    <div
      className={cn(
        "absolute left-0 right-0 bottom-0 z-30 flex items-stretch text-[11px] font-mono tabular-nums select-none",
        "border-t",
        darkMode
          ? "bg-gray-900/95 border-gray-800 text-gray-300 backdrop-blur"
          : "bg-white/95 border-gray-200 text-gray-700 backdrop-blur",
      )}
      role="status"
      aria-live="polite"
    >
      <Segment>
        <Compass className="h-3 w-3" />
        <span>
          {state.cursorLat !== null && state.cursorLng !== null
            ? `${state.cursorLat.toFixed(6)}, ${state.cursorLng.toFixed(6)}`
            : "—"}
        </span>
      </Segment>

      <Segment>
        <span className="uppercase tracking-wider text-[9px] opacity-70">Zoom</span>
        <span>{state.zoom.toFixed(2)}</span>
      </Segment>

      <Segment>
        <span className="uppercase tracking-wider text-[9px] opacity-70">Rot</span>
        <span>{state.bearingDeg.toFixed(1)}°</span>
      </Segment>

      {state.activeFloor !== null && (
        <Segment>
          <span className="uppercase tracking-wider text-[9px] opacity-70">Floor</span>
          <span>{state.activeFloor}</span>
        </Segment>
      )}

      {state.activeLayer && (
        <Segment>
          <Layers className="h-3 w-3" />
          <span className="truncate max-w-[8ch]">{state.activeLayer}</span>
        </Segment>
      )}

      <Segment>
        <MousePointer2 className="h-3 w-3" />
        <span>{state.selectionCount}</span>
      </Segment>

      {state.fps !== null && (
        <Segment>
          <Gauge className="h-3 w-3" />
          <span
            className={cn(
              state.fps >= 55 ? "text-green-500" :
              state.fps >= 30 ? "text-yellow-500" :
              "text-red-500",
            )}
          >
            {state.fps.toFixed(0)} fps
          </span>
        </Segment>
      )}

      <div className="flex-1" />

      {/* Save state pill */}
      <Segment>
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider",
            state.saveState === "saved"  ? "bg-green-500/15 text-green-600" :
            state.saveState === "saving" ? "bg-yellow-500/15 text-yellow-600 animate-pulse" :
            state.saveState === "dirty"  ? "bg-blue-500/15 text-blue-600" :
                                           "bg-red-500/15 text-red-600",
          )}
        >
          {state.saveState}
        </span>
      </Segment>

      {/* Validation pill — clickable */}
      <button
        type="button"
        onClick={onOpenValidation}
        className={cn(
          "flex items-center gap-2 px-3 border-l transition-colors",
          darkMode ? "border-gray-800 hover:bg-gray-800" : "border-gray-200 hover:bg-gray-50",
          state.errorCount > 0 && "text-red-600",
          state.errorCount === 0 && state.warningCount > 0 && "text-yellow-600",
        )}
        aria-label={`Validation: ${state.errorCount} errors, ${state.warningCount} warnings`}
      >
        {state.errorCount > 0 ? <XOctagon className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
        <span>{state.errorCount}e · {state.warningCount}w</span>
      </button>
    </div>
  );
}

function Segment({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-3 border-l first:border-l-0 border-gray-200 dark:border-gray-800">
      {children}
    </div>
  );
}
