# KSYK Maps — Working TODO

Living list of what's done, in progress, and pending across sessions. Update inline; do not delete completed items until they've shipped.

## Legend
- ✅ done + deployed
- 🚧 in progress this session
- ⏳ pending — assigned but not started
- ❌ blocked — needs user input / external work

---

## 🚧 In progress this session

- 🚧 **Widget past-class dimming + all-day view** — show every lesson of the day, not just future ones; grey out ones that have ended. When today's schedule is finished, roll to tomorrow.
- 🚧 **Widget rollover across days** — Next/Current widgets must look forward across dates when today's are all done.
- 🚧 **Widget button tap targets** — arrows currently 24dp, bump to 48dp minimum.
- 🚧 **Widget names + descriptions + preview images** — better labels in the picker.
- 🚧 **Sentry issues panel** in Analytics & Logs.
- 🚧 **FCM device-side verification** — awaiting user to install v1.74.0 APK, open, then confirm devices count ticks up. Server-side is instrumented.

## 📋 Big pending — Schedule engine unification

**User spec:** switch every timetable comparison from `HH:mm` clock math to full `LocalDateTime` comparisons against the actual event date. Ensure jakso boundaries are respected using event dates (not just day-of-week). Centralize in a single ScheduleEngine used by TimetableScreen + all three widgets + notifications. Timezone Europe/Helsinki everywhere.

Status: not started — needs a follow-up round because it touches `ScheduleStore`, `TimetableScreen`, all three widgets, `LessonReminderReceiver`, and Wilma iCalendar parsing.

## ⏳ Pending

- ⏳ Production keystore for Play Store (currently self-signed) — needs user to generate + set env vars.
- ⏳ Firebase Console: verify `fi.ksykmaps` + `fi.ksykmaps.debug` both have current SHA-1 fingerprints (only matters for Auth, not FCM — noted for completeness).
- ⏳ `EMAIL_USER` / `EMAIL_PASSWORD` env vars — user confirms emails already work, so this is done from their end (leave as reminder).

## ❌ Blocked

- ❌ Vercel WAF Custom Rule (Skip Attack Challenge on `x-ksyk-bypass-token`) — user must configure in Vercel Firewall UI. Docs in `android/BUILD.md`.

## ✅ Recently done (last few commits)

- ✅ v1.75.0 · pending · Widget past-class dimming (grey w/ ✓), automatic day rollover when today's schedule is over (up to 14 days ahead), Next-lesson widget looks 14 days forward with 'Tomorrow' / weekday prefix, bigger 36×32dp arrow buttons, Finnish widget names + rewritten descriptions, targetCellWidth/Height for Android 12+ resize, new Sentry errors tab in Analytics & Logs (deep-links to Issues/Discover/Replays).
- ✅ v1.74.0 · cb48ff9 · Persistent `TODO.md`. FCM: `/notifications/status` returns `initError` + `recentDevices` + all env-var-set flags; `sendToTokens` returns per-token error codes when ≤20 targets. Widgets: current-lesson translucent tile + remaining-minutes chip, softer 3-stop navy→indigo gradient, weekend empty-state emoji. PostHog: `ksyk_session_id` registered as super-property (web + Android), admin session drill dialog has "Watch replay in PostHog" deep-link button.
- ✅ v1.73.0 · c1e2ff3 · Apple Maps-style DetailSheet (grabber, colored category icon bubble, prominent Directions CTA), FCM diagnostics (`{warning: no devices}` when total=0, `/notifications/status` returns 7d/30d counts).
- ✅ v1.72.0 · ba54ceb · CSP fixed in vercel.json (Firebase + googletagmanager whitelisted), admin analytics 401s fixed (OverviewInsightsCards + AnalyticsExternalPanel now send admin headers), Sentry tunnel 403 fixed (X-Sentry-Auth forwarded), CampusMap switched to CartoDB Voyager tiles, TodaySchedule widget contextual day chip.
- ✅ v1.71.0 · ee5d396 · Admin panel consolidated ("Analytics & Logs" tab merges 4 old panels), feedback/bugs/crashes workflow states, invite/reset email failure visibility, onboarding 5→3 pages, in-app Changelog screen, crash logs upload to `/api/crash-reports`, FCM tap intent routing, jakso auto-switch by date picker.
- ✅ v1.71.0 · f6a661a · Firebase Analytics disabled on Android (fixed map crash), Firebase removed from web bundle (fixed CSP), `KsykApp.onCreate` wrapped in `runCatching`, `registerFcmToken()` defensive.

---

## Standing rules for this project

- **Never** add `Co-Authored-By: Claude` trailer to commits.
- **Never** link feedback / support to `juuso.kaikula@gmail.com`.
- Bump version string on every user-facing change (client `changelog.ts` + Android `build.gradle.kts`).
- Keep secrets out of `android/` — server env vars only.
