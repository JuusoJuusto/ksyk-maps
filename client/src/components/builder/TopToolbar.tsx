/**
 * TopToolbar — Builder top toolbar.
 *
 * Groups the main Builder commands. Each group is a `<Group>` cluster
 * of icon buttons; the parent wires each `onXxx` callback to the real
 * behaviour (mutations, canvas ops, validation panel, ...).
 *
 * State-driven:
 *   - `canUndo`/`canRedo` disable the corresponding buttons.
 *   - `isPublishing` puts the Publish button into a busy state.
 *   - `hasErrors` blocks publish (matches the validator's contract).
 *   - `snapEnabled`/`gridEnabled` show the pressed state on their
 *     toggles.
 */
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";
import {
  Save, Undo2, Redo2, Upload, Download, Grid3x3, Magnet, ZoomIn, ZoomOut,
  RotateCw, Eye, ShieldCheck, Rocket, ChevronLeft,
} from "lucide-react";

export interface TopToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  isPublishing: boolean;
  hasErrors: boolean;
  snapEnabled: boolean;
  gridEnabled: boolean;

  onBack?: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onImport: () => void;
  onExport: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotateCW: () => void;
  onPreview: () => void;
  onValidate: () => void;
  onPublish: () => void;
}

export default function TopToolbar(p: TopToolbarProps) {
  const { darkMode } = useDarkMode();

  return (
    <div
      className={cn(
        "absolute left-0 right-0 top-0 z-30 flex items-center gap-1 px-2 py-1.5",
        "border-b",
        darkMode
          ? "bg-gray-900/95 border-gray-800 text-gray-200 backdrop-blur"
          : "bg-white/95 border-gray-200 text-gray-800 backdrop-blur",
      )}
    >
      {p.onBack && (
        <>
          <IconButton onClick={p.onBack} label="Back to map">
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <Divider />
        </>
      )}

      <IconButton onClick={p.onSave} label="Save (⌘S)">
        <Save className="h-4 w-4" />
      </IconButton>
      <IconButton onClick={p.onUndo} disabled={!p.canUndo} label="Undo (⌘Z)">
        <Undo2 className="h-4 w-4" />
      </IconButton>
      <IconButton onClick={p.onRedo} disabled={!p.canRedo} label="Redo (⌘⇧Z)">
        <Redo2 className="h-4 w-4" />
      </IconButton>

      <Divider />

      <IconButton onClick={p.onImport} label="Import (JSON / GeoJSON)">
        <Upload className="h-4 w-4" />
      </IconButton>
      <IconButton onClick={p.onExport} label="Export">
        <Download className="h-4 w-4" />
      </IconButton>

      <Divider />

      <IconButton
        onClick={p.onToggleGrid}
        pressed={p.gridEnabled}
        label={p.gridEnabled ? "Hide grid" : "Show grid"}
      >
        <Grid3x3 className="h-4 w-4" />
      </IconButton>
      <IconButton
        onClick={p.onToggleSnap}
        pressed={p.snapEnabled}
        label={p.snapEnabled ? "Snap on" : "Snap off"}
      >
        <Magnet className="h-4 w-4" />
      </IconButton>

      <Divider />

      <IconButton onClick={p.onZoomIn} label="Zoom in">
        <ZoomIn className="h-4 w-4" />
      </IconButton>
      <IconButton onClick={p.onZoomOut} label="Zoom out">
        <ZoomOut className="h-4 w-4" />
      </IconButton>
      <IconButton onClick={p.onRotateCW} label="Rotate 30° CW">
        <RotateCw className="h-4 w-4" />
      </IconButton>

      <div className="flex-1" />

      <IconButton onClick={p.onPreview} label="Preview">
        <Eye className="h-4 w-4" />
      </IconButton>
      <IconButton
        onClick={p.onValidate}
        label="Validate"
        className={cn(p.hasErrors && "text-red-600")}
      >
        <ShieldCheck className="h-4 w-4" />
      </IconButton>

      <button
        type="button"
        onClick={p.onPublish}
        disabled={p.isPublishing || p.hasErrors}
        title={p.hasErrors ? "Fix validation errors first" : "Publish"}
        className={cn(
          "ml-2 h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/25",
        )}
      >
        <Rocket className="h-4 w-4" />
        {p.isPublishing ? "Publishing…" : "Publish"}
      </button>
    </div>
  );
}

function IconButton({
  children, onClick, disabled, pressed, label, className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
        pressed && "bg-blue-500/15 text-blue-600",
        !pressed && "hover:bg-gray-100 dark:hover:bg-gray-800",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />;
}
