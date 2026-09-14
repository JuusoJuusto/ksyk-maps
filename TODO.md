# KSYK Maps — Working TODO

Living list of what's done, in progress, and pending across sessions. Update inline; do not delete completed items until they've shipped.

## Legend
- ✅ done + deployed
- 🚧 in progress this session
- ⏳ pending — assigned but not started
- ❌ blocked — needs user input / external work

---

## 🚧 In progress this session

- 🚧 **FCM notifications actually deliver end-to-end** — server side ready (init error surfaced, per-token errors, recentDevices list). Still needs: user tests on device, google-services.json verification, verifying tokens land in `push_tokens` after opening v1.74.0 APK.
- 🚧 **Widgets scalable + better** — current lesson highlighted with translucent tile + remaining minutes in this round. Still todo: color-per-subject accent bar, dynamic-color theming.
- 🚧 **Analytics & Logs page cleanup** — PostHog replay deep-link added this round. Still todo: prune dead panels, redesign the tab hierarchy, add Sentry issues panel.
- 🚧 **PostHog session replay** — ksyk_session_id registered as super-property (web + Android) so deep-link from admin drill dialog resolves. Still todo: verify recordings actually surface after next deploy.
- 🚧 **Error tracking UX** — not started. Sentry issues panel deferred to next round.

## ⏳ Pending

- ⏳ Production keystore for Play Store (currently self-signed) — needs user to generate + set env vars.
- ⏳ Firebase Console: verify `fi.ksykmaps` + `fi.ksykmaps.debug` both have current SHA-1 fingerprints (only matters for Auth, not FCM — noted for completeness).
- ⏳ `EMAIL_USER` / `EMAIL_PASSWORD` env vars — user confirms emails already work, so this is done from their end (leave as reminder).

## ❌ Blocked

- ❌ Vercel WAF Custom Rule (Skip Attack Challenge on `x-ksyk-bypass-token`) — user must configure in Vercel Firewall UI. Docs in `android/BUILD.md`.

## ✅ Recently done (last few commits)

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
