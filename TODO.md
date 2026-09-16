# KSYK Maps — Working TODO

Living list of what's done, in progress, and pending across sessions. Update inline; do not delete completed items until they've shipped.

## Legend
- ✅ done + deployed
- 🚧 in progress this session
- ⏳ pending — assigned but not started
- ❌ blocked — needs user input / external work

---

**Where does this file live?** `TODO.md` at the repo root:
`C:\Users\JuusoKaikula\Downloads\KSYK-Map\TODO.md`
Also on GitHub at `main/TODO.md`.

---

## ✅ Just shipped (Android v1.89.0 · web 4.7.8 · pending push)

- **Home tab section reorder (Android)** — new `HomeSectionsScreen` reached from Settings → Appearance → Customize home. Long-press the drag handle on the right side of any row and drag up/down. Each section (6 of them: Quick actions · Now/next lesson · Rest of day · Tomorrow preview · Campus stats · Announcements) can also be hidden via a Switch. Persisted in `SharedPreferences("ksyk_home_layout")` as a CSV of `section_id:visible` pairs. `HomeScreen` iterates `HomeSectionPrefs.load(ctx).sections.forEach` so the same handlers all still work — just in user-chosen order.
- **Retention chart in admin analytics** — new `RetentionChart` card below the timeseries. Line chart of D0→D30 cohort retention over the last 60 days. `/api/analytics/retention` cohort SQL uses `COALESCE(user_id, anonymous_id, session_id)` so anonymous students still track. D1 / D7 / D30 quick-look numbers in the card header.
- Kotlin compile clean; TypeScript clean.

## ✅ Shipped (Android v1.88.0 · web 4.7.7 · pushed 1f62dcb)

- **Widget long-press config actually does something now.** The TodayScheduleWidget config activity had 3 toggles (Hide Past / Auto Roll / Show Chip) that never took effect because the widget's `updateWidget()` never read them. Fixed: every render honors all three per widget-id. Added a **fourth pref — Default Day** picker (`-1 = Yesterday · 0 = Today · 1 = Tomorrow · 2 · 3`) so users can pin a widget to a specific day.
- **Session replay scrubber upgraded** in `AdminAnalyticsDashboard.tsx`:
  - **Kind filter chips** (Errors · Search · Pageviews · Nav · Other) with per-kind counts. Click to hide/show.
  - **Playback speed selector** (0.5× · 1× · 2× · 4×) — big time-saver on long sessions.
  - **Loop toggle** for repeated review.
  - **Real mm:ss / total elapsed display** replacing "+Ns from start".
  - **Keyboard shortcuts**: `Space` play/pause · `←/→` step · `L` loop.
  - Event list opens by default with a max-height scroller instead of a giant page-height list, and rows now show `+elapsed` offset from session start instead of wall-clock time.

## ✅ Shipped (web 4.7.6 · pushed 7304c37)

- **Admin Analytics & Logs cleanup — the primary ask.**
  - `AppLogsManager` (Logs pill) had **7 tabs**: All Logs, Live Events, Logins, App Events, Analytics, Insights, Easter Eggs. The last three all had aggregate views that ALSO existed in `AdminAnalyticsDashboard`. Trimmed to **4 tabs** — raw log streams only.
  - Top stat cards in Logs went from **5 → 4** — dropped Total Visitors, Total Searches, Page Views (those live in Analytics tab). Kept Total Logs / Live Events / Logins / App Events.
  - Reorganized pill nav in `InsightsPanel` — clearer order (Analytics → Live logs → Errors → Feedback → External), each pill has a hint tooltip, header subtitle updates to match the active pill.
  - Removed 3 redundant `/api/telemetry/*` fetches that only fed the deleted duplicate cards.
  - Renamed the Logs card title from "Application Logs" → "Live log stream" with an explanatory sub-text pointing admins to the Analytics pill for aggregate views.

## ✅ Shipped (Android v1.87.0 · web 4.7.5 · pushed fa8022d)

