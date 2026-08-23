/**
 * iCalendar parser for Wilma school calendar feeds.
 *
 * Handles:
 *  - Line folding (RFC 5545 §3.1)
 *  - VEVENT properties: DTSTART, DTEND, SUMMARY, LOCATION, DESCRIPTION, UID, RRULE
 *  - Timestamps with TZID (local Finnish time) and UTC (Z suffix)
 *  - All-day events (VALUE=DATE)
 *  - Weekly RRULE expansion for school schedules
 *  - Teacher extraction from DESCRIPTION
 */

export interface RawEvent {
  uid: string;
  summary: string;
  location: string;
  description: string;
  dtstart: Date | null;
  dtend: Date | null;
  rrule: string | null;
  isAllDay: boolean;
}

export interface ExpandedEvent {
  uid: string;
  summary: string;
  location: string;
  description: string;
  date: Date;              // calendar date (no time)
  startHhmm: string;      // "HH:mm"
  endHhmm: string;        // "HH:mm"
  dayOfWeek: number;      // 1=Mon … 7=Sun
  teacher: string;
  isAllDay: boolean;
}

// -------------------------------------------------------------------
// Entry point
// -------------------------------------------------------------------

export function parseICalFeed(icalText: string): ExpandedEvent[] {
  const raw = parseRawEvents(icalText);
  const expanded: ExpandedEvent[] = [];
  // Expand recurring events over ±8 weeks from today
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 7);
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 8 * 7);

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

  return expanded;
}

// -------------------------------------------------------------------
// Low-level VEVENT parser
// -------------------------------------------------------------------

function parseRawEvents(icalText: string): RawEvent[] {
  // Unfold: continuation lines start with space or tab
  const unfolded = icalText.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events: RawEvent[] = [];
  let props: Record<string, string> | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (t === 'BEGIN:VEVENT') {
      props = {};
    } else if (t === 'END:VEVENT' && props) {
      const ev = buildEvent(props);
      if (ev) events.push(ev);
      props = null;
    } else if (props !== null) {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const rawKey = line.slice(0, colon);
      const value = line.slice(colon + 1);
      // Strip parameters from key (e.g. DTSTART;TZID=...) → DTSTART
      const baseKey = rawKey.split(';')[0].toUpperCase();
      // Store first occurrence only (RRULE can appear once)
      if (!(baseKey in props)) props[baseKey] = value;
    }
  }

  return events;
}

function buildEvent(props: Record<string, string>): RawEvent | null {
  const uid = props['UID'] ?? `gen-${Math.random().toString(36).slice(2)}`;
  const summary = unescape(props['SUMMARY'] ?? '');
  const location = unescape(props['LOCATION'] ?? '');
  const description = unescape(props['DESCRIPTION'] ?? '');
  const rrule = props['RRULE'] ?? null;

  const dts = parseDt(props['DTSTART'] ?? '');
  const dte = parseDt(props['DTEND'] ?? '');

  return {
    uid,
    summary,
    location,
    description,
    dtstart: dts?.date ?? null,
    dtend: dte?.date ?? null,
    rrule,
    isAllDay: dts?.isAllDay ?? false,
  };
}

// -------------------------------------------------------------------
// Date / time parsing
// -------------------------------------------------------------------

interface DtResult { date: Date; isAllDay: boolean }

function parseDt(raw: string): DtResult | null {
  if (!raw) return null;

  // All-day: VALUE=DATE:20241009
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
      // Convert UTC to local (Finland = UTC+2/+3). We keep as-is;
      // the HH:mm is extracted locally, which is correct for display.
      const d = new Date(Date.UTC(year, month, day, hour, min, sec));
      return { date: d, isAllDay: false };
    } else {
      // TZID-tagged or floating — treat as local school time.
      // We build a local Date object which is correct for HH:mm extraction.
      const d = new Date(year, month, day, hour, min, sec);
      return { date: d, isAllDay: false };
    }
  }

  return null;
}

// -------------------------------------------------------------------
// RRULE expansion (FREQ=WEEKLY is the only case we handle)
// -------------------------------------------------------------------

function expandRecurring(ev: RawEvent, from: Date, to: Date): ExpandedEvent[] {
  if (!ev.dtstart || !ev.dtend || !ev.rrule) return [];

  // Parse basic RRULE
  const parts: Record<string, string> = {};
  for (const p of ev.rrule.split(';')) {
    const eq = p.indexOf('=');
    if (eq !== -1) parts[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }

  const freq = parts['FREQ']?.toUpperCase();
  if (freq !== 'WEEKLY' && freq !== 'DAILY') return [];

  const interval = parseInt(parts['INTERVAL'] ?? '1', 10) || 1;
  const durationMs = ev.dtend.getTime() - ev.dtstart.getTime();

  // UNTIL or COUNT limit
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

    if (cursor >= from) {
      const end = new Date(cursor.getTime() + durationMs);
      const exp = toExpanded(ev, cursor, end);
      if (exp) results.push(exp);
    }
    generated++;
    // Advance by interval weeks or days
    if (freq === 'WEEKLY') cursor.setDate(cursor.getDate() + 7 * interval);
    else cursor.setDate(cursor.getDate() + interval);
  }

  return results;
}

// -------------------------------------------------------------------
// Convert raw event + dates to ExpandedEvent
// -------------------------------------------------------------------

function toExpanded(ev: RawEvent, start: Date, end: Date): ExpandedEvent | null {
  if (ev.isAllDay) return null; // skip all-day events for timetable

  const dayOfWeek = start.getDay() === 0 ? 7 : start.getDay(); // 1=Mon..7=Sun

  return {
    uid: ev.uid,
    summary: ev.summary || 'Unknown lesson',
    location: ev.location,
    description: ev.description,
    date: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
    startHhmm: hhmm(start),
    endHhmm: hhmm(end),
    dayOfWeek,
    teacher: extractTeacher(ev.description),
    isAllDay: false,
  };
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

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
  // Wilma often puts: "Opettaja: Virtanen, M." or "Teacher: Smith, J."
  const m = description.match(/(?:opettaja|teacher|opettajat|opettajat:|teachers?:?)\s*:?\s*([^\n\\]+)/i);
  if (m) {
    return m[1]
      .replace(/\\n.*/s, '') // cut off after first line
      .replace(/\\/g, '')
      .trim();
  }
  // Try extracting from first non-empty line of description
  const firstLine = description.split(/\\n|\n/).find(l => l.trim());
  return firstLine?.trim() ?? '';
}
