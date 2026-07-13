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
      const r = await fetch("/api/analytics/overview", { credentials: "include" });
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
          { label: "Pageviews", value: today.pageviews, Icon: Eye, ring: "from-blue-500 to-indigo-500" },
          { label: "Feature uses", value: today.featureUses, Icon: Zap, ring: "from-amber-500 to-orange-500" },
          { label: "Searches", value: today.searches, Icon: SearchIcon, ring: "from-emerald-500 to-teal-500" },
        ].map(({ label, value, Icon, ring }) => (
          <Card
            key={label}
            className="relative overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/5 bg-card"
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${ring}`} />
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                    Today · {label}
                  </p>
                  <p className="text-3xl font-bold mt-1 tabular-nums tracking-[-0.02em]">
                    {value}
                  </p>
                </div>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${ring} text-white shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top features + top searches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl ring-1 ring-black/5 dark:ring-white/5 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
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

        <Card className="rounded-2xl ring-1 ring-black/5 dark:ring-white/5 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <SearchIcon className="h-4 w-4 text-emerald-500" />
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
      <Card className="rounded-2xl ring-1 ring-black/5 dark:ring-white/5 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-purple-500" />
              Easter eggs discovered
            </CardTitle>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
              <Sparkles className="h-3 w-3" />
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
                      className={cn(
                        "flex flex-col gap-0.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50",
                        v > 0 && "ring-1 ring-purple-200 dark:ring-purple-900/40",
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground truncate">
                        {EGG_LABELS[k] || k}
                      </span>
                      <span className="text-lg font-black tabular-nums leading-none text-purple-600 dark:text-purple-400">
                        {v}
                      </span>
                    </div>
                  ))}
              </div>
              {recentEggs.length > 0 && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-2">
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
