/**
 * Diagnostic runner for the Wilma iCal parser.
 *
 * Run with:  npx tsx server/__diag__/wilmaDebug.ts
 *
 * Builds a fixture matching the shape the user described (multi-jakso
 * series with overlapping weekdays, EXDATE exclusions, TZID Europe/
 * Helsinki, RESERVATION category for lunch) and prints the concrete
 * occurrences the parser generates. This is how we PROVE the parser
 * is correct instead of trusting the diff.
 */

import { parseICalFeed } from '../icalParser.js';

const FIXTURE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Wilma test//EN
X-WR-TIMEZONE:Europe/Helsinki
BEGIN:VTIMEZONE
TZID:Europe/Helsinki
END:VTIMEZONE
BEGIN:VEVENT
UID:series-A-jakso1
SUMMARY:MA4.F (TCh) (K24)
LOCATION:K24 K24 Mannerheim
CATEGORIES:Education
DTSTART;TZID=Europe/Helsinki:20260817T094500
DTEND;TZID=Europe/Helsinki:20260817T110000
RRULE:FREQ=WEEKLY;UNTIL=20261005T110000
END:VEVENT
BEGIN:VEVENT
UID:series-B-jakso2
SUMMARY:MA5.F (TCh)
LOCATION:K24 K24 Mannerheim
CATEGORIES:Education
DTSTART;TZID=Europe/Helsinki:20261006T094500
DTEND;TZID=Europe/Helsinki:20261006T110000
RRULE:FREQ=WEEKLY;UNTIL=20261020T110000
EXDATE;TZID=Europe/Helsinki:20261013T094500
END:VEVENT
BEGIN:VEVENT
UID:series-C-jakso3
SUMMARY:MA6.F (TCh)
LOCATION:A24 A24
CATEGORIES:Education
DTSTART;TZID=Europe/Helsinki:20261019T094500
DTEND;TZID=Europe/Helsinki:20261019T110000
RRULE:FREQ=WEEKLY;UNTIL=20261026T110000
EXDATE;TZID=Europe/Helsinki:20261014T094500
END:VEVENT
BEGIN:VEVENT
UID:reservation-lounas
SUMMARY:Lounas
LOCATION:K27 K27 Liikuntasali
CATEGORIES:Reservation
DTSTART;TZID=Europe/Helsinki:20260818T111500
DTEND;TZID=Europe/Helsinki:20260818T120000
RRULE:FREQ=WEEKLY;UNTIL=20260929T120000
END:VEVENT
BEGIN:VEVENT
UID:utc-encoded-test
SUMMARY:UTC time test — should read 08:15 Helsinki
LOCATION:A33-A34 A33-A34
CATEGORIES:Education
DTSTART:20260901T051500Z
DTEND:20260901T063000Z
END:VEVENT
END:VCALENDAR`;

const RAW_VEVENT_COUNT = 5;

function main() {
  const now = new Date();
  console.log('=== Wilma parser diagnostic ===');
  console.log(`Current server time: ${now.toISOString()}`);
  console.log(`Server TZ: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log('');

  const occurrences = parseICalFeed(FIXTURE);

  const lessons = occurrences.filter(o => o.type === 'lesson');
  const reservations = occurrences.filter(o => o.type === 'reservation');

  console.log(`RAW VEVENT COUNT:               ${RAW_VEVENT_COUNT}`);
  console.log(`EXPANDED OCCURRENCE COUNT:      ${occurrences.length}`);
  console.log(`  lessons:                      ${lessons.length}`);
  console.log(`  reservations:                 ${reservations.length}`);
  console.log('');

  const byDate = new Map<string, typeof occurrences>();
  for (const o of occurrences) {
    if (!byDate.has(o.localDate)) byDate.set(o.localDate, []);
    byDate.get(o.localDate)!.push(o);
  }

  const sortedDates = [...byDate.keys()].sort();
  console.log(`DATES WITH LESSONS: ${sortedDates.length}`);
  console.log('');

  const checkDates = [
    '2026-08-17',  // Series A first
    '2026-08-24',
    '2026-09-28',
    '2026-10-05',  // Series A last
    '2026-10-06',  // Series B first (must NOT include A)
    '2026-10-13',  // Should be EXDATE'd from Series B
    '2026-10-19',  // Series C first
    '2026-10-20',  // Series B last + series C
    '2026-10-14',  // Series C EXDATE — but 2026-10-14 is before series C DTSTART (2026-10-19), so it shouldn't matter
    '2026-10-26',  // Series C last
    '2026-11-02',  // No series active — should be empty
  ];

  for (const date of checkDates) {
    const events = byDate.get(date) ?? [];
    console.log(`--- ${date} (${events.length} events) ---`);
    for (const e of events) {
      console.log(`  ${e.startHhmm}–${e.endHhmm}  [${e.type}]  ${e.summary}  @ ${e.location}`);
      console.log(`    occurrenceId=${e.occurrenceId}`);
    }
    if (events.length === 0) console.log('  (empty)');
  }

  console.log('');

  // Explicit assertions
  const errors: string[] = [];

  const oct5 = byDate.get('2026-10-05') ?? [];
  if (!oct5.some(e => e.uid === 'series-A-jakso1')) {
    errors.push('EXPECTED: series-A lesson on 2026-10-05 (last occurrence of RRULE UNTIL=20261005)');
  }

  const oct6 = byDate.get('2026-10-06') ?? [];
  if (oct6.some(e => e.uid === 'series-A-jakso1')) {
    errors.push('BUG: series-A appeared on 2026-10-06 — RRULE ended 20261005 (UNTIL)');
  }
  if (!oct6.some(e => e.uid === 'series-B-jakso2')) {
    errors.push('EXPECTED: series-B lesson on 2026-10-06 (DTSTART)');
  }

  const oct13 = byDate.get('2026-10-13') ?? [];
  if (oct13.some(e => e.uid === 'series-B-jakso2')) {
    errors.push('BUG: series-B appeared on 2026-10-13 despite EXDATE');
  }

  const nov2 = byDate.get('2026-11-02') ?? [];
  if (nov2.length > 0) {
    errors.push(`BUG: got ${nov2.length} events on 2026-11-02 — no series should be active`);
  }

  // Timezone check: UTC event at 05:15Z should read 08:15 Helsinki (DST → UTC+3)
  const utcTest = occurrences.find(o => o.uid === 'utc-encoded-test');
  if (utcTest) {
    if (utcTest.startHhmm !== '08:15') {
      errors.push(`BUG: UTC 05:15Z should be 08:15 Helsinki, got ${utcTest.startHhmm}`);
    }
    if (utcTest.localDate !== '2026-09-01') {
      errors.push(`BUG: UTC 05:15Z on 20260901 should be localDate 2026-09-01, got ${utcTest.localDate}`);
    }
  } else {
    errors.push('BUG: UTC-encoded event missing from output');
  }

  // Reservation should be classified, not shown as lesson
  const lounasOne = reservations.find(o => o.uid === 'reservation-lounas');
  if (!lounasOne) {
    errors.push('EXPECTED: Lounas classified as reservation');
  }

  console.log('=== ASSERTIONS ===');
  if (errors.length === 0) {
    console.log('ALL PASSED ✓');
    process.exit(0);
  } else {
    for (const e of errors) console.log(`FAIL: ${e}`);
    process.exit(1);
  }
}

main();
