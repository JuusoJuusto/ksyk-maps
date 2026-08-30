/**
 * KSYK Maps — first-party telemetry SDK.
 *
 * Public API (mirrored by android/…/data/Analytics.kt):
 *
 *   analytics.track(eventName, metadata?)
 *   analytics.pageView(path?)
 *   analytics.search(query, hits?)
 *   analytics.navigation({ fromRoom?, toRoom?, distance?, duration?, ... })
 *   analytics.featureUsed(feature, action?, metadata?)
 *   analytics.error(err, ctx?)
 *   analytics.performance(name, valueMs, meta?)
 *   analytics.easterEgg(eggId, metadata?)
 *   analytics.flushNow()
 *
 * Design constraints:
 *  - **First-party.** Every event goes to `/api/session/heartbeat` on the
 *    same origin. No third-party scripts, no cross-origin beacons.
 *  - **Fail-open.** The app never breaks because telemetry couldn't send.
 *    Every failure is swallowed after being recorded to the local queue.
 *  - **Adblock-friendly (not adblock-evasive).** We picked a benign path
 *    (`/session/…`) so ordinary tracker blocklists don't strip us, but
 *    we do NOT try to detect or defeat user extensions.
 *  - **Batched.** Events accumulate in memory + localStorage. Flushed
 *    every 15 s, on tab hide, on unload, and immediately when the queue
 *    exceeds `MAX_BATCH`.
 *  - **Persistent.** If a flush fails or the tab closes mid-flight,
 *    localStorage keeps the queue so we retry on next page load.
 *  - **Bounded.** Queue is capped at `MAX_QUEUE`. Oldest events drop
 *    first when full.
 *  - **Privacy.** No arbitrary DOM contents. No auth headers. No cookie
 *    contents. Emails only if the caller explicitly attaches them.
 */

// ── Config ───────────────────────────────────────────────────────────
const ENDPOINT = "/api/session/heartbeat";
const PIXEL_ENDPOINT = "/api/session/ping";
const APP_VERSION_HDR: string =
  (import.meta as any).env?.VITE_APP_VERSION ?? "web";
// v4.5.53: relaxed 15s → 45s to spare the shared rate-limit bucket. On
// tab-hide / pagehide we still flush immediately via sendBeacon, so the
// worst-case dropped events window is one 45s interval.
const FLUSH_INTERVAL_MS = 45_000;
const MAX_BATCH = 40;
const MAX_QUEUE = 400;
const QUEUE_STORAGE_KEY = "ksyk_telemetry_queue_v1";
const SESSION_STORAGE_KEY = "ksyk_session_id";
const ANON_STORAGE_KEY = "ksyk_user_id";

// ── Consent gate ─────────────────────────────────────────────────────
// The CookieConsent component writes `{ analytics: true }` when the user
// accepts. Without consent we still capture *errors* (safety-critical)
// and *session lifecycle* (needed for total DAU on the admin dashboard)
// but skip everything else.
function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem("cookie_consent");
    if (!raw) return false;
    return JSON.parse(raw)?.analytics === true;
  } catch {
    return false;
  }
}
const ALWAYS_SEND = new Set(["error", "session_started", "session_ended"]);

// ── Session + anonymous IDs ──────────────────────────────────────────
function newId(prefix: string): string {
  const rnd = () =>
    (crypto?.randomUUID?.() ??
      `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`);
  return `${prefix}_${rnd().replace(/-/g, "").slice(0, 20)}`;
}

let cachedSessionId: string | null = null;
export function sessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  try {
    let s = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!s) {
      s = newId("ses");
      sessionStorage.setItem(SESSION_STORAGE_KEY, s);
    }
    cachedSessionId = s;
    return s;
  } catch {
    cachedSessionId = "ses_anon";
    return cachedSessionId;
  }
}

export function anonymousId(): string {
  try {
    let a = localStorage.getItem(ANON_STORAGE_KEY);
    if (!a) {
      a = newId("usr");
      localStorage.setItem(ANON_STORAGE_KEY, a);
    }
    return a;
  } catch {
    return "usr_anon";
  }
}

// ── Device fingerprint (device / os / viewport / connection) ────────
function deviceInfo(): Record<string, unknown> {
  const n = navigator as any;
  return {
    ua: navigator.userAgent,
    lang: navigator.language,
    platform: navigator.platform,
    online: navigator.onLine,
    dpr: window.devicePixelRatio,
    screen: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    connection: n.connection
      ? {
          type: n.connection.effectiveType,
          downlink: n.connection.downlink,
          rtt: n.connection.rtt,
          saveData: n.connection.saveData,
        }
      : null,
    darkMode: window.matchMedia?.("(prefers-color-scheme: dark)").matches,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  };
}

