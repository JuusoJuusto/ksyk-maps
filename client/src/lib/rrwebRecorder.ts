/**
 * rrweb DOM snapshot recorder
 *
 * Records every session unconditionally (except explicit opt-out via
 * ksyk_no_replay=1) and batch-uploads to /api/sessions/rrweb every 5 s.
 * Sensitive text is masked via maskAllInputs + maskTextClass="ksyk-mask".
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
  } catch { return { skip: true, reason: "no-storage" }; }
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
  doStart();
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
