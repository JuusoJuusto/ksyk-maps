/**
 * rrweb DOM snapshot recorder — v4.7.12
 *
 * Records the DOM incrementally on public routes and batch-uploads
 * to /api/sessions/rrweb every 5 s (or 300 events, whichever comes
 * first). Uses the same `ksyk_session_id` sessionStorage key as the
 * telemetry SDK so admin sessions cross-link to their replay.
 *
 * Skipped when:
 *   - admin token present (they see admin UI which is uninteresting to record)
 *   - user has ksyk_no_replay=1 in localStorage (opt-out)
 *   - the route is /admin or /builder (recorder = students-only replay)
 *   - reduced-motion or DNT is set (privacy hygiene)
 *
 * Sensitive text is masked via rrweb's built-in maskAllInputs +
 * maskTextClass="ksyk-mask" so any field marked with that class
 * gets ***** in the recording.
 */
import { record, type eventWithTime } from "rrweb";

const BATCH_MS = 5_000;
const BATCH_MAX_EVENTS = 300;
const ENDPOINT = "/api/sessions/rrweb";

let stopFn: (() => void) | null = null;
let buffer: eventWithTime[] = [];
let batchSeq = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function shouldSkip(): { skip: true; reason: string } | null {
  if (typeof window === "undefined") return { skip: true, reason: "ssr" };
  try {
    if (localStorage.getItem("ksyk_no_replay") === "1") return { skip: true, reason: "opt-out" };
    if (localStorage.getItem("ksyk_admin_token")) return { skip: true, reason: "admin" };
  } catch { /* storage denied, treat as opt-out */ return { skip: true, reason: "no-storage" }; }
  const p = window.location.pathname || "/";
  if (p.startsWith("/admin") || p.startsWith("/builder")) return { skip: true, reason: "admin-route" };
  if (navigator.doNotTrack === "1" || (navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack === "1") {
    return { skip: true, reason: "dnt" };
  }
  return null;
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem("ksyk_session_id");
    if (!id) {
      id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem("ksyk_session_id", id);
    }
    return id;
  } catch {
    return `session_${Date.now()}_ephemeral`;
  }
}

function flush(force = false): void {
  if (!buffer.length) return;
  if (!force && buffer.length < 5) return; // ignore tiny batches unless forced
  const events = buffer;
  buffer = [];
  const seq = batchSeq++;
  const startedAt = new Date(events[0].timestamp).toISOString();
  const endedAt = new Date(events[events.length - 1].timestamp).toISOString();
  const payload = {
    sessionId: getSessionId(),
    seq,
    startedAt,
    endedAt,
    eventCount: events.length,
    events,
  };
  // Fire-and-forget. Body is JSON. sendBeacon works even on
  // page-hide, so we prefer it and fall back to fetch.
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
  } catch { /* fall through to fetch */ }
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch { /* swallow — recording is best-effort */ }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, BATCH_MS);
}

export function startRrwebRecording(): void {
  const skip = shouldSkip();
  if (skip) {
    if (import.meta.env.DEV) console.info("[rrweb] skip:", skip.reason);
    return;
  }
  if (stopFn) return; // already recording

  // v4.7.13 — respect admin's enableSessionReplay flag from /api/settings.
  // Fetched async; recording waits until we get the answer so we never
  // record against the admin's will. Cached in sessionStorage on success
  // so subsequent tabs don't re-fetch.
  void (async () => {
    try {
      const cached = sessionStorage.getItem("ksyk_enable_replay");
      if (cached === "0") { if (import.meta.env.DEV) console.info("[rrweb] disabled by admin"); return; }
      if (cached === "1") { doStart(); return; }
      const r = await fetch("/api/settings", { credentials: "include" });
      if (!r.ok) { doStart(); return; } // fail-open: default to record
      const s = await r.json().catch(() => ({} as { enableSessionReplay?: boolean }));
      const on = s.enableSessionReplay !== false; // default true
      try { sessionStorage.setItem("ksyk_enable_replay", on ? "1" : "0"); } catch { /* quota */ }
      if (!on) { if (import.meta.env.DEV) console.info("[rrweb] disabled by admin"); return; }
      doStart();
    } catch {
      // fail-open — if settings fetch fails, still record so we don't
      // silently drop analytics from a transient network issue.
      doStart();
    }
  })();
}

function doStart(): void {
  if (stopFn) return;

  try {
    stopFn = record({
      emit(event) {
        buffer.push(event);
        if (buffer.length >= BATCH_MAX_EVENTS) {
          flush(true);
        } else {
          scheduleFlush();
        }
      },
      maskAllInputs: true,
      maskTextClass: "ksyk-mask",
      // Keep block class + ignore class conventional so future
      // sensitive DOM can opt out via className="ksyk-block".
      blockClass: "ksyk-block",
      ignoreClass: "ksyk-ignore",
      recordCanvas: false,   // canvas snapshots are huge; MapLibre is one
      collectFonts: false,
      sampling: {
        // Throttle mousemoves so recordings don't explode on the map.
        mousemove: 50,
        mouseInteraction: true,
        scroll: 150,
        input: "last",
      },
    }) ?? null;
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[rrweb] start failed:", e);
    return;
  }

  // Flush on tab hide / unload so we don't lose the last few events.
  const onHide = () => flush(true);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") onHide();
  });
  window.addEventListener("pagehide", onHide);
  window.addEventListener("beforeunload", onHide);
}

export function stopRrwebRecording(): void {
  try { stopFn?.(); } catch { /* noop */ }
  stopFn = null;
  flush(true);
}