// ── Queue ────────────────────────────────────────────────────────────
type Event = {
  type: string;
  ts: string;
  url?: string;
  category?: string;
  [key: string]: unknown;
};

let queue: Event[] = [];
try {
  const persisted = localStorage.getItem(QUEUE_STORAGE_KEY);
  if (persisted) {
    const parsed = JSON.parse(persisted);
    if (Array.isArray(parsed)) queue = parsed.slice(-MAX_QUEUE);
  }
} catch { /* ignore */ }

function persistQueue() {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch { /* quota full — drop silently */ }
}

let backoffUntil = 0;
let consecutiveFails = 0;

function push(ev: Event) {
  if (!ALWAYS_SEND.has(ev.type) && !hasAnalyticsConsent()) return;
  ev.ts = ev.ts || new Date().toISOString();
  ev.url = ev.url || window.location.pathname + window.location.search;
  queue.push(ev);
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  persistQueue();
  if (queue.length >= MAX_BATCH) flush();
}

function flush(useBeacon = false) {
  if (queue.length === 0) return;
  if (!useBeacon && Date.now() < backoffUntil) return;

  const batch = queue.splice(0, queue.length);
  persistQueue();

  const body = JSON.stringify({
    source: "web",
    sessionId: sessionId(),
    anonymousId: anonymousId(),
    appVersion: APP_VERSION_HDR,
    meta: { deviceInfo: deviceInfo() },
    events: batch,
  });

  const canBeacon =
    useBeacon &&
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function";
  if (canBeacon) {
    try {
      const ok = navigator.sendBeacon(
        ENDPOINT,
        new Blob([body], { type: "application/json" }),
      );
      if (ok) return;
    } catch { /* fall through */ }
  }

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    credentials: "include",
  })
    .then((r) => {
      if (r.status === 429 || r.status >= 500) {
        // Requeue at the front, apply exponential backoff.
        consecutiveFails += 1;
        const delay = Math.min(30_000 * 2 ** (consecutiveFails - 1), 600_000);
        backoffUntil = Date.now() + delay;
        queue = [...batch, ...queue].slice(-MAX_QUEUE);
        persistQueue();
      } else if (r.ok) {
        consecutiveFails = 0;
        backoffUntil = 0;
      }
    })
    .catch(() => {
      // Network failure — requeue and try the pixel fallback so at least
      // *something* leaves the browser.
      queue = [...batch, ...queue].slice(-MAX_QUEUE);
      persistQueue();
      try {
        const first = batch[0];
        if (first) {
          const img = new Image();
          img.src =
            `${PIXEL_ENDPOINT}?src=web&s=${encodeURIComponent(sessionId())}` +
            `&p=${encodeURIComponent(first.url || "/")}` +
            `&_=${Date.now()}`;
        }
      } catch { /* really can't do more */ }
    });
}

// ── Public API ───────────────────────────────────────────────────────

export const analytics = {
  track(eventName: string, metadata: Record<string, unknown> = {}) {
    push({
      type: eventName,
      ts: new Date().toISOString(),
      category: (metadata.category as string) || undefined,
      metadata,
    });
  },
  pageView(path?: string) {
    push({
      type: "page_view",
      ts: new Date().toISOString(),
      url: path ?? window.location.pathname + window.location.search,
      referrer: document.referrer || null,
    });
  },
  search(query: string, hits: number | null = null) {
    push({
      type: "search",
      ts: new Date().toISOString(),
      query: (query || "").slice(0, 200),
      hits,
    });
  },
  navigation(payload: {
    fromRoom?: string;
    toRoom?: string;
    fromBuilding?: string;
    toBuilding?: string;
    distance?: number;
    duration?: number;
    navigationType?: string;
  }) {
    push({
      type: "navigation",
      ts: new Date().toISOString(),
      ...payload,
    });
  },
  featureUsed(
    feature: string,
    action: "opened" | "used" | "completed" | "failed" = "used",
    metadata: Record<string, unknown> = {},
  ) {
    push({
      type: "feature",
      ts: new Date().toISOString(),
      name: feature,
      action,
      metadata,
    });
  },
  error(err: unknown, ctx: Record<string, unknown> = {}) {
    const e = err as any;
    push({
      type: "error",
      ts: new Date().toISOString(),
      level: "error",
      message: (e?.message || String(err) || "unknown").slice(0, 500),
      stack: typeof e?.stack === "string" ? e.stack.slice(0, 2000) : undefined,
      ...ctx,
    });
  },
  performance(name: string, valueMs: number, meta: Record<string, unknown> = {}) {
    push({
      type: "performance",
      ts: new Date().toISOString(),
      metric: name,
      value: valueMs,
      metadata: meta,
    });
  },
  easterEgg(eggId: string, metadata: Record<string, unknown> = {}) {
    push({
      type: "easter_egg",
      ts: new Date().toISOString(),
      eggId,
      metadata,
    });
  },
  flushNow() {
    flush();
  },
};

