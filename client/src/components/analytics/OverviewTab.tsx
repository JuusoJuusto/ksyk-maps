/**
 * Overview — the one screen an admin opens first: how many people, is it
 * growing, is anything broken. Everything is compared with the equally long
 * period before, like PostHog's trends.
 */
import { useMemo } from "react";
import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import ErrorRetry from "@/components/ErrorRetry";
import {
  EmptyState, Kpi, Masthead, PANEL, fmtNum, timeAgo, useAdminQuery, type Range,
} from "./shared";
import type { ErrorReport } from "./ErrorsTab";

export interface Metric { current: number; previous: number }
export interface Summary {
  range: Range;
  metrics: Record<"sessions" | "visitors" | "pageviews" | "searches" | "features" | "navigations" | "errors", Metric>;
  live: { now: number; byPlatform: Record<string, number> };
  bySource: Record<string, number>;
  fetchedAt: string;
}

interface Row { ts: string; platform?: string; feature?: string; n: number }
interface Timeseries { bucket: "hour" | "day"; pageviews: Row[]; errors: Row[]; features: Row[] }
interface FeatureRow { feature: string; action: string; n: number }

export function useSummary(range: Range) {
  return useAdminQuery<Summary>(["insights-summary", range], `/api/admin/insights/summary?range=${range}`, 30_000);
}