- **Fixed duplicate 360° icon on the public map.** `installPOIs` and `installPoiPillars` now skip `kind='panorama'` so only the dedicated fuchsia layer shows. Was rendering the panorama TWICE — once as a grey POI chip and once as the fuchsia 360° badge stacked on top.
- **Popular-rooms heatmap (admin-only)** — 🔥 toggle in the bottom-right button stack, visible only when `ksyk_admin_token` is present. New `/api/analytics/room-popularity` aggregates last-30-day `room_view` events grouped by `metadata.roomId`, joins to `rooms.points` centroid, returns `{ roomId, count, lat, lng }`. Rendered as a MapLibre heatmap layer with green→yellow→orange→red gradient.
- **Updated `room_view` telemetry** — every call site now passes `roomId + roomNumber` in metadata so the heatmap has real data going forward.
- **Widget scaling for stretched sizes.** New XXL bucket (>1400dp) on all three widgets. NextLesson/CurrentLesson subject text up to 84sp; TodaySchedule subject up to 56sp.
- **WAY bigger day-navigation buttons in TodaySchedule** — 72×60dp (was 56×48) with 42sp arrows (was 34sp).

## ✅ Shipped (Android v1.86.0 · web 4.7.4 · pushed 84682f9)

- **Panorama viewer — Polycam support.** `poly.cam` / `polycam.ai` share URLs auto-rewrite to `/embed` form; kuula.co gets `?fs=1`; direct `.jpg` panoramas render via pannellum (lazy-loaded from CDN) for proper spherical projection with mouse/touch/gyro. Recognizes roundme, momento360, panoraven, 360cities, Google Street View.
- **PanoramaViewer extracted to `client/src/components/PanoramaViewer.tsx`** so both the Builder AND the public map use the same viewer + URL classifier.
- **`usePanoramaViewer` hook + `ksyk:panorama:open` window event** — CampusOverlay dispatches; KSYKMapView listens. Clean pub/sub, no prop drilling.
- **Panorama markers on the public map** — new fuchsia glow + white ring + "360°" label rendered above every other POI layer. Same styling as the Builder now.
- **Better Builder markers** — soft outer glow halo, 3px white ring, tighter letterspacing on the "360°" label.
- **"Import Floor Plan" button in TopToolbar** — no longer hidden in the command palette. If a building is selected before importing, every SVG shape becomes a *room* in that building on the current floor (Polycam workflow); otherwise shapes still land as buildings.
- **SvgImportDialog copy updated** — mentions Polycam explicitly, explains the room-vs-building selection behavior.
- **Server contract unchanged** — panoramas still ride on `campus_pois` with `kind="panorama"`, URL in `metadata.url`; no new tables.

## ✅ Shipped (Android v1.85.0 · web 4.7.3 · pushed b7d327b)

- **Builder — Measure tool HUD** (M key). Floating right-side panel with per-segment lengths + total. Copy button exports "12.3 m + 4.5 m = 16.8 m" to clipboard. Clear button (or Esc) resets waypoints; tool stays active so you can chain measurements.
- **Builder — Midpoint snapping** for doors, POIs, and every tool that used `computeSmartSnap`. New `snapPointToNearestMidpoint()` — snaps to the halfway point of the nearest wall segment or room/building edge, sitting between "existing point" and "wall segment" in the precedence chain. Amber indicator distinguishes midpoint snaps from vertex/wall snaps.
- **Builder — 360° panorama spots**. New tool in the POI palette under a new "Immersive" group; hotkey `3`. Places a `campus_pois` row with `kind = "panorama"` and a URL in metadata. Fullscreen viewer detects hosted panorama URLs (kuula, roundme, momento360, panoraven, 360cities) and embeds as iframe; direct JPG/PNG URLs get a drag-to-look-around pan/tilt viewer. Panorama markers render as fuchsia circles with "360°" label on the Builder map.
- **Server** — `/api/pois/:id` PATCH / PUT endpoint (via new `updatePoi()` in kvStorage) so panorama metadata is editable after placement.

## ✅ Shipped (Android v1.84.0 · web 4.7.2 · pushed 7d8dd78)

