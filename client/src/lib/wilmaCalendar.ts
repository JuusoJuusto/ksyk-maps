/**
 * Wilma iCalendar integration for KSYK Maps Web.
 *
 * The iCal URL is stored ONLY in localStorage — it never appears in
 * server logs, analytics, or error messages. Calendar data is fetched
 * through the /api/calendar/parse proxy which parses on-demand and
 * returns normalized events without persisting the URL server-side.
 *
 * Cache strategy: parsed events are cached in sessionStorage for 30
 * minutes to avoid hammering the proxy on every page load.
 */

export interface CalendarEvent {
  uid: string;
  summary: string;
  location: string;
  teacher: string;
  date: string;           // ISO date string
  startHhmm: string;      // "HH:mm"
  endHhmm: string;        // "HH:mm"
  dayOfWeek: number;      // 1=Mon..7=Sun
  matchedRoomId: string | null;
  matchedRoomNumber: string | null;
  matchConfidence: number;
  matchMethod: string;
}

export interface CalendarState {
  connected: boolean;
  events: CalendarEvent[];
  lastSync: Date | null;
  error: string | null;
  syncing: boolean;
}

export interface SyncResult {
  events: CalendarEvent[];
  stats: { total: number; matched: number; unmatched: number; ambiguous: number };
  unknownLocations: string[];
}

const URL_KEY = 'ksyk_wilma_ical_url';
const CACHE_KEY = 'ksyk_wilma_events_cache';
const CACHE_TS_KEY = 'ksyk_wilma_cache_ts';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

// -------------------------------------------------------------------
// URL storage (localStorage — never leaves device)
// -------------------------------------------------------------------

export function getStoredUrl(): string | null {
  try { return localStorage.getItem(URL_KEY); } catch { return null; }
}

export function setStoredUrl(url: string): void {
  try { localStorage.setItem(URL_KEY, url.trim()); } catch { /* ignore */ }
}

export function clearStoredUrl(): void {
  try {
    localStorage.removeItem(URL_KEY);
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TS_KEY);
  } catch { /* ignore */ }
}

// -------------------------------------------------------------------
// Cache helpers
// -------------------------------------------------------------------

function loadCache(): CalendarEvent[] | null {
  try {
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (!ts) return null;
    if (Date.now() - Number(ts) > CACHE_TTL_MS) return null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveCache(events: CalendarEvent[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(events));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch { /* quota exceeded is OK */ }
}

export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TS_KEY);
  } catch { /* ignore */ }
}

export function getCacheAge(): Date | null {
  try {
    const ts = localStorage.getItem(CACHE_TS_KEY);
    return ts ? new Date(Number(ts)) : null;
  } catch { return null; }
}

// -------------------------------------------------------------------
// Sync — fetch + parse via backend proxy
// -------------------------------------------------------------------

export async function syncCalendar(url?: string): Promise<SyncResult> {
  const targetUrl = url ?? getStoredUrl();
  if (!targetUrl) throw new Error('No calendar URL configured');

  const res = await fetch('/api/calendar/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: targetUrl }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const code: Record<string, string> = {
      FETCH_ERROR: 'Could not reach the calendar URL. Make sure it is correct and accessible.',
      NOT_CALENDAR: 'The URL does not point to a calendar file.',
      INVALID_ICAL: 'The file is not a valid iCalendar file.',
      TIMEOUT: 'The calendar server took too long to respond.',
      NETWORK_ERROR: 'Network error — the server could not fetch your calendar.',
    };
    throw new Error(code[body.code] ?? body.message ?? `Server error ${res.status}`);
  }

  const result: SyncResult = await res.json();
  saveCache(result.events);
  return result;
}

// -------------------------------------------------------------------
// Today's schedule helpers
// -------------------------------------------------------------------

function todayDow(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d; // 1=Mon..7=Sun
}

function nowMins(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function hhmmToMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function getCurrentLesson(events: CalendarEvent[]): CalendarEvent | null {
  const dow = todayDow();
  const now = nowMins();
  return events.find(
    e => e.dayOfWeek === dow &&
         hhmmToMins(e.startHhmm) <= now &&
         now < hhmmToMins(e.endHhmm)
  ) ?? null;
}

export function getNextLesson(events: CalendarEvent[]): CalendarEvent | null {
  const dow = todayDow();
  const now = nowMins();
  const todayRest = events
    .filter(e => e.dayOfWeek === dow && hhmmToMins(e.startHhmm) > now)
    .sort((a, b) => hhmmToMins(a.startHhmm) - hhmmToMins(b.startHhmm));
  return todayRest[0] ?? null;
}

export function getTodayLessons(events: CalendarEvent[]): CalendarEvent[] {
  const dow = todayDow();
  const now = nowMins();
  return events
    .filter(e => e.dayOfWeek === dow && hhmmToMins(e.endHhmm) > now)
    .sort((a, b) => hhmmToMins(a.startHhmm) - hhmmToMins(b.startHhmm));
}

export function getWeekLessons(events: CalendarEvent[]): CalendarEvent[][] {
  const byDay: CalendarEvent[][] = Array.from({ length: 5 }, () => []);
  for (const e of events) {
    if (e.dayOfWeek >= 1 && e.dayOfWeek <= 5) {
      byDay[e.dayOfWeek - 1].push(e);
    }
  }
  return byDay.map(day =>
    [...day].sort((a, b) => hhmmToMins(a.startHhmm) - hhmmToMins(b.startHhmm))
  );
}

// -------------------------------------------------------------------
// Load cached data (no network)
// -------------------------------------------------------------------

export function loadCachedEvents(): CalendarEvent[] {
  return loadCache() ?? [];
}
