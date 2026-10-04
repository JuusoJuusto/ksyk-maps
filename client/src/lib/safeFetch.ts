/**
 * safeFetch — wrapper around window.fetch that never leaks an unhandled
 * promise rejection.
 *
 * Problem it solves (v1.0.1):
 *   `TypeError: Failed to fetch` was dominating our PostHog error
 *   tracking (407 events in 14 days).  Root cause:
 *   `void fetch(url, { keepalive: true })` with no `.catch` — the
 *   surrounding `try/catch` cannot catch a rejected promise, so each
 *   network failure (offline, DNS, keepalive-size cap during pagehide)
 *   bubbled up to window.onunhandledrejection and got reported.
 *
 * Usage:
 *   await safeFetch("/api/foo", { method: "POST", body })
 *      .catch((err) => handleOffline(err));
 *
 *   Or fire-and-forget with no risk of unhandled rejection:
 *   safeFetchFireAndForget("/api/foo", { method: "POST", body });
 *
 * Error shape:
 *   On a network error (TypeError from fetch), throws a new Error with
 *   the message `fetch <METHOD> <PATH>: <orig message>`.  Query strings
 *   are stripped so we don't leak tokens into error tracking.
 */

function methodOf(init?: RequestInit): string {
  const m = (init?.method ?? "GET").toUpperCase();
  return m;
}

function pathOf(input: RequestInfo | URL): string {
  try {
    const raw = typeof input === "string" ? input
      : input instanceof URL ? input.toString()
      : (input as Request).url;
    // Strip query string and hash so no tokens / IDs leak.
    const noQuery = raw.split("?")[0].split("#")[0];
    // For same-origin requests Vercel/Chrome return a relative-ish path;
    // for absolute URLs trim the origin so the message stays short.
    try { return new URL(noQuery, typeof window === "undefined" ? "http://x" : window.location.origin).pathname; }
    catch { return noQuery; }
  } catch {
    return "<unknown>";
  }
}

export async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    // TypeError: Failed to fetch (Chrome), NetworkError (Firefox), etc.
    const method = methodOf(init);
    const path   = pathOf(input);
    const orig   = err instanceof Error ? err.message : String(err);
    throw new Error(`fetch ${method} ${path}: ${orig}`);
  }
}

/**
 * Fire-and-forget — never throws, never produces an unhandled rejection.
 * Use for best-effort uploads (telemetry, session recording, beacons).
 * The `onError` callback is optional — console.debug by default so dev
 * builds surface them in the console without touching error tracking.
 */
export function safeFetchFireAndForget(
  input: RequestInfo | URL,
  init?: RequestInit,
  onError?: (err: Error) => void,
): void {
  safeFetch(input, init).catch((err: Error) => {
    if (onError) {
      try { onError(err); } catch { /* onError itself can't crash the host */ }
    } else if (typeof console !== "undefined") {
      // Silent in prod — PostHog Replay will note the attempted upload
      // in the breadcrumbs if needed.  Dev builds get a quiet log.
      try { console.debug("[safeFetch]", err.message); } catch { /* */ }
    }
  });
}
