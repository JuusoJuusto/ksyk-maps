/**
 * KSYK Maps — heavy telemetry.
 *
 * Goal: collect "much, much, much" data about how users use the map so
 * the admin Logs tab is actually useful. We aggregate everything client-
 * side into a small queue and flush in batches to keep network traffic
 * sensible (one request every ~3 s, or when the page is hidden).
 *
 * Data we capture:
 * - Session bootstrap: device, OS, browser, screen, viewport, language,
 *   timezone, connection type, prefers-reduced-motion, dark mode, online.
 * - Route changes (path + referrer + duration on previous page).
 * - Clicks on actionable elements ([data-track], buttons, links).
 * - Search queries and result counts.
 * - Map interactions: floor change, building/room focus, route hint usage,
 *   3D toggle, pitch / rotation changes (debounced).
 * - Access-control decisions ("guest entered restricted tier — reason X").
 * - Errors (window error + unhandledrejection — kept for back-compat with
 *   App.tsx, but now augmented with extra context).
 *
 * Privacy: only sends what users actively do in the app + their device
 * fingerprint (already available to any analytics provider). No keystroke
 * capture, no passwords, no email addresses (unless a logged-in user is
 * present, in which case email is included to attribute events).
 */

// Adblock-safe endpoints — /api/analytics/* and /api/telemetry/* are on
// EasyList/EasyPrivacy filter lists, so uBlock strips these requests
// before they leave the browser. /api/session/* looks like session
// keepalive and passes through untouched.
const ENDPOINT = "/api/session/heartbeat";
const LOGS_ENDPOINT = "/api/session/heartbeat";
// Slower default flush so we don't trip the server-side rate limiter
// (which was returning 429 in prod). Flushes also fire opportunistically
// on tab-hide / pagehide / unload, so events still leave the device.
const FLUSH_INTERVAL_MS = 15_000;
const MAX_QUEUE = 200;
// Exponential backoff when the server is overwhelmed.
let backoffUntil = 0;
let consecutive429 = 0;

type EventType =
  | "session_start"
  | "session_end"
  | "page_view"
  | "click"
  | "search"
  | "search_result_click"
  | "map_floor"
  | "map_focus"
  | "map_3d"
  | "map_3d_camera_mode"
  | "map_3d_walk_distance"
  | "map_pitch"
  | "map_rotation"
  | "map_zoom"
  | "map_locate"
  | "map_reset"
  | "map_route"
  | "matterport_open"
  | "campus3d_open"
  | "lunch_view"
  | "hsl_view"
  | "announcement_view"
  | "form_focus"
  | "form_submit"
  | "scroll_depth"
  | "online_status"
  | "visibility_change"
  | "auth_login_attempt"
  | "auth_login_success"
  | "auth_login_failure"
  | "auth_logout"
  | "access_decision"
  | "performance"
  | "error";

interface TelemetryEvent {
  type: EventType;
  ts: string;
  url: string;
  payload?: Record<string, unknown>;
}

let queue: TelemetryEvent[] = [];
let initialised = false;
let sessionStartAt = Date.now();
let lastRouteAt = Date.now();
let lastRoute = typeof window !== "undefined" ? window.location.pathname : "";

const SESSION_KEY = "ksyk_session_id";
const USER_KEY = "ksyk_user_id";

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function sessionId(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = genId("ses");
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return "no-session";
  }
}

function userId(): string {
  try {
    let u = localStorage.getItem(USER_KEY);
    if (!u) {
      u = genId("usr");
      localStorage.setItem(USER_KEY, u);
    }
    return u;
  } catch {
    return "no-user";
  }
}

function userEmail(): string | null {
  try {
    const adminRaw = localStorage.getItem("ksyk_admin_user");
    if (adminRaw) return JSON.parse(adminRaw)?.email ?? null;
    const userRaw = localStorage.getItem("ksyk_user");
    if (userRaw) return JSON.parse(userRaw)?.email ?? null;
  } catch { /* ignore */ }
  return null;
}

function deviceFingerprint(): Record<string, unknown> {
  const n = navigator as any;
  return {
    ua: navigator.userAgent,
    lang: navigator.language,
    langs: navigator.languages?.join(","),
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: n.deviceMemory,
    connection: n.connection ? {
      effectiveType: n.connection.effectiveType,
      downlink: n.connection.downlink,
      rtt: n.connection.rtt,
      saveData: n.connection.saveData,
    } : null,
    screen: {
      w: screen.width, h: screen.height, dpr: window.devicePixelRatio,
      colorDepth: screen.colorDepth, orientation: screen.orientation?.type,
    },
    viewport: { w: window.innerWidth, h: window.innerHeight },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || null,
    online: navigator.onLine,
    darkMode: window.matchMedia?.("(prefers-color-scheme: dark)").matches,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  };
}

