/**
 * RrwebReplay — v4.7.12
 *
 * Admin surface for the rrweb DOM snapshot recorder. Two parts:
 *   - RrwebSessionsCard: table of recorded sessions with a "Play" button per row.
 *   - RrwebPlayerModal: fullscreen overlay wrapping rrweb-player, loaded
 *     lazily so the ~250 KB player bundle doesn't hit the admin panel
 *     until the user actually clicks Play.
 *
 * The player library is imported dynamically to keep the AdminAnalyticsDashboard
 * initial bundle lean.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchList, fetchObject } from "@/lib/fetchList";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, X, Video, Loader2 } from "lucide-react";

interface SessionRow {
  sessionId: string;
  batches: number;
  totalEvents: number;
  startedAt: string;
  endedAt: string;
}

interface FetchedSession {
  sessionId: string;
  eventCount: number;
  events: unknown[];
}

function useRrwebSessions(range: "24h" | "7d" | "30d" | "90d") {
  return useQuery<SessionRow[]>({
    queryKey: ["admin-rrweb-sessions", range],
    queryFn: async () => (await fetchList<SessionRow>(`/api/sessions/rrweb?range=${range}`)) ?? [],
    refetchInterval: 60_000,
  });
}

/** Human-readable duration from two ISO timestamps. */
function fmtDuration(a: string, b: string): string {
  try {
    const ms = new Date(b).getTime() - new Date(a).getTime();
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return `${m}m ${rest}s`;
  } catch { return "—"; }
}

export function RrwebSessionsCard({ range }: { range: "24h" | "7d" | "30d" | "90d" }) {
  const { data = [], isLoading } = useRrwebSessions(range);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4" /> Session replays
          </CardTitle>
          <CardDescription className="text-xs">
            rrweb DOM snapshots from public routes. {data.length.toLocaleString()} sessions in the {range} window. Recording skips admin sessions, /admin, /builder, opt-outs, and DNT.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-xs text-muted-foreground py-2">Loading…</p>}
          {!isLoading && data.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              No recordings yet. Recording started in v4.7.12 — sessions land here as students visit the map.
            </p>
          )}
          {data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left px-2 py-1.5">Session</th>
                    <th className="text-right px-2 py-1.5">Batches</th>
                    <th className="text-right px-2 py-1.5">Events</th>
                    <th className="text-right px-2 py-1.5">Duration</th>
                    <th className="text-right px-2 py-1.5">Ended</th>
                    <th className="w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.slice(0, 20).map((s) => (
                    <tr key={s.sessionId} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                      <td className="px-2 py-1.5 font-mono text-[10px] text-blue-600 dark:text-blue-400 truncate max-w-[220px]">
                        {s.sessionId.slice(0, 28)}
                      </td>
                      <td className="text-right font-mono tabular-nums px-2 py-1.5">{s.batches}</td>
                      <td className="text-right font-mono tabular-nums px-2 py-1.5">{s.totalEvents.toLocaleString()}</td>
                      <td className="text-right font-mono tabular-nums px-2 py-1.5">{fmtDuration(s.startedAt, s.endedAt)}</td>
                      <td className="text-right font-mono text-[10px] px-2 py-1.5">
                        {new Date(s.endedAt).toLocaleTimeString()}
                      </td>
                      <td className="text-right px-2 py-1.5">
                        <button
                          onClick={() => setOpenId(s.sessionId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-semibold hover:opacity-90"
                        >
                          <Play className="h-3 w-3" /> Play
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {openId && (
        <RrwebPlayerModal sessionId={openId} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}

export function RrwebPlayerModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<{ $destroy?: () => void } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery<FetchedSession | null>({
    queryKey: ["admin-rrweb-session", sessionId],
    queryFn: () => fetchObject<FetchedSession>(`/api/sessions/rrweb/${sessionId}`),
  });

  const events = useMemo(() => data?.events ?? [], [data]);
  const isEmpty = !isLoading && data !== undefined && events.length === 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    if (!events.length) return;
    (async () => {
      try {
        // Lazy-load rrweb-player + its CSS so the player bundle
        // isn't pulled into the initial admin chunk.
        const [{ default: RrwebPlayer }] = await Promise.all([
          import("rrweb-player"),
          import("rrweb-player/dist/style.css"),
        ]);
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = "";

        // rrweb-player's constructor synchronously creates an iframe, sets
        // sandbox="allow-same-origin", then writes the replay HTML — all
        // before any async observer can fire. Patch Element.prototype.setAttribute
        // synchronously before construction so the iframe is born with
        // allow-scripts already present, preventing the "Blocked script
        // execution in 'about:blank'" console error entirely.
        const origSetAttr = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name: string, value: string) {
          if (this instanceof HTMLIFrameElement && name === "sandbox" && !value.includes("allow-scripts")) {
            value = (value + " allow-scripts").trim();
          }
          return origSetAttr.call(this, name, value);
        };

        try {
          playerRef.current = new RrwebPlayer({
            target: containerRef.current,
            props: {
              events: events as unknown as never[], // rrweb-player types stricter than API returns
              autoPlay: true,
              width: Math.min(1280, window.innerWidth - 80),
              height: Math.min(720, window.innerHeight - 160),
              skipInactive: true,
              showController: true,
              UNSAFE_replayCanvas: false,
              liveMode: false,
            },
          }) as unknown as { $destroy?: () => void };
        } finally {
          Element.prototype.setAttribute = origSetAttr;
        }

        // Resize the player when the modal/window is resized.
        const ro = new ResizeObserver(() => {
          if (!containerRef.current) return;
          const w = Math.min(1280, window.innerWidth - 80);
          const h = Math.min(720, window.innerHeight - 160);
          (playerRef.current as any)?.$set?.({ width: w, height: h });
        });
        if (containerRef.current) ro.observe(containerRef.current);
        const origDestroy = playerRef.current.$destroy?.bind(playerRef.current);
        playerRef.current.$destroy = () => { ro.disconnect(); origDestroy?.(); };

        setStatus("ready");
      } catch (e: any) {
        if (!cancelled) {
          setErrMsg(e?.message ?? "Player failed to load");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
      try { playerRef.current?.$destroy?.(); } catch { /* noop */ }
      playerRef.current = null;
    };
  }, [events]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur shadow-lg"
        title="Close (Esc)"
      >
        <X className="h-5 w-5" strokeWidth={2.5} />
      </button>
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-white text-xs font-mono">
        {sessionId.slice(0, 32)}
      </div>

      <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
        <div ref={containerRef} className="min-w-[640px] min-h-[400px]" />
        {status === "loading" && !isEmpty && (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading player…</span>
          </div>
        )}
        {isEmpty && (
          <div className="p-8 text-center text-slate-500 text-sm">
            No recording data for this session.
          </div>
        )}
        {status === "error" && (
          <div className="p-8 text-center text-red-600 text-sm">
            Failed to load player{errMsg ? `: ${errMsg}` : ""}.
          </div>
        )}
      </div>
    </div>
  );
}
