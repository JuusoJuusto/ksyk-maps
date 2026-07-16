/**
 * EasterEggStats — admin overview of every KSYK Maps easter egg.
 *
 * Reads its list from `easterEggRegistry` (the single source of
 * truth), then merges in server-side counts from
 * `GET /api/easter-eggs/stats`. Every egg from the registry always
 * shows even if it has zero discoveries, so admins can see the whole
 * roster + the newly-added ones.
 *
 * Also exposes:
 *   - Per-egg card with icon, discovery hint (blurred until "Reveal"
 *     clicked), reward, and count.
 *   - A "reset all counters" button that POSTs to
 *     `/api/easter-eggs/reset` (admin-only) and also wipes the
 *     local browser flags so the resetter gets a clean hunt too.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Award, Eye, EyeOff, RotateCcw, Sparkles, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASTER_EGGS, RARITY_WEIGHT, resetLocalEggFlags } from "@/lib/easterEggRegistry";
import type { EasterEgg } from "@/lib/easterEggRegistry";

interface EggStatsResponse {
  totalDiscoveries?: number;
  uniqueEggs?: number;
  /** [{ id, name, count, lastFound }] — from firebaseStorage. */
  byEgg?: Array<{ id: string; name?: string; count: number; lastFound?: string }>;
  recent?: Array<{ eggId: string; eggName?: string; timestamp: string; userId?: string }>;
}

