/**
 * PostHog web wrapper.
 *
 * Every request goes through the **managed reverse proxy at t.ksykmaps.fi**
 * (PostHog-provisioned, live). We deliberately IGNORE any VITE_POSTHOG_HOST
 * env var override — historically that variable was set to the raw
 * us.i.posthog.com and caused every capture, config, flag lookup, and log
 * to go directly to posthog.com, which:
 *   1. leaks the phc_ project token in URL query strings for tools like
 *      the Logs endpoint (`?token=phc_…`),
 *   2. gets blocked by uBlock Origin / EasyList / EasyPrivacy at the
 *      network layer,
 *   3. exhausts our CSP allowlist with third-party subdomains.
 *
 * Hard-coding the proxy means the browser only ever sees same-site URLs
 * under `https://t.ksykmaps.fi/…`.
 *
 * The toolbar is disabled everywhere because it (a) crashes with
 * `n.key.toLowerCase()` on undefined `event.key` from synthetic
 * keyboard events, (b) surfaces the "hedgehog" floating button that
 * end users don't want to see, (c) isn't needed in production.
 */
import posthog from "posthog-js";

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

if (shouldInit()) {
  try {
    posthog.init(projectToken, {
      // Hard-coded proxy. Ignoring VITE_POSTHOG_HOST is deliberate.
      api_host: PROXY_HOST,
      ui_host: UI_HOST,
      defaults: "2026-05-30",
      capture_pageview: false, // our own SDK handles route changes
      autocapture: true,
      capture_exceptions: true,
      person_profiles: "identified_only",
      // Toolbar off everywhere. See top-of-file rationale.
      disable_toolbar_metrics: true,
      disable_session_recording: false, // replay ON for prod
      loaded: (ph) => {
        try { (ph as any)?.toolbar?.close?.(); } catch { /* ignore */ }
      },
      debug: (import.meta as any).env?.DEV,
    } as any);
    initialised = true;
  } catch {
    // PostHog init failure must never crash the app — first-party
    // pipeline covers analytics per spec §14.
  }
}

export default posthog;
