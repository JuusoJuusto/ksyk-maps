# KSYK Maps — Working TODO

Living list of what's done, in progress, and pending across sessions. Update inline; do not delete completed items until they've shipped.

## Legend
- ✅ done + deployed
- 🚧 in progress this session
- ⏳ pending — assigned but not started
- ❌ blocked — needs user input / external work

---

## 🚧 In progress this session (v1.76.0)

- 🚧 **FCM not delivering to device** — response says sent:1 but phone shows nothing. Root cause investigation: switch to data-only messages, add step-by-step logging in `onMessageReceived`, check notification channel exists before display, force high priority.
- 🚧 **Widgets bigger + strikethrough on past classes + per-subject accent color** — larger minWidth/minHeight, bump text sizes, add color-per-subject vertical strip.
- 🚧 **Widget long-press configure** — add `android:configure` attribute pointing at a config activity so users can tweak per-widget prefs.

## ⏳ Deferred (too big for this pass — scoped for next rounds)

- ⏳ **Full ScheduleEngine rewrite** — LocalDateTime comparisons, jakso-by-date, centralized service used by TimetableScreen + all widgets + notifications. Wilma iCalendar as source of truth. Touches ~10 files.
- ⏳ **Production keystore** — user must generate a real keystore and set the env vars; I've documented the steps in `android/BUILD.md`. Nothing I can do without their private key.
- ⏳ **Mobile app admin panel — more features** — needs scope discussion. What features? Right now the mobile admin panel is basic. Web admin has everything.
- ⏳ **Website admin panel — more settings** — same. What settings specifically?
- ⏳ **Dynamic-color / Material You widget theming** — RemoteViews doesn't directly support Material dynamic-color; requires Android 12+ colorControlNormal system attrs. Investigate feasibility.

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

- ✅ v1.77.0 · pending push · Mobile Settings → Diagnostics: manual "Register push token" retry button with visible OK/FAIL + error message. Mobile admin → Actions: "Send test push to all" (calls `/notifications/test`, warns on 0 devices) + FCM status card showing config + registered count + init error. Widget max resize doubled to 1080dp, XXL text bucket at width>560dp (subject up to 32sp), bigger 44×40dp nav arrow buttons.
- ✅ v1.76.0 · 3426cd9 · FCM as data-only so onMessageReceived always fires (fixes the "sent:1 but nothing arrived" bug). 6-step logging in KsykFirebaseMessagingService with clear failure points. Channel auto-recovery if missing. POST_NOTIFICATIONS explicit permission check with clear log. Widgets: past classes STRIKETHROUGH via HTML span, per-subject color dot from deterministic 10-hue palette, larger minResize/maxResize dimensions, subject font up to 24sp on widest widgets.
- ✅ v1.75.0 · cf37134 · Widget past-class dimming (grey w/ ✓), automatic day rollover when today's schedule is over (up to 14 days ahead), Next-lesson widget looks 14 days forward with 'Tomorrow' / weekday prefix, bigger 36×32dp arrow buttons, Finnish widget names + rewritten descriptions, targetCellWidth/Height for Android 12+ resize, new Sentry errors tab in Analytics & Logs (deep-links to Issues/Discover/Replays).
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
