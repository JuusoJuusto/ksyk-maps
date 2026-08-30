/**
 * PostHog web wrapper — safe to import from anywhere.
 *
 * KSYK Maps writes to PostHog as an OPTIONAL secondary sink alongside the
 * first-party pipeline (see analytics-sdk.ts). We bake a public project
 * token (phc_… — safe to expose per PostHog docs) as the default so the
 * integration works out of the box without needing a build-time env var.
 * You can still override with VITE_POSTHOG_KEY / VITE_POSTHOG_HOST.
 */
import posthog from "posthog-js";

const DEFAULT_KEY = "phc_z4eXUY3op3B93RcMzhvCPbUN8c8cACFB92XW3VuBVbCq";
const DEFAULT_HOST = "https://us.i.posthog.com";

const projectToken =
  ((import.meta as any).env?.VITE_POSTHOG_KEY as string | undefined) ??
  DEFAULT_KEY;
const host =
  ((import.meta as any).env?.VITE_POSTHOG_HOST as string | undefined) ??
  DEFAULT_HOST;

let initialised = false;

function shouldInit(): boolean {
  if (typeof window === "undefined") return false;
  if (initialised) return false;
  if (!projectToken) return false;
  // Don't send events from localhost dev by default — set
  // VITE_POSTHOG_DEV to any truthy value to override.
  const h = window.location.host;
  const isLocal = h.includes("localhost") || h.includes("127.0.0.1");
  if (isLocal && !(import.meta as any).env?.VITE_POSTHOG_DEV) return false;
  return true;
}

if (shouldInit()) {
  try {
    posthog.init(projectToken, {
      api_host: host,
      defaults: "2026-05-30",
      capture_pageview: false, // our SDK handles route change tracking
      autocapture: true,
      capture_exceptions: true,
      person_profiles: "identified_only",
      debug: (import.meta as any).env?.DEV,
    });
    initialised = true;
  } catch {
    // PostHog init failure must never crash the app — first-party
    // pipeline covers analytics per spec §14.
  }
}

export default posthog;
