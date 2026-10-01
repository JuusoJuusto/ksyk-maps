/**
 * Amica RSS feed for the /lunch page, shared by the Vercel handler
 * (api/index.ts) and the Express dev server (server/routes.ts).
 *
 * The upstream feed is slow at times, so the fetch has a timeout and the
 * last good response is kept in memory. When the upstream fails, a stale
 * copy is better than an error, so we serve it if we have one.
 */
const FEED_URL = "https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3026&language=fi";
const FETCH_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 10 * 60_000;

let cached: { xml: string; fetchedAt: number } | null = null;

export async function getLunchMenuXml(): Promise<string> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.xml;
  try {
    const response = await fetch(FEED_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`Lunch feed responded ${response.status}`);
    const xml = await response.text();
    cached = { xml, fetchedAt: Date.now() };
    return xml;
  } catch (error) {
    if (cached) return cached.xml;
    throw error;
  }
}
