/**
 * Admin insights — the queries behind the Analytics tab and the owner alerts.
 *
 * Everything here is read-only and never throws: a missing table (fresh
 * deploy) or a DB hiccup yields zeros / empty lists so the dashboard can say
 * "no data" instead of crashing.
 */
import { createHash } from "node:crypto";
import { db } from "./db.js";
import { sql } from "drizzle-orm";

export type Range = "24h" | "7d" | "30d" | "90d";

const RANGE_HOURS: Record<Range, number> = { "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };

export function parseRange(v: unknown): Range {
  const s = String(v ?? "24h").toLowerCase();
  return (s in RANGE_HOURS ? s : "24h") as Range;
}

export function rangeHours(r: Range): number {
  return RANGE_HOURS[r];
}

function rowsOf(res: unknown): any[] {
  const r = res as any;
  return Array.isArray(r) ? r : (r?.rows ?? []);
}

/**
 * Stable id for "the same error". Volatile parts (ids, numbers, URLs, hex) are
 * masked so `Failed to load room 123` and `... room 456` group together.
 */
export function errorFingerprint(message: string): string {
  const norm = String(message ?? "")
    .toLowerCase()
    .replace(/https?:\/\/[^\s)'"]+/g, "<url>")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, "<id>")
    .replace(/\b0x[0-9a-f]+\b/g, "<hex>")
    .replace(/\b[0-9a-f]{16,}\b/g, "<hex>")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return createHash("sha1").update(norm).digest("hex").slice(0, 12);
}

async function countBetween(
  table: string, col: string, from: Date, to: Date, extra = "", distinct = "*",
): Promise<number> {
  // table/col/extra are internal constants, never user input.
  try {
    const r = await db.execute(sql`
      SELECT COUNT(${sql.raw(distinct === "*" ? "*" : `DISTINCT ${distinct}`)})::int AS n
      FROM ${sql.raw(table)}
      WHERE ${sql.raw(col)} >= ${from} AND ${sql.raw(col)} < ${to} ${sql.raw(extra)}
    `);
    return Number(rowsOf(r)[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export interface Metric { current: number; previous: number }

export interface Summary {
  range: Range;
  since: string;
  metrics: {
    sessions: Metric; visitors: Metric; pageviews: Metric; searches: Metric;
    features: Metric; navigations: Metric; errors: Metric;
  };
  live: { now: number; byPlatform: Record<string, number> };
  bySource: Record<string, number>;
  fetchedAt: string;
}

const METRIC_SOURCES: Record<keyof Summary["metrics"], [string, string, string, string]> = {
  sessions:    ["telemetry_sessions",   "started_at", "", "*"],
  visitors:    ["telemetry_sessions",   "started_at", "", "COALESCE(anonymous_id, session_id)"],
  pageviews:   ["page_views",           "created_at", "", "*"],
  searches:    ["search_analytics",     "created_at", "", "*"],
  features:    ["feature_usage",        "created_at", "", "*"],
  navigations: ["navigation_analytics", "created_at", "", "*"],
  errors:      ["app_logs",             "created_at", "AND level = 'error'", "*"],
};

/** Current period vs the equally long period right before it, plus who is online now. */
export async function getSummary(range: Range): Promise<Summary> {
  const ms = rangeHours(range) * 3600_000;
  const now = new Date();
  const since = new Date(now.getTime() - ms);
  const prevSince = new Date(since.getTime() - ms);

  const keys = Object.keys(METRIC_SOURCES) as (keyof Summary["metrics"])[];
  const pairs = await Promise.all(keys.map(async (k) => {
    const [table, col, extra, distinct] = METRIC_SOURCES[k];
    const [current, previous] = await Promise.all([
      countBetween(table, col, since, new Date(now.getTime() + 60_000), extra, distinct),
      countBetween(table, col, prevSince, since, extra, distinct),
    ]);
    return [k, { current, previous }] as const;
  }));

  const grouped = async (q: ReturnType<typeof sql>) => {
    const out: Record<string, number> = {};
    try {
      for (const r of rowsOf(await db.execute(q))) out[String(r.k ?? "unknown")] = Number(r.n) || 0;
    } catch { /* table may not exist yet */ }
    return out;
  };
  const [bySource, byPlatform] = await Promise.all([
    grouped(sql`SELECT COALESCE(platform, 'unknown') AS k, COUNT(*)::int AS n
                FROM telemetry_sessions WHERE started_at >= ${since} GROUP BY 1`),
    grouped(sql`SELECT COALESCE(platform, 'unknown') AS k, COUNT(*)::int AS n
                FROM telemetry_sessions
                WHERE last_seen_at >= now() - interval '5 minutes' GROUP BY 1`),
  ]);

  return {
    range,
    since: since.toISOString(),
    metrics: Object.fromEntries(pairs) as Summary["metrics"],
    live: { now: Object.values(byPlatform).reduce((a, b) => a + b, 0), byPlatform },
    bySource,
    fetchedAt: now.toISOString(),
  };
}

export interface ErrorGroup {
  id: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  sources: Record<string, number>;
  versions: [string, number][];
  sampleStack: string | null;
  sampleUrl: string | null;
  /** Equal time slices across the range, oldest first — drives the sparkline. */
  trend: number[];
  /** No occurrence in the period before this range. */
  isNew: boolean;
}

export interface ErrorReport {
  range: Range;
  totalEvents: number;
  groups: ErrorGroup[];
  /** The scan is capped; true means the oldest events in range were not read. */
  truncated: boolean;
}

const ERROR_SCAN_CAP = 5000;
const TREND_BUCKETS = 12;

function inferSource(source: unknown, userAgent: unknown): string {
  if (typeof source === "string" && source) return source;
  return /android/i.test(String(userAgent ?? "")) ? "android" : "web";
}

export async function getErrorGroups(range: Range): Promise<ErrorReport> {
  const ms = rangeHours(range) * 3600_000;
  const now = Date.now();
  const since = new Date(now - ms);
  const prevSince = new Date(since.getTime() - ms);

  let rows: any[] = [];
  let prevMessages: any[] = [];
  try {
    [rows, prevMessages] = await Promise.all([
      db.execute(sql`
        SELECT message, source, error_stack, url, user_agent, metadata, created_at
        FROM app_logs
        WHERE level = 'error' AND created_at >= ${since}
        ORDER BY created_at DESC LIMIT ${ERROR_SCAN_CAP}
      `).then(rowsOf),
      db.execute(sql`
        SELECT DISTINCT message FROM app_logs
        WHERE level = 'error' AND created_at >= ${prevSince} AND created_at < ${since}
        LIMIT ${ERROR_SCAN_CAP}
      `).then(rowsOf),
    ]);
  } catch {
    return { range, totalEvents: 0, groups: [], truncated: false };
  }

  const seenBefore = new Set(prevMessages.map((r) => errorFingerprint(r.message)));
  const bucketMs = ms / TREND_BUCKETS;
  const byFp = new Map<string, ErrorGroup & { _versions: Map<string, number> }>();

  for (const r of rows) {
    const fp = errorFingerprint(r.message);
    const at = new Date(r.created_at).getTime();
    let g = byFp.get(fp);
    if (!g) {
      g = {
        id: fp,
        message: String(r.message ?? "").slice(0, 300),
        count: 0,
        firstSeen: new Date(at).toISOString(),
        lastSeen: new Date(at).toISOString(),
        sources: {},
        versions: [],
        sampleStack: null,
        sampleUrl: null,
        trend: new Array(TREND_BUCKETS).fill(0),
        isNew: !seenBefore.has(fp),
        _versions: new Map(),
      };
      byFp.set(fp, g);
    }
    g.count++;
    // Rows arrive newest-first, so the first row seen is lastSeen and the last is firstSeen.
    g.firstSeen = new Date(at).toISOString();
    const src = inferSource(r.source, r.user_agent);
    g.sources[src] = (g.sources[src] ?? 0) + 1;
    // Android's batch endpoint sends appVersion, its single-error reporter app_version.
    const ver = (r.metadata as any)?.appVersion ?? (r.metadata as any)?.app_version;
    if (ver) g._versions.set(String(ver), (g._versions.get(String(ver)) ?? 0) + 1);
    if (!g.sampleStack && r.error_stack) g.sampleStack = String(r.error_stack).slice(0, 2000);
    if (!g.sampleUrl && r.url) g.sampleUrl = String(r.url).slice(0, 200);
    const slot = Math.min(TREND_BUCKETS - 1, Math.max(0, Math.floor((at - since.getTime()) / bucketMs)));
    g.trend[slot]++;
  }

  const groups = [...byFp.values()]
    .map(({ _versions, ...g }) => ({
      ...g,
      versions: [..._versions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 100);

  return { range, totalEvents: rows.length, groups, truncated: rows.length >= ERROR_SCAN_CAP };
}

/** Error-level app_logs rows in the last `minutes` — used by the spike alert. */
export async function countRecentErrors(minutes: number): Promise<number> {
  try {
    const r = await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM app_logs
      WHERE level = 'error' AND created_at >= now() - make_interval(mins => ${Math.round(minutes)}::int)
    `);
    return Number(rowsOf(r)[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

/** Occurrences of an error (same first 80 chars) in the last 30 days, current one included. */
export async function countSimilarErrors(message: string): Promise<number> {
  try {
    const prefix = String(message).slice(0, 80);
    const r = await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM app_logs
      WHERE level = 'error' AND created_at >= now() - interval '30 days'
        AND left(message, 80) = ${prefix}
    `);
    return Number(rowsOf(r)[0]?.n ?? 0);
  } catch {
    return 0;
  }
}
