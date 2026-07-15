/**
 * RoutePanel — turn-by-turn overlay for an active route.
 *
 * Sits over the map (bottom, mobile-first) and shows:
 *   - Total distance + walking-speed ETA
 *   - Current turn (big) + next turn (small)
 *   - Per-floor progress with a floor picker so the user can preview
 *     the whole route across floors.
 *   - Close button to dismiss the route.
 *
 * Consumes:
 *   - `route: Route` from `@ksyk/routing.findPath()`
 *   - `turns: TurnHint[]` from `@ksyk/routing.annotateRoute()`
 *   - `activeStepIndex` — the caller advances this as the user follows
 *     the route (M13.1 will auto-advance based on GPS proximity).
 *
 * Pure presentation. All interaction (advancing step, changing floor)
 * goes back to the caller via callbacks so the map stays in sync.
 */
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { X, MapPin, ArrowUp, ArrowDown, CornerUpLeft, CornerUpRight, ArrowUpRight, ArrowUpLeft, Flag, Play } from "lucide-react";
import type { Route as NavRoute, TurnHint } from "@ksyk/routing";

export interface RoutePanelProps {
  route: NavRoute;
  turns: TurnHint[];
  activeStepIndex: number;
  onAdvance: (nextIndex: number) => void;
  onClose: () => void;
  onFocusFloor?: (floor: number) => void;
}

/** Icon per turn kind. */
function TurnIcon({ kind, className }: { kind: TurnHint["turn"]; className?: string }) {
  const cls = className ?? "h-6 w-6";
  switch (kind) {
    case "start":       return <Play className={cls} />;
    case "arrive":      return <Flag className={cls} />;
    case "floor_up":    return <ArrowUp className={cls} />;
    case "floor_down":  return <ArrowDown className={cls} />;
    case "left":
    case "sharp_left":  return <CornerUpLeft className={cls} />;
    case "right":
    case "sharp_right": return <CornerUpRight className={cls} />;
    case "slight_left": return <ArrowUpLeft className={cls} />;
    case "slight_right": return <ArrowUpRight className={cls} />;
    default:            return <ArrowUp className={cls} />;
  }
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)} s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export default function RoutePanel({
  route, turns, activeStepIndex, onAdvance, onClose, onFocusFloor,
}: RoutePanelProps) {
  const { darkMode } = useDarkMode();

  const clampedIdx = Math.min(Math.max(0, activeStepIndex), turns.length - 1);
  const current = turns[clampedIdx];
  const next = turns[clampedIdx + 1];

  // Floor breakdown: for each segment, distance in metres.
  const perFloor = useMemo(() => {
    return route.segments.map((s) => {
      let d = 0;
      for (let i = 1; i < s.coords.length; i++) {
        // Cheap flat-earth (fine for < 2 km segments).
        const dx = (s.coords[i].lng - s.coords[i - 1].lng) * 111_320 * Math.cos((s.coords[i].lat * Math.PI) / 180);
        const dy = (s.coords[i].lat - s.coords[i - 1].lat) * 111_320;
        d += Math.sqrt(dx * dx + dy * dy);
      }
      return { floor: s.floor, buildingId: s.buildingId, distance: d };
    });
  }, [route.segments]);

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 z-40 w-[min(94vw,32rem)]",
        "rounded-2xl shadow-2xl border overflow-hidden",
        darkMode ? "bg-gray-900/95 border-gray-800 text-gray-100 backdrop-blur" : "bg-white border-gray-200 text-gray-900",
      )}
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      role="region"
      aria-label="Active route"
    >
      {/* Header — totals + close */}
      <div className={cn("flex items-center gap-3 px-4 py-3 border-b", darkMode ? "border-gray-800" : "border-gray-200")}>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Route</p>
          <p className="text-sm font-semibold">
            {formatDistance(route.totalDistanceMeters)} · {formatDuration(route.totalDurationSeconds)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn("h-8 w-8 rounded-lg flex items-center justify-center", darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100")}
          aria-label="Close route"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Current turn — big */}
      {current && (
        <div className="flex items-center gap-4 px-4 py-4">
          <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 text-white", "bg-blue-600 shadow-md shadow-blue-600/30")}>
            <TurnIcon kind={current.turn} className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold leading-tight">{current.description}</p>
            {current.distanceToNextMeters > 0 && (
              <p className={cn("text-xs mt-0.5", darkMode ? "text-gray-400" : "text-gray-500")}>
                Then {formatDistance(current.distanceToNextMeters)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Next turn — small */}
      {next && (
        <div className={cn("flex items-center gap-3 px-4 py-2.5 border-t", darkMode ? "border-gray-800 bg-gray-800/40" : "border-gray-200 bg-gray-50")}>
          <TurnIcon kind={next.turn} className={cn("h-4 w-4", darkMode ? "text-gray-400" : "text-gray-500")} />
          <p className={cn("text-xs flex-1 min-w-0 truncate", darkMode ? "text-gray-300" : "text-gray-600")}>
            Then: {next.description}
          </p>
        </div>
      )}

      {/* Per-floor progress */}
      {perFloor.length > 1 && (
        <div className={cn("px-4 py-3 border-t", darkMode ? "border-gray-800" : "border-gray-200")}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Floors on this route
          </p>
          <div className="flex flex-wrap gap-1.5">
            {perFloor.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onFocusFloor?.(f.floor)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors",
                  darkMode
                    ? "border-gray-700 hover:bg-blue-500/15 hover:border-blue-500/40 text-gray-200"
                    : "border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700",
                )}
              >
                <MapPin className="h-3 w-3 inline-block mr-1" />
                Floor {f.floor} · {formatDistance(f.distance)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={cn("flex items-center gap-2 px-4 py-3 border-t", darkMode ? "border-gray-800" : "border-gray-200")}>
        <button
          type="button"
          onClick={() => onAdvance(Math.max(0, clampedIdx - 1))}
          disabled={clampedIdx === 0}
          className={cn(
            "flex-1 h-9 rounded-lg text-xs font-semibold border transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            darkMode
              ? "border-gray-700 hover:bg-gray-800"
              : "border-gray-200 hover:bg-gray-50",
          )}
        >
          ← Previous
        </button>
        <span className={cn("text-xs tabular-nums", darkMode ? "text-gray-400" : "text-gray-500")}>
          {clampedIdx + 1} / {turns.length}
        </span>
        <button
          type="button"
          onClick={() => onAdvance(Math.min(turns.length - 1, clampedIdx + 1))}
          disabled={clampedIdx >= turns.length - 1}
          className={cn(
            "flex-1 h-9 rounded-lg text-xs font-semibold text-white transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "bg-blue-600 hover:bg-blue-700",
          )}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
