/**
 * iCalendar parser for Wilma school calendar feeds.
 *
 * Semantics:
 *  - RFC 5545 line unfolding.
 *  - Every VEVENT is an independent series. We do NOT merge VEVENTs by
 *    summary or weekday.
 *  - Each VEVENT's DTSTART / DTEND / RRULE (weekly with UNTIL/COUNT) is
 *    expanded into concrete occurrences.
 *  - EXDATE occurrences are subtracted.
 *  - Times are treated in Europe/Helsinki local time. Wilma emits
 *    TZID=Europe/Helsinki and X-WR-TIMEZONE:Europe/Helsinki; we assume
 *    all VEVENT times without a `Z` suffix are already in that zone.
 *  - CATEGORIES tags each occurrence (lesson / reservation / other) so
 *    the caller can filter Lounas reservations away from real lessons.
 *  - Occurrence identity is `${UID}:${startTimestamp}` — enough to
 *    deduplicate a repeated VEVENT without collapsing genuinely
 *    different series that happen to share a weekday.
 */

export interface RawEvent {
  uid: string;
  summary: string;
  location: string;
  description: string;
  categories: string[];
  dtstart: Date | null;
  dtend: Date | null;
  rrule: string | null;
  /** Set of local date+time strings ("YYYYMMDDTHHmmss") to exclude. */
  exdates: Set<string>;
  isAllDay: boolean;
}

export interface ExpandedEvent {
  uid: string;
  occurrenceId: string;
  summary: string;
  location: string;
  description: string;
  /** Occurrence's local calendar date at Europe/Helsinki. */
  date: Date;
  /** "YYYY-MM-DD" in Europe/Helsinki. */
  localDate: string;
  startHhmm: string;
  endHhmm: string;
  dayOfWeek: number; // 1=Mon … 7=Sun
  teacher: string;
  type: 'lesson' | 'reservation' | 'other';
  isAllDay: boolean;
}

// -------------------------------------------------------------------
// Entry point
// -------------------------------------------------------------------

export function parseICalFeed(icalText: string): ExpandedEvent[] {
  const raw = parseRawEvents(icalText);
  const expanded: ExpandedEvent[] = [];

  // Look 8 weeks back and 26 weeks forward — enough for a whole term.
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 8 * 7);
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 26 * 7);

  for (const ev of raw) {
    if (!ev.dtstart || !ev.dtend) continue;
    if (ev.rrule) {
      expanded.push(...expandRecurring(ev, windowStart, windowEnd));
    } else {
      const exp = toExpanded(ev, ev.dtstart, ev.dtend);
      if (exp && exp.date >= windowStart && exp.date <= windowEnd) {
        expanded.push(exp);
      }
    }
  }

  // Deduplicate by occurrenceId. A Wilma feed occasionally emits
  // overlapping series for the same lesson in different jaksot; the
  // (UID, start) tuple keeps them distinct while dropping true dupes.
  const seen = new Set<string>();
  const out: ExpandedEvent[] = [];
  for (const e of expanded) {
    if (seen.has(e.occurrenceId)) continue;
    seen.add(e.occurrenceId);
    out.push(e);
  }
  return out;
}

// -------------------------------------------------------------------
// Low-level VEVENT parser
// -------------------------------------------------------------------

interface RawLine { key: string; params: Record<string, string>; value: string }

function parseRawEvents(icalText: string): RawEvent[] {
  // Unfold: continuation lines start with space or tab (RFC 5545 §3.1)
  const unfolded = icalText.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events: RawEvent[] = [];
  // Accumulate raw lines per property so multi-value fields (EXDATE) are preserved.
  let bucket: RawLine[] | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (t === 'BEGIN:VEVENT') {
      bucket = [];
    } else if (t === 'END:VEVENT' && bucket) {
      const ev = buildEvent(bucket);
      if (ev) events.push(ev);
      bucket = null;
    } else if (bucket !== null && line) {
      const parsed = parseLine(line);
      if (parsed) bucket.push(parsed);
    }
  }
  return events;
}

function parseLine(line: string): RawLine | null {
  const colon = line.indexOf(':');
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [rawKey, ...paramTokens] = head.split(';');
  const key = rawKey.toUpperCase();
  const params: Record<string, string> = {};
  for (const p of paramTokens) {
    const eq = p.indexOf('=');
    if (eq !== -1) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }
  return { key, params, value };
}

