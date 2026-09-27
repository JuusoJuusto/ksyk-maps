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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchList, fetchObject } from "@/lib/fetchList";
import { EASTER_EGGS } from "@/lib/easterEggRegistry";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Clock, Download,
  Eye, Filter, Gauge, MousePointer2, Pause, Play, RefreshCw, Search, Shield,
  Sparkles, TrendingUp, Users, MapPin, Navigation, Video,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, LineChart,
} from "recharts";
import { RrwebSessionsCard, RrwebPlayerModal as RrwebPlayerModalInline } from "@/components/RrwebReplay";
import { PostHogReplaysPanel } from "@/components/PostHogReplaysPanel";
import { cn } from "@/lib/utils";
import ErrorRetry from "@/components/ErrorRetry";

type Range = "24h" | "7d" | "30d" | "90d";

// ── Range picker (sticky in dashboard header) ───────────────────────
// v4.7.13 apple-design pass — proper segmented control feel, tighter
// spacing, active state uses subtle shadow + blue fill rather than
// competing chrome.
function RangePicker({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Date range"
      className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100/80 dark:bg-slate-900 p-0.5 border border-slate-200/70 dark:border-slate-800"
    >
      {(["24h", "7d", "30d", "90d"] as Range[]).map((r) => {
        const active = range === r;
        return (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(r)}
            className={cn(
              "px-3 h-7 rounded-md text-[11px] font-semibold tabular-nums transition-all min-w-[42px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-slate-900",
              active
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50",
            )}
          >
            {r}
          </button>
        );
      })}
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
            <p className="text-sm">Not enough data</p>
            <p className="text-xs text-muted-foreground mt-1">Pageviews will appear here as they're recorded.</p>
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

// v4.7.10 — Popular rooms card. Was a 🔥 toggle on the public map;
// moved here because the audience for aggregate room-view data is
// admins, not students. Fetches /api/analytics/room-popularity and
// shows a top-10 horizontal-bar list plus the total volume.
interface PopularRoom { roomId: string; count: number; lat: number; lng: number }
function useRoomPopularity(range: Range) {
  return useQuery<PopularRoom[]>({
    queryKey: ["admin-analytics-room-popularity", range],
    queryFn: async () => (await fetchList<PopularRoom>(`/api/analytics/room-popularity?range=${range}`)) ?? [],
    refetchInterval: 300_000,
  });
}
function RoomPopularityCard({ range }: { range: Range }) {
  const { data, isLoading } = useRoomPopularity(range);
  // Also fetch rooms so we can show human-readable numbers instead of UUIDs.
  const { data: rooms } = useQuery<Array<{ id: string; roomNumber?: string; name?: string }>>({
    queryKey: ["/api/rooms-min"],
    queryFn: async () => (await fetchList("/api/rooms")) as Array<{ id: string; roomNumber?: string; name?: string }>,
    staleTime: 300_000,
  });
  const roomLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rooms ?? []) m.set(r.id, r.roomNumber ?? r.name ?? r.id.slice(0, 8));
    return m;
  }, [rooms]);
  const sorted = useMemo(() => (data ?? []).slice().sort((a, b) => b.count - a.count), [data]);
  const top = sorted.slice(0, 10);
  const total = (data ?? []).reduce((sum, r) => sum + r.count, 0);
  const max = top[0]?.count ?? 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Popular rooms
            </CardTitle>
            <CardDescription className="text-xs">
              Top 10 rooms opened from search or the map in the last 30 days. Total: {total.toLocaleString()} views.
            </CardDescription>
          </div>
          <button
            onClick={() => downloadCSV(sorted.map(r => ({ roomId: r.roomId, label: roomLabel.get(r.roomId) ?? r.roomId, count: r.count })), "popular-rooms.csv")}
            className="text-[10px] font-semibold px-2 py-1 rounded bg-muted hover:bg-muted/70 flex items-center gap-1"
            title="Download all rooms as CSV"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <p role="status" aria-live="polite" className="text-xs text-muted-foreground py-2">Loading…</p>}
        {!isLoading && top.length === 0 && (
          <div className="py-2">
            <p className="text-sm">No room views recorded</p>
            <p className="text-xs text-muted-foreground mt-1">This list populates as students open rooms from search or the map.</p>
          </div>
        )}
        {top.length > 0 && (
          <ul className="space-y-1.5">
            {top.map((r, i) => {
              const label = roomLabel.get(r.roomId) ?? r.roomId.slice(0, 8);
              const pct = Math.round((r.count / max) * 100);
              return (
                <li key={r.roomId} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-right font-mono text-muted-foreground">{i + 1}.</span>
                  <span className="w-20 font-mono font-semibold truncate">{label}</span>
                  <div className="flex-1 h-4 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-500/70 dark:bg-blue-500/60 rounded"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono tabular-nums">{r.count.toLocaleString()}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// v4.7.11 — Route popularity top-20. Aggregates route_computed
// telemetry from feature_usage grouped by from+to endpoint labels.
interface RouteRow {
  fromId: string;
  toId: string;
  fromLabel: string;
  toLabel: string;
  avgDistance: number;
  count: number;
}
function useRoutePopularity(range: Range) {
  return useQuery<RouteRow[]>({
    queryKey: ["admin-analytics-route-popularity", range],
    queryFn: async () => (await fetchList<RouteRow>(`/api/analytics/route-popularity?range=${range}`)) ?? [],
    refetchInterval: 300_000,
  });
}
function RoutePopularityCard({ range }: { range: Range }) {
  const { data = [], isLoading } = useRoutePopularity(range);
  const total = data.reduce((s, r) => s + r.count, 0);
  const max = data[0]?.count ?? 1;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Navigation className="h-4 w-4" /> Popular routes
            </CardTitle>
            <CardDescription className="text-xs">
              Top 20 origin → destination pairs in the {range} window. Total: {total.toLocaleString()} routes computed.
            </CardDescription>
          </div>
          <button
            onClick={() => downloadCSV(data as unknown as Record<string, unknown>[], "route-popularity.csv")}
            className="text-[10px] font-semibold px-2 py-1 rounded bg-muted hover:bg-muted/70 flex items-center gap-1"
            disabled={!data.length}
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <p role="status" aria-live="polite" className="text-xs text-muted-foreground py-2">Loading…</p>}
        {!isLoading && data.length === 0 && (
          <div className="py-2">
            <p className="text-sm">No routes computed</p>
            <p className="text-xs text-muted-foreground mt-1">Every time a student computes a route on the map, it lands here.</p>
          </div>
        )}
        {data.length > 0 && (
          <ul className="space-y-1.5">
            {data.map((r, i) => {
              const pct = Math.round((r.count / max) * 100);
              return (
                <li key={`${r.fromId}->${r.toId}`} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-right font-mono text-muted-foreground">{i + 1}.</span>
                  <span className="flex-1 min-w-0 truncate" title={`${r.fromLabel} → ${r.toLabel}`}>
                    <span className="font-semibold">{r.fromLabel}</span>
                    <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                    <span className="font-semibold">{r.toLabel}</span>
                  </span>
                  <div className="w-24 h-3 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden relative shrink-0">
                    <div
                      className="absolute inset-y-0 left-0 bg-violet-500/70 dark:bg-violet-500/60 rounded"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-14 text-right font-mono tabular-nums" title="Average distance">
                    {r.avgDistance ? `${r.avgDistance}m` : "—"}
                  </span>
                  <span className="w-10 text-right font-mono tabular-nums font-semibold">{r.count.toLocaleString()}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// v4.7.10 — Announcement CTR. Groups feature_usage announcement_view
// vs announcement_click by metadata.announcementId. Table shows title,
// views, clicks, CTR%. Honors the range picker.
interface AnnouncementCtrRow {
  announcementId: string;
  title: string;
  views: number;
  clicks: number;
  ctrPct: number;
}
function useAnnouncementCtr(range: Range) {
  return useQuery<AnnouncementCtrRow[]>({
    queryKey: ["admin-analytics-announcement-ctr", range],
    queryFn: async () => (await fetchList<AnnouncementCtrRow>(`/api/analytics/announcement-ctr?range=${range}`)) ?? [],
    refetchInterval: 300_000,
  });
}
function AnnouncementCtrCard({ range }: { range: Range }) {
  const { data = [], isLoading } = useAnnouncementCtr(range);
  const totalViews = data.reduce((s, r) => s + r.views, 0);
  const totalClicks = data.reduce((s, r) => s + r.clicks, 0);
  const overallCtr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <MousePointer2 className="h-4 w-4" /> Announcement CTR
            </CardTitle>
            <CardDescription className="text-xs">
              Impressions vs clicks per announcement in the {range} window. Overall: {totalClicks.toLocaleString()} / {totalViews.toLocaleString()} = <b>{overallCtr.toFixed(1)}%</b>.
            </CardDescription>
          </div>
          <button
            onClick={() => downloadCSV(data as unknown as Record<string, unknown>[], "announcement-ctr.csv")}
            className="text-[10px] font-semibold px-2 py-1 rounded bg-muted hover:bg-muted/70 flex items-center gap-1"
            disabled={!data.length}
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <p role="status" aria-live="polite" className="text-xs text-muted-foreground py-2">Loading…</p>}
        {!isLoading && data.length === 0 && (
          <div className="py-2">
            <p className="text-sm">No announcement activity</p>
            <p className="text-xs text-muted-foreground mt-1">Impressions and clicks appear once announcements are published and shown.</p>
          </div>
        )}
        {data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="text-left px-2 py-1.5">Announcement</th>
                  <th scope="col" className="text-right px-2 py-1.5">Views</th>
                  <th scope="col" className="text-right px-2 py-1.5">Clicks</th>
                  <th scope="col" className="text-right px-2 py-1.5">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.slice(0, 10).map((r) => (
                  <tr key={r.announcementId} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                    <td className="px-2 py-1.5 truncate max-w-[180px]" title={r.title}>{r.title}</td>
                    <td className="text-right font-mono tabular-nums px-2 py-1.5">{r.views.toLocaleString()}</td>
                    <td className="text-right font-mono tabular-nums px-2 py-1.5">{r.clicks.toLocaleString()}</td>
                    <td className="text-right font-mono tabular-nums font-semibold px-2 py-1.5">
                      <span className={
                        r.ctrPct >= 30 ? "text-emerald-600 dark:text-emerald-400"
                        : r.ctrPct >= 10 ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-500"
                      }>{r.ctrPct.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// v4.7.10 — Popular rooms card. Was a 🔥 toggle on the public map;
interface RetentionResponse {
  cohortSize: number;
  days: Array<{ day: number; retained: number; retainedPct: number }>;
}
function useRetention(range: Range) {
  return useQuery<RetentionResponse | null>({
    queryKey: ["admin-analytics-retention", range],
    queryFn: () => fetchObject<RetentionResponse>(`/api/analytics/retention?range=${range}`),
    refetchInterval: 300_000,
  });
}

function RetentionChart({ range }: { range: Range }) {
  const { data, isLoading } = useRetention(range);
  const rows = data?.days ?? [];
  const cohortSize = data?.cohortSize ?? 0;
  const d1 = rows.find(r => r.day === 1)?.retainedPct ?? 0;
  const d7 = rows.find(r => r.day === 7)?.retainedPct ?? 0;
  const d30 = rows.find(r => r.day === 30)?.retainedPct ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Retention (last 60 days)
            </CardTitle>
            <CardDescription className="text-xs">
              % of the anchor cohort ({cohortSize.toLocaleString()} users) who came back N days later. Anonymous sessions counted via anonymous_id.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-muted-foreground">D1: <b className="text-foreground">{d1.toFixed(1)}%</b></span>
            <span className="text-muted-foreground">D7: <b className="text-foreground">{d7.toFixed(1)}%</b></span>
            <span className="text-muted-foreground">D30: <b className="text-foreground">{d30.toFixed(1)}%</b></span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-56 pl-0">
        {isLoading && <div role="status" aria-live="polite" className="p-4 text-xs text-muted-foreground">Loading…</div>}
        {!isLoading && rows.length === 0 && (
          <div className="p-4">
            <p className="text-sm">Not enough data</p>
            <p className="text-xs text-muted-foreground mt-1">Retention needs at least one full week of session activity to draw a meaningful curve.</p>
          </div>
        )}
        {!isLoading && rows.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                tickFormatter={(d: number) => `D${d}`}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => `${v}%`}
                width={40}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(v: number, _: string, item: { payload?: { retained?: number } }) => [
                  `${v}% (${item?.payload?.retained ?? 0} users)`, "Retention",
                ]}
                labelFormatter={(d: number) => `Day ${d}`}
              />
              <Line
                type="monotone"
                dataKey="retainedPct"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
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
  // v4.7.13 — apple-design pass. Rounded-xl card, tabular figures,
  // quieter label with more tracking, sparkline sits below the value
  // with dedicated space instead of overlapping.
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${t.bg}`}>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {label}
            </p>
            <p className="text-[26px] font-semibold text-slate-900 dark:text-white leading-none mt-1 tabular-nums tracking-tight">
              {value}
            </p>
            {trend && (
              <p className="text-[10px] text-slate-400 mt-1">{trend}</p>
            )}
          </div>
        </div>
      </div>
      {chartData.length > 1 && (
        <div className="h-8 opacity-70 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <Line type="monotone" dataKey="n" stroke={t.stroke} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
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
interface RrwebSessionSummary {
  sessionId: string;
  batches: number;
  totalEvents: number;
  startedAt: string;
  endedAt: string;
}

interface RrwebStatus {
  tableExists: boolean;
  recordingEnabled: boolean;
  batchesLast24h: number;
  batchesTotal: number;
  lastBatchAt: string | null;
  migrationHint: string | null;
  recentSessions?: RrwebSessionSummary[];
  sampleFirstEventType?: number | null;
}

function SessionsPanel({ range }: { range: Range }) {
  const [drillSid, setDrillSid] = useState<string | null>(null);
  // v4.7.23 — Replay-inline: fetch which sessions have rrweb recordings
  // so the row Play button and the "Session replays" card share one
  // request instead of two competing tables.
  const [replayId, setReplayId] = useState<string | null>(null);
  const queryResult = useQuery<TelemetrySession[]>({
    queryKey: ["admin-analytics-sessions", range],
    queryFn: () => fetchList<TelemetrySession>(`/api/admin/analytics/sessions?limit=100&range=${range}`),
    refetchInterval: 60_000,
  });
  // v4.7.27 — single source of truth: the /status endpoint now returns
  // `recentSessions` too, so we drop the separate list query and derive
  // both the diagnostic and the panel from ONE fetch. Removes the
  // "status says 10 batches but list returns 0" class of bug entirely.
  const replayStatus = useQuery<RrwebStatus | null>({
    queryKey: ["admin-rrweb-status"],
    queryFn: () => fetchObject<RrwebStatus>(`/api/sessions/rrweb/status`),
    refetchInterval: 60_000,
  });
  // Use the range-aware rrweb list (same key as RrwebSessionsCard — React Query
  // deduplicates the fetch) so sessions outside the 7-day status window still
  // get their Play button and aren't falsely labelled "no recording".
  const rrwebListQuery = useQuery<RrwebSessionSummary[]>({
    queryKey: ["admin-rrweb-sessions", range],
    queryFn: async () => (await fetchList<RrwebSessionSummary>(`/api/sessions/rrweb?range=${range}`)) ?? [],
    refetchInterval: 60_000,
  });
  const { data = [], isLoading, refetch } = queryResult;
  const recentReplaySessions = rrwebListQuery.data ?? [];
  const hasReplaySet = useMemo(
    () => new Set(recentReplaySessions.map((r) => r.sessionId)),
    [recentReplaySessions],
  );
  // v4.7.26/27 — MERGE telemetry sessions with rrweb-only sessions.
  // Some tabs record rrweb batches without hitting /session/heartbeat
  // (guest tabs, background pages, tab-swap timing), so their sessionId
  // never lands in telemetry_sessions. Result was "10 batches but 0 with
  // replay". Fix: synthesize a row from the rrweb metadata for any
  // session id missing from telemetry — every batch is playable.
  const mergedSessions = useMemo<TelemetrySession[]>(() => {
    const byId = new Map<string, TelemetrySession>();
    for (const s of data) byId.set(s.sessionId, s);
    for (const r of recentReplaySessions) {
      if (byId.has(r.sessionId)) continue;
      byId.set(r.sessionId, {
        id: `rrweb-only-${r.sessionId}`,
        sessionId: r.sessionId,
        platform: "web",
        appVersion: null,
        osVersion: null,
        deviceType: "web (replay-only)",
        startedAt: r.startedAt,
        lastSeenAt: r.endedAt,
        endedAt: r.endedAt,
        durationMs: Math.max(0, new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()),
      });
    }
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
    );
  }, [data, recentReplaySessions]);
  return (
    <div className="space-y-2 pt-3">
      <ErrorRetry query={queryResult} label="sessions" />
      {replayStatus.data && (replayStatus.data.tableExists === false || replayStatus.data.recordingEnabled === false || hasReplaySet.size === 0) && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5" />
            {replayStatus.data.tableExists === false
              ? "Session replay table missing"
              : replayStatus.data.recordingEnabled === false
                ? "Session recording disabled"
                : "No replays recorded yet"}
          </p>
          <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
            {replayStatus.data.tableExists === false
              ? (replayStatus.data.migrationHint ?? "Run migrations/0003_rrweb_batches.sql in the Supabase SQL Editor, or wait for the first client upload — the table auto-creates on first write.")
              : replayStatus.data.recordingEnabled === false
                ? "Enable it in Settings → Features → 'Session replay recording'. Once on, the next public-route visitor will start populating this table."
                : `Table is ready and recording is on. ${replayStatus.data.batchesTotal.toLocaleString()} batches total; ${replayStatus.data.batchesLast24h} in the last 24h. Wait for the next student visit — replays land here automatically.`}
          </p>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          {isLoading
            ? "Loading…"
            : `${mergedSessions.length} session${mergedSessions.length === 1 ? "" : "s"} · ${hasReplaySet.size} with replay`}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => { refetch(); replayStatus.refetch(); }}
            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            title="Refresh"
            aria-label="Refresh sessions list"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => downloadCSV(mergedSessions as any, "ksyk-sessions.csv")}
            disabled={!mergedSessions.length}
            className="h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            title="Download CSV"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>
      </div>
      <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="text-left px-3 py-2">Session</th>
                <th scope="col" className="text-left px-3 py-2">Platform</th>
                <th scope="col" className="text-left px-3 py-2">Version</th>
                <th scope="col" className="text-left px-3 py-2">Started</th>
                <th scope="col" className="text-left px-3 py-2">Last seen</th>
                <th scope="col" className="text-right px-3 py-2">Duration</th>
                <th scope="col" className="text-right px-3 py-2 w-24">Replay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && mergedSessions.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-xs">
                  No sessions in this range. New visitors will show up here as they land.
                </td></tr>
              )}
              {mergedSessions.map((s) => {
                const canReplay = hasReplaySet.has(s.sessionId);
                return (
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
                      {canReplay ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setReplayId(s.sessionId); }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          title="Play recorded session (rrweb)"
                        >
                          <Play className="h-3 w-3" /> Play
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-slate-600">no recording</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <SessionDrillDialog sessionId={drillSid} onClose={() => setDrillSid(null)} />
      {replayId && (
        <RrwebPlayerModalInline sessionId={replayId} onClose={() => setReplayId(null)} />
      )}
    </div>
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
          <DialogDescription className="sr-only">Session event timeline</DialogDescription>
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-[11px] font-semibold hover:bg-orange-200 dark:hover:bg-orange-950/70"
              >
                <Play className="h-3 w-3" /> Watch replay in PostHog
              </a>
            </div>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading events…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No events recorded for this session.
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
  const allEvents = useMemo(
    () => [...rows].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()),
    [rows],
  );

  // v4.7.7 — richer scrubber: kind filter chips, playback speed, real
  // wall-clock elapsed display, keyboard shortcuts, jump-to-error, loop.
  type Kind = "error" | "search" | "pageview" | "nav" | "other";
  const kindOf = (k: string): Kind => {
    if (k.includes("error"))    return "error";
    if (k.includes("search"))   return "search";
    if (k.includes("pageview")) return "pageview";
    if (k.includes("nav"))      return "nav";
    return "other";
  };
  const kindColor: Record<Kind, string> = {
    error:    "#EF4444",
    search:   "#F59E0B",
    pageview: "#3B82F6",
    nav:      "#8B5CF6",
    other:    "#10B981",
  };
  const kindLabel: Record<Kind, string> = {
    error: "Errors", search: "Search", pageview: "Pageviews", nav: "Nav", other: "Other",
  };

  const [hidden, setHidden] = useState<Set<Kind>>(new Set());
  const events = useMemo(
    () => allEvents.filter(e => !hidden.has(kindOf(e.kind))),
    [allEvents, hidden],
  );

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2 | 4>(1);
  const [loop, setLoop] = useState(false);

  // Clamp idx when the filter shrinks the visible set.
  useEffect(() => {
    if (idx >= events.length && events.length > 0) setIdx(events.length - 1);
    if (events.length === 0) setIdx(0);
  }, [events.length, idx]);

  useEffect(() => {
    if (!playing) return;
    if (idx >= events.length - 1) {
      if (loop) { setIdx(0); return; }
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, events.length - 1)), 1000 / speed);
    return () => clearTimeout(t);
  }, [playing, idx, events.length, speed, loop]);

  // Keyboard: space toggles play, ←/→ step, . jumps to first error, l toggles loop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === " ") { e.preventDefault(); setPlaying(p => !p); return; }
      if (e.key === "ArrowLeft")  { setIdx(i => Math.max(0, i - 1)); return; }
      if (e.key === "ArrowRight") { setIdx(i => Math.min(events.length - 1, i + 1)); return; }
      if (e.key === "l" || e.key === "L") { setLoop(l => !l); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [events.length]);

  const current = events[idx];
  const start = events[0]?.ts ? new Date(events[0].ts).getTime() : 0;
  const end = events[events.length - 1]?.ts ? new Date(events[events.length - 1].ts).getTime() : start;
  const total = Math.max(1, end - start);
  const elapsed = current ? new Date(current.ts).getTime() - start : 0;
  const totalDurationMs = total;

  const firstErrorIdx = events.findIndex((e) => e.kind.includes("error"));

  const fmtMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const toggleKind = (k: Kind) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  // Precompute filter chip counts from the unfiltered set so the numbers
  // don't shrink when the user hides categories.
  const counts = useMemo(() => {
    const c: Record<Kind, number> = { error: 0, search: 0, pageview: 0, nav: 0, other: 0 };
    for (const e of allEvents) c[kindOf(e.kind)]++;
    return c;
  }, [allEvents]);

  if (events.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No events match the current filter.
      </div>
    );
  }

  return (
    <div className="space-y-3 py-3">
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-muted-foreground font-medium mr-1">Filter:</span>
        {(Object.keys(counts) as Kind[]).map((k) => {
          const isOn = !hidden.has(k);
          return (
            <button
              key={k}
              onClick={() => toggleKind(k)}
              disabled={counts[k] === 0}
              className={`px-2 py-1 rounded-md font-mono font-semibold flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                isOn ? "bg-slate-100 dark:bg-slate-800" : "bg-transparent opacity-50 hover:opacity-80"
              }`}
              title={isOn ? `Hide ${kindLabel[k]}` : `Show ${kindLabel[k]}`}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: kindColor[k] }} />
              <span>{kindLabel[k]}</span>
              <span className="text-muted-foreground">({counts[k]})</span>
            </button>
          );
        })}
      </div>

      {/* Current-event card */}
      {current && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: kindColor[kindOf(current.kind)] }}
            />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wide" style={{ color: kindColor[kindOf(current.kind)] }}>
              {current.kind}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto font-mono">
              {new Date(current.ts).toLocaleTimeString()} · +{fmtMs(elapsed)} from start
            </span>
          </div>
          <p className="text-sm break-all font-mono">{current.detail || "—"}</p>
        </div>
      )}

      {/* Playback controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 disabled:opacity-40 flex items-center justify-center font-bold"
          title="Previous event (←)"
        >‹</button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center font-bold shadow-sm"
          title={playing ? "Pause (Space)" : "Play (Space)"}
        >{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
        <button
          onClick={() => setIdx((i) => Math.min(events.length - 1, i + 1))}
          disabled={idx >= events.length - 1}
          className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 disabled:opacity-40 flex items-center justify-center font-bold"
          title="Next event (→)"
        >›</button>

        {/* Speed selector */}
        <div className="flex items-center gap-0.5 rounded-md bg-slate-100 dark:bg-slate-800 p-0.5">
          {([0.5, 1, 2, 4] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                speed === s ? "bg-white dark:bg-slate-950 shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              title={`Playback speed ${s}×`}
            >{s}×</button>
          ))}
        </div>

        {/* Loop toggle */}
        <button
          onClick={() => setLoop(l => !l)}
          className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
            loop ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
          title="Loop playback (L)"
        >↻ Loop</button>

        {/* Elapsed / total */}
        <span className="ml-auto text-[11px] font-mono tabular-nums text-muted-foreground">
          {fmtMs(elapsed)} / {fmtMs(totalDurationMs)}
        </span>

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

      {/* Scrubber slider */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-mono w-10 text-right tabular-nums">{idx + 1}</span>
        <input
          type="range"
          min={0}
          max={Math.max(0, events.length - 1)}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground font-mono w-10 tabular-nums">{events.length}</span>
      </div>

      {/* Timeline strip — event ticks */}
      <div className="relative h-8 rounded bg-slate-100 dark:bg-slate-900 overflow-hidden">
        {events.map((e, i) => {
          const pos = ((new Date(e.ts).getTime() - start) / total) * 100;
          const k = kindOf(e.kind);
          return (
            <div
              key={i}
              onClick={() => setIdx(i)}
              className="absolute top-0 bottom-0 w-[3px] cursor-pointer hover:w-[6px] transition-all"
              style={{ left: `${pos}%`, background: kindColor[k] }}
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
      <details className="text-xs" open>
        <summary className="cursor-pointer text-muted-foreground py-2 select-none font-medium">
          All {events.length} events (click any row to jump)
        </summary>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 mt-2 max-h-64 overflow-y-auto rounded border border-slate-200 dark:border-slate-800">
          {events.map((r, i) => (
            <li
              key={i}
              onClick={() => setIdx(i)}
              className={`py-1.5 px-2 flex items-center justify-between gap-3 cursor-pointer ${i === idx ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"}`}
            >
              <div className="min-w-0 flex items-center gap-2 flex-1">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: kindColor[kindOf(r.kind)] }}
                />
                <span className="font-mono text-[10px] font-semibold w-16 shrink-0">{r.kind.slice(0, 14)}</span>
                <span className="text-[11px] text-muted-foreground truncate">{r.detail || "—"}</span>
              </div>
              <p className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                +{fmtMs(new Date(r.ts).getTime() - start)}
              </p>
            </li>
          ))}
        </ul>
      </details>

      <p className="text-[10px] text-muted-foreground">
        Shortcuts: <kbd className="px-1 rounded bg-muted">Space</kbd> play/pause · <kbd className="px-1 rounded bg-muted">←/→</kbd> step · <kbd className="px-1 rounded bg-muted">L</kbd> loop
      </p>
    </div>
  );
}

// ── Features panel ──────────────────────────────────────────────────
interface FeatureRow { feature: string; action: string; n: number; }
function FeaturesPanel({ range }: { range: Range }) {
  const queryResult = useQuery<FeatureRow[]>({
    queryKey: ["admin-analytics-features", range],
    queryFn: () => fetchList<FeatureRow>(`/api/admin/analytics/features?range=${range}`),
    refetchInterval: 60_000,
  });
  const { data = [], isLoading } = queryResult;
  const totals = new Map<string, number>();
  for (const r of data) totals.set(r.feature, (totals.get(r.feature) || 0) + Number(r.n));
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const max = ranked[0]?.[1] || 1;
  return (
    <div className="space-y-3 pt-3">
      <ErrorRetry query={queryResult} label="features" />
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          {isLoading ? "Loading…" : `${ranked.length} of ${totals.size} features`}
        </p>
        <button
          type="button"
          onClick={() => downloadCSV(data as any, "ksyk-features.csv")}
          disabled={!data.length}
          className="h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
      {/* v4.7.16 — dropped the rounded-xl bordered card wrapper; the
       *  tab already provides structural separation and the bars
       *  themselves carry the visual rhythm. */}
      {isLoading && <p role="status" aria-live="polite" className="text-sm text-slate-500 py-6 text-center">Loading feature usage…</p>}
      {!isLoading && ranked.length === 0 && !queryResult.isError && (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-700 dark:text-slate-200">No feature usage in this range</p>
          <p className="text-xs text-slate-500 mt-1">Try a wider window with the range picker above.</p>
        </div>
      )}
      <div className="space-y-2">
        {ranked.map(([f, n]) => (
          <div key={f}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{f}</span>
              <span className="text-xs text-slate-500 tabular-nums">{n.toLocaleString()}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.max(3, (n / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Errors ──────────────────────────────────────────────────────────
interface ErrorRow { id: string; level: string; message: string; url: string | null; errorStack: string | null; createdAt: string; }
/**
 * v1.84.0 — new admin insight panels grouped into one tab so the top-level
 * Analytics view doesn't drown in nested tabs. Four sub-cards inside:
 *   1. Search zero-results (content-gap finder)
 *   2. Peak usage by hour × day-of-week
 *   3. Device / OS / app_version breakdown
 *   4. Bounce rate by landing route
 */
interface ZeroResultRow { query: string; attempts: number; unique_searchers: number; last_seen: string; }
interface PeakUsageRow { dow: number; hour: number; n: number; }
interface DeviceBreakdown { platform: { k: string; n: number }[]; appVersion: { k: string; n: number }[]; os: { k: string; n: number }[]; }
interface BounceRow { route: string; sessions: number; bounced: number; bounce_pct: number; }

function InsightsPanels({ range }: { range: Range }) {
  return (
    <div className="space-y-4">
      <SearchZeroResults range={range} />
      <PeakUsageHeatmap range={range} />
      <DeviceBreakdownCard range={range} />
      <BounceRateCard range={range} />
    </div>
  );
}

function SearchZeroResults({ range }: { range: Range }) {
  const { data = [], isLoading } = useQuery<ZeroResultRow[]>({
    queryKey: ["admin-analytics-zero-results", range],
    queryFn: () => fetchList<ZeroResultRow>(`/api/admin/analytics/search-zero-results?range=${range}`),
    refetchInterval: 60_000,
  });
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Search className="h-4 w-4 text-amber-500" />
          Search queries that returned nothing
        </CardTitle>
        <CardDescription className="text-xs">
          Ranked by frequency. Fixes: add these as room aliases or create missing rooms in the Builder.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-xs text-muted-foreground px-4 py-6 text-center">Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-xs text-muted-foreground px-4 py-6 text-center">No zero-result searches in this range — coverage looks good.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-2">Query</th>
                <th className="px-4 py-2 text-right">Attempts</th>
                <th className="px-4 py-2 text-right">Unique</th>
                <th className="px-4 py-2 text-right">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((r) => (
                <tr key={r.query} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="px-4 py-2 font-mono">{r.query}</td>
                  <td className="px-4 py-2 text-right font-semibold">{r.attempts}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{r.unique_searchers}</td>
                  <td className="px-4 py-2 text-right text-[10px] text-muted-foreground">
                    {new Date(r.last_seen).toLocaleString("fi-FI")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function PeakUsageHeatmap({ range }: { range: Range }) {
  const { data = [], isLoading } = useQuery<PeakUsageRow[]>({
    queryKey: ["admin-analytics-peak", range],
    queryFn: () => fetchList<PeakUsageRow>(`/api/admin/analytics/peak-usage?range=${range}`),
    refetchInterval: 60_000,
  });
  // 7 rows (Mon-Sun; dow=0 is Sunday in Postgres EXTRACT) × 24 columns
  const grid: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  let max = 0;
  for (const r of data) {
    // Convert Postgres DOW (0=Sun) to Mon-first order for display
    const displayRow = r.dow === 0 ? 6 : r.dow - 1;
    if (displayRow >= 0 && displayRow < 7 && r.hour >= 0 && r.hour < 24) {
      grid[displayRow][r.hour] = r.n;
      if (r.n > max) max = r.n;
    }
  }
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-500" />
          Peak usage — hour × day
        </CardTitle>
        <CardDescription className="text-xs">Darker = more events. Hour of day 0–23 (Europe/Helsinki).</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Loading…</p>
        ) : max === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No event data in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-[10px] mx-auto border-separate" style={{ borderSpacing: 2 }}>
              <thead>
                <tr>
                  <th className="pr-1" />
                  {Array.from({ length: 24 }, (_, h) => (
                    <th key={h} className="w-4 text-center text-muted-foreground font-mono">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day, i) => (
                  <tr key={day}>
                    <td className="pr-1 text-right text-muted-foreground font-mono">{day}</td>
                    {grid[i].map((n, h) => {
                      const pct = n / max;
                      const alpha = 0.08 + pct * 0.92;
                      return (
                        <td
                          key={h}
                          title={`${day} ${h}:00 — ${n} events`}
                          className="w-4 h-4 rounded"
                          style={{ background: `rgba(99, 102, 241, ${alpha})` }}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeviceBreakdownCard({ range }: { range: Range }) {
  const { data, isLoading } = useQuery<DeviceBreakdown | null>({
    queryKey: ["admin-analytics-devices", range],
    queryFn: () => fetchObject<DeviceBreakdown>(`/api/admin/analytics/devices?range=${range}`),
    refetchInterval: 120_000,
  });
  const bar = (rows: { k: string; n: number }[]) => {
    const total = rows.reduce((s, r) => s + r.n, 0) || 1;
    return (
      <ul className="space-y-1.5">
        {rows.slice(0, 8).map((r) => (
          <li key={r.k}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="truncate font-mono">{r.k}</span>
              <span className="text-muted-foreground shrink-0 ml-2">{r.n} · {Math.round((r.n / total) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded bg-slate-100 dark:bg-slate-900 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${(r.n / total) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    );
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          Device / OS / app version
        </CardTitle>
        <CardDescription className="text-xs">Distribution across sessions in this range.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Loading…</p>
        ) : !data ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No sessions in this range.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Platform</p>
              {bar(data.platform)}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">App version</p>
              {bar(data.appVersion)}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">OS version</p>
              {bar(data.os)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BounceRateCard({ range }: { range: Range }) {
  const { data = [], isLoading } = useQuery<BounceRow[]>({
    queryKey: ["admin-analytics-bounce", range],
    queryFn: () => fetchList<BounceRow>(`/api/admin/analytics/bounce-rate?range=${range}`),
    refetchInterval: 120_000,
  });
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-rose-500" />
          Bounce rate by landing page
        </CardTitle>
        <CardDescription className="text-xs">Sessions where the user viewed only one route. High % = onboarding/landing issue.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-xs text-muted-foreground px-4 py-6 text-center">Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-xs text-muted-foreground px-4 py-6 text-center">Not enough data yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-2">Route</th>
                <th className="px-4 py-2 text-right">Sessions</th>
                <th className="px-4 py-2 text-right">Bounced</th>
                <th className="px-4 py-2 text-right">Bounce %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((r) => (
                <tr key={r.route} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="px-4 py-2 font-mono truncate max-w-[240px]">{r.route}</td>
                  <td className="px-4 py-2 text-right">{r.sessions}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{r.bounced}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${r.bounce_pct >= 70 ? "text-red-500" : r.bounce_pct >= 40 ? "text-amber-500" : "text-emerald-500"}`}>
                    {r.bounce_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function ErrorsPanel({ range }: { range: Range }) {
  const queryResult = useQuery<ErrorRow[]>({
    queryKey: ["admin-analytics-errors", range],
    queryFn: () => fetchList<ErrorRow>(`/api/admin/analytics/errors?range=${range}`),
    refetchInterval: 30_000,
  });
  const { data = [], isLoading } = queryResult;
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-3 pt-3">
      <ErrorRetry query={queryResult} label="error log" />
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          {isLoading ? "Loading…" : `${data.length} error${data.length === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          onClick={() => downloadCSV(data as any, "ksyk-errors.csv")}
          disabled={!data.length}
          className="h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
      {/* v4.7.16 — dropped the outer bordered card. Rows carry their
       *  own visual rhythm via the divider list. */}
      {isLoading && <p role="status" aria-live="polite" className="text-sm text-slate-500 py-6 text-center">Loading errors…</p>}
      {!isLoading && data.length === 0 && !queryResult.isError && (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-700 dark:text-slate-200">No errors</p>
          <p className="text-xs text-slate-500 mt-1">Nothing has been reported in this range.</p>
        </div>
      )}
      {data.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-b border-slate-100 dark:border-slate-800">
          {data.map((e) => (
            <li key={e.id} className="py-3">
              <button
                type="button"
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                aria-expanded={expanded === e.id}
                className="w-full flex items-start justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.message}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
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
      )}
    </div>
  );
}

// ── Performance ─────────────────────────────────────────────────────
interface PerfRow { metric_name: string; n: number; p50: number; p95: number; p99: number; avg: number; }
function PerformancePanel({ range }: { range: Range }) {
  const queryResult = useQuery<PerfRow[]>({
    queryKey: ["admin-analytics-perf", range],
    queryFn: () => fetchList<PerfRow>(`/api/admin/analytics/performance?range=${range}`),
    refetchInterval: 60_000,
  });
  const { data = [], isLoading } = queryResult;
  const fmt = (v: number | null) => v == null ? "—" : v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`;
  return (
    <div className="space-y-3 pt-3">
      <ErrorRetry query={queryResult} label="performance samples" />
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          {isLoading ? "Loading…" : `${data.length} metric${data.length === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          onClick={() => downloadCSV(data as any, "ksyk-perf.csv")}
          disabled={!data.length}
          className="h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
      <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="text-left px-3 py-2">Metric</th>
                <th scope="col" className="text-right px-3 py-2">Count</th>
                <th scope="col" className="text-right px-3 py-2">p50</th>
                <th scope="col" className="text-right px-3 py-2">p95</th>
                <th scope="col" className="text-right px-3 py-2">p99</th>
                <th scope="col" className="text-right px-3 py-2">avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && data.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-xs">
                  No performance samples in this range.
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
                <th scope="col" className="text-left px-3 py-2">Egg</th>
                <th scope="col" className="text-left px-3 py-2">Rarity</th>
                <th scope="col" className="text-right px-3 py-2">Discoveries</th>
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
function RecentEventsPanel({ range }: { range: Range }) {
  const queryResult = useQuery<any[]>({
    queryKey: ["admin-analytics-recent", range],
    queryFn: () => fetchList<any>(`/api/admin/analytics/recent-events?limit=200&range=${range}`),
    refetchInterval: 10_000,
  });
  const { data = [], isLoading } = queryResult;
  return (
    <div className="space-y-3 pt-3">
      <ErrorRetry query={queryResult} label="recent events" />
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          {isLoading ? "Loading…" : `${data.length} event${data.length === 1 ? "" : "s"}`}
        </p>
      </div>
      <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[540px]">
          <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="text-left px-3 py-2">Time</th>
              <th scope="col" className="text-left px-3 py-2">Event</th>
              <th scope="col" className="text-left px-3 py-2">Platform</th>
              <th scope="col" className="text-left px-3 py-2">Route</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground text-xs">
                No events recorded in this range.
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
              <th scope="col" className="text-left px-3 py-2">Time</th>
              <th scope="col" className="text-left px-3 py-2">Action</th>
              <th scope="col" className="text-left px-3 py-2">Admin</th>
              <th scope="col" className="text-left px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground text-xs">
                No admin actions logged in the last 7 days.
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
  const [usageTab, setUsageTab] = useState("features");
  const [healthTab, setHealthTab] = useState("errors");
  const overviewQ = useOverview(range);
  const { data: overview, dataUpdatedAt } = overviewQ;
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

  // Sparklines for the remaining 4 stat cards, derived from the features timeseries.
  // features rows have { ts, feature, n } — aggregate by bucket timestamp.
  const featureUsesSpark = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of timeseries?.features ?? []) {
      map.set(r.ts, (map.get(r.ts) || 0) + Number(r.n));
    }
    return [...map.entries()].sort().map(([, n]) => n);
  }, [timeseries]);
  const searchesSpark = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of timeseries?.features ?? []) {
      if (r.feature && r.feature.toLowerCase().includes("search")) {
        map.set(r.ts, (map.get(r.ts) || 0) + Number(r.n));
      }
    }
    return [...map.entries()].sort().map(([, n]) => n);
  }, [timeseries]);
  const navigationsSpark = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of timeseries?.features ?? []) {
      const f = r.feature?.toLowerCase() ?? "";
      if (f.includes("navigat") || f.includes("route")) {
        map.set(r.ts, (map.get(r.ts) || 0) + Number(r.n));
      }
    }
    return [...map.entries()].sort().map(([, n]) => n);
  }, [timeseries]);

  return (
    <div className="space-y-4">
      {/* v4.7.13 apple-design header — tighter type scale, calmer
       *  meta line, sticky with translucent backdrop.
       *  v4.7.17 — flex-wrap for narrow viewports so the range
       *  picker drops below the title instead of overflowing. */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-[18px] w-[18px] text-slate-500 dark:text-slate-400" strokeWidth={2} />
            Analytics
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
            <span className="opacity-60">·</span>
            <span>auto-refresh 30 s</span>
            {dataUpdatedAt && (
              <>
                <span className="opacity-60">·</span>
                <span className="tabular-nums">
                  updated {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </>
            )}
          </p>
        </div>
        <RangePicker range={range} onChange={setRange} />
      </div>
      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 -mt-2 italic">
        Range affects every card except Eggs (lifetime) &amp; the audit log (fixed 7d window).
      </p>

      {/* v4.7.15 — surface fetch failures instead of silently
       *  showing zeros across every card. Retry actually calls
       *  react-query's refetch. */}
      <ErrorRetry query={overviewQ} label="analytics overview" />

      {/* ── Product Analytics ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Product Analytics
          </h3>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon={Users} label="Sessions" value={overview?.sessions ?? "…"} tone="blue" />
          <StatCard icon={Eye} label="Pageviews" value={overview?.pageviews ?? "…"} sparkline={pvSpark} tone="blue" />
          <StatCard icon={Search} label="Searches" value={overview?.searches ?? "…"} sparkline={searchesSpark} tone="violet" />
          <StatCard icon={MousePointer2} label="Feature uses" value={overview?.featureUses ?? "…"} sparkline={featureUsesSpark} tone="emerald" />
          <StatCard icon={Activity} label="Navigations" value={overview?.navigations ?? "…"} sparkline={navigationsSpark} tone="blue" />
          <StatCard
            icon={TrendingUp}
            label="Web · Android"
            value={overview
              ? `${overview.bySource?.web ?? 0} · ${overview.bySource?.android ?? 0}`
              : "…"}
            tone="emerald"
          />
        </div>
      </div>

      {/* ── Technical Health ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Technical Health
          </h3>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon={AlertTriangle} label="Errors" value={overview?.errors ?? "…"} sparkline={errSpark} tone="red" />
          <StatCard icon={Sparkles} label="Easter eggs" value={overview?.easterEggs ?? "…"} tone="amber" />
        </div>
      </div>

      {/* Timeseries chart */}
      <TimeseriesChart range={range} />

      {/* v4.7.10 — retention + popular rooms side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <RetentionChart range={range} />
        <RoomPopularityCard range={range} />
      </div>
      {/* v4.7.11 — routes + announcement CTR side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <RoutePopularityCard range={range} />
        <AnnouncementCtrCard range={range} />
      </div>

      {/* v4.7.23 — session replays moved INTO the Sessions sub-tab
       *  below. Previously this stood alone above the tabs; folding
       *  it in gives admins a single "which sessions can I replay"
       *  answer instead of two competing tables. */}

      {/* Detail tabs */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Drill-down
          </h3>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        </div>
        {/* Usage tabs */}
        <div className="space-y-1 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-600 shrink-0">
              Usage
            </span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/60" />
          </div>
        </div>
        <Tabs value={usageTab} onValueChange={setUsageTab}>
          <TabsList className="inline-flex gap-0.5 h-8 bg-slate-100/80 dark:bg-slate-900 p-0.5 border border-slate-200/70 dark:border-slate-800 rounded-lg mb-1">
            <TabsTrigger value="features" className="text-[11px] h-7 font-semibold gap-1 px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 rounded-md">
              <Gauge className="h-3 w-3" />Features
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-[11px] h-7 font-semibold gap-1 px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 rounded-md">
              <Search className="h-3 w-3" />Insights
            </TabsTrigger>
            <TabsTrigger value="sessions" className="text-[11px] h-7 font-semibold gap-1 px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 rounded-md">
              <Users className="h-3 w-3" />Sessions
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-[11px] h-7 font-semibold gap-1 px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 rounded-md">
              <Filter className="h-3 w-3" />Recent
            </TabsTrigger>
            <TabsTrigger value="eggs" className="text-[11px] h-7 font-semibold gap-1 px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 rounded-md">
              <Sparkles className="h-3 w-3" />Eggs
            </TabsTrigger>
            <TabsTrigger value="posthog" className="text-[11px] h-7 font-semibold gap-1 px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 rounded-md">
              <Video className="h-3 w-3" />PostHog
            </TabsTrigger>
          </TabsList>
          <TabsContent value="features"><FeaturesPanel range={range} /></TabsContent>
          <TabsContent value="insights"><InsightsPanels range={range} /></TabsContent>
          <TabsContent value="sessions"><SessionsPanel range={range} /></TabsContent>
          <TabsContent value="eggs"><EggsPanel /></TabsContent>
          <TabsContent value="recent"><RecentEventsPanel range={range} /></TabsContent>
          <TabsContent value="posthog" className="pt-3"><PostHogReplaysPanel range={range} /></TabsContent>
        </Tabs>

        {/* Health tabs */}
        <div className="space-y-1 mt-3 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-600 shrink-0">
              Health
            </span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/60" />
          </div>
        </div>
        <Tabs value={healthTab} onValueChange={setHealthTab}>
          <TabsList className="inline-flex gap-0.5 h-8 bg-slate-100/80 dark:bg-slate-900 p-0.5 border border-slate-200/70 dark:border-slate-800 rounded-lg mb-1">
            <TabsTrigger value="errors" className="text-[11px] h-7 font-semibold gap-1 px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 rounded-md data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400">
              <AlertTriangle className="h-3 w-3" />Errors
            </TabsTrigger>
            <TabsTrigger value="perf" className="text-[11px] h-7 font-semibold gap-1 px-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 rounded-md">
              <Clock className="h-3 w-3" />Performance
            </TabsTrigger>
          </TabsList>
          <TabsContent value="errors"><ErrorsPanel range={range} /></TabsContent>
          <TabsContent value="perf"><PerformancePanel range={range} /></TabsContent>
        </Tabs>
      </div>

      {/* Audit log — its own section, unstyled container instead of a card
       *  so it lives next to the details tab list, not floating separately. */}
      <div className="pt-4">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-[13px] font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            Admin audit log
          </h3>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
            Last 7 days of privileged actions
          </p>
        </div>
        <AuditPanel />
      </div>
    </div>
  );
}
