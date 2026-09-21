/**
 * ErrorRetry — small standard error-recovery block for admin fetches.
 *
 * Design goals per the admin rework spec:
 *   - Show something honest ("Couldn't load X"), not "Something happened".
 *   - Provide a real retry action that re-runs the failed query.
 *   - Announce via aria-live so screen readers pick up the failure.
 *   - No huge illustration, no bordered card — inline, contained.
 *
 * Callers pass the react-query mutation/query result directly. When
 * `isError` is true, this renders; otherwise nothing. This lets pages
 * do:
 *
 *   <ErrorRetry query={rows} label="logs" />
 *   {rows.data && <Table rows={rows.data} />}
 *
 * without wrapping every panel in explicit ternaries.
 */
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** react-query result (or minimal duck-typed subset). */
  query: {
    isError: boolean;
    error?: unknown;
    refetch?: () => Promise<unknown>;
  };
  /** Human name of what failed to load — "logs", "sessions", "events". */
  label: string;
  /** Compact one-line variant, no border. Use when embedding in a
   *  table cell or a tight surface. */
  compact?: boolean;
  className?: string;
}

export default function ErrorRetry({ query, label, compact = false, className }: Props) {
  if (!query.isError) return null;
  const msg =
    (query.error instanceof Error && query.error.message)
      ? query.error.message
      : null;

  if (compact) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className={cn(
          "flex items-center gap-2 py-2 px-3 text-[12px]",
          "text-red-700 dark:text-red-300",
          className,
        )}
      >
        <span className="flex-1 truncate">
          Couldn't load {label}
          {msg ? <> · <span className="opacity-70 font-mono">{msg}</span></> : null}
        </span>
        {query.refetch && (
          <button
            type="button"
            onClick={() => void query.refetch!()}
            className={cn(
              "inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-semibold transition-all",
              "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
              "hover:bg-red-200 dark:hover:bg-red-950/70",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1",
            )}
          >
            <RefreshCw className="h-3 w-3" strokeWidth={2.25} /> Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20",
        "p-4 flex items-start gap-3",
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-900 dark:text-red-100">
          Couldn't load {label}
        </p>
        <p className="text-xs text-red-700/80 dark:text-red-300/80 mt-0.5">
          Something went wrong while loading this section. It's usually a temporary issue.
        </p>
        {msg && (
          <p className="mt-2 text-[11px] font-mono text-red-700/70 dark:text-red-300/70 break-all">
            {msg}
          </p>
        )}
      </div>
      {query.refetch && (
        <button
          type="button"
          onClick={() => void query.refetch!()}
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold shrink-0 transition-all",
            "bg-red-600 text-white shadow-sm shadow-red-600/25",
            "hover:bg-red-700 hover:shadow-md hover:shadow-red-700/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2",
            "active:scale-[0.98]",
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.25} /> Try again
        </button>
      )}
    </div>
  );
}
