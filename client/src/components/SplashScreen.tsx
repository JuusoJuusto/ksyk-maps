/**
 * KSYK Maps — boot splash.
 *
 * Real loading gate that also displays live boot-check status so users
 * see *what* is loading, not just a spinner. Each check ticks green
 * when it resolves. Once every required check is done (or the safety
 * cap fires) the splash fades and the app takes over.
 *
 * Callers can also dispatch `ksyk:map-ready` to fast-path the fade
 * once the map itself signals it has painted a first frame.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchList } from "@/lib/fetchList";

const FADE_MS = 380;
/** Absolute cap. A dead API can't hold the splash forever. */
const BOOT_MAX_MS = 8000;
/** Minimum time the splash stays up so the logo actually reads. */
const BOOT_MIN_MS = 550;

type CheckStatus = "pending" | "ok" | "warn";
interface BootCheck {
  id: string;
  label: string;
  status: CheckStatus;
}

/** Aggregate every boot-time signal into a list the UI can render as
 *  a tick-off checklist. Each check flips to "ok" once its query
 *  resolves — resolution counts as ok even on 404 (fetchList soft-
 *  fails to `[]`) because that means the API answered.
 */
function useBootChecks(): { ready: boolean; checks: BootCheck[]; progress: number } {
  const startRef = useState(() => performance.now())[0];

  const buildings   = useQuery<unknown[]>({ queryKey: ["/api/buildings", "boot"],   queryFn: () => fetchList("/api/buildings"),   staleTime: 60_000 });
  const rooms       = useQuery<unknown[]>({ queryKey: ["/api/rooms", "boot"],       queryFn: () => fetchList("/api/rooms"),       staleTime: 60_000 });
  const hallways    = useQuery<unknown[]>({ queryKey: ["/api/hallways", "boot"],    queryFn: () => fetchList("/api/hallways"),    staleTime: 60_000 });
  const layers      = useQuery<unknown[]>({ queryKey: ["/api/layers", "boot"],      queryFn: () => fetchList("/api/layers"),      staleTime: 60_000 });
  const stairs      = useQuery<unknown[]>({ queryKey: ["/api/stairs", "boot"],      queryFn: () => fetchList("/api/stairs"),      staleTime: 60_000 });
  const elevators   = useQuery<unknown[]>({ queryKey: ["/api/elevators", "boot"],   queryFn: () => fetchList("/api/elevators"),   staleTime: 60_000 });
  const doors       = useQuery<unknown[]>({ queryKey: ["/api/doors", "boot"],       queryFn: () => fetchList("/api/doors"),       staleTime: 60_000 });
  const mapDefaults = useQuery<unknown>  ({ queryKey: ["/api/map-defaults", "boot"], queryFn: async () => {
    try { const r = await fetch("/api/map-defaults"); return r.ok ? await r.json() : null; }
    catch { return null; }
  }, staleTime: 60_000 });
  const announcements = useQuery<unknown>({ queryKey: ["/api/announcements", "boot"], queryFn: async () => {
    try { const r = await fetch("/api/announcements"); return r.ok ? await r.json() : null; }
    catch { return null; }
  }, staleTime: 60_000 });
  const appSettings = useQuery<unknown>({ queryKey: ["/api/settings", "boot"], queryFn: async () => {
    try { const r = await fetch("/api/settings"); return r.ok ? await r.json() : null; }
    catch { return null; }
  }, staleTime: 60_000 });

  const [mapPainted, setMapPainted] = useState(false);
  useEffect(() => {
    const onReady = () => setMapPainted(true);
    window.addEventListener("ksyk:map-ready", onReady);
    return () => window.removeEventListener("ksyk:map-ready", onReady);
  }, []);

  const [, force] = useState(0);
  useEffect(() => {
    // Re-render on the min-elapsed tick so the timeout window flips.
    const t = window.setTimeout(() => force((n) => n + 1), BOOT_MIN_MS);
    return () => window.clearTimeout(t);
  }, []);

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), BOOT_MAX_MS);
    return () => window.clearTimeout(t);
  }, []);

  const checks: BootCheck[] = useMemo(() => [
    { id: "buildings",     label: "Buildings",     status: buildings.isFetched     ? "ok" : "pending" },
    { id: "rooms",         label: "Rooms",         status: rooms.isFetched         ? "ok" : "pending" },
    { id: "hallways",      label: "Hallways",      status: hallways.isFetched      ? "ok" : "pending" },
    { id: "walls-pois",    label: "POIs & walls",  status: (stairs.isFetched && elevators.isFetched && doors.isFetched) ? "ok" : "pending" },
    { id: "layers",        label: "Layers",        status: layers.isFetched        ? "ok" : "pending" },
    { id: "map-defaults",  label: "Map defaults",  status: mapDefaults.isFetched   ? "ok" : "pending" },
    { id: "app-settings",  label: "App settings",  status: appSettings.isFetched   ? "ok" : "pending" },
    { id: "announcements", label: "Announcements", status: announcements.isFetched ? "ok" : "pending" },
    { id: "map",           label: "Map rendering", status: mapPainted              ? "ok" : "pending" },
  ], [
    buildings.isFetched, rooms.isFetched, hallways.isFetched,
    layers.isFetched, mapDefaults.isFetched, appSettings.isFetched,
    announcements.isFetched, stairs.isFetched, elevators.isFetched,
    doors.isFetched, mapPainted,
  ]);

  const okCount = checks.filter((c) => c.status === "ok").length;
  const progress = okCount / checks.length;

  const dataChecksReady = checks.slice(0, 8).every((c) => c.status === "ok");
  const now = performance.now();
  const elapsed = now - startRef;
  const minElapsed = elapsed >= BOOT_MIN_MS;
  const mapOkOrSlow = mapPainted || elapsed > BOOT_MAX_MS * 0.55;
  const ready = ((dataChecksReady && mapOkOrSlow) && minElapsed) || timedOut;

  return { ready, checks, progress };
}

export default function SplashScreen() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  const { ready, checks, progress } = useBootChecks();

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
      <div className="flex flex-col items-center gap-6 px-6 max-w-sm w-full">
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

        {/* Progress bar */}
        <div className="w-full">
          <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-[width] duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>

        {/* Boot checks */}
        <ul className="w-full space-y-1.5 text-[12px]">
          {checks.map((c) => (
            <li key={c.id} className="flex items-center gap-2.5">
              <CheckMark status={c.status} />
              <span className={c.status === "ok" ? "text-slate-800" : "text-slate-500"}>
                {c.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        @keyframes ksyk-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ksyk-pending-pulse {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}

function CheckMark({ status }: { status: CheckStatus }) {
  if (status === "ok") {
    return (
      <span className="inline-flex h-4 w-4 rounded-full bg-emerald-500 text-white items-center justify-center text-[9px] font-bold shrink-0">
        ✓
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span className="inline-flex h-4 w-4 rounded-full bg-amber-500 text-white items-center justify-center text-[9px] font-bold shrink-0">
        !
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-4 w-4 rounded-full border-2 border-slate-300 shrink-0"
      style={{ animation: "ksyk-pending-pulse 1.6s ease-in-out infinite" }}
    />
  );
}