export default function EasterEggStats() {
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const { data: stats } = useQuery<EggStatsResponse | null>({
    queryKey: ["/api/easter-eggs/stats"],
    queryFn: async () => {
      const res = await fetch("/api/easter-eggs/stats", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Merge registry with counts. Every egg from the registry appears,
  // even when count is 0.
  const merged = useMemo(() => {
    const countById = new Map<string, number>();
    for (const e of stats?.byEgg ?? []) countById.set(e.id, e.count);
    const list = EASTER_EGGS.map((egg) => ({
      egg,
      count: countById.get(egg.id) ?? 0,
    }));
    list.sort((a, b) =>
      RARITY_WEIGHT[a.egg.rarity] - RARITY_WEIGHT[b.egg.rarity] ||
      b.count - a.count ||
      a.egg.name.localeCompare(b.egg.name),
    );
    return list;
  }, [stats]);

  const totalDiscoveries = merged.reduce((sum, m) => sum + m.count, 0);
  const eggsWithFinds = merged.filter((m) => m.count > 0).length;
  const totalEggs = merged.length;
  const uniqueUsers = stats?.uniqueEggs ?? 0;

  const reset = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/easter-eggs/reset", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Reset failed: ${res.status}`);
      return res.json();
    },
    onSuccess: (body: { deleted?: number }) => {
      resetLocalEggFlags();
      // Also nuke the "seen this epoch" flag so if the epoch stays the
      // same on subsequent visits, the flags don't reappear.
      try { localStorage.removeItem("ksyk_egg_reset_epoch"); } catch { /* ignore */ }
      qc.invalidateQueries({ queryKey: ["/api/easter-eggs/stats"] });
      setResetMessage(`Reset complete — ${body.deleted ?? 0} discoveries cleared. Go hunt them again!`);
      setConfirmingReset(false);
    },
    onError: (e) => {
      setResetMessage(`Reset failed: ${(e as Error).message}`);
      setConfirmingReset(false);
    },
  });

  return (
    <div className="space-y-6">
      {/* Overview summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          Icon={Sparkles}
          label="Total Discoveries"
          value={totalDiscoveries}
          tint="blue"
        />
        <SummaryCard
          Icon={Users}
          label="Eggs Found (of all)"
          value={`${eggsWithFinds} / ${totalEggs}`}
          tint="purple"
        />
        <SummaryCard
          Icon={TrendingUp}
          label="Discovery Rate"
          value={`${uniqueUsers > 0 ? Math.round((totalDiscoveries / (uniqueUsers * totalEggs)) * 100) : 0}%`}
          tint="green"
        />
      </div>

      {/* Roster */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-6 w-6" />
                Easter Egg Roster
              </CardTitle>
              <CardDescription className="text-purple-100">
                {EASTER_EGGS.length} eggs · sorted by rarity, then by finds
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={() => setConfirmingReset(true)}
              variant="secondary"
              className="bg-white/15 text-white hover:bg-white/25 border-none"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset counter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {resetMessage && (
            <div className="mb-4 rounded-lg border border-blue-500/40 bg-blue-500/5 p-3 text-sm text-blue-800 dark:text-blue-200">
              {resetMessage}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {merged.map(({ egg, count }) => (
              <EggCard
                key={egg.id}
                egg={egg}
                count={count}
                revealed={revealed.has(egg.id)}
                onToggleReveal={() =>
                  setRevealed((prev) => {
                    const next = new Set(prev);
                    if (next.has(egg.id)) next.delete(egg.id);
                    else next.add(egg.id);
                    return next;
                  })
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent activity */}
      {stats?.recent && stats.recent.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Recent Discoveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {stats.recent.slice(0, 12).map((r, i) => (
                <li
                  key={`${r.eggId}-${i}`}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg text-sm"
                >
                  <div>
                    <p className="font-semibold">{r.eggName || r.eggId}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">{r.userId ?? "anonymous"}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Reset confirmation modal */}
      {confirmingReset && (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmingReset(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(28rem,95vw)] rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-lg font-semibold">Reset all easter egg counters?</p>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              This wipes every discovery record from the server and clears
              your local browser flags. Everyone gets a fresh hunt from
              their next page load. This can't be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingReset(false)}
                disabled={reset.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => reset.mutate()}
                disabled={reset.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {reset.isPending ? "Resetting…" : "Yes, reset everything"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────────────

function SummaryCard({
  Icon, label, value, tint,
}: {
  Icon: typeof Sparkles;
  label: string;
  value: number | string;
  tint: "blue" | "purple" | "green";
}) {
  const tints = {
    blue:   { border: "border-blue-200",   bg: "bg-blue-100 dark:bg-blue-500/20",   text: "text-blue-600" },
    purple: { border: "border-purple-200", bg: "bg-purple-100 dark:bg-purple-500/20", text: "text-purple-600" },
    green:  { border: "border-green-200",  bg: "bg-green-100 dark:bg-green-500/20",  text: "text-green-600" },
  }[tint];
  return (
    <Card className={cn("shadow-lg border-2", tints.border)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className={cn("text-3xl font-bold", tints.text)}>{value}</p>
          </div>
          <div className={cn("p-3 rounded-full", tints.bg)}>
            <Icon className={cn("h-6 w-6", tints.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EggCard({
  egg, count, revealed, onToggleReveal,
}: {
  egg: EasterEgg;
  count: number;
  revealed: boolean;
  onToggleReveal: () => void;
}) {
  const Icon = egg.icon;
  return (
    <div className="border-2 border-border rounded-xl p-4 hover:shadow-md transition-all bg-card">
      <div className="flex items-start gap-3">
        <div className={cn("p-3 rounded-xl shrink-0", egg.bgColor)}>
          <Icon className={cn("h-6 w-6", egg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-foreground">{egg.name}</h3>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase tracking-wider",
                egg.rarity === "common"    && "text-gray-500",
                egg.rarity === "rare"      && "text-blue-600 border-blue-300",
                egg.rarity === "epic"      && "text-purple-600 border-purple-300",
                egg.rarity === "legendary" && "text-yellow-600 border-yellow-300",
              )}
            >
              {egg.rarity}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{egg.description}</p>
          <p className="text-[11px] text-purple-600 dark:text-purple-300 font-semibold mt-1">
            🎁 {egg.reward}
          </p>

          {/* Discovery hint — blurred by default so admins don't accidentally
              spoil themselves scrolling the roster. */}
          <div className="mt-2 flex items-center gap-2">
            <p
              className={cn(
                "text-[11px] font-mono flex-1 rounded px-2 py-1 border",
                revealed ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5" : "border-gray-300 dark:border-gray-700 text-transparent bg-gray-100 dark:bg-gray-800 select-none",
              )}
              aria-label="Discovery hint"
              style={revealed ? undefined : { textShadow: "0 0 8px rgba(0,0,0,0.7)" }}
            >
              {egg.hint}
            </p>
            <button
              type="button"
              onClick={onToggleReveal}
              title={revealed ? "Hide hint" : "Reveal hint"}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-2xl font-bold tabular-nums">{count}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">finds</div>
        </div>
      </div>
    </div>
  );
}