function firstOf(lines: RawLine[], key: string): RawLine | undefined {
  return lines.find(l => l.key === key);
}
function allOf(lines: RawLine[], key: string): RawLine[] {
  return lines.filter(l => l.key === key);
}

function buildEvent(lines: RawLine[]): RawEvent | null {
  const uid = firstOf(lines, 'UID')?.value ?? `gen-${Math.random().toString(36).slice(2)}`;
  const summary = unescape(firstOf(lines, 'SUMMARY')?.value ?? '');
  const location = unescape(firstOf(lines, 'LOCATION')?.value ?? '');
  const description = unescape(firstOf(lines, 'DESCRIPTION')?.value ?? '');
  const categoriesRaw = firstOf(lines, 'CATEGORIES')?.value ?? '';
  const categories = categoriesRaw
    .split(',').map(s => s.trim()).filter(Boolean);

  const dtstartLine = firstOf(lines, 'DTSTART');
  const dtendLine = firstOf(lines, 'DTEND');
  const dts = dtstartLine ? parseDt(dtstartLine.value) : null;
  const dte = dtendLine ? parseDt(dtendLine.value) : null;

  const rrule = firstOf(lines, 'RRULE')?.value ?? null;

  // EXDATE — collect from every occurrence, comma-split each value.
  const exdates = new Set<string>();
  for (const l of allOf(lines, 'EXDATE')) {
    for (const v of l.value.split(',')) {
      const k = exdateKey(v);
      if (k) exdates.add(k);
    }
  }

  return {
    uid,
    summary,
    location,
    description,
    categories,
    dtstart: dts?.date ?? null,
    dtend: dte?.date ?? null,
    rrule,
    exdates,
    isAllDay: dts?.isAllDay ?? false,
  };
}

// -------------------------------------------------------------------
// Date / time parsing
// -------------------------------------------------------------------

interface DtResult { date: Date; isAllDay: boolean }

/** Normalise an EXDATE value to a "YYYYMMDDTHHmmss" key we can compare
 *  against an occurrence's local start time. Also accepts date-only. */
function exdateKey(raw: string): string | null {
  const dtOnly = raw.match(/(\d{8})T(\d{6})/);
  if (dtOnly) return `${dtOnly[1]}T${dtOnly[2]}`;
  const dOnly = raw.match(/(\d{8})/);
  if (dOnly) return `${dOnly[1]}T000000`;
  return null;
}

function parseDt(raw: string): DtResult | null {
  if (!raw) return null;

  // All-day: VALUE=DATE:20241009  or  20241009
  const dateOnly = raw.match(/VALUE=DATE:(\d{8})/i) || raw.match(/^(\d{8})$/);
  if (dateOnly) {
    const s = dateOnly[1];
    const d = new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
    return { date: d, isAllDay: true };
  }

  // Datetime: 20241009T081500 or 20241009T081500Z
  const dtMatch = raw.match(/(\d{8})T(\d{6})(Z)?/);
  if (dtMatch) {
    const [, dateStr, timeStr, isUtc] = dtMatch;
    const year = +dateStr.slice(0, 4);
    const month = +dateStr.slice(4, 6) - 1;
    const day = +dateStr.slice(6, 8);
    const hour = +timeStr.slice(0, 2);
    const min = +timeStr.slice(2, 4);
    const sec = +timeStr.slice(4, 6);
    if (isUtc) {
      // Convert UTC → Europe/Helsinki wall clock.
      const utcMs = Date.UTC(year, month, day, hour, min, sec);
      return { date: helsinkiWallClockFromUtc(utcMs), isAllDay: false };
    }
    // TZID-tagged or floating — Wilma emits TZID=Europe/Helsinki, so
    // the numbers are already Helsinki wall clock. We build a
    // "floating" Date whose local getters return the exact HH:mm the
    // calendar published, regardless of the server's own timezone.
    return { date: new Date(year, month, day, hour, min, sec), isAllDay: false };
  }
  return null;
}

/** Given a UTC millisecond timestamp, return a Date whose local getters
 *  (`getHours`, `getDate`, etc.) yield the wall-clock time as seen in
 *  Europe/Helsinki. Works regardless of the host machine's timezone
 *  (Vercel serverless runs UTC). */
