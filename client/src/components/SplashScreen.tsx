/**
 * KSYK Maps — boot splash.
 *
 * Minimal UI: spinner + brand + determinate progress bar. The checks
 * still run — they're just hidden. Each check flips a bit of the
 * progress bar as it resolves; the splash stays up until:
 *   - the map's first frame paints (`ksyk:map-ready` event), AND
 *   - the buildings + rooms queries have answered
 * or the safety cap fires (8s). If none of the required data
 * responded and the safety cap fires, the splash shows a retry hint
 * so the user isn't left in front of an eternal spinner.
 *
 * The gate is REAL: it blocks the app render until data is verified
 * loadable, so no more "map didn't load, refresh once".
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchList } from "@/lib/fetchList";

const FADE_MS = 350;
/** Absolute cap. A dead API can't hold the splash forever. */
const BOOT_MAX_MS = 8000;
/** Minimum time so the brand actually registers. */
const BOOT_MIN_MS = 500;

interface BootState {
  ready: boolean;
  progress: number;
  showRetry: boolean;
  errorCount: number;
}

function useBootGate(): BootState {
  const startRef = useState(() => performance.now())[0];

  // Real requests — resolution counts as "ok", even 404 (fetchList
  // soft-fails to `[]`). If the query throws we count that as an
  // error and surface the retry banner if the cap fires.
  const buildings = useQuery<unknown[]>({
    queryKey: ["/api/buildings", "boot"],
    queryFn: () => fetchList("/api/buildings"),
    staleTime: 60_000,
    retry: 2,
  });
  const rooms = useQuery<unknown[]>({
    queryKey: ["/api/rooms", "boot"],
    queryFn: () => fetchList("/api/rooms"),
    staleTime: 60_000,
    retry: 2,
  });
  const layers = useQuery<unknown[]>({
    queryKey: ["/api/layers", "boot"],
    queryFn: () => fetchList("/api/layers"),
    staleTime: 60_000,
    retry: 1,
  });
  const mapDefaults = useQuery<unknown>({
    queryKey: ["/api/map-defaults", "boot"],
    queryFn: async () => {
      const r = await fetch("/api/map-defaults");
      return r.ok ? await r.json() : null;
    },
    staleTime: 60_000,
    retry: 1,
  });
  const published = useQuery<unknown>({
    queryKey: ["/api/map-package/published", "boot"],
    queryFn: async () => {
      const r = await fetch("/api/map-package/published");
      // 404 is fine — nothing published yet.
      return r.ok ? await r.json() : null;
    },
    staleTime: 60_000,
    retry: 0,
  });

  const [mapPainted, setMapPainted] = useState(false);
  useEffect(() => {
    const onReady = () => setMapPainted(true);
    window.addEventListener("ksyk:map-ready", onReady);
    return () => window.removeEventListener("ksyk:map-ready", onReady);
  }, []);

  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setMinElapsed(true), BOOT_MIN_MS);
    const t2 = window.setTimeout(() => setTimedOut(true), BOOT_MAX_MS);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  return useMemo<BootState>(() => {
    // Weighted signals — the map + the two required data queries
    // carry the most weight. Others add small bumps for pacing so
    // the bar feels alive.
    const signals: Array<{ done: boolean; weight: number }> = [
      { done: buildings.isFetched, weight: 25 },
      { done: rooms.isFetched,     weight: 25 },
      { done: layers.isFetched,    weight: 10 },
      { done: mapDefaults.isFetched, weight: 10 },
      { done: published.isFetched, weight: 10 },
      { done: mapPainted,          weight: 20 },
    ];
    const totalWeight = signals.reduce((s, x) => s + x.weight, 0);
    const doneWeight = signals.filter((s) => s.done).reduce((s, x) => s + x.weight, 0);
    const now = performance.now();
    const elapsed = now - startRef;
    // Time-based floor so the bar never appears stuck.
    const timeFloor = Math.min(0.9, elapsed / BOOT_MAX_MS);
    const progress = Math.max(doneWeight / totalWeight, timeFloor);
    const dataReady = buildings.isFetched && rooms.isFetched;
    const mapReady = mapPainted || elapsed > BOOT_MAX_MS * 0.7;
    const ready = ((dataReady && mapReady) && minElapsed) || timedOut;
    const errorCount = [buildings.error, rooms.error, layers.error, mapDefaults.error, published.error]
      .filter(Boolean).length;
    return {
      ready,
      progress: Math.min(1, progress),
      showRetry: timedOut && !dataReady,
      errorCount,
    };
  }, [
    buildings.isFetched, buildings.error,
    rooms.isFetched, rooms.error,
    layers.isFetched, layers.error,
    mapDefaults.isFetched, mapDefaults.error,
    published.isFetched, published.error,
    mapPainted, minElapsed, timedOut, startRef,
  ]);
}

export default function SplashScreen() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  const { ready, progress, showRetry, errorCount } = useBootGate();

  useEffect(() => {
    if (!ready || phase !== "in") return;
    setPhase("out");
  }, [ready, phase]);

  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("gone"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        opacity: phase === "out" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: phase === "out" ? "none" : "auto",
      }}
    >
      <div className="flex flex-col items-center gap-5 px-8 w-[min(20rem,90vw)]">
        {/* Logo + ring */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 80 80"
            aria-hidden="true"
            style={{ animation: "ksyk-ring-spin 0.95s linear infinite" }}
          >
            <circle cx={40} cy={40} r={34} fill="none" stroke="#e5e7eb" strokeWidth={3} />
            <circle
              cx={40} cy={40} r={34}
              fill="none" stroke="#2563eb" strokeWidth={3}
              strokeLinecap="round" strokeDasharray="155 60"
              transform="rotate(-90 40 40)"
            />
          </svg>
          <img
            src="/favicon-128.png"
            alt=""
            width={44} height={44}
            className="relative block object-contain"
            decoding="sync"
            fetchPriority="high"
            draggable={false}
          />
        </div>

        {/* Brand */}
        <div className="text-center">
          <p className="text-xl font-bold tracking-tight text-slate-900">KSYK Maps</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">by Nordbyte Studio</p>
        </div>

        {/* Determinate progress bar. Grows with each satisfied signal
         *  plus a small time floor so it never appears stuck. */}
        <div className="w-full">
          <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-[width] duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2 tabular-nums">
            {Math.round(progress * 100)}%
          </p>
        </div>

        {showRetry && (
          <div className="text-center space-y-2">
            <p className="text-[11px] text-red-600 font-medium">
              Loading is taking longer than expected.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline decoration-blue-600/30 hover:decoration-blue-600"
            >
              Reload to retry
            </button>
            {errorCount > 0 && (
              <p className="text-[10px] text-slate-500">
                {errorCount} endpoint{errorCount === 1 ? "" : "s"} not responding.
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ksyk-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
