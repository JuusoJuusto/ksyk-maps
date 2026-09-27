/**
 * KSYK Maps — boot splash.
 *
 * Always white background — no dark-mode switching. The very first
 * visible frame is white and stays white until the fade-out.
 *
 * Progress bar is driven by two sources:
 *   1. Real loading signals (weighted) — fires on each query settling
 *      and on the map's first frame painting via `ksyk:map-ready`.
 *   2. A 200ms tick that lets the time-based fill animate smoothly
 *      between signal updates (prevents the bar from freezing at 80%
 *      while waiting for map paint).
 *
 * The bar reaches 100% only when the gate truly opens; it
 * asymptotically crawls toward 97% while waiting so it never appears
 * stuck.
 */

import { memo, useEffect, useMemo, useState } from "react";
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

  // Tick every 400ms so the time-based fill animates continuously
  // even when no query state changes (prevents the bar freezing at
  // 80% while waiting for the map's first frame). 400ms halves
  // main-thread pressure vs 200ms while still keeping the bar moving.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 400);
    return () => clearInterval(t);
  }, []);

  return useMemo<BootState>(() => {
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
    const elapsed = performance.now() - startRef;
    const dataReady = buildings.isFetched && rooms.isFetched;
    const mapReady = mapPainted || elapsed > BOOT_MAX_MS * 0.7;
    const ready = ((dataReady && mapReady) && minElapsed) || timedOut;

    let progress: number;
    if (ready) {
      progress = 1;
    } else {
      const signalProgress = doneWeight / totalWeight;
      // Asymptotically crawl from current signal progress toward 0.97
      // over twice the boot cap — bar keeps moving without racing to 100%.
      const ceiling = 0.97;
      const remaining = ceiling - signalProgress;
      const fill = remaining * (1 - Math.exp(-elapsed / (BOOT_MAX_MS * 1.2)));
      progress = Math.min(ceiling, signalProgress + fill);
    }

    const errorCount = [buildings.error, rooms.error, layers.error, mapDefaults.error, published.error]
      .filter(Boolean).length;
    return {
      ready,
      progress,
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
    tick,
  ]);
}

export default function SplashScreen() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  const { ready, progress, showRetry, errorCount } = useBootGate();
  const isDark = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  )[0];

  useEffect(() => {
    if (!ready || phase !== "in") return;
    setPhase("out");
  }, [ready, phase]);

  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("gone"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // v4.7.26 — inert the app tree while the splash is visible so inputs
  // rendered behind the overlay can't steal focus / trigger autofill.
  // Firefox and iOS Safari otherwise happily fill password fields into
  // forms the user cannot see, then leave them stuck when the splash
  // fades. Toggle #app-root's `inert` attribute directly — it's the
  // cleanest way to disable focus + pointer events on the whole tree.
  useEffect(() => {
    const root = document.getElementById("app-root");
    if (!root) return;
    if (phase === "gone") {
      root.removeAttribute("inert");
      root.removeAttribute("aria-hidden");
    } else {
      root.setAttribute("inert", "");
      root.setAttribute("aria-hidden", "true");
    }
    return () => {
      root.removeAttribute("inert");
      root.removeAttribute("aria-hidden");
    };
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
        background: isDark ? "#030712" : "#ffffff",
        opacity: phase === "out" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: phase === "out" ? "none" : "auto",
      }}
    >
      <div className="flex flex-col items-center gap-5 px-8 w-[min(20rem,90vw)]">
        <BootSpinner />

        {/* Brand */}
        <div className="text-center">
          <p className="text-xl font-bold tracking-tight" style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>
            KSYK Maps
          </p>
          <p className="text-xs font-medium mt-0.5" style={{ color: isDark ? "#475569" : "#94a3b8" }}>
            Campus navigation
          </p>
        </div>

        {/* Determinate progress bar */}
        <div className="w-full">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: isDark ? "#1e293b" : "#f1f5f9" }}>
            <div
              className="h-full bg-blue-600 transition-[width] duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-center mt-2 tabular-nums" style={{ color: isDark ? "#475569" : "#94a3b8" }}>
            {Math.round(progress * 100)}%
          </p>
        </div>

        {showRetry && (
          <div className="text-center space-y-2">
            <p className="text-[11px] text-red-500 font-medium">
              Loading is taking longer than expected.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-[11px] font-semibold text-blue-500 hover:text-blue-400 underline decoration-blue-500/30 hover:decoration-blue-500"
            >
              Reload to retry
            </button>
            {errorCount > 0 && (
              <p className="text-[10px]" style={{ color: "#94a3b8" }}>
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
        /* v4.7.27 — spinner uses pure CSS border (border-top-color /
         * border-right-color) so only transform:rotate() is animated —
         * compositor-only, never blocks on main-thread paint during
         * heavy startup. Wrapped in memo so reconciliation skips it. */
        .ksyk-spinner-wrap {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          contain: layout paint;
        }
        .ksyk-spinner-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: #2563eb;
          border-right-color: rgba(37, 99, 235, 0.45);
          background: transparent;
          box-sizing: border-box;
          animation: ksyk-ring-spin 0.95s linear infinite;
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        .ksyk-spinner-track {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid #e5e7eb;
          box-sizing: border-box;
        }
        @media (prefers-color-scheme: dark) {
          .ksyk-spinner-track { border-color: #1e293b; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ksyk-spinner-ring { animation: none; }
        }
      `}</style>
    </div>
  );
}

/**
 * Memo'd so React reconciliation during query hydration never touches
 * this subtree. The CSS animation runs on the compositor thread —
 * frame-perfect 60fps independent of main-thread JS work.
 */
const BootSpinner = memo(function BootSpinner() {
  return (
    <div className="ksyk-spinner-wrap">
      <div className="ksyk-spinner-track" aria-hidden="true" />
      <div className="ksyk-spinner-ring" aria-hidden="true" />
      <img
        src="/favicon-128.png"
        alt=""
        width={44}
        height={44}
        className="relative block object-contain"
        decoding="async"
        fetchPriority="high"
        draggable={false}
      />
    </div>
  );
});
