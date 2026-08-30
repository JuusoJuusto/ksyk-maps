/**
 * Server-side PostHog capture (posthog-node).
 *
 * Complements posthogLogger.ts:
 *   - posthogLogger.ts → OpenTelemetry Logs (PostHog Logs view)
 *   - posthogNode.ts   → Product analytics events (PostHog Insights)
 *
 * We keep a single PostHog client alive per cold start. `shutdown()` is
 * a no-op on Vercel because we call `flush()` before returning; leaving
 * the client alive lets subsequent invocations reuse it without paying
 * the init cost.
 */
import { PostHog } from "posthog-node";

const DEFAULT_KEY = "phc_z4eXUY3op3B93RcMzhvCPbUN8c8cACFB92XW3VuBVbCq";
const DEFAULT_HOST = "https://us.i.posthog.com";

const apiKey = process.env.POSTHOG_API_KEY || DEFAULT_KEY;
const host = process.env.POSTHOG_HOST || DEFAULT_HOST;

let client: PostHog | null = null;

function getClient(): PostHog {
  if (client) return client;
  client = new PostHog(apiKey, {
    host,
    // No batching on Vercel — flush after every capture so we don't lose
    // events when the runtime freezes.
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

export function capture(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
): void {
  try {
    getClient().capture({
      distinctId,
      event,
      properties: {
        source: "ksyk-maps-api",
        ...properties,
      },
    });
  } catch { /* never crash on telemetry */ }
}

export async function flush(): Promise<void> {
  try { await getClient().flush(); } catch { /* ignore */ }
}
