/**
 * PostHog web wrapper (v4.5.58 hardening).
 *
 * uBlock Origin + EasyList + EasyPrivacy don't just block by hostname —
 * they also block by URL path pattern. Filenames like
 * `posthog-recorder.js` and `dead-clicks-autocapture.js` are on those
 * lists, so even served from `t.ksykmaps.fi/static/…` uBlock still
 * blocks them. The only reliable defence is to bundle every extension
 * at build time so no external asset load ever happens.
 *
 * We import `posthog-js/dist/module.full.no-external` which:
 *   - Pre-bundles session replay, dead-clicks autocapture, surveys,
 *     exception autocapture, web vitals, tracing headers.
 *   - Disables all `<script>` and lazy `import()` loads at runtime.
 *   - Adds ~200 KB to the bundle (worth it for uBlock resilience).
 *
 * The proxy at `t.ksykmaps.fi` still handles capture/config/flags
 * requests, so those URLs stay first-party.
 *
 * Toolbar is disabled outright — it always loads external CSS from
 * us-assets.i.posthog.com which our CSP + uBlock both block. Any
 * `__posthog=…` hash param in the URL (which triggers the toolbar) is
 * stripped before init.
 *
 * Consent: PostHog is opted-out by default and only opted-in after the
 * cookie-consent banner accepts analytics. This is what makes GDPR/
 * "välttämättömät" (strictly necessary) cookies actually meaningful.
 */
import posthog from "posthog-js/dist/module.full.no-external";

const DEFAULT_KEY = "phc_z4eXUY3op3B93RcMzhvCPbUN8c8cACFB92XW3VuBVbCq";
const PROXY_HOST = "https://t.ksykmaps.fi";
const UI_HOST = "https://us.posthog.com";

const projectToken =
  ((import.meta as any).env?.VITE_POSTHOG_KEY as string | undefined) ??
  DEFAULT_KEY;

let initialised = false;

function shouldInit(): boolean {
  if (typeof window === "undefined") return false;
  if (initialised) return false;
  if (!projectToken) return false;
  const h = window.location.host;
  const isLocal = h.includes("localhost") || h.includes("127.0.0.1");
  if (isLocal && !(import.meta as any).env?.VITE_POSTHOG_DEV) return false;
  return true;
}

/** Strip any PostHog toolbar hijack payload from the URL BEFORE init so
 *  the toolbar can't self-load. Toolbar URLs look like
 *  `#__posthog=%7B%22...%22%7D` or `?__posthog=…`. */
function stripToolbarParams() {
  try {
    const url = new URL(window.location.href);
    let changed = false;
    if (url.searchParams.has("__posthog")) {
      url.searchParams.delete("__posthog");
      changed = true;
    }
    if (url.hash.includes("__posthog")) {
      url.hash = url.hash
        .replace(/[?&]?__posthog=[^&]*/g, "")
        .replace(/^#&/, "#")
        .replace(/^#$/, "");
      changed = true;
    }
    if (changed) {
      window.history.replaceState({}, "", url.toString());
    }
  } catch { /* ignore malformed URL */ }
}

/** Read the cookie-consent banner state. `null` means the user hasn't
 *  answered yet. `{analytics: true}` means opted in. */
function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem("cookie_consent");
    if (!raw) return false;
    return JSON.parse(raw)?.analytics === true;
  } catch { return false; }
}

if (shouldInit()) {
  stripToolbarParams();
  try {
    posthog.init(projectToken, {
      api_host: PROXY_HOST,
      ui_host: UI_HOST,
      defaults: "2026-05-30",
      // Autocapture EVERYTHING — clicks + $pageview + form submits +
      // rage clicks. Manual analytics-sdk still forwards its events for
      // the first-party pipeline; PostHog is the secondary sink.
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      capture_exceptions: true,
      // Opt out by default — flip on when the user accepts the banner.
      // Errors and session lifecycle events STILL bypass this gate via
      // the first-party pipeline (see analytics-sdk.ts ALWAYS_SEND).
      opt_out_capturing_by_default: true,
      // Session Replay with WebGL canvas capture so the MapLibre map
      // shows up in recordings. Sample rate applies at PostHog project
      // level; the SDK just enables the capability.
      disable_session_recording: false,
      session_recording: {
        recordCanvas: true,
        canvasFps: 4,
        canvasQuality: "0.6",
        maskAllInputs: true,
        maskTextSelector: "[data-sensitive]",
      } as any,
      person_profiles: "identified_only",
      // Toolbar off completely — see top-of-file rationale. Also close
      // it defensively in loaded() in case the SDK ever bypasses the
      // config flag from a URL param we didn't strip.
      disable_toolbar_metrics: true,
      loaded: (ph: typeof posthog) => {
        try { (ph as any)?.toolbar?.close?.(); } catch { /* ignore */ }
        // Sync consent state on load.
        try {
          if (hasAnalyticsConsent()) ph.opt_in_capturing();
          else ph.opt_out_capturing();
        } catch { /* ignore */ }
        // Register our first-party session id as a super-property so every
        // PostHog event carries `ksyk_session_id`. This makes the "Watch
        // replay in PostHog" link from the admin dashboard resolve to the
        // right recording via a property filter.
        try {
          const sid = sessionStorage.getItem("ksyk_session_id");
          if (sid) (ph as any).register?.({ ksyk_session_id: sid });
        } catch { /* ignore */ }
      },
      debug: (import.meta as any).env?.DEV,
    } as any);
    initialised = true;

    // Listen for the consent-changed event dispatched by CookieConsent
    // when the user accepts / declines analytics tracking.
    window.addEventListener("ksyk:analytics-consent", () => {
      try {
        if (hasAnalyticsConsent()) posthog.opt_in_capturing();
        else posthog.opt_out_capturing();
      } catch { /* ignore */ }
    });
  } catch {
    // PostHog init failure must never crash the app — first-party
    // pipeline covers analytics per spec §14.
  }
}

// ── Global error capture ──────────────────────────────────────────────
// These catch non-React errors (MapLibre frame crashes, unhandled promises,
// third-party script failures) that never pass through ErrorBoundary.
// PostHog's capture_exceptions:true only covers its own SDK path; we
// also explicitly send to captureException so errors appear in PostHog
// Error Tracking with a session replay link.
if (typeof window !== "undefined" && initialised) {
  const prevOnError = window.onerror;
  window.onerror = (msg, src, line, col, err) => {
    try {
      const e = err instanceof Error ? err : new Error(String(msg));
      posthog.captureException?.(e, {
        extra: { source: src, line, col },
      });
    } catch { /* never crash on telemetry */ }
    if (typeof prevOnError === "function") prevOnError(msg, src, line, col, err);
    return false;
  };

  const prevUnhandled = window.onunhandledrejection;
  window.onunhandledrejection = (ev) => {
    try {
      const reason = ev.reason;
      const e = reason instanceof Error ? reason : new Error(String(reason));
      posthog.captureException?.(e, { extra: { type: "unhandledrejection" } });
    } catch { /* never crash on telemetry */ }
    if (typeof prevUnhandled === "function") prevUnhandled.call(window, ev);
  };
}

export default posthog;
