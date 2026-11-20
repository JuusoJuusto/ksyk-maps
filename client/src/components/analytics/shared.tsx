/**
 * Shared pieces of the Analytics tab: range picker, KPI card with period
 * delta, typed admin API helper. Wilma tokens: navy #003d82, hairline
 * #d5dae0 / #2a3040, radii 4/6/8.
 */
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export type Range = "24h" | "7d" | "30d" | "90d";
export const RANGES: Range[] = ["24h", "7d", "30d", "90d"];

export const PANEL = "rounded-lg border border-[#d5dae0] dark:border-[#2a3040] bg-white dark:bg-gray-950";
/** Lighter than the brand navy so thin lines stay visible on the dark theme. */
const SPARK_BLUE = "#3d78bd";

/** GET an admin endpoint; throws on non-2xx so ErrorRetry can show it. 401s renew the token once. */
export async function adminGet<T>(url: string): Promise<T> {
  return (await apiRequest("GET", url)).json() as Promise<T>;
}

export function useAdminQuery<T>(key: unknown[], url: string, refetchMs?: number) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => adminGet<T>(url),
    refetchInterval: refetchMs,
    staleTime: 10_000,
  });
}

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function timeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

/** Uppercase 10px masthead with a hairline, used above every block. */
export function Masthead({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{children}</h3>
      <div className="flex-1 h-px bg-[#d5dae0] dark:bg-[#2a3040]" />
      {right}
    </div>
  );
}

export function RangePicker({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  return (
    <div role="tablist" aria-label="Date range" className="inline-flex rounded-md border border-[#d5dae0] dark:border-[#2a3040] p-0.5">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={range === r}
          onClick={() => onChange(r)}
          className={cn(
            "h-7 min-w-[40px] px-2.5 rounded text-[12px] font-semibold tabular-nums transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d82]",
            range === r
              ? "bg-[#003d82] text-white"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900",
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

/** +12% / -8% vs the previous period. `badWhenUp` flips the colours (errors). */
export function Delta({ current, previous, badWhenUp }: { current: number; previous: number; badWhenUp?: boolean }) {
  if (previous === 0 && current === 0) return <span className="text-[11px] text-gray-400">no change</span>;
  if (previous === 0) return <span className="text-[11px] font-semibold text-gray-500">new</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-[11px] text-gray-400">no change</span>;
  const good = badWhenUp ? pct < 0 : pct > 0;
  return (
    <span className={cn("text-[11px] font-semibold tabular-nums", good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
      {pct > 0 ? "+" : ""}{pct}%
    </span>
  );
}

export function Kpi({
  label, current, previous, spark, badWhenUp, loading,
}: {
  label: string; current?: number; previous?: number; spark?: number[]; badWhenUp?: boolean; loading?: boolean;
}) {
  const data = (spark ?? []).map((n, i) => ({ i, n }));
  return (
    <div className={cn(PANEL, "p-3.5 flex flex-col")}>
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">{label}</p>
      <div className="flex items-baseline gap-2 mt-1.5">
        <span className="text-[26px] leading-none font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white">
          {loading || current === undefined ? "…" : fmtNum(current)}
        </span>
        {!loading && current !== undefined && previous !== undefined && (
          <Delta current={current} previous={previous} badWhenUp={badWhenUp} />
        )}
      </div>
      {data.length > 1 && (
        <div className="h-8 mt-2 -mx-0.5" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <Line type="monotone" dataKey="n" stroke={badWhenUp ? "#d92d20" : SPARK_BLUE} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-[13px] font-medium text-gray-700 dark:text-gray-200">{title}</p>
      {hint && <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">{hint}</p>}
    </div>
  );
}
