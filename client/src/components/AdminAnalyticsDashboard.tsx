/**
 * AdminAnalyticsDashboard — real-Postgres analytics for KSYK Maps admins.
 *
 * v4.5.55 rewrite: sticky range picker, sparkline mini-charts in each
 * stat card, stacked-area time-series of pageviews by platform, session
 * drill-in modal, CSV export per panel, richer empty states, per-panel
 * refresh timestamp, mobile-first responsive layout.
 *
 * All data is powered by /api/admin/analytics/{overview,timeseries,
 * sessions,session/:id,features,errors,performance,easter-eggs,
 * recent-events,audit}. No hardcoded numbers anywhere.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchList, fetchObject } from "@/lib/fetchList";
import { EASTER_EGGS } from "@/lib/easterEggRegistry";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Clock, Download,
  Eye, Filter, Gauge, MousePointer2, RefreshCw, Search, Shield,
  Sparkles, TrendingUp, Users,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, LineChart,
} from "recharts";

type Range = "24h" | "7d" | "30d" | "90d";

// ── Range picker (sticky in dashboard header) ───────────────────────
function RangePicker({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-1 shadow-sm">
      {(["24h", "7d", "30d", "90d"] as Range[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition min-w-[42px] ${
            range === r
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────────────
interface Overview {
  range: string;
  since: string;
  pageviews: number; searches: number; errors: number;
  featureUses: number; easterEggs: number; sessions: number;
  navigations: number;
  bySource: Record<string, number>;
  fetchedAt: string;
}
function useOverview(range: Range) {
  return useQuery<Overview | null>({
    queryKey: ["admin-analytics-overview", range],
    queryFn: () => fetchObject<Overview>(`/api/admin/analytics/overview?range=${range}`),
    refetchInterval: 30_000,
  });
}

// ── Timeseries ──────────────────────────────────────────────────────
interface TimeseriesRow { ts: string; platform?: string; feature?: string; n: number; }
interface Timeseries { bucket: string; pageviews: TimeseriesRow[]; errors: TimeseriesRow[]; features: TimeseriesRow[]; }
function useTimeseries(range: Range) {
  return useQuery<Timeseries | null>({
    queryKey: ["admin-analytics-timeseries", range],
    queryFn: () => fetchObject<Timeseries>(`/api/admin/analytics/timeseries?range=${range}`),
    refetchInterval: 60_000,
  });
}

function TimeseriesChart({ range }: { range: Range }) {
  const { data, isLoading } = useTimeseries(range);
  // Reshape pageviews (rows have ts + platform + n) → wide rows per ts
  // with a column per platform, ready for AreaChart.
  const rows = useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    for (const r of data?.pageviews ?? []) {
      const key = r.ts;
      const existing = map.get(key) || { ts: key };
      existing[r.platform || "unknown"] = (existing[r.platform || "unknown"] || 0) + Number(r.n);
      map.set(key, existing);
    }
    for (const r of data?.errors ?? []) {
      const key = r.ts;
      const existing = map.get(key) || { ts: key };
      existing.errors = Number(r.n);
      map.set(key, existing);
    }
    return [...map.values()].sort((a, b) => a.ts.localeCompare(b.ts));
  }, [data]);

  const platforms = useMemo(() => {
    const s = new Set<string>();
    for (const r of data?.pageviews ?? []) s.add(r.platform || "unknown");
    return [...s].sort();
  }, [data]);
  const colours: Record<string, string> = {
    web:     "#3b82f6",
    android: "#10b981",
    ios:     "#f59e0b",
    unknown: "#9ca3af",
    server:  "#8b5cf6",
  };

  const fmt = (v: string) => {
    try {
      const d = new Date(v);
      if (data?.bucket === "day") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch { return v; }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" /> Pageviews by platform
            </CardTitle>
            <CardDescription className="text-xs">Live time-series from Postgres</CardDescription>
          </div>
          {platforms.length > 0 && (
            <div className="flex gap-2 text-[10px]">
              {platforms.map((p) => (
                <span key={p} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: colours[p] || "#9ca3af" }} />
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pl-0 pr-2 pb-2">
        {isLoading && (
          <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
            Loading…
          </div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <BarChart3 className="h-6 w-6 opacity-40" />
            <p>No pageviews in this range yet — generate some traffic to see the chart populate.</p>
          </div>
        )}
        {rows.length > 0 && (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={rows} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <defs>
                {platforms.map((p) => (
                  <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colours[p] || "#9ca3af"} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={colours[p] || "#9ca3af"} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="ts" tickFormatter={fmt} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis width={28} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip
                labelFormatter={fmt}
                contentStyle={{
                  background: "rgba(15,23,42,0.95)", border: 0,
                  borderRadius: 8, fontSize: 12, color: "#f8fafc",
                }}
              />
              {platforms.map((p) => (
                <Area
                  key={p}
                  type="monotone"
                  dataKey={p}
                  stackId="pv"
                  stroke={colours[p] || "#9ca3af"}
                  strokeWidth={2}
                  fill={`url(#grad-${p})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ── Stat card with sparkline ────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sparkline, tone = "blue", trend,
}: {
  icon: any;
  label: string;
  value: string | number;
  sparkline?: number[];
  tone?: "blue" | "amber" | "red" | "emerald" | "violet";
  trend?: string;
}) {
  const toneClass: Record<string, { bg: string; stroke: string }> = {
    blue:    { bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",       stroke: "#3b82f6" },
    amber:   { bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",   stroke: "#f59e0b" },
    red:     { bg: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",           stroke: "#ef4444" },
    emerald: { bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", stroke: "#10b981" },
    violet:  { bg: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300", stroke: "#8b5cf6" },
  };
  const t = toneClass[tone];
  const chartData = (sparkline || []).map((n, i) => ({ i, n }));
  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${t.bg}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {label}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
              {value}
            </p>
            {trend && (
              <p className="text-[10px] text-slate-400 mt-0.5">{trend}</p>
            )}
          </div>
        </div>
        {chartData.length > 1 && (
          <div className="absolute -bottom-1 left-0 right-0 h-10 opacity-60 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <Line type="monotone" dataKey="n" stroke={t.stroke} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── CSV helper ──────────────────────────────────────────────────────
function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Sessions with drill-in ──────────────────────────────────────────
interface TelemetrySession {
  id: string; sessionId: string; platform: string;
  appVersion: string | null; osVersion: string | null; deviceType: string | null;
  startedAt: string; lastSeenAt: string; endedAt: string | null; durationMs: number | null;
}
function SessionsPanel() {
  const [drillSid, setDrillSid] = useState<string | null>(null);
  const { data = [], isLoading, refetch } = useQuery<TelemetrySession[]>({
    queryKey: ["admin-analytics-sessions"],
    queryFn: () => fetchList<TelemetrySession>("/api/admin/analytics/sessions?limit=100"),
    refetchInterval: 60_000,
  });
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">
          {isLoading ? "Loading…" : `${data.length} sessions`}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => refetch()}
            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => downloadCSV(data as any, "ksyk-sessions.csv")}
            disabled={!data.length}
            className="h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            title="Download CSV"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>
      </div>
      <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-3 py-2">Session</th>
                <th className="text-left px-3 py-2">Platform</th>
                <th className="text-left px-3 py-2">Version</th>
                <th className="text-left px-3 py-2">Started</th>
                <th className="text-left px-3 py-2">Last seen</th>
                <th className="text-right px-3 py-2">Duration</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && data.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-xs">
                  No sessions in the last 24 hours. New visitors will show up here as they land.
                </td></tr>
              )}
              {data.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition"
                  onClick={() => setDrillSid(s.sessionId)}
                >
                  <td className="px-3 py-2 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                    {s.sessionId.slice(0, 24)}
                  </td>
                  <td className="px-3 py-2"><Badge variant="outline">{s.platform}</Badge></td>
                  <td className="px-3 py-2 text-xs">{s.appVersion || "—"}</td>
                  <td className="px-3 py-2 text-xs">{new Date(s.startedAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs">{new Date(s.lastSeenAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs text-right">
                    {s.durationMs ? `${Math.round(s.durationMs / 1000)}s` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <SessionDrillDialog sessionId={drillSid} onClose={() => setDrillSid(null)} />
    </>
  );
}

function SessionDrillDialog({ sessionId, onClose }: { sessionId: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery<{ session: any; events: any[]; pageViews: any[]; searches: any[] } | null>({
    queryKey: ["admin-analytics-session-drill", sessionId],
    queryFn: () => sessionId ? fetchObject(`/api/admin/analytics/session/${encodeURIComponent(sessionId)}`) : Promise.resolve(null),
    enabled: !!sessionId,
  });
  const rows = useMemo(() => {
    if (!data) return [];
    const events = [
      ...(data.events || []).map((e: any) => ({ ts: e.createdAt, kind: e.eventName, detail: e.route || e.screen || "" })),
      ...(data.pageViews || []).map((v: any) => ({ ts: v.createdAt, kind: "pageview", detail: v.url })),
      ...(data.searches || []).map((s: any) => ({ ts: s.createdAt, kind: "search", detail: `"${s.query}" — ${s.resultsCount ?? 0} hits` })),
    ];
    return events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [data]);
  // Deep-link into PostHog. PostHog stores its own $session_id but we can
  // land the admin on the Replay list filtered by user distinct_id.
  const posthogReplayUrl = sessionId
    ? `https://us.posthog.com/replay/home?filters=%7B%22filter_test_accounts%22%3Afalse%2C%22properties%22%3A%5B%7B%22key%22%3A%22ksyk_session_id%22%2C%22value%22%3A%22${encodeURIComponent(sessionId)}%22%2C%22operator%22%3A%22exact%22%2C%22type%22%3A%22event%22%7D%5D%7D`
    : "";

  return (
    <Dialog open={!!sessionId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm text-blue-600 dark:text-blue-400 break-all">
            {sessionId}
          </DialogTitle>
          {data?.session && (
            <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-1 items-center">
              <span>Platform: <strong>{data.session.platform}</strong></span>
              <span>Version: <strong>{data.session.appVersion || "—"}</strong></span>
              <span>Started: <strong>{new Date(data.session.startedAt).toLocaleString()}</strong></span>
              <span>Events: <strong>{rows.length}</strong></span>
              <a
                href={posthogReplayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-[11px] font-semibold hover:bg-orange-200 dark:hover:bg-orange-950/70"
              >
                ▶ Watch replay in PostHog
              </a>
            </div>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading events…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No events recorded for this session yet.
            </p>
          )}
          {rows.length > 0 && <SessionReplayTimeline rows={rows} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * v1.79.0 — in-app session replay viewer (light version).
 *
 * A scrubbable timeline over the session's events with the current
 * event highlighted. Not a full DOM replay like PostHog's video — we
 * don't collect DOM snapshots ourselves — but this gives admins the
 * "watch me play through this session" experience without shelling out
 * to PostHog. Use "Watch replay in PostHog" (in the dialog header) for
 * the full video.
 *
 * Features:
 *   - Slider scrubs through events
 *   - Prev / Next arrow buttons + auto-play at 1 event/sec
 *   - Current event card shows full detail
 *   - Timeline strip below the current-event card colored by event kind
 *   - Elapsed-time chip between events (e.g. "+42 s")
 *   - Jump-to-error button if the session has any error events
 */