- **ScheduleEngine — root fix for the "Nyt meneillään" wrong-lesson bug.**
  - New pure-function `fi.ksykmaps.schedule.ScheduleEngine` (no Android deps, unit-testable).
  - Materializes weekly-recurring `ScheduleEntry` + `Jakso` date ranges into concrete-dated `TimedLesson` objects backed by `LocalDateTime`.
  - Every widget + the reminder alarm scheduler now goes through this single source of truth. No more inline HH:mm math drifting between consumers.
  - Migrated: `NextLessonWidget` (materialize 14-day window + `nextLesson()`), `CurrentLessonWidget` (`currentLesson()` + `Duration.between` progress bar), `TodayScheduleWidget` (`classifyForDate` PAST/CURRENT/FUTURE + `nextSchoolDayWithLessons` auto-roll), `LessonReminderScheduler` (materialize + first-lesson-with-lead-time-in-future).
  - `ScheduleStore.saveEntries()` now also persists `jaksot_json` to widget SharedPreferences so widgets can filter by jakso date ranges synchronously.
  - `LessonReminderReceiver` drops its manual `activeJaksoId` filter — engine handles it natively.

## ✅ Shipped (web 4.7.1 · pushed fdb8ca4)

- **Smart guides on Builder canvas** — the one from the "deferred" list.
  - Snap POI / door / entrance / stair / elevator / nav-node placement to nearest existing point (2.5m), wall segment (doors, 3m), or polygon vertex (2.5m). Precedence: point > wall > vertex > raw.
  - Green visual snap indicator on hover: a target circle at the snap point + dashed line from cursor.
  - Connect tool falls back to nearest-node-within-3m when MapLibre pixel query misses.
  - Duplicate-door guard within 0.5m.

## ✅ Shipped (web 4.7.0 · a86f867)

- **Admin → Analytics → Insights tab** with 4 new data cards:
  - Search zero-results table (content gap finder)
  - Peak-usage heatmap (24 × 7 grid, Europe/Helsinki)
  - Device / OS / app-version breakdown (3 side-by-side bars)
  - Bounce rate by landing page (color-coded ≥70% red)
- **Fixed duplicate easter-egg logs** — server-side dedup on (egg, user) within 5 min

## ✅ Shipped (Android v1.83.0 · pushed 7ef73c2)

- **Removed "Delete ALL map data"** danger button — too easy to trigger, no undo path
- **Reminder lead-time slider** in mobile Settings → Notifications (0–30 min, was fixed at 5)
- **`/faq` page** — 9 common questions (Wilma / notifications / widgets / cache / feedback / TODO location / …)
- **"Get the app" popup** with feature flag in admin Settings → Content (dismissible, once per session)
- **Lunch tab per-category emojis** (🥗 kasvis / 🐟 kala / 🍗 kana / 🥩 liha / 🍲 keitto / 🥬 salaatti / 🍰 jälki / 🥖 leipä) — deterministic Finnish-keyword mapping

## ✅ Shipped (v1.82.0)

- **Map "API KEY REQUIRED" watermarks GONE** — CartoDB added the watermark in Sep 2026 for unauthenticated use; switched back to OSM standard tiles which are fine for school-scale traffic.
- **Dev-facing FCM buttons removed** from mobile Settings ("Rekisteröi push-token" / "Kopioi FCM-token") — production-ready now, registration is automatic with retry backoff.
- **Message templates removed** from admin Notifications tab per request.
- **Reset analytics/logs** — new "Danger zone" in admin Settings → Maintenance with three wipe buttons: events / logs / all.
- **README rewritten** — reflects the current stack (Android app, native widgets, PostgreSQL/Drizzle, PostHog, Sentry). Copyright dates now 2025–2026 per your correction.

## ✅ Shipped (v1.81.0)

- FCM upload retry with exponential backoff (fixes "reg fail — Unable to resolve host" on Wi-Fi handoffs)
- Admin: DELETE /push-tokens endpoint + "Reset all tokens" button
- Admin: 6 pre-canned message templates for common broadcasts
- Admin: character counters (65 / 240) on title + body fields

## ✅ Shipped (v1.80.0)

- **FCM finally actually fixed** — switched to modular `firebase-admin/app` + `firebase-admin/messaging` imports (the `.default ?? mod` shim was wrong, module namespace has `apps` not the default export).
- Widget XXXXL bucket (width > 1000dp): subject 40sp / 56sp.
- Copy FCM token button in Settings → Diagnostics for Firebase Console debugging.
- Admin: Broadcast history card with delivery stats (last 50 sends).