// ── Session lifecycle ────────────────────────────────────────────────
let sessionStartMs = Date.now();
let initialised = false;

export function initTelemetry() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  sessionStartMs = Date.now();

  // Session bootstrap. Fires even without analytics consent so we always
  // know DAU; no personal data is captured in this event.
  push({
    type: "session_started",
    ts: new Date().toISOString(),
    metadata: { device: deviceInfo() },
  });
  analytics.pageView();

  // SPA route change poller. wouter doesn't expose subscribe; setInterval
  // is cheap and only fires on genuine location changes.
  let lastPath = window.location.pathname + window.location.search;
  setInterval(() => {
    const p = window.location.pathname + window.location.search;
    if (p !== lastPath) {
      analytics.pageView(p);
      lastPath = p;
    }
  }, 800);

  // Flush on visibility change (tab hidden), page hide, before unload.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => {
    push({
      type: "session_ended",
      ts: new Date().toISOString(),
      durationMs: Date.now() - sessionStartMs,
    });
    flush(true);
  });
  window.addEventListener("beforeunload", () => flush(true));
  setInterval(() => flush(false), FLUSH_INTERVAL_MS);

  // Global error hooks — safety-critical, always send. We tag the
  // transient MapLibre render errors so they show up in analytics but
  // don't spam the "fatal errors" chart on the admin dashboard.
  const isMapLibreTransient = (msg: string, stack: string) =>
    /Cannot read properties of undefined \(reading '(get|getLayer|0)'\)/.test(msg) &&
    /(renderLayer|_render|Object\.(circle|line|fill|symbol)|Om\.render|setUniform)/.test(stack);
  window.addEventListener("error", (e: ErrorEvent) => {
    const stack = String(e.error?.stack || '');
    const msg = String(e.error?.message || e.message || '');
    if (isMapLibreTransient(msg, stack)) {
      analytics.track("maplibre_transient_error", { message: msg });
      e.preventDefault?.();
      return;
    }
    analytics.error(e.error ?? e.message ?? "unknown", {
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
    });
  });
  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const stack = String((e.reason as any)?.stack || '');
    const msg = String((e.reason as any)?.message || e.reason || '');
    if (isMapLibreTransient(msg, stack)) {
      analytics.track("maplibre_transient_error", { message: msg, unhandledRejection: true });
      e.preventDefault?.();
      return;
    }
    analytics.error(e.reason, { unhandledRejection: true });
  });

  // Wire web-vitals if the app opted in via `web-vitals` package. Loaded
  // dynamically so a missing dep never blocks bootstrap.
  import("web-vitals")
    .then((m) => {
      m.onCLS?.((v) => analytics.performance("cls", v.value * 1000, { rating: v.rating }));
      m.onLCP?.((v) => analytics.performance("lcp", v.value, { rating: v.rating }));
      m.onINP?.((v) => analytics.performance("inp", v.value, { rating: v.rating }));
      m.onTTFB?.((v) => analytics.performance("ttfb", v.value, { rating: v.rating }));
      m.onFCP?.((v) => analytics.performance("fcp", v.value, { rating: v.rating }));
    })
    .catch(() => { /* package not installed — skip */ });

}

// ── Back-compat shim ────────────────────────────────────────────────
// Older code in analytics.ts / telemetry.ts exported these names. Keep
// them re-exported so we don't have to edit every call site.
export const trackPageView = (page: string) => analytics.pageView(page);
export const trackEasterEgg = (id: string) => analytics.easterEgg(id);
export const trackFeature = (name: string, meta?: Record<string, unknown>) =>
  analytics.featureUsed(name, "used", meta);
export const trackFeatureUse = trackFeature;
export const trackSearch = (q: string) => analytics.search(q);
export const trackNavigation = (from: string, to: string) =>
  analytics.navigation({ fromRoom: from, toRoom: to });
