/**
 * ValidationDrawer — surfaces the current campus's validation issues.
 *
 * Slides in from the right when the user clicks the validation pill in
 * the StatusBar (or the ShieldCheck icon in the TopToolbar). Shows:
 *   - A summary bar with error/warning/info counts + a publish gate.
 *   - Issues grouped by severity. Each row is clickable; the parent
 *     handles focusing the offending entity in the sidebar / on the
 *     canvas.
 *
 * The drawer is stateless — it re-runs `validateMap` on every render
 * from the live campus data. That's fine: validation is O(n²) at
 * worst on the tiny campus sizes we support (< ~1000 entities), and
 * running it live means the panel is always fresh.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { validateMap } from "@ksyk/shared";
import type {
  Building, Room, Hallway, Floor, Door, Stair, Elevator,
  ValidationIssue, ValidationResult, ValidationSeverity, ValidationEntityKind,
} from "@ksyk/shared";
import { X, AlertTriangle, XOctagon, Info, ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { fetchList } from "@/lib/fetchList";

export interface ValidationDrawerProps {
  open: boolean;
  onClose: () => void;
  onFocusIssue: (kind: ValidationEntityKind, id: string) => void;
}

const SEVERITY_META: Record<ValidationSeverity, {
  label: string; badge: string; Icon: typeof AlertTriangle;
}> = {
  error:   { label: "Errors",   badge: "bg-red-500/15 text-red-600",       Icon: XOctagon },
  warning: { label: "Warnings", badge: "bg-yellow-500/15 text-yellow-600", Icon: AlertTriangle },
  info:    { label: "Info",     badge: "bg-blue-500/15 text-blue-600",     Icon: Info },
};

export default function ValidationDrawer({ open, onClose, onFocusIssue }: ValidationDrawerProps) {
  const { darkMode } = useDarkMode();

  // Live-load the campus data. React Query dedupes with the LeftSidebar
  // queries so no extra network hits. Every queryFn goes through
  // fetchList so 404s can't leak a non-array into the validator.
  const { data: buildings = [] } = useQuery<Building[]>({ queryKey: ["/api/buildings"], queryFn: () => fetchList<Building>("/api/buildings") });
  const { data: rooms = [] } = useQuery<Room[]>({ queryKey: ["/api/rooms"], queryFn: () => fetchList<Room>("/api/rooms") });
  const { data: hallways = [] } = useQuery<Hallway[]>({ queryKey: ["/api/hallways"], queryFn: () => fetchList<Hallway>("/api/hallways") });
  const { data: floors = [] } = useQuery<Floor[]>({ queryKey: ["/api/floors"], queryFn: () => fetchList<Floor>("/api/floors") });
  const { data: doors = [] } = useQuery<Door[]>({ queryKey: ["/api/doors"], queryFn: () => fetchList<Door>("/api/doors") });
  const { data: stairs = [] } = useQuery<Stair[]>({ queryKey: ["/api/stairs"], queryFn: () => fetchList<Stair>("/api/stairs") });
  const { data: elevators = [] } = useQuery<Elevator[]>({ queryKey: ["/api/elevators"], queryFn: () => fetchList<Elevator>("/api/elevators") });

  const result: ValidationResult = useMemo(
    () => validateMap({ buildings, rooms, hallways, floors, doors, stairs, elevators }),
    [buildings, rooms, hallways, floors, doors, stairs, elevators],
  );

  const grouped = useMemo(() => {
    const g: Record<ValidationSeverity, ValidationIssue[]> = { error: [], warning: [], info: [] };
    for (const i of result.issues) g[i.severity].push(i);
    return g;
  }, [result]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Sheet */}
      <aside
        aria-hidden={!open}
        className={cn(
          "fixed z-50 top-0 right-0 h-full w-[min(28rem,95vw)] border-l shadow-2xl flex flex-col transition-transform",
          darkMode ? "bg-gray-900 border-gray-800 text-gray-100" : "bg-white border-gray-200 text-gray-900",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center justify-between px-4 py-3 border-b", darkMode ? "border-gray-800" : "border-gray-200")}>
          <div className="flex items-center gap-2">
            <ShieldCheck className={cn("h-4 w-4", result.publishable ? "text-emerald-500" : "text-red-500")} />
            <p className="text-sm font-semibold">Validation</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn("h-8 w-8 rounded-lg flex items-center justify-center", darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100")}
            aria-label="Close validation panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Summary */}
        <div className={cn("px-4 py-3 border-b flex items-center gap-2", darkMode ? "border-gray-800" : "border-gray-200")}>
          <SummaryPill severity="error"   count={result.errorCount} />
          <SummaryPill severity="warning" count={result.warningCount} />
          <SummaryPill severity="info"    count={result.infoCount} />
          <div className="flex-1" />
          {result.publishable ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Publish ready</span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Publish blocked</span>
          )}
        </div>

        {/* Issues */}
        <div className="flex-1 overflow-y-auto">
          {result.issues.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No issues found.</p>
              <p className="text-xs mt-1 opacity-80">This map is ready to publish.</p>
            </div>
          ) : (
            (["error", "warning", "info"] as ValidationSeverity[]).map((sev) =>
              grouped[sev].length === 0 ? null : (
                <Section key={sev} severity={sev} issues={grouped[sev]} onFocus={onFocusIssue} />
              )
            )
          )}
        </div>
      </aside>
    </>
  );
}

function SummaryPill({ severity, count }: { severity: ValidationSeverity; count: number }) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.Icon;
  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold", meta.badge)}>
      <Icon className="h-3 w-3" />
      {count}
    </div>
  );
}

function Section({
  severity, issues, onFocus,
}: {
  severity: ValidationSeverity;
  issues: ValidationIssue[];
  onFocus: (kind: ValidationEntityKind, id: string) => void;
}) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.Icon;
  return (
    <div>
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5", severity === "error" ? "text-red-500" : severity === "warning" ? "text-yellow-500" : "text-blue-500")} />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {meta.label} · {issues.length}
        </p>
      </div>
      <ul>
        {issues.map((i, idx) => (
          <li key={`${i.code}-${i.entityId}-${idx}`}>
            <button
              type="button"
              onClick={() => i.entityId && onFocus(i.entityKind, i.entityId)}
              disabled={!i.entityId}
              className={cn(
                "w-full text-left px-4 py-2.5 border-t transition-colors",
                "border-gray-200 dark:border-gray-800",
                "hover:bg-muted/60 disabled:cursor-default",
              )}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{i.message}</p>
                  {i.hint && (
                    <p className="text-xs text-muted-foreground mt-0.5">{i.hint}</p>
                  )}
                  <p className="text-[10px] font-mono text-muted-foreground mt-1 opacity-70">
                    {i.entityKind}{i.entityId ? ` · ${i.entityId}` : ""} · {i.code}
                  </p>
                </div>
                {i.entityId && <ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