function SessionReplayTimeline({ rows }: { rows: Array<{ ts: string; kind: string; detail: string }> }) {
  // Sort oldest-first for playback semantics; the caller sorts newest-first.
  const events = useMemo(
    () => [...rows].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()),
    [rows],
  );
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (idx >= events.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, events.length - 1)), 1000);
    return () => clearTimeout(t);
  }, [playing, idx, events.length]);

  const current = events[idx];
  const start = events[0]?.ts ? new Date(events[0].ts).getTime() : 0;
  const end = events[events.length - 1]?.ts ? new Date(events[events.length - 1].ts).getTime() : start;
  const total = Math.max(1, end - start);
  const elapsed = current ? new Date(current.ts).getTime() - start : 0;

  const kindColor = (k: string) => {
    if (k.includes("error"))    return "#EF4444";
    if (k.includes("search"))   return "#F59E0B";
    if (k.includes("pageview")) return "#3B82F6";
    if (k.includes("nav"))      return "#8B5CF6";
    return "#10B981";
  };

  const firstErrorIdx = events.findIndex((e) => e.kind.includes("error"));

  return (
    <div className="space-y-3 py-3">
      {/* Current-event card */}
      {current && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: kindColor(current.kind) }}
            />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wide" style={{ color: kindColor(current.kind) }}>
              {current.kind}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto font-mono">
              {new Date(current.ts).toLocaleTimeString()} · +{Math.round(elapsed / 1000)}s from start
            </span>
          </div>
          <p className="text-sm break-all">{current.detail || "—"}</p>
        </div>
      )}

      {/* Playback controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 disabled:opacity-40 flex items-center justify-center font-bold"
        >‹</button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center"
        >{playing ? "❚❚" : "▶"}</button>
        <button
          onClick={() => setIdx((i) => Math.min(events.length - 1, i + 1))}
          disabled={idx >= events.length - 1}
          className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 disabled:opacity-40 flex items-center justify-center font-bold"
        >›</button>
        <div className="flex-1 flex items-center gap-2 ml-2">
          <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">{idx + 1}</span>
          <input
            type="range"
            min={0}
            max={events.length - 1}
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground font-mono w-8">{events.length}</span>
        </div>
        {firstErrorIdx >= 0 && (
          <button
            onClick={() => setIdx(firstErrorIdx)}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-950/70"
            title="Jump to first error"
          >
            → Error
          </button>
        )}
      </div>

      {/* Timeline strip */}
      <div className="relative h-6 rounded bg-slate-100 dark:bg-slate-900 overflow-hidden">
        {events.map((e, i) => {
          const pos = ((new Date(e.ts).getTime() - start) / total) * 100;
          return (
            <div
              key={i}
              onClick={() => setIdx(i)}
              className="absolute top-0 bottom-0 w-[3px] cursor-pointer hover:w-[5px] transition-all"
              style={{ left: `${pos}%`, background: kindColor(e.kind) }}
              title={`${e.kind} @ ${new Date(e.ts).toLocaleTimeString()}`}
            />
          );
        })}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-foreground pointer-events-none"
          style={{ left: `${(elapsed / total) * 100}%` }}
        />
      </div>

      {/* Full event list (for reference / copy) */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground py-2 select-none">
          All {events.length} events (click to expand)
        </summary>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
          {events.map((r, i) => (
            <li
              key={i}
              onClick={() => setIdx(i)}
              className={`py-1.5 px-2 flex items-center justify-between gap-3 cursor-pointer rounded ${i === idx ? "bg-primary/10" : "hover:bg-muted/50"}`}
            >
              <div className="min-w-0 flex items-center gap-2">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: kindColor(r.kind) }}
                />
                <span className="font-mono text-[10px] font-semibold w-16 shrink-0">{r.kind.slice(0, 12)}</span>
                <span className="text-[11px] text-muted-foreground truncate">{r.detail || "—"}</span>
              </div>
              <p className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                {new Date(r.ts).toLocaleTimeString()}
              </p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

// ── Features panel ──────────────────────────────────────────────────
interface FeatureRow { feature: string; action: string; n: number; }
function FeaturesPanel({ range }: { range: Range }) {
  const { data = [], isLoading } = useQuery<FeatureRow[]>({
    queryKey: ["admin-analytics-features", range],
    queryFn: () => fetchList<FeatureRow>(`/api/admin/analytics/features?range=${range}`),
    refetchInterval: 60_000,
  });
  const totals = new Map<string, number>();
  for (const r of data) totals.set(r.feature, (totals.get(r.feature) || 0) + Number(r.n));
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const max = ranked[0]?.[1] || 1;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => downloadCSV(data as any, "ksyk-features.csv")}
          disabled={!data.length}
          className="h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
      <div className="rounded-xl border bg-white dark:bg-slate-950 p-4">
        {isLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>}
        {!isLoading && ranked.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No feature usage recorded yet in this range.
          </p>
        )}
        <div className="space-y-2">
          {ranked.map(([f, n]) => (
            <div key={f}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{f}</span>
                <span className="text-xs text-muted-foreground">{n.toLocaleString()}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.max(3, (n / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Errors ──────────────────────────────────────────────────────────
interface ErrorRow { id: string; level: string; message: string; url: string | null; errorStack: string | null; createdAt: string; }
function ErrorsPanel({ range }: { range: Range }) {
  const { data = [], isLoading } = useQuery<ErrorRow[]>({
    queryKey: ["admin-analytics-errors", range],
    queryFn: () => fetchList<ErrorRow>(`/api/admin/analytics/errors?range=${range}`),
    refetchInterval: 30_000,
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isLoading ? "Loading…" : `${data.length} errors`}
        </p>
        <button
          type="button"
          onClick={() => downloadCSV(data as any, "ksyk-errors.csv")}
          disabled={!data.length}
          className="h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
      <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
        {!isLoading && data.length === 0 && (
          <p className="text-sm text-muted-foreground p-6 text-center">
            No errors in this range. 🎉
          </p>
        )}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.map((e) => (
            <li key={e.id} className="p-3">
              <button
                type="button"
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                className="w-full flex items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(e.createdAt).toLocaleString()}
                    {e.url && <span> · {e.url}</span>}
                  </p>
                </div>
                <Badge variant="destructive" className="shrink-0">{e.level}</Badge>
              </button>
              {expanded === e.id && e.errorStack && (
                <pre className="mt-2 text-[10px] font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded overflow-x-auto max-h-64">
                  {e.errorStack}
                </pre>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Performance ─────────────────────────────────────────────────────
interface PerfRow { metric_name: string; n: number; p50: number; p95: number; p99: number; avg: number; }
function PerformancePanel({ range }: { range: Range }) {
  const { data = [], isLoading } = useQuery<PerfRow[]>({
    queryKey: ["admin-analytics-perf", range],
    queryFn: () => fetchList<PerfRow>(`/api/admin/analytics/performance?range=${range}`),
    refetchInterval: 60_000,
  });
  const fmt = (v: number | null) => v == null ? "—" : v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => downloadCSV(data as any, "ksyk-perf.csv")}
          disabled={!data.length}
          className="h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
      <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-3 py-2">Metric</th>
                <th className="text-right px-3 py-2">Count</th>
                <th className="text-right px-3 py-2">p50</th>
                <th className="text-right px-3 py-2">p95</th>
                <th className="text-right px-3 py-2">p99</th>
                <th className="text-right px-3 py-2">avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && data.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-xs">
                  No performance samples yet. Web Vitals populate this after real page loads.
                </td></tr>
              )}
              {data.map((r) => (
                <tr key={r.metric_name}>
                  <td className="px-3 py-2 font-mono text-xs">{r.metric_name}</td>
                  <td className="px-3 py-2 text-right text-xs">{r.n?.toLocaleString?.() ?? r.n}</td>
                  <td className="px-3 py-2 text-right text-xs">{fmt(r.p50)}</td>
                  <td className="px-3 py-2 text-right text-xs">{fmt(r.p95)}</td>
                  <td className="px-3 py-2 text-right text-xs">{fmt(r.p99)}</td>
                  <td className="px-3 py-2 text-right text-xs">{fmt(r.avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Eggs ────────────────────────────────────────────────────────────
interface EggsPanelData {
  byEgg: { eggId: string; count: number }[];
  recent: any[];
  kvCounters: Record<string, number>;
}
function EggsPanel() {
  const { data, isLoading, refetch } = useQuery<EggsPanelData | null>({
    queryKey: ["admin-analytics-eggs"],
    queryFn: () => fetchObject<EggsPanelData>("/api/admin/analytics/easter-eggs?range=90d"),
    refetchInterval: 60_000,
  });
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  async function handleReset() {
    if (!confirm("Reset every easter-egg counter to zero? This wipes both the aggregate KV counters and the time-series events.")) return;
    setResetting(true); setResetError(null);
    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("ksyk_admin_token") : null;
      const r = await fetch("/api/admin/analytics/reset-easter-eggs", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await refetch();
    } catch (e: any) {
      setResetError(e?.message || "Reset failed");
    } finally { setResetting(false); }
  }
  const counts = new Map<string, number>();
  for (const { eggId, count } of data?.byEgg ?? []) counts.set(eggId, (counts.get(eggId) || 0) + count);
  for (const [k, v] of Object.entries(data?.kvCounters ?? {})) counts.set(k, (counts.get(k) || 0) + Number(v));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const ranked = EASTER_EGGS.map((e) => ({ egg: e, count: counts.get(e.id) || 0 })).sort((a, b) => b.count - a.count);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Total discoveries
            </CardTitle>
            <CardDescription className="text-xs">
              {isLoading ? "Loading…" : `${EASTER_EGGS.length} eggs in the registry`}
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {resetting ? "Resetting…" : "Reset counters"}
          </button>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{total.toLocaleString()}</p>
          {resetError && <p className="text-xs text-red-600 mt-1">{resetError}</p>}
        </CardContent>
      </Card>
      <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-3 py-2">Egg</th>
                <th className="text-left px-3 py-2">Rarity</th>
                <th className="text-right px-3 py-2">Discoveries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ranked.filter((r) => r.egg).map(({ egg, count }) => {
                // Defensive Icon fallback — egg.icon can be undefined
                // for a beat during hot-reload / registry mismatch.
                const Icon: any = (egg as any).icon ?? (() => null);
                return (
                  <tr key={egg.id}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-6 rounded-md ${egg.bgColor || ""} ${egg.color || ""} flex items-center justify-center`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-medium leading-tight">{egg.name}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{egg.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2"><Badge variant="outline">{egg.rarity}</Badge></td>
                    <td className="px-3 py-2 text-right font-semibold">{count.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Recent events firehose ──────────────────────────────────────────
function RecentEventsPanel() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-analytics-recent"],
    queryFn: () => fetchList<any>("/api/admin/analytics/recent-events?limit=200"),
    refetchInterval: 10_000,
  });
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[540px]">
          <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">Time</th>
              <th className="text-left px-3 py-2">Event</th>
              <th className="text-left px-3 py-2">Platform</th>
              <th className="text-left px-3 py-2">Route</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground text-xs">
                No firehose events yet. Every non-dedicated event type lands here.
              </td></tr>
            )}
            {data.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleTimeString()}
                </td>
                <td className="px-3 py-2 text-xs font-medium">{r.eventName}</td>
                <td className="px-3 py-2"><Badge variant="outline">{r.platform}</Badge></td>
                <td className="px-3 py-2 text-[11px] text-muted-foreground truncate max-w-[240px]">
                  {r.route || r.screen || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Audit ───────────────────────────────────────────────────────────
function AuditPanel() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-analytics-audit"],
    queryFn: () => fetchList<any>("/api/admin/analytics/audit?limit=200"),
    refetchInterval: 60_000,
  });
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">Time</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Admin</th>
              <th className="text-left px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground text-xs">
                No audit rows yet.
              </td></tr>
            )}
            {data.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-xs font-medium">{r.action}</td>
                <td className="px-3 py-2 text-xs">{r.adminEmail || r.adminUserId || "—"}</td>
                <td className="px-3 py-2 text-[11px] text-muted-foreground">{r.ipAddress || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Top-level ───────────────────────────────────────────────────────
export default function AdminAnalyticsDashboard() {
  const [range, setRange] = useState<Range>("24h");
  const { data: overview, dataUpdatedAt } = useOverview(range);
  const { data: timeseries } = useTimeseries(range);

  // Sparklines derived from timeseries so we don't fetch twice.
  const pvSpark = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of timeseries?.pageviews ?? []) {
      map.set(r.ts, (map.get(r.ts) || 0) + Number(r.n));
    }
    return [...map.entries()].sort().map(([, n]) => n);
  }, [timeseries]);
  const errSpark = useMemo(() => (timeseries?.errors ?? []).map((r) => Number(r.n)), [timeseries]);

  return (
    <div className="space-y-4">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Analytics
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Postgres-backed · auto-refresh 30 s
            {dataUpdatedAt && <span> · updated {new Date(dataUpdatedAt).toLocaleTimeString()}</span>}
          </p>
        </div>
        <RangePicker range={range} onChange={setRange} />
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Sessions" value={overview?.sessions ?? "…"} tone="blue" />
        <StatCard icon={Eye} label="Pageviews" value={overview?.pageviews ?? "…"} sparkline={pvSpark} tone="blue" />
        <StatCard icon={Search} label="Searches" value={overview?.searches ?? "…"} tone="violet" />
        <StatCard icon={MousePointer2} label="Feature uses" value={overview?.featureUses ?? "…"} tone="emerald" />
        <StatCard icon={Activity} label="Navigations" value={overview?.navigations ?? "…"} tone="blue" />
        <StatCard icon={AlertTriangle} label="Errors" value={overview?.errors ?? "…"} sparkline={errSpark} tone="red" />
        <StatCard icon={Sparkles} label="Easter eggs" value={overview?.easterEggs ?? "…"} tone="amber" />
        <StatCard
          icon={TrendingUp}
          label="Web / Android"
          value={overview
            ? `${overview.bySource?.web ?? 0} / ${overview.bySource?.android ?? 0}`
            : "…"}
          tone="emerald"
        />
      </div>

      {/* Timeseries chart */}
      <TimeseriesChart range={range} />

      {/* Detail tabs */}
      <Tabs defaultValue="features">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
          <TabsTrigger value="features"><Gauge className="h-3.5 w-3.5 mr-1" />Features</TabsTrigger>
          <TabsTrigger value="sessions"><Users className="h-3.5 w-3.5 mr-1" />Sessions</TabsTrigger>
          <TabsTrigger value="errors"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Errors</TabsTrigger>
          <TabsTrigger value="perf"><Clock className="h-3.5 w-3.5 mr-1" />Perf</TabsTrigger>
          <TabsTrigger value="eggs"><Sparkles className="h-3.5 w-3.5 mr-1" />Eggs</TabsTrigger>
          <TabsTrigger value="recent"><Filter className="h-3.5 w-3.5 mr-1" />Recent</TabsTrigger>
        </TabsList>
        <TabsContent value="features"><FeaturesPanel range={range} /></TabsContent>
        <TabsContent value="sessions"><SessionsPanel /></TabsContent>
        <TabsContent value="errors"><ErrorsPanel range={range} /></TabsContent>
        <TabsContent value="perf"><PerformancePanel range={range} /></TabsContent>
        <TabsContent value="eggs"><EggsPanel /></TabsContent>
        <TabsContent value="recent"><RecentEventsPanel /></TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" /> Admin audit log
          </CardTitle>
          <CardDescription className="text-xs">
            Every privileged action lands here. Views of the audit log itself are not audited to avoid infinite loops.
          </CardDescription>
        </CardHeader>
        <CardContent><AuditPanel /></CardContent>
      </Card>
    </div>
  );
}
