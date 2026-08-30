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
  "https://307744c2ccba7e5ffa05ec0bb5a9478c@o4512001020133376.ingest.de.sentry.io/4512001025376336";

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
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      // In production, sample 20 % of transactions and 100 % of error
      // sessions for session replay. Adjust up when we care more about
      // performance data, down if we hit Sentry quota.
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1.0,
      tracePropagationTargets: [
        "localhost",
        /^https:\/\/(www\.)?ksykmaps\.fi\/api/,
      ],
      // We filter out the known-transient MapLibre render errors here
      // so they don't burn Sentry quota. They already flow through our
      // first-party analytics as `maplibre_transient_error` events.
      beforeSend(event, hint) {
        const err = hint?.originalException as any;
        const msg = String(err?.message || event.message || "");
        const stack = String(err?.stack || "");
        if (
          /Cannot read properties of undefined \(reading '(get|getLayer|0)'\)/.test(msg) &&
          /(renderLayer|_render|Object\.(circle|line|fill|symbol)|Om\.render|setUniform)/.test(stack)
        ) {
          return null; // drop
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