const HOURS: Record<Range, number> = { "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };
const PLATFORM_COLOR: Record<string, string> = {
  mobile: "#2a64ad", desktop: "#6fa0dc", tablet: "#a9c4e6", unknown: "#c4ccd6",
};

/** Zero-fill empty buckets so quiet hours show as zero instead of being skipped. */
function buildSeries(range: Range, ts: Timeseries | undefined) {
  if (!ts) return { rows: [] as Record<string, number | string>[], platforms: [] as string[] };
  const step = ts.bucket === "day" ? 86_400_000 : 3_600_000;
  const end = Math.floor(Date.now() / step) * step;
  const start = Math.floor((Date.now() - HOURS[range] * 3_600_000) / step) * step;
  const byTs = new Map<number, Record<string, number | string>>();
  for (let t = start; t <= end; t += step) byTs.set(t, { t, errors: 0 });
  const platforms = new Set<string>();
  for (const r of ts.pageviews) {
    const slot = byTs.get(Math.floor(new Date(r.ts).getTime() / step) * step);
    if (!slot) continue;
    const p = r.platform || "unknown";
    platforms.add(p);
    slot[p] = Number(slot[p] ?? 0) + Number(r.n);
  }
  for (const r of ts.errors) {
    const slot = byTs.get(Math.floor(new Date(r.ts).getTime() / step) * step);
    if (slot) slot.errors = Number(slot.errors) + Number(r.n);
  }
  const list = [...platforms].sort();
  const rows = [...byTs.values()].map((row) => {
    for (const p of list) row[p] = Number(row[p] ?? 0);
    return row;
  });
  return { rows, platforms: list };
}

/** Per-bucket totals for KPI sparklines. */
function totals(rows: Row[], range: Range, step: number): number[] {
  const end = Math.floor(Date.now() / step) * step;
  const start = Math.floor((Date.now() - HOURS[range] * 3_600_000) / step) * step;
  const m = new Map<number, number>();
  for (let t = start; t <= end; t += step) m.set(t, 0);
  for (const r of rows) {
    const k = Math.floor(new Date(r.ts).getTime() / step) * step;
    if (m.has(k)) m.set(k, (m.get(k) ?? 0) + Number(r.n));
  }
  return [...m.values()];
}

function TrafficChart({ range, loading, ts }: { range: Range; loading: boolean; ts: Timeseries | undefined }) {
  const { rows, platforms } = useMemo(() => buildSeries(range, ts), [range, ts]);
  const dayBuckets = ts?.bucket === "day";
  const fmtX = (t: number) => {
    const d = new Date(t);
    return dayBuckets || range !== "24h"
      ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };
  const hasData = rows.some((r) => platforms.some((p) => Number(r[p]) > 0) || Number(r.errors) > 0);

  return (
    <div className={`${PANEL} p-4`}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <p className="text-[13px] font-semibold text-gray-900 dark:text-white">Pageviews and errors</p>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          {platforms.map((p) => (
            <span key={p} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: PLATFORM_COLOR[p] ?? "#c4ccd6" }} />{p}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 bg-[#d92d20]" />errors</span>
        </div>
      </div>
      {loading ? (
        <div className="h-[240px] animate-pulse rounded bg-gray-100 dark:bg-gray-900" />
      ) : !hasData ? (
        <EmptyState title="No traffic in this range" hint="Pageviews appear here as people open the map." />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={rows} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
            <XAxis dataKey="t" tickFormatter={fmtX} tick={{ fontSize: 10 }} stroke="#94a3b8" minTickGap={28} />
            <YAxis yAxisId="pv" tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
            <YAxis yAxisId="err" orientation="right" tick={{ fontSize: 10 }} stroke="#d92d20" allowDecimals={false} width={30} />
            <Tooltip
              labelFormatter={(t) => fmtX(Number(t))}
              contentStyle={{ background: "#0f172a", border: 0, borderRadius: 6, fontSize: 12, color: "#f8fafc" }}
              itemStyle={{ color: "#f8fafc" }}
            />
            {platforms.map((p) => (
              <Area
                key={p} yAxisId="pv" type="monotone" dataKey={p} stackId="pv"
                stroke={PLATFORM_COLOR[p] ?? "#c4ccd6"} fill={PLATFORM_COLOR[p] ?? "#c4ccd6"} fillOpacity={0.35}
                strokeWidth={1.5} isAnimationActive={false}
              />
            ))}
            <Line yAxisId="err" type="monotone" dataKey="errors" stroke="#d92d20" strokeWidth={1.75} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Bars({ items, empty }: { items: { label: string; n: number }[]; empty: string }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  if (!items.length) return <EmptyState title={empty} />;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex justify-between text-[12px] mb-1">
            <span className="truncate pr-2 text-gray-800 dark:text-gray-200">{i.label}</span>
            <span className="tabular-nums text-gray-500 dark:text-gray-400">{fmtNum(i.n)}</span>
          </div>
          <div className="h-1.5 rounded-sm bg-gray-100 dark:bg-gray-900">
            <div className="h-full rounded-sm bg-[#003d82]" style={{ width: `${Math.max(3, (i.n / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function OverviewTab({ range, onOpenErrors }: { range: Range; onOpenErrors: () => void }) {
  const summaryQ = useSummary(range);
  const tsQ = useAdminQuery<Timeseries>(["admin-analytics-timeseries", range], `/api/admin/analytics/timeseries?range=${range}`, 60_000);
  const featQ = useAdminQuery<FeatureRow[]>(["admin-analytics-features", range], `/api/admin/analytics/features?range=${range}`, 120_000);
  const errQ = useAdminQuery<ErrorReport>(["insights-errors", range], `/api/admin/insights/errors?range=${range}`, 60_000);

  const m = summaryQ.data?.metrics;
  const loading = summaryQ.isLoading;
  const step = tsQ.data?.bucket === "day" ? 86_400_000 : 3_600_000;
  const pvSpark = useMemo(() => totals(tsQ.data?.pageviews ?? [], range, step), [tsQ.data, range, step]);
  const errSpark = useMemo(() => totals(tsQ.data?.errors ?? [], range, step), [tsQ.data, range, step]);
  const featSpark = useMemo(() => totals(tsQ.data?.features ?? [], range, step), [tsQ.data, range, step]);

  const topFeatures = useMemo(() => {
    const by = new Map<string, number>();
    for (const r of Array.isArray(featQ.data) ? featQ.data : []) by.set(r.feature, (by.get(r.feature) ?? 0) + Number(r.n));
    return [...by.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, 6);
  }, [featQ.data]);

  const platforms = useMemo(
    () => Object.entries(summaryQ.data?.bySource ?? {}).map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n),
    [summaryQ.data],
  );
  const topErrors = errQ.data?.groups.slice(0, 3) ?? [];

  return (
    <div className="space-y-5">
      <ErrorRetry query={summaryQ} label="the overview" />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Visitors" loading={loading} current={m?.visitors.current} previous={m?.visitors.previous} />
        <Kpi label="Sessions" loading={loading} current={m?.sessions.current} previous={m?.sessions.previous} />
        <Kpi label="Pageviews" loading={loading} current={m?.pageviews.current} previous={m?.pageviews.previous} spark={pvSpark} />
        <Kpi label="Searches" loading={loading} current={m?.searches.current} previous={m?.searches.previous} />
        <Kpi label="Feature uses" loading={loading} current={m?.features.current} previous={m?.features.previous} spark={featSpark} />
        <Kpi label="Errors" loading={loading} current={m?.errors.current} previous={m?.errors.previous} spark={errSpark} badWhenUp />
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 -mt-2">
        Changes compare with the previous {range} period.
      </p>

      <TrafficChart range={range} loading={tsQ.isLoading} ts={tsQ.data} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className={`${PANEL} p-4 lg:col-span-2`}>
          <Masthead right={
            <button type="button" onClick={onOpenErrors} className="text-[12px] font-semibold text-[#003d82] dark:text-blue-300 hover:underline">
              All errors
            </button>
          }>Needs attention</Masthead>
          {errQ.isLoading ? (
            <div className="h-20 animate-pulse rounded bg-gray-100 dark:bg-gray-900" />
          ) : topErrors.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-[13px] text-gray-700 dark:text-gray-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              No errors in the last {range}.
            </div>
          ) : (
            <ul className="divide-y divide-[#d5dae0] dark:divide-[#2a3040]">
              {topErrors.map((g) => (
                <li key={g.id}>
                  <button type="button" onClick={onOpenErrors} className="w-full text-left py-2.5 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-900 -mx-2 px-2 rounded">
                    <span className="mt-0.5 min-w-[34px] text-center rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[12px] font-semibold tabular-nums py-0.5">
                      {fmtNum(g.count)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-gray-900 dark:text-gray-100 line-clamp-2 break-words">{g.message}</span>
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {Object.keys(g.sources).join(", ")} · last {timeAgo(g.lastSeen)}{g.isNew ? " · new" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`${PANEL} p-4`}>
          <Masthead>Online now</Masthead>
          <p className="text-[30px] leading-none font-semibold tabular-nums text-gray-900 dark:text-white">
            {summaryQ.data ? summaryQ.data.live.now : "…"}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
            {Object.entries(summaryQ.data?.live.byPlatform ?? {}).map(([k, v]) => `${v} ${k}`).join(" · ") || "Active in the last 5 minutes"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={`${PANEL} p-4`}>
          <Masthead>Top features</Masthead>
          <Bars items={topFeatures} empty="No feature usage yet" />
        </div>
        <div className={`${PANEL} p-4`}>
          <Masthead>Sessions by platform</Masthead>
          <Bars items={platforms} empty="No sessions yet" />
        </div>
      </div>
    </div>
  );
}
