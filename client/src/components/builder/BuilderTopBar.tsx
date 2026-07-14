/**
 * KSYK Maps Builder — top bar.
 *
 * Mirrors the AdminDashboard top bar chrome (h-14, bg-card border-b) so the
 * Builder route feels like an extension of the admin workspace. Shows the
 * brand mark, a live "save-state" pill that reflects React Query mutation
 * activity, and a big blue Publish button which flushes the map defaults
 * to the server via `saveMapDefaultsToServer`.
 *
 * Design tokens are lifted straight from the app style guide — bg-card,
 * border-border, shadow-sm, KSYK blue (#2563eb / blue-600), 44px inputs,
 * active:scale-[0.98] on primary CTAs.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Check, ChevronLeft, CloudUpload, Loader2, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSettings, saveMapDefaultsToServer } from "@/hooks/useAppSettings";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface BuilderTopBarProps {
  /** Aggregate save-state across all builder mutations (buildings/rooms/hallways). */
  saveState: SaveState;
  /** Optional error message shown next to the save pill. */
  saveError?: string | null;
  /** Fires after a successful publish so the parent can invalidate queries. */
  onPublished?: () => void;
}

export default function BuilderTopBar({ saveState, saveError, onPublished }: BuilderTopBarProps) {
  const [, setLocation] = useLocation();
  const { settings } = useAppSettings();
  const [publishState, setPublishState] = useState<SaveState>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);

  const handlePublish = async () => {
    setPublishState("saving");
    setPublishError(null);
    try {
      await saveMapDefaultsToServer(settings);
      setPublishState("saved");
      onPublished?.();
      setTimeout(() => setPublishState("idle"), 2400);
    } catch (e: any) {
      setPublishError(e?.message || "Publish failed");
      setPublishState("error");
      setTimeout(() => setPublishState("idle"), 3200);
    }
  };

  return (
    <header className="h-14 shrink-0 bg-card border-b border-border shadow-sm flex items-center px-3 sm:px-4 gap-2 sm:gap-3 z-40 relative">
      {/* Back to admin */}
      <button
        type="button"
        onClick={() => setLocation("/admin")}
        className="h-10 w-10 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-[0.98]"
        aria-label="Back to admin dashboard"
        title="Back to admin dashboard"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2} />
      </button>

      {/* Brand + label */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/25 shrink-0">
          <MapPin className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400 leading-none">
            KSYK Maps
          </div>
          <div className="text-sm font-bold tracking-tight text-foreground leading-tight truncate">
            Campus builder
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save state pill — shows whichever mutation is active or last completed */}
      <SaveStatePill state={saveState} error={saveError} />

      {/* Publish CTA — flushes map defaults to server (visible to all users) */}
      <button
        type="button"
        onClick={handlePublish}
        disabled={publishState === "saving"}
        className={cn(
          "h-10 px-3 sm:px-4 rounded-xl text-sm font-semibold text-white shadow-sm active:scale-[0.98] transition-all flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-wait",
          publishState === "saved"
            ? "bg-emerald-600 shadow-emerald-600/25"
            : publishState === "error"
            ? "bg-red-600 shadow-red-600/25"
            : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25"
        )}
        title={publishError ?? "Publish map defaults for every user"}
      >
        {publishState === "saving" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : publishState === "saved" ? (
          <Check className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <CloudUpload className="h-4 w-4" strokeWidth={2.2} />
        )}
        <span className="hidden sm:inline">
          {publishState === "saving"
            ? "Publishing…"
            : publishState === "saved"
            ? "Published"
            : publishState === "error"
            ? "Retry publish"
            : "Publish"}
        </span>
      </button>
    </header>
  );
}

function SaveStatePill({ state, error }: { state: SaveState; error?: string | null }) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "saved"
      ? "Saved"
      : state === "error"
      ? "Save failed"
      : "All changes saved";

  const icon =
    state === "saving" ? (
      <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
    ) : state === "error" ? (
      <span className="h-2 w-2 rounded-full bg-red-500" />
    ) : (
      <Check className="h-3 w-3" strokeWidth={2.5} />
    );

  return (
    <div
      className={cn(
        "hidden md:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full text-[11px] font-semibold ring-1 transition-colors",
        state === "saving"
          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-blue-500/20"
          : state === "error"
          ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-red-500/20"
          : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20"
      )}
      title={error ?? undefined}
      aria-live="polite"
    >
      {icon}
      {label}
    </div>
  );
}

// Kept unused import stubbed to silence tree-shaking noise in dev.
void Sparkles;
