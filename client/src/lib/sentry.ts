/**
 * Sentry web wrapper. Initialised early from main.tsx.
 *
 * DSN is baked as a default so the integration works with zero env
 * configuration; override with VITE_SENTRY_DSN. On localhost dev we
 * skip init by default to keep the Issues feed clean — pass
 * VITE_SENTRY_DEV=true to override.
 */
import * as Sentry from "@sentry/react";

const DEFAULT_DSN =
  "https://265057853851f81798b8f01ebb2c236a@o4512001020133376.ingest.de.sentry.io/4512012645302352";

const dsn =
  ((import.meta as any).env?.VITE_SENTRY_DSN as string | undefined) ??
  DEFAULT_DSN;

let initialised = false;

function shouldInit(): boolean {
  if (typeof window === "undefined") return false;
  if (initialised) return false;
  if (!dsn) return false;
  const h = window.location.host;
  const isLocal = h.includes("localhost") || h.includes("127.0.0.1");
  if (isLocal && !(import.meta as any).env?.VITE_SENTRY_DEV) return false;
  return true;
}

export function initSentry() {
  if (!shouldInit()) return;
  try {
    Sentry.init({
      dsn,
      // Route every envelope POST through /monitoring/* (same-origin) so
      // uBlock / EasyPrivacy don't strip it. vercel.json rewrites this to
      // o4512001020133376.ingest.de.sentry.io/*. The DSN's project id
      // (4512001025376336) determines the URL suffix Sentry writes.
      tunnel: "/api/sentry-tunnel",
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          // Mask all text content so student names, schedules, and room data
          // are never visible in session replays.
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      // In production, sample 20 % of transactions and 100 % of error
      // sessions for session replay. Adjust up when we care more about
      // performance data, down if we hit Sentry quota.
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      tracePropagationTargets: [
        "localhost",
        /^https:\/\/(www\.)?ksykmaps\.fi\/api/,
      ],
      beforeSend(event, hint) {
        // Attach PostHog session replay URL as a tag for easy cross-reference.
        try {
          const phReplayUrl = (window as any).posthog?.get_session_replay_url?.();
          if (phReplayUrl) event.tags = { ...event.tags, posthog_session: phReplayUrl };
        } catch { /* ignore */ }
        // Drop known-transient MapLibre render errors — they self-recover
        // each frame and are already tracked as maplibre_transient_error.
        const err = hint?.originalException as any;
        const msg = String(err?.message || event.message || "");
        const stack = String(err?.stack || "");
        if (
          /Cannot read properties of undefined \(reading '(get|getLayer|0)'\)/.test(msg) &&
          /(renderLayer|_render|Object\.(circle|line|fill|symbol)|Om\.render|setUniform)/.test(stack)
        ) {
          return null;
        }
        return event;
      },
    });
    initialised = true;
  } catch {
    // Sentry init failure must never crash the app.
  }
}

export default Sentry;