function helsinkiWallClockFromUtc(utcMs: number): Date {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? '0';
  const y = +g('year');
  const m = +g('month') - 1;
  const d = +g('day');
  let hh = +g('hour');
  const mm = +g('minute');
  const ss = +g('second');
  if (hh === 24) hh = 0;
  return new Date(y, m, d, hh, mm, ss);
}

// -------------------------------------------------------------------
// RRULE expansion — FREQ=WEEKLY / DAILY only, honours UNTIL/COUNT/EXDATE
// -------------------------------------------------------------------

function expandRecurring(ev: RawEvent, from: Date, to: Date): ExpandedEvent[] {
  if (!ev.dtstart || !ev.dtend || !ev.rrule) return [];

  const parts: Record<string, string> = {};
  for (const p of ev.rrule.split(';')) {
    const eq = p.indexOf('=');
    if (eq !== -1) parts[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }

  const freq = parts['FREQ']?.toUpperCase();
  if (freq !== 'WEEKLY' && freq !== 'DAILY') return [];

  const interval = parseInt(parts['INTERVAL'] ?? '1', 10) || 1;
  const durationMs = ev.dtend.getTime() - ev.dtstart.getTime();

  let untilDate: Date | null = null;
  if (parts['UNTIL']) {
    const u = parseDt(parts['UNTIL']);
    if (u) untilDate = u.date;
  }
  const count = parts['COUNT'] ? parseInt(parts['COUNT'], 10) : null;

  const results: ExpandedEvent[] = [];
  const cursor = new Date(ev.dtstart);
  let generated = 0;
  const maxIter = 500;

  while (generated < maxIter) {
    if (cursor > to) break;
    if (untilDate && cursor > untilDate) break;
    if (count !== null && generated >= count) break;

    // EXDATE skip: compare cursor's wall clock to the excluded key.
    const key = wallClockKey(cursor);
    const excluded = ev.exdates.has(key);

    if (!excluded && cursor >= from) {
      const end = new Date(cursor.getTime() + durationMs);
      const exp = toExpanded(ev, cursor, end);
      if (exp) results.push(exp);
    }
    generated++;
    if (freq === 'WEEKLY') cursor.setDate(cursor.getDate() + 7 * interval);
    else cursor.setDate(cursor.getDate() + interval);
  }
  return results;
}

function wallClockKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${dd}T${hh}${mm}${ss}`;
}

// -------------------------------------------------------------------
// RawEvent × occurrence → ExpandedEvent
// -------------------------------------------------------------------

function toExpanded(ev: RawEvent, start: Date, end: Date): ExpandedEvent | null {
  if (ev.isAllDay) return null;

  const dayOfWeek = start.getDay() === 0 ? 7 : start.getDay();
  const localDateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

  return {
    uid: ev.uid,
    occurrenceId: `${ev.uid}:${start.getTime()}`,
    summary: ev.summary || 'Unknown lesson',
    location: ev.location,
    description: ev.description,
    date: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
    localDate: localDateStr,
    startHhmm: hhmm(start),
    endHhmm: hhmm(end),
    dayOfWeek,
    teacher: extractTeacher(ev.description),
    type: classifyEvent(ev),
    isAllDay: false,
  };
}

function classifyEvent(ev: RawEvent): 'lesson' | 'reservation' | 'other' {
  const cats = ev.categories.map(c => c.toLowerCase());
  if (cats.some(c => c.includes('reservation') || c.includes('varaus'))) return 'reservation';
  if (cats.some(c => c.includes('education') || c.includes('opetus') || c.includes('lesson'))) return 'lesson';
  const summary = ev.summary.toLowerCase();
  if (summary.startsWith('lounas') || summary.includes(' lounas')) return 'reservation';
  return cats.length > 0 ? 'other' : 'lesson';
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function unescape(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function extractTeacher(description: string): string {
  if (!description) return '';
  const m = description.match(/(?:opettaja|teacher|opettajat|opettajat:|teachers?:?)\s*:?\s*([^\n\\]+)/i);
  if (m) {
    return m[1]
      .replace(/\\n.*/s, '')
      .replace(/\\/g, '')
      .trim();
  }
  const firstLine = description.split(/\\n|\n/).find(l => l.trim());
  return firstLine?.trim() ?? '';
}