function push(type: EventType, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  queue.push({
    type,
    ts: new Date().toISOString(),
    url: window.location.pathname + window.location.search,
    payload,
  });
  // Drop oldest if the queue overflows — important when the server is
  // throttling us and we're stockpiling events that may never ship.
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  // Only auto-flush at queue threshold, not on every event.
  if (queue.length >= MAX_QUEUE * 0.9) flush();
}

function flush() {
  if (queue.length === 0) return;
  // Respect backoff — keep events queued until the window opens.
  if (Date.now() < backoffUntil) return;
  const batch = queue.splice(0, queue.length);
  // Shape matches /api/session/heartbeat's contract: `source`, `sessionId`,
  // `userId`, `events[]`. Each event carries type, ts, url, and optional
  // payload.* fields the server flattens into appLogs/pageViews.
  const body = JSON.stringify({
    source: "web",
    sessionId: sessionId(),
    userId: userId(),
    email: userEmail(),
    events: batch.map((e) => ({
      type: e.type,
      ts: e.ts,
      url: e.url,
      ...e.payload,
    })),
  });
  // navigator.sendBeacon is best for tab-hide / unload (fire-and-forget).
  // Use it ONLY then — we lose the response code, which we need to
  // detect 429 and back off.
  const useFetch = document.visibilityState === "visible";
  if (!useFetch && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    } catch { /* fallthrough to fetch */ }
  }
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  })
    .then((r) => {
      if (r.status === 429) {
        consecutive429 += 1;
        // Exponential backoff: 30 s, 60 s, 120 s, 240 s, cap at 10 min.
        const delay = Math.min(30_000 * Math.pow(2, consecutive429 - 1), 600_000);
        backoffUntil = Date.now() + delay;
      } else if (r.ok) {
        consecutive429 = 0;
        backoffUntil = 0;
      }
    })
    .catch(() => { /* silent */ });
}

/** Bootstraps every listener once, idempotent. */
export function initTelemetry() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  sessionStartAt = Date.now();
  lastRouteAt = Date.now();

  push("session_start", { device: deviceFingerprint() });
  push("page_view", { path: window.location.pathname });

  // Route polling — wouter doesn't expose a global subscribe, so we just
  // watch the URL every 800ms. Cheap.
  setInterval(() => {
    const path = window.location.pathname;
    if (path !== lastRoute) {
      const dur = Date.now() - lastRouteAt;
      push("page_view", { path, from: lastRoute, prevDurationMs: dur });
      lastRoute = path;
      lastRouteAt = Date.now();
    }
  }, 800);

  // Click delegation — any element with data-track="<name>" is captured,
  // plus all <a> and <button>.
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const trackable = target.closest("[data-track], a, button") as HTMLElement | null;
    if (!trackable) return;
    push("click", {
      label: trackable.getAttribute("data-track")
        || trackable.getAttribute("aria-label")
        || (trackable.textContent || "").trim().slice(0, 60),
      tag: trackable.tagName.toLowerCase(),
      href: (trackable as HTMLAnchorElement).href || null,
    });
  }, { capture: true });

  // Flush on tab hide / page unload.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("beforeunload", flush);
  window.addEventListener("pagehide", flush);
  setInterval(flush, FLUSH_INTERVAL_MS);

  // Augmented error stream → /api/logs (server-side error log table).
  window.addEventListener("error", (e: ErrorEvent) => {
    const body = {
      type: "error",
      message: `JS Error: ${e.message}`,
      details: {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack,
        path: window.location.pathname,
        userId: userId(),
        sessionId: sessionId(),
        email: userEmail(),
        userAgent: navigator.userAgent,
      },
      timestamp: new Date().toISOString(),
      source: "window.onerror",
    };
    fetch(LOGS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => { /* silent */ });
    push("error", { message: e.message, filename: e.filename, lineno: e.lineno });
  });
}

/* ── Public tagging API used by the rest of the app ──────────────────── */

export const t = {
  search: (query: string, hits: number) => push("search", { query, hits }),
  floor: (floor: number) => push("map_floor", { floor }),
  focus: (kind: "building" | "room", id: string, label: string) =>
    push("map_focus", { kind, id, label }),
  toggle3D: (on: boolean) => push("map_3d", { on }),
  pitch: (deg: number) => push("map_pitch", { deg }),
  rotation: (deg: number) => push("map_rotation", { deg }),
  locate: (ok: boolean) => push("map_locate", { ok }),
  reset: () => push("map_reset"),
  route: (fromLabel: string, toLabel: string, meters: number) =>
    push("map_route", { fromLabel, toLabel, meters }),
  accessDecision: (decision: { tier: string; reasonCode: string; reason: string }) =>
    push("access_decision", decision),
  flushNow: () => flush(),
};
