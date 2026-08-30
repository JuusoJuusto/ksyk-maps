/**
 * AdminAnalyticsDashboard — real-Postgres analytics for KSYK Maps admins.
 *
 * Powered by /api/admin/analytics/{overview,sessions,features,errors,
 * performance,easter-eggs,recent-events,audit}. Every panel fetches its
 * own data (React Query) with staleTime so tab switching is instant.
 *
 * No hardcoded numbers. Empty states are honest ("no events yet — try
 * generating one from the console").
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchList, fetchObject } from "@/lib/fetchList";
import { EASTER_EGGS, eggById } from "@/lib/easterEggRegistry";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, AlertTriangle, BarChart3, Clock, Eye,
  Gauge, MousePointer2, Search, Sparkles, TrendingUp, Users, Shield,
} from "lucide-react";

type Range = "24h" | "7d" | "30d" | "90d";

// ── Overview ────────────────────────────────────────────────────────
interface Overview {
  range: string;
  since: string;
  pageviews: number;
  searches: number;
  errors: number;
  featureUses: number;
  easterEggs: number;
  sessions: number;
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

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "blue",
}: {
  icon: any;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "blue" | "amber" | "red" | "emerald" | "violet";
}) {
  const toneClass: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  };
  return (
    <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneClass[tone]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mt-1">
              {value}
            </p>
            {hint && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sessions ────────────────────────────────────────────────────────
interface TelemetrySession {
  id: string;
  sessionId: string;
  platform: string;
  appVersion: string | null;
  osVersion: string | null;
  deviceType: string | null;
  startedAt: string;
  lastSeenAt: string;
  endedAt: string | null;
  durationMs: number | null;
}

function SessionsPanel() {
  const { data = [], isLoading } = useQuery<TelemetrySession[]>({
    queryKey: ["admin-analytics-sessions"],
    queryFn: () => fetchList<TelemetrySession>("/api/admin/analytics/sessions?limit=100"),
    refetchInterval: 60_000,
  });
  return (
    <div className="border rounded-xl overflow-hidden bg-white dark:bg-gray-950">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900 text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="text-left px-3 py-2">Session</th>
            <th className="text-left px-3 py-2">Platform</th>
            <th className="text-left px-3 py-2">Version</th>
            <th className="text-left px-3 py-2">Started</th>
            <th className="text-left px-3 py-2">Last seen</th>
            <th className="text-right px-3 py-2">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {isLoading && (
            <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
          )}
          {!isLoading && data.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No sessions in the last 24 hours.</td></tr>
          )}
          {data.map((s) => (
            <tr key={s.id}>
              <td className="px-3 py-2 font-mono text-[11px]">{s.sessionId.slice(0, 24)}</td>
              <td className="px-3 py-2"><Badge variant="outline">{s.platform}</Badge></td>
              <td className="px-3 py-2 text-xs">{s.appVersion || "—"}</td>
              <td className="px-3 py-2 text-xs">{new Date(s.startedAt).toLocaleString()}</td>
              <td className="px-3 py-2 text-xs">{new Date(s.lastSeenAt).toLocaleString()}</td>
              <td className="px-3 py-2 text-xs text-right">
                {s.durationMs ? `${Math.round(s.durationMs / 1000)}s` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Features ────────────────────────────────────────────────────────
interface FeatureRow { feature: string; action: string; n: number; }
function FeaturesPanel({ range }: { range: Range }) {
  const { data = [], isLoading } = useQuery<FeatureRow[]>({
    queryKey: ["admin-analytics-features", range],
    queryFn: () => fetchList<FeatureRow>(`/api/admin/analytics/features?range=${range}`),
    refetchInterval: 60_000,
  });
  // Roll up rows into per-feature totals across all actions.
  const totals = new Map<string, number>();
  for (const r of data) totals.set(r.feature, (totals.get(r.feature) || 0) + Number(r.n));
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const max = ranked[0]?.[1] || 1;
  return (
    <div className="rounded-xl border bg-white dark:bg-gray-950 p-4">
      {isLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>}
      {!isLoading && ranked.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No feature usage recorded in this range yet.
        </p>
      )}
      <div className="space-y-2">
        {ranked.map(([f, n]) => (
          <div key={f}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{f}</span>
              <span className="text-xs text-muted-foreground">{n.toLocaleString()}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${Math.max(3, (n / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Errors ──────────────────────────────────────────────────────────
interface ErrorRow {
  id: string; level: string; message: string; url: string | null;
  errorStack: string | null; createdAt: string;
}
function ErrorsPanel({ range }: { range: Range }) {
  const { data = [], isLoading } = useQuery<ErrorRow[]>({
    queryKey: ["admin-analytics-errors", range],
    queryFn: () => fetchList<ErrorRow>(`/api/admin/analytics/errors?range=${range}`),
    refetchInterval: 30_000,
  });
  return (
    <div className="rounded-xl border bg-white dark:bg-gray-950 overflow-hidden">
      {isLoading && <p className="text-sm text-muted-foreground p-6 text-center">Loading…</p>}
      {!isLoading && data.length === 0 && (
        <p className="text-sm text-muted-foreground p-6 text-center">No errors in this range 🎉</p>
      )}
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {data.map((e) => (
          <li key={e.id} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{e.message}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(e.createdAt).toLocaleString()}
                  {e.url && <span> · {e.url}</span>}
                </p>
              </div>
              <Badge variant="destructive" className="shrink-0">{e.level}</Badge>
            </div>
            {e.errorStack && (
              <pre className="mt-2 text-[10px] font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto max-h-32">
                {e.errorStack.slice(0, 800)}
              </pre>
            )}
          </li>
        ))}
      </ul>
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
    <div className="rounded-xl border bg-white dark:bg-gray-950 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900 text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="text-left px-3 py-2">Metric</th>
            <th className="text-right px-3 py-2">Count</th>
            <th className="text-right px-3 py-2">p50</th>
            <th className="text-right px-3 py-2">p95</th>
            <th className="text-right px-3 py-2">p99</th>
            <th className="text-right px-3 py-2">avg</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {isLoading && (
            <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
          )}
          {!isLoading && data.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
              No performance samples yet. Web Vitals arrive after real users load pages.
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
  );
}

// ── Easter Eggs ─────────────────────────────────────────────────────
interface EggsPanelData {
  byEgg: { eggId: string; count: number }[];
  recent: any[];
  kvCounters: Record<string, number>;
}
function EggsPanel() {
  const { data, isLoading } = useQuery<EggsPanelData | null>({
    queryKey: ["admin-analytics-eggs"],
    queryFn: () => fetchObject<EggsPanelData>("/api/admin/analytics/easter-eggs?range=90d"),
    refetchInterval: 60_000,
  });
  // Merge counts from both sources (new event table + legacy KV counters).
  const counts = new Map<string, number>();
  for (const { eggId, count } of data?.byEgg ?? []) counts.set(eggId, (counts.get(eggId) || 0) + count);
  for (const [k, v] of Object.entries(data?.kvCounters ?? {})) counts.set(k, (counts.get(k) || 0) + Number(v));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const ranked = EASTER_EGGS.map((e) => ({
    egg: e,
    count: counts.get(e.id) || 0,
  })).sort((a, b) => b.count - a.count);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Total discoveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${EASTER_EGGS.length} eggs in the registry`}
          </p>
        </CardContent>
      </Card>
      <div className="rounded-xl border bg-white dark:bg-gray-950 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left px-3 py-2">Egg</th>
              <th className="text-left px-3 py-2">Rarity</th>
              <th className="text-right px-3 py-2">Discoveries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {ranked.map(({ egg, count }) => (
              <tr key={egg.id}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-md ${egg.bgColor} ${egg.color} flex items-center justify-center`}>
                      <egg.icon className="h-3.5 w-3.5" />
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
            ))}
          </tbody>
        </table>
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
    <div className="rounded-xl border bg-white dark:bg-gray-950 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900 text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="text-left px-3 py-2">Time</th>
            <th className="text-left px-3 py-2">Event</th>
            <th className="text-left px-3 py-2">Platform</th>
            <th className="text-left px-3 py-2">Route</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {isLoading && (
            <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
          )}
          {!isLoading && data.length === 0 && (
            <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
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
    <div className="rounded-xl border bg-white dark:bg-gray-950 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900 text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="text-left px-3 py-2">Time</th>
            <th className="text-left px-3 py-2">Action</th>
            <th className="text-left px-3 py-2">Admin</th>
            <th className="text-left px-3 py-2">IP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {isLoading && (
            <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
          )}
          {!isLoading && data.length === 0 && (
            <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
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
  );
}

// ── Top-level component ─────────────────────────────────────────────
export default function AdminAnalyticsDashboard() {
  const [range, setRange] = useState<Range>("24h");
  const { data: overview } = useOverview(range);

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Analytics
            </CardTitle>
            <CardDescription>
              First-party telemetry, Postgres-backed. Data auto-refreshes every 30 s.
            </CardDescription>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
            {(["24h", "7d", "30d", "90d"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  range === r
                    ? "bg-white dark:bg-gray-800 text-blue-600 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Sessions" value={overview?.sessions ?? "…"} hint="Distinct devices" />
        <StatCard icon={Eye} label="Pageviews" value={overview?.pageviews ?? "…"} tone="blue" />
        <StatCard icon={Search} label="Searches" value={overview?.searches ?? "…"} tone="violet" />
        <StatCard icon={MousePointer2} label="Feature uses" value={overview?.featureUses ?? "…"} tone="emerald" />
        <StatCard icon={Activity} label="Navigations" value={overview?.navigations ?? "…"} tone="blue" />
        <StatCard icon={AlertTriangle} label="Errors" value={overview?.errors ?? "…"} tone="red" />
        <StatCard icon={Sparkles} label="Easter eggs" value={overview?.easterEggs ?? "…"} tone="amber" />
        <StatCard
          icon={TrendingUp}
          label="Web / Android"
          value={overview
            ? `${overview.bySource?.web ?? 0} / ${overview.bySource?.android ?? 0}`
            : "…"}
          tone="emerald"
          hint="Sessions by platform"
        />
      </div>

      <Tabs defaultValue="features">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
          <TabsTrigger value="features"><Gauge className="h-3.5 w-3.5 mr-1" />Features</TabsTrigger>
          <TabsTrigger value="sessions"><Users className="h-3.5 w-3.5 mr-1" />Sessions</TabsTrigger>
          <TabsTrigger value="errors"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Errors</TabsTrigger>
          <TabsTrigger value="perf"><Clock className="h-3.5 w-3.5 mr-1" />Perf</TabsTrigger>
          <TabsTrigger value="eggs"><Sparkles className="h-3.5 w-3.5 mr-1" />Eggs</TabsTrigger>
          <TabsTrigger value="recent"><Activity className="h-3.5 w-3.5 mr-1" />Recent</TabsTrigger>
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
            Every privileged action lands here. Views of this panel are not audited to avoid infinite loops.
          </CardDescription>
        </CardHeader>
        <CardContent><AuditPanel /></CardContent>
      </Card>
    </div>
  );
}
