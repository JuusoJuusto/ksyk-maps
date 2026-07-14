/**
 * KSYK Maps Builder — tool palette.
 *
 * Groups tools into three semantic clusters: Draw (Building/Room/Hallway/Wall),
 * Edit (Select/Delete), and View (Pan/Fit-to-campus). One tool is active at a
 * time (radio semantics); Delete and Fit-to-campus fire as one-shot actions
 * instead of setting the tool state.
 *
 * The component is presentation-only — the parent owns the `activeTool`
 * state so keyboard shortcuts and the map itself can flip it too.
 */
import {
  Building2,
  DoorOpen,
  Route,
  Minus,
  MousePointer2,
  Trash2,
  Hand,
  Maximize,
  PenTool,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BuilderTool =
  | "select"
  | "pan"
  | "building"
  | "polygon"
  | "room"
  | "hallway"
  | "wall";

interface BuilderToolbarProps {
  activeTool: BuilderTool;
  onToolChange: (t: BuilderTool) => void;
  onDelete: () => void;
  onFitCampus: () => void;
  hasSelection: boolean;
}

interface ToolMeta {
  id: BuilderTool;
  label: string;
  hint: string;
  Icon: typeof Building2;
  hotkey: string;
}

const DRAW_TOOLS: ToolMeta[] = [
  { id: "building", label: "Building", hint: "Drag to draw a rectangular building", Icon: Building2, hotkey: "B" },
  { id: "polygon",  label: "Polygon",  hint: "Click corners, Enter to finish (arbitrary shape)", Icon: PenTool, hotkey: "G" },
  { id: "room",     label: "Room",     hint: "Drag inside a building to draw a room", Icon: DoorOpen, hotkey: "R" },
  { id: "hallway",  label: "Hallway",  hint: "Click waypoints, Enter to finish", Icon: Route, hotkey: "H" },
  { id: "wall",     label: "Wall",     hint: "Click two points to draw a wall", Icon: Minus, hotkey: "W" },
];

const EDIT_TOOLS: ToolMeta[] = [
  { id: "select", label: "Select", hint: "Click a shape to edit or move it", Icon: MousePointer2, hotkey: "V" },
  { id: "pan",    label: "Pan",    hint: "Drag the map without selecting",   Icon: Hand,          hotkey: "Space" },
];

export default function BuilderToolbar({
  activeTool,
  onToolChange,
  onDelete,
  onFitCampus,
  hasSelection,
}: BuilderToolbarProps) {
  return (
    <div className="space-y-4">
      <ToolGroup label="Draw">
        <div className="grid grid-cols-2 gap-1.5">
          {DRAW_TOOLS.map((t) => (
            <ToolButton
              key={t.id}
              meta={t}
              active={activeTool === t.id}
              onClick={() => onToolChange(t.id)}
            />
          ))}
        </div>
      </ToolGroup>

      <ToolGroup label="Edit">
        <div className="grid grid-cols-2 gap-1.5">
          {EDIT_TOOLS.map((t) => (
            <ToolButton
              key={t.id}
              meta={t}
              active={activeTool === t.id}
              onClick={() => onToolChange(t.id)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={!hasSelection}
          className={cn(
            "mt-1.5 w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]",
            hasSelection
              ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 ring-1 ring-red-500/20 hover:bg-red-100 dark:hover:bg-red-950/60"
              : "bg-muted/50 text-muted-foreground/60 ring-1 ring-transparent cursor-not-allowed"
          )}
          title={hasSelection ? "Delete selected shape (Del)" : "Select something to delete"}
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
          Delete selected
        </button>
      </ToolGroup>

      <ToolGroup label="View">
        <button
          type="button"
          onClick={onFitCampus}
          className="w-full h-11 rounded-xl bg-card ring-1 ring-border text-sm font-semibold text-foreground hover:bg-muted transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
          title="Fly the map to the campus centre"
        >
          <Maximize className="h-4 w-4" strokeWidth={2} />
          Fit to campus
        </button>
      </ToolGroup>
    </div>
  );
}

function ToolGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground px-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function ToolButton({
  meta,
  active,
  onClick,
}: {
  meta: ToolMeta;
  active: boolean;
  onClick: () => void;
}) {
  const { Icon, label, hint, hotkey } = meta;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${hint} — ${hotkey}`}
      className={cn(
        "group relative h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.98] ring-1",
        active
          ? "bg-blue-600 text-white ring-blue-600 shadow-sm shadow-blue-600/25"
          : "bg-card text-foreground ring-border hover:bg-muted hover:ring-border"
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      <span className="text-[11px] font-semibold leading-none">{label}</span>
      <span
        className={cn(
          "absolute top-1 right-1.5 text-[9px] font-mono font-bold leading-none tabular-nums",
          active ? "text-white/70" : "text-muted-foreground/50"
        )}
      >
        {hotkey}
      </span>
    </button>
  );
}
