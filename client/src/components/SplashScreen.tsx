/**
 * KSYK Maps — boot splash.
 *
 * Real loading gate: covers the viewport until every piece of
 * bootstrap data has arrived. `useBootLoader` starts a set of "readiness
 * signals" — buildings, rooms, hallways, layers, map defaults, first
 * map tile — and the splash only fades when they all resolve OR a
 * safety timeout (BOOT_MAX_MS) fires so a stuck fetch can't lock the
 * app.
 *
 * Callers can also dispatch `ksyk:boot-ready` to fast-path the fade
 * once the map itself signals it has painted a first frame.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchList } from "@/lib/fetchList";

const FADE_MS = 380;
/** Absolute cap. A dead API can't hold the splash forever. */
const BOOT_MAX_MS = 8000;
/** Minimum time the splash stays up so the logo actually reads. */
const BOOT_MIN_MS = 450;

/** Fires readiness of every bootstrap resource. Returns true when
 *  everything the app needs to render its first meaningful frame has
 *  loaded (or gave up). */
function useBootReady(): boolean {
  const startRef = useState(() => performance.now())[0];

  // Any of these failing is fine — the fetchList wrapper returns [] on
  // 404 / non-JSON so isFetched still flips true. We wait for the
  // resolutions, not the successes.
  const buildings   = useQuery<unknown[]>({ queryKey: ["/api/buildings", "boot"],   queryFn: () => fetchList("/api/buildings"),   staleTime: 60_000 });
  const rooms       = useQuery<unknown[]>({ queryKey: ["/api/rooms", "boot"],       queryFn: () => fetchList("/api/rooms"),       staleTime: 60_000 });
  const hallways    = useQuery<unknown[]>({ queryKey: ["/api/hallways", "boot"],    queryFn: () => fetchList("/api/hallways"),    staleTime: 60_000 });
  const layers      = useQuery<unknown[]>({ queryKey: ["/api/layers", "boot"],      queryFn: () => fetchList("/api/layers"),      staleTime: 60_000 });
  const mapDefaults = useQuery<unknown>  ({ queryKey: ["/api/map-defaults", "boot"], queryFn: async () => {
    try { const r = await fetch("/api/map-defaults"); return r.ok ? await r.json() : null; }
    catch { return null; }
  }, staleTime: 60_000 });

  const [mapPainted, setMapPainted] = useState(false);
  useEffect(() => {
    const onReady = () => setMapPainted(true);
    window.addEventListener("ksyk:map-ready", onReady);
    return () => window.removeEventListener("ksyk:map-ready", onReady);
  }, []);

  const [timedOut, setTimedOut] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setTimedOut(true), BOOT_MAX_MS);
    const t2 = window.setTimeout(() => setMinElapsed(true), BOOT_MIN_MS);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  const dataReady =
    buildings.isFetched && rooms.isFetched && hallways.isFetched &&
    layers.isFetched && mapDefaults.isFetched;

  // Keep the map-painted signal advisory — if map fails to fire the
  // event within the safety cap, we still un-gate the app.
  const now = performance.now();
  const elapsed = now - startRef;
  const naturalReady = dataReady && (mapPainted || elapsed > BOOT_MAX_MS * 0.6);
  return (naturalReady && minElapsed) || timedOut;
}

export default function SplashScreen() {
  /** "in"  → fully shown / fading in
   *  "out" → fading out
   *  "gone"→ display:none, removed from accessible tree */
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  const ready = useBootReady();

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
      {/* Logo + ring stack */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Spinning ring — arc segment of a circle, rotates */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 80 80"
          aria-hidden="true"
          style={{ animation: "ksyk-ring-spin 0.95s linear infinite" }}
        >
          {/* Track */}
          <circle
            cx={40}
            cy={40}
            r={34}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={3}
          />
          {/* Active arc — KSYK blue, ~260° */}
          <circle
            cx={40}
            cy={40}
            r={34}
            fill="none"
            stroke="#2563eb"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="155 60"
            transform="rotate(-90 40 40)"
          />
        </svg>
        {/* KSYK Maps logo */}
        <img
          src="/favicon-128.png"
          alt=""
          width={44}
          height={44}
          className="relative block object-contain"
          decoding="sync"
          fetchPriority="high"
          draggable={false}
        />
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
