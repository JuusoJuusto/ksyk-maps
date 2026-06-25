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

const ENDPOINT = "/api/analytics/track";
const LOGS_ENDPOINT = "/api/logs";
const FLUSH_INTERVAL_MS = 3000;
const MAX_QUEUE = 50;

type EventType =
  | "session_start"
  | "page_view"
  | "click"
  | "search"
  | "map_floor"
  | "map_focus"
  | "map_3d"
  | "map_pitch"
  | "map_rotation"
  | "map_locate"
  | "map_reset"
  | "map_route"
  | "access_decision"
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
  if (queue.length >= MAX_QUEUE) flush();
}

function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  const body = JSON.stringify({
    sessionInfo: { sessionId: sessionId(), userId: userId(), email: userEmail() },
    events: batch.map((e) => ({
      ...e,
      sessionId: sessionId(),
      userId: userId(),
      email: userEmail(),
    })),
  });
  // navigator.sendBeacon is the only reliable transport when the page is
  // unloading; falls back to fetch keepalive otherwise.
  if (navigator.sendBeacon) {
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
  }).catch(() => { /* silent */ });
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