## ✅ Just shipped (v1.79.0)

- Widget: config activity on drop (hide-past / auto-roll / show-chip toggles)
- Widget: arrows 56×48dp / 34sp, rows 8dp vertical padding
- Web admin: inline scrubbable session replay timeline (play/pause/prev/next/slider + jump-to-error)

## 🚧 Still working (v1.79.0)

- 🚧 **Widgets stretch to max + bigger text + WAY bigger buttons** — bump text buckets, bigger arrow tap targets, wider row padding so it looks right when stretched large.
- 🚧 **Widget long-press configure activity** — new ConfigActivity + XML for TodaySchedule (default day / show-past toggle).
- 🚧 **Admin panel reorganize Analytics & Logs** — clearer nav pills, remove duplicate cards, add explicit sub-page structure.
- 🚧 **In-app session replay viewer** — build a scrubbable event-timeline in the session drill dialog. Own it instead of shelling to PostHog for the basic case.
- 🚧 **FCM verification report** — user asked for structured FCM implementation report.

## ⏳ Deferred honestly — each needs its own focused round

- ⏳ **Full ScheduleEngine rewrite** — 10+ files (ScheduleEntry model → LocalDateTime, ScheduleStore, TimetableScreen, all 3 widgets, LessonReminderReceiver, LessonReminderScheduler, Wilma iCalendar parser, HomeScreen). Rushing this will break "Nyt meneillään" for real users. Needs a solo round.
- ⏳ **Dynamic-color Material You widgets** — RemoteViews limitation; can only reference `@android:color/system_accent1_*` inline (Android 12+). Investigate + prototype next round.
- ⏳ **Production keystore** — blocked on you (private key material). Docs in `android/BUILD.md`.

## ❌ Blocked

- ❌ Vercel WAF Custom Rule (Skip Attack Challenge on `x-ksyk-bypass-token`) — user must configure in Vercel Firewall UI. Docs in `android/BUILD.md`.

## ✅ Recently done (last few commits)

- ✅ v1.78.0 · bac34f6 · **CRITICAL FCM require→dynamic import fix** (was throwing ReferenceError silently on Vercel). Admin panel: init error banner + last-5 recent devices list + per-token error codes + 15s auto-refresh + Copy button on crash logs. Widget XXXL text bucket at width>800dp (subject 44sp/32sp). Widget maxResize 2000dp.
- ✅ v1.77.0 · ccc1bba · Mobile Settings → Diagnostics: manual "Register push token" retry button with visible OK/FAIL + error message. Mobile admin → Actions: "Send test push to all" (calls `/notifications/test`, warns on 0 devices) + FCM status card showing config + registered count + init error. Widget max resize doubled to 1080dp, XXL text bucket at width>560dp (subject up to 32sp), bigger 44×40dp nav arrow buttons.
- ✅ v1.76.0 · 3426cd9 · FCM as data-only so onMessageReceived always fires (fixes the "sent:1 but nothing arrived" bug). 6-step logging in KsykFirebaseMessagingService with clear failure points. Channel auto-recovery if missing. POST_NOTIFICATIONS explicit permission check with clear log. Widgets: past classes STRIKETHROUGH via HTML span, per-subject color dot from deterministic 10-hue palette, larger minResize/maxResize dimensions, subject font up to 24sp on widest widgets.
- ✅ v1.75.0 · cf37134 · Widget past-class dimming, day rollover, next-lesson 14-day lookahead, Sentry errors tab.
- ✅ v1.74.0 · cb48ff9 · TODO.md, FCM /notifications/status returns initError + recentDevices + per-env-var flags, per-token errors, ksyk_session_id super-property (web + Android), admin session drill "Watch replay in PostHog" button.

---

## Standing rules for this project

- **Never** add `Co-Authored-By: Claude` trailer to commits.
- **Never** link feedback / support to `juuso.kaikula@gmail.com`.
- Bump version string on every user-facing change (client `changelog.ts` + Android `build.gradle.kts`).
- Keep secrets out of `android/` — server env vars only.
- Always maintain this TODO.md; recap done/pending at the end of every response.
