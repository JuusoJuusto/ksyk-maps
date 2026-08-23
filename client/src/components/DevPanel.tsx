import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { APP_VERSION } from "@/lib/changelog";
import { X, RefreshCw } from "lucide-react";

interface Metric {
  label: string;
  value: string;
  ok?: boolean;
}

interface PanelData {
  apiLatencyMs: number | null;
  backendVersion: string | null;
  requestId: string | null;
  cacheEntries: number;
  staleCacheEntries: number;
  fingerprintCount: number | null;
  positioningReady: boolean | null;
  lastFloor: number | null;
  lastPosition: string | null;
  timestamp: number;
}

async function fetchPanelData(): Promise<PanelData> {
  const t0 = performance.now();
  let backendVersion: string | null = null;
  let requestId: string | null = null;
  let fingerprintCount: number | null = null;
  let positioningReady: boolean | null = null;

  try {
    const res = await fetch("/api/health");
    const latencyMs = Math.round(performance.now() - t0);
    requestId = res.headers.get("x-request-id");
    if (res.ok) {
      const data = await res.json();
      backendVersion = data.version ?? null;
    }

    const wifiRes = await fetch("/api/wifi/status");
    if (wifiRes.ok) {
      const wd = await wifiRes.json();
      fingerprintCount = wd.fingerprintCount ?? wd.count ?? null;
      positioningReady = wd.ready ?? (fingerprintCount !== null && fingerprintCount > 0);
    }

    return {
      apiLatencyMs: latencyMs,
      backendVersion,
      requestId,
      cacheEntries: 0,
      staleCacheEntries: 0,
      fingerprintCount,
      positioningReady,
      lastFloor: null,
      lastPosition: null,
      timestamp: Date.now(),
    };
  } catch {
    return {
      apiLatencyMs: null,
      backendVersion,
      requestId,
      cacheEntries: 0,
      staleCacheEntries: 0,
      fingerprintCount,
      positioningReady,
      lastFloor: null,
      lastPosition: null,
      timestamp: Date.now(),
    };
  }
}

function latencyColor(ms: number | null) {
  if (ms === null) return "text-red-400";
  if (ms < 200) return "text-green-400";
  if (ms < 600) return "text-yellow-400";
  return "text-red-400";
}

export default function DevPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const cache = qc.getQueryCache();
    const entries = cache.getAll();
    const stale = entries.filter((e) => e.isStale()).length;

    const fresh = await fetchPanelData();
    fresh.cacheEntries = entries.length;
    fresh.staleCacheEntries = stale;
    setData(fresh);
    setLoading(false);
  }, [qc]);

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto-refresh every 5 s while open
  useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    refresh();
    intervalRef.current = setInterval(refresh, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, refresh]);

  if (!open) return null;

  const metrics: Metric[] = [
    {
      label: "App version",
      value: APP_VERSION,
    },
    {
      label: "Backend version",
      value: data?.backendVersion ?? "—",
    },
    {
      label: "API latency",
      value: data?.apiLatencyMs !== null ? `${data!.apiLatencyMs} ms` : "unreachable",
      ok: data?.apiLatencyMs !== null,
    },
    {
      label: "Last request ID",
      value: data?.requestId ?? "—",
    },
    {
      label: "RQ cache entries",
      value: data ? `${data.cacheEntries} (${data.staleCacheEntries} stale)` : "—",
    },
    {
      label: "Wi-Fi fingerprints",
      value:
        data?.fingerprintCount !== null
          ? String(data!.fingerprintCount)
          : "—",
      ok: data?.positioningReady ?? undefined,
    },
    {
      label: "Positioning ready",
      value:
        data?.positioningReady === true
          ? "yes"
          : data?.positioningReady === false
          ? "no"
          : "—",
      ok: data?.positioningReady ?? undefined,
    },
  ];

  return (
    <div
      role="dialog"
      aria-label="Developer panel"
      style={{
        position: "fixed",
        bottom: "80px",
        right: "16px",
        zIndex: 99999,
        width: "300px",
        background: "#0f172a",
        border: "1px solid #1e3a5f",
        borderRadius: "12px",
        boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
        fontFamily: "Menlo, monospace",
        fontSize: "12px",
        color: "#e2e8f0",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "#1e293b",
          borderBottom: "1px solid #1e3a5f",
        }}
      >
        <span style={{ fontWeight: 700, letterSpacing: "0.05em", color: "#60a5fa" }}>
          DEV PANEL
        </span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={refresh}
            aria-label="Refresh metrics"
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#60a5fa",
              padding: "2px",
              display: "flex",
              opacity: loading ? 0.5 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          </button>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close developer panel"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "2px",
              display: "flex",
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
            <span style={{ color: "#64748b", flexShrink: 0 }}>{m.label}</span>
            <span
              style={{ textAlign: "right", wordBreak: "break-all" }}
              className={
                m.label === "API latency"
                  ? latencyColor(data?.apiLatencyMs ?? null)
                  : m.ok === true
                  ? "text-green-400"
                  : m.ok === false
                  ? "text-red-400"
                  : ""
              }
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: "6px 14px",
          borderTop: "1px solid #1e3a5f",
          color: "#334155",
          fontSize: "10px",
        }}
      >
        Ctrl+Shift+D to toggle · refreshes every 5 s
      </div>
    </div>
  );
}
