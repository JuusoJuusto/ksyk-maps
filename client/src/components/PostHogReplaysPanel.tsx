/**
 * PostHogReplaysPanel — v4.7.31
 *
 * Displays PostHog session recordings in the admin analytics dashboard.
 * All API calls are proxied through /api/admin/posthog/* so the PostHog
 * Personal API Key never reaches the browser.
 *
 * For playback we first try to fetch rrweb snapshot events from PostHog
 * and play them with the existing RrwebPlayerModal. If PostHog's snapshot
 * API returns blob-storage sources (not direct events), we fall back to a
 * "Watch in PostHog" external link so the admin can still view the replay.
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchObject } from "@/lib/fetchList";
import {
  Video, Play, ExternalLink, Monitor, Smartphone, AlertCircle,
  Clock, MousePointer2, AlertTriangle, RefreshCw, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RrwebPlayerModal } from "@/components/RrwebReplay";

// ── Types ────────────────────────────────────────────────────────────────────

interface PostHogPerson {
  id: string;
  name: string;
  distinct_ids: string[];
}

export interface PostHogRecording {
  id: string;
  distinct_id: string;
  viewed: boolean;
  recording_duration: number; // seconds
  active_seconds: number;
  start_time: string;
  end_time: string;
  click_count: number;
  keypress_count: number;
  mouse_activity_count: number;
  console_error_count: number;
  console_warn_count: number;
  console_log_count: number;
  start_url: string;
  person?: PostHogPerson;
  snapshot_source: string; // "web" | "mobile"
}

interface PostHogRecordingsList {
  count: number;
  next: string | null;
  previous: string | null;
  results: PostHogRecording[];
}

interface PostHogSnapshotData {
  snapshots?: unknown[];
  sources?: Array<{ source: string; blob_key?: string; start_timestamp?: string; end_timestamp?: string }>;
}

interface UnconfiguredResponse {
  configured: false;
  message: string;
}

type RecordingsResponse = PostHogRecordingsList | UnconfiguredResponse;

function isUnconfigured(r: RecordingsResponse | null): r is UnconfiguredResponse {
  return !!(r && typeof r === "object" && "configured" in r && !(r as any).configured);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  return `${m}m ${rest}s`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function routeLabel(url: string): string {
  try {
    const p = new URL(url).pathname;
    if (p === "/" || p === "") return "Home";
    return p.replace(/^\//, "").replace(/\/$/, "") || "Home";
  } catch { return url.slice(0, 30); }
}

const POSTHOG_BASE = "https://us.posthog.com";
function postHogReplayUrl(sessionId: string): string {
  return `${POSTHOG_BASE}/replay/${encodeURIComponent(sessionId)}`;
}

// ── Recording row ─────────────────────────────────────────────────────────────

function RecordingRow({
  rec,
  onPlay,
  onOpen,
}: {
  rec: PostHogRecording;
  onPlay: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const isWeb = rec.snapshot_source !== "mobile";
  const personLabel = rec.person?.name && rec.person.name !== "Anonymous"
    ? rec.person.name
    : rec.distinct_id.slice(0, 16);

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/60 group">
      <td className="px-3 py-2 text-[11px] font-mono text-blue-600 dark:text-blue-400 truncate max-w-[200px]">
        {rec.id.slice(0, 24)}
      </td>
      <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
        {personLabel}
      </td>
      <td className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {fmtDate(rec.start_time)}
      </td>
      <td className="px-3 py-2 text-[11px] font-mono tabular-nums text-right text-slate-600 dark:text-slate-400 whitespace-nowrap">
        {fmtDuration(rec.recording_duration)}
      </td>
      <td className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px] hidden sm:table-cell">
        {routeLabel(rec.start_url || "")}
      </td>
      <td className="px-3 py-2 text-center hidden md:table-cell">
        {isWeb
          ? <Monitor className="h-3.5 w-3.5 text-slate-400 inline" />
          : <Smartphone className="h-3.5 w-3.5 text-slate-400 inline" />}
      </td>
      <td className="px-3 py-2 text-right text-[11px] font-mono tabular-nums hidden sm:table-cell">
        {rec.console_error_count > 0
          ? <span className="text-red-500 font-semibold">{rec.console_error_count}</span>
          : <span className="text-slate-400">—</span>}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => onPlay(rec.id)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold hover:opacity-90 transition-opacity"
            title="Play in admin panel"
          >
            <Play className="h-3 w-3" />
            Play
          </button>
          <a
            href={postHogReplayUrl(rec.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Watch in PostHog"
            onClick={() => onOpen(rec.id)}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </td>
    </tr>
  );
}

// ── Player wrapper ────────────────────────────────────────────────────────────

function PostHogPlayerModal({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useQuery<PostHogSnapshotData | null>({
    queryKey: ["posthog-snapshots", sessionId],
    queryFn: () => fetchObject<PostHogSnapshotData>(`/api/admin/posthog/recordings/${encodeURIComponent(sessionId)}/snapshots`),
    retry: 1,
  });

  const events = useMemo(() => {
    if (!data) return null;
    if (Array.isArray((data as any).snapshots) && (data as any).snapshots.length > 0) {
      return (data as any).snapshots as unknown[];
    }
    return null;
  }, [data]);

  const hasBlobSources = !!(data?.sources?.some((s) => s.source === "blob" || s.blob_key));

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading snapshot data…</p>
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 mt-2">Cancel</button>
        </div>
      </div>
    );
  }

  if (isError || !data || (!events && !hasBlobSources)) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 max-w-md w-full text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="font-bold text-slate-900 dark:text-white">Snapshot unavailable</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            PostHog didn't return inline snapshot data for this session — it may be stored in blob storage,
            expired, or still processing. Open it directly in PostHog to watch the replay.
          </p>
          <div className="flex gap-2 justify-center">
            <a
              href={postHogReplayUrl(sessionId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              <ExternalLink className="h-4 w-4" /> Watch in PostHog
            </a>
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hasBlobSources && !events) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 max-w-md w-full text-center space-y-4">
          <Video className="h-10 w-10 text-blue-500 mx-auto" />
          <h2 className="font-bold text-slate-900 dark:text-white">Recording stored in PostHog cloud</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This recording is stored in PostHog's object storage. Open it directly in PostHog to watch it in their player.
          </p>
          <div className="flex gap-2 justify-center">
            <a
              href={postHogReplayUrl(sessionId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              <ExternalLink className="h-4 w-4" /> Watch in PostHog
            </a>
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (events && events.length > 0) {
    return <RrwebPlayerModal sessionId={sessionId} onClose={onClose} _preloadedEvents={events} />;
  }

  return null;
}

// ── Main panel ────────────────────────────────────────────────────────────────

type DateRange = "24h" | "7d" | "30d" | "90d";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "24h": "24h",
  "7d":  "7d",
  "30d": "30d",
  "90d": "90d",
};

const LIMIT = 50;

export function PostHogReplaysPanel({ range }: { range: DateRange }) {
  const [offset, setOffset] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const dateFrom = useMemo(() => {
    const now = Date.now();
    const ms = range === "90d" ? 90 : range === "30d" ? 30 : range === "7d" ? 7 : 1;
    return new Date(now - ms * 24 * 3600_000).toISOString();
  }, [range]);

  const query = useQuery<RecordingsResponse | null>({
    queryKey: ["posthog-recordings", range, offset],
    queryFn: () => fetchObject<RecordingsResponse>(
      `/api/admin/posthog/recordings?limit=${LIMIT}&offset=${offset}&date_from=${encodeURIComponent(dateFrom)}`,
    ),
    staleTime: 60_000,
    retry: 1,
  });

  const { data, isLoading, isError, refetch } = query;

  const notConfigured = isUnconfigured(data ?? null);
  const list = (!notConfigured && data && "results" in data) ? (data as PostHogRecordingsList) : null;
  const recordings = list?.results ?? [];
  const totalCount = list?.count ?? 0;
  const hasMore = !!(list?.next);
  const hasPrev = offset > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Video className="h-4 w-4" /> PostHog session recordings
        </CardTitle>
        <CardDescription className="text-xs">
          Real user sessions captured by PostHog — opt-in only (requires analytics consent).
          {list && ` ${totalCount.toLocaleString()} recording${totalCount !== 1 ? "s" : ""} in the ${range} window.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="py-6 flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading session recordings…
          </div>
        )}

        {isError && (
          <div className="py-4 flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Couldn't load recordings</p>
              <button onClick={() => refetch()} className="text-xs mt-1 flex items-center gap-1 hover:underline">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          </div>
        )}

        {notConfigured && (
          <div className="py-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-4 space-y-2">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> PostHog not configured
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Set these environment variables in Vercel → Project Settings → Environment Variables:
            </p>
            <ul className="text-xs font-mono text-amber-800 dark:text-amber-300 space-y-1 list-disc list-inside">
              <li><strong>POSTHOG_PERSONAL_API_KEY</strong> — PostHog → Settings → Personal API Keys → Create key (All access)</li>
              <li><strong>POSTHOG_PROJECT_ID</strong> — The numeric project ID from the PostHog dashboard URL</li>
            </ul>
            <p className="text-[10px] text-amber-700 dark:text-amber-400">
              These are server-side only and never sent to the browser.
            </p>
          </div>
        )}

        {!isLoading && !isError && !notConfigured && recordings.length === 0 && (
          <div className="py-8 text-center space-y-2">
            <Video className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No recordings yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
              PostHog records sessions from users who have accepted analytics cookies.
              Sessions appear here once they complete and are processed by PostHog (usually within a few minutes).
            </p>
          </div>
        )}

        {recordings.length > 0 && (
          <>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left px-3 py-1.5">Session</th>
                    <th className="text-left px-3 py-1.5">Person</th>
                    <th className="text-left px-3 py-1.5">Started</th>
                    <th className="text-right px-3 py-1.5">Duration</th>
                    <th className="text-left px-3 py-1.5 hidden sm:table-cell">Start URL</th>
                    <th className="text-center px-3 py-1.5 hidden md:table-cell">Platform</th>
                    <th className="text-right px-3 py-1.5 hidden sm:table-cell">Errors</th>
                    <th className="w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recordings.map((rec) => (
                    <RecordingRow
                      key={rec.id}
                      rec={rec}
                      onPlay={setPlayingId}
                      onOpen={() => {}}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-500 tabular-nums">
                {offset + 1}–{Math.min(offset + LIMIT, totalCount)} of {totalCount.toLocaleString()}
              </p>
              <div className="flex gap-1">
                <button
                  disabled={!hasPrev}
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={!hasMore}
                  onClick={() => setOffset(offset + LIMIT)}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {playingId && (
        <PostHogPlayerModal
          sessionId={playingId}
          onClose={() => setPlayingId(null)}
        />
      )}
    </Card>
  );
}
