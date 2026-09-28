/**
 * KSYK Maps — small "today at a glance" card grid that lives at the
 * bottom of the admin Overview tab.
 *
 * Four sections stacked in a responsive grid:
 *   1. Today's counters — pageviews, feature-uses, searches (raw totals)
 *   2. Top 5 features — features with the most trackFeature() hits today
 *   3. Top 10 searches — de-duplicated search queries today
 *   4. Easter eggs — per-egg count + recent discoveries feed
 *
 * All data is fetched from a single /api/analytics/overview call so the
 * network cost is one round-trip. Each section has an empty state so the
 * panel doesn't look "broken" when there's no data yet.
 */
import { useQuery } from "@tanstack/react-query";
import { getAdminHeaders } from "@/lib/adminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Zap, Search as SearchIcon, Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverviewSummary {
  today: { pageviews: number; featureUses: number; searches: number };
  topFeatures: { name: string; count: number }[];
  topSearches: { query: string; count: number }[];
  easterEggs: {
    secretEasterEgg: number; konamiCode: number; devMode: number;
    ksykTyped: number; logoClicks: number; debugCombo: number;
    total: number;
  };
  fetchedAt: string;
}

interface RecentEgg { egg: string; userId: string; at: string }

const EGG_LABELS: Record<string, string> = {
  secretEasterEgg: "Secret page",
  konamiCode: "Konami code",
  devMode: "Dev mode",
  ksykTyped: "Typed \"ksyk\"",
  logoClicks: "Logo tap x10",
  debugCombo: "Debug combo",
};

export default function OverviewInsightsCards() {
  const { data: summary } = useQuery<OverviewSummary>({
    queryKey: ["analytics-overview"],
    queryFn: async () => {
      const r = await fetch("/api/analytics/overview", {
        credentials: "include",
        headers: getAdminHeaders(),
      });
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: recentEggs = [] } = useQuery<RecentEgg[]>({
    queryKey: ["easter-eggs-recent"],
    queryFn: async () => {
      const r = await fetch("/api/easter-eggs/recent", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const today = summary?.today || { pageviews: 0, featureUses: 0, searches: 0 };
  const topFeatures = summary?.topFeatures || [];
  const topSearches = summary?.topSearches || [];
  const eggs = summary?.easterEggs || {
    secretEasterEgg: 0, konamiCode: 0, devMode: 0,
    ksykTyped: 0, logoClicks: 0, debugCombo: 0, total: 0,
  };

  return (
    <>
      {/* Today's counters row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Pageviews", value: today.pageviews, Icon: Eye, accent: "text-blue-600 dark:text-blue-400" },
          { label: "Feature uses", value: today.featureUses, Icon: Zap, accent: "text-amber-600 dark:text-amber-400" },
          { label: "Searches", value: today.searches, Icon: SearchIcon, accent: "text-emerald-600 dark:text-emerald-400" },
        ].map(({ label, value, Icon, accent }) => (
          <Card
            key={label}
            className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Today · {label}
                  </p>
                  <p className={cn("text-[26px] font-semibold mt-1 tabular-nums tracking-[-0.02em]", accent)}>
                    {value}
                  </p>
                </div>
                <Icon className="h-[18px] w-[18px] text-gray-400 shrink-0 mt-1" strokeWidth={1.75} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top features + top searches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
              <Zap className="h-[18px] w-[18px] text-gray-400" strokeWidth={1.75} />
              Top features today
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {topFeatures.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Zap className="h-8 w-8 text-gray-300 dark:text-gray-700" />
                <p className="text-xs text-muted-foreground">
                  No feature uses tracked today — actions like settings, floor changes, and 3D toggles will show here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {topFeatures.map((f, i) => (
                  <div key={f.name} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground w-4 tabular-nums">
                      {i + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{f.name.replace(/_/g, " ")}</p>
                    </div>
                    <Badge variant="outline" className="tabular-nums text-xs">
                      {f.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
              <SearchIcon className="h-[18px] w-[18px] text-gray-400" strokeWidth={1.75} />
              Top searches today
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {topSearches.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <SearchIcon className="h-8 w-8 text-gray-300 dark:text-gray-700" />
                <p className="text-xs text-muted-foreground">
                  No searches yet — queries typed in the campus search bar will show here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {topSearches.slice(0, 10).map((s, i) => (
                  <div key={s.query} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground w-4 tabular-nums">
                      {i + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">"{s.query}"</p>
                    </div>
                    <Badge variant="outline" className="tabular-nums text-xs">
                      {s.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Easter eggs card */}
      <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
              <Trophy className="h-[18px] w-[18px] text-gray-400" strokeWidth={1.75} />
              Easter eggs discovered
            </CardTitle>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
              <Sparkles className="h-3 w-3" strokeWidth={1.75} />
              {eggs.total} total
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {eggs.total === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Trophy className="h-8 w-8 text-gray-300 dark:text-gray-700" />
              <p className="text-xs text-muted-foreground">
                No eggs found yet — hidden across the app: try typing "ksyk", tapping the logo repeatedly, or pressing Ctrl+Shift+K then Ctrl+Shift+D.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {(Object.entries(eggs) as [string, number][])
                  .filter(([k]) => k !== "total")
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="flex flex-col gap-0.5 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800"
                    >
                      <span className="text-[11px] text-muted-foreground truncate">
                        {EGG_LABELS[k] || k}
                      </span>
                      <span className={cn(
                        "text-[17px] font-semibold tabular-nums leading-none",
                        v > 0 ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-600",
                      )}>
                        {v}
                      </span>
                    </div>
                  ))}
              </div>
              {recentEggs.length > 0 && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                    Recent finds
                  </p>
                  <div className="space-y-1.5">
                    {recentEggs.slice(0, 6).map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {EGG_LABELS[r.egg] || r.egg}
                        </Badge>
                        <span className="text-muted-foreground truncate flex-1">
                          {r.userId.slice(0, 12)}
                          {r.userId.length > 12 && "…"}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          {new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
