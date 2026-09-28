/**
 * KSYK Maps — External analytics aggregator.
 *
 * Pulls visit / pageview / event data from:
 *   - Cloudflare Web Analytics (GraphQL Analytics API)
 *   - Vercel Web Analytics (public dashboard endpoint)
 *   - Firestore (our own telemetry collected via lib/telemetry)
 *
 * Each source is independent — if a provider's token isn't configured
 * server-side it just shows "Not configured" and the others keep working.
 * The actual API calls live in /api/analytics/external on the server,
 * which holds the secrets (we never expose tokens to the client).
 */

import { useState } from "react";
import { getAdminHeaders } from "@/lib/adminAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle, Cloud, Globe, Loader2, RefreshCw, Settings, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderSnapshot {
  configured: boolean;
  source: string;
  visitors24h?: number;
  pageviews24h?: number;
  visitors7d?: number;
  pageviews7d?: number;
  topPages?: Array<{ path: string; views: number }>;
  topCountries?: Array<{ code: string; visitors: number }>;
  topReferrers?: Array<{ source: string; visitors: number }>;
  error?: string;
  fetchedAt: string;
}

interface ExternalAnalyticsResponse {
  cloudflare?: ProviderSnapshot;
  firestore?: ProviderSnapshot;
}

export default function AnalyticsExternalPanel() {
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");

  const { data, isLoading, refetch, isFetching } = useQuery<ExternalAnalyticsResponse>({
    queryKey: ["analytics-external", range],
    queryFn: async () => {
      const r = await fetch(`/api/analytics/external?range=${range}`, {
        credentials: "include",
        headers: getAdminHeaders(),
      });
      if (!r.ok) return {};
      return r.json();
    },
    staleTime: 60_000,
  });

  const providers: Array<{ key: keyof ExternalAnalyticsResponse; name: string; Icon: typeof Cloud }> = [
    { key: "cloudflare", name: "Cloudflare", Icon: Cloud },
    { key: "firestore", name: "Live (Firestore)", Icon: Zap },
  ];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          {(["24h", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "h-8 px-3 text-[12px] font-medium rounded-lg transition-colors tabular-nums",
                range === r
                  ? "bg-white dark:bg-gray-950 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 dark:hover:text-gray-100",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-10 px-4 rounded-xl border-gray-200 dark:border-gray-800 text-[13px] gap-1.5"
        >
          {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />}
          Refresh
        </Button>
      </div>

      {/* Providers grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {providers.map(({ key, name, Icon }) => {
          const snap = data?.[key];
          return (
            <Card key={key} className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-[18px] w-[18px] text-gray-400" strokeWidth={1.75} />
                    <CardTitle className="text-[15px] font-semibold text-gray-900 dark:text-white">{name}</CardTitle>
                  </div>
                  {!snap?.configured ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Settings className="h-3 w-3" strokeWidth={1.75} /> Not configured
                    </span>
                  ) : snap.error ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3 w-3" strokeWidth={1.75} /> Error
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2.5">
                {isLoading ? (
                  <div className="py-6 flex items-center justify-center text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : !snap?.configured ? (
                  <div className="py-3 text-xs text-gray-500 leading-relaxed">
                    <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Add a token in env to enable.
                    </p>
                    <p>
                      {key === "cloudflare" && "Set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_SITE_TAG in Vercel env vars."}
                      {key === "firestore" && "Already on — no setup needed."}
                    </p>
                  </div>
                ) : snap.error ? (
                  <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{snap.error}</p>
                ) : (
                  <>
                    {/* Two big numbers */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Metric
                        label="Visitors"
                        value={range === "24h" ? snap.visitors24h : snap.visitors7d}
                      />
                      <Metric
                        label="Pageviews"
                        value={range === "24h" ? snap.pageviews24h : snap.pageviews7d}
                      />
                    </div>
                    {/* Top lists */}
                    {snap.topPages && snap.topPages.length > 0 && (
                      <MiniList title="Top pages" rows={snap.topPages.map((p) => ({ key: p.path, value: p.views }))} />
                    )}
                    {snap.topReferrers && snap.topReferrers.length > 0 && (
                      <MiniList title="Top sources" rows={snap.topReferrers.map((p) => ({ key: p.source, value: p.visitors }))} />
                    )}
                    {snap.topCountries && snap.topCountries.length > 0 && (
                      <MiniList title="Countries" rows={snap.topCountries.map((p) => ({ key: p.code, value: p.visitors }))} />
                    )}
                    <p className="text-[10px] text-gray-400 pt-1.5 flex items-center gap-1">
                      <Globe className="h-2.5 w-2.5" />
                      {snap.source} · refreshed {new Date(snap.fetchedAt).toLocaleTimeString()}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed max-w-2xl">
        Cloudflare data is fetched server-side using the API token stored as an environment variable —
        the client never sees it. Firestore numbers come from our own{" "}
        <code className="font-mono text-blue-600 dark:text-blue-400">lib/telemetry</code> stream which already runs in production.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="text-[22px] font-semibold tabular-nums mt-1 text-gray-900 dark:text-white">
        {typeof value === "number" ? value.toLocaleString() : "—"}
      </p>
    </div>
  );
}

function MiniList({ title, rows }: { title: string; rows: Array<{ key: string; value: number }> }) {
  return (
    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
      <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-400 mb-1.5">{title}</p>
      <div className="space-y-1">
        {rows.slice(0, 5).map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="text-gray-400 font-mono w-4 text-right">{i + 1}</span>
            <span className="truncate flex-1 text-gray-700 dark:text-gray-300">{r.key}</span>
            <span className="font-mono tabular-nums text-gray-500">{r.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
