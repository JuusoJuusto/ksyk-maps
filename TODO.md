# KSYK Maps — Working TODO

Living list of what's done, in progress, and pending across sessions. Update inline; do not delete completed items until they've shipped.

## Legend
- ✅ done + deployed
- 🚧 in progress this session
- ⏳ pending — assigned but not started
- ❌ blocked — needs user input / external work

---

## ✅ Just shipped (v1.80.0 · pending push)

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
