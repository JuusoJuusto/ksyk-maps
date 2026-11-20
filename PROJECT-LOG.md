# PROJECT-LOG.md — KSYK Maps running history

Append-only.  Agents MUST add a new entry at the top of the list after
every conversation.  Keep each entry scannable.  **Dates follow
`DD-MM-YYYY`** (per project convention):

```
## DD-MM-YYYY — vX.Y.Z — one-line summary
**Asked.** 2–5 bullets of what the user asked for, verbatim-ish.
**Decided.** What we chose to build or defer, with the why.
**Shipped.** Commit SHA + versions + file list touched.
```

Hub: [[BRAIN.md]]  ·  Board: [[ROADMAP.md]]

---

## 20-11-2026 — v1.4.1 / Android 1.3.0 — Analytics rebuilt, errors grouped, owner alerts (Slack + phone)

**Asked.**
- "Improve the analytics admin page on the website and on mobile, and add notifications to me, the owner, via the mobile app and via Slack. Clean up the whole analytics tab, make it simple, with the things PostHog has: errors, analytics, logs, everything. Make it good." (Sent twice; the first run hit the usage limit and saved nothing, the working tree was clean when this run started.)

**Decided.**
- Scope is PostHog's useful core, not a clone: Overview with period-over-period comparison, errors grouped into issues, sessions and replays (kept), logs (kept), the long-tail drill-downs (kept, tucked into Usage), alerts. Funnels, paths and cohorts were skipped: nothing records the events they need.
- The server does the comparing and grouping (`server/insights.ts`) so the website and the Android app show the same numbers. An error fingerprint masks ids, numbers and URLs so `Failed to load room 12` and `... 98` are one issue.
- Alerts (`server/alerts.ts`): Slack incoming webhook (validated to `https://hooks.slack.com/services/…`, stored in `kv_settings`, write-only, `SLACK_WEBHOOK_URL` env as fallback) and push through the existing FCM to a **separate** `alert_devices` list, so student phones can never receive owner alerts. Owner-only. The cooldown is claimed atomically in `alert_events`, spike checks are throttled per instance, and side effects are awaited for at most 4 s because serverless freezes after the response. Defaults on: crash, new error, error spike (15 in 10 min), failed admin sign-ins (5 in 10 min), new ticket, daily digest. Every admin sign-in is off by default.
- Two production bugs found while tracing the data, both fixed: `POST /api/logs/batch` returned 404 on the live site (the route existed only in `server/routes.ts`, so the "Android log pipeline" of v1.2.0 never worked in production), and `POST /api/logs` ignored the `level`, `source`, `errorStack` and `metadata` Android sends, storing every Android error and crash as `info` without a stack. Consequence: error history before this deploy is incomplete.
- Not done, flagged: the separate `android/admin` app is untouched. Only the owner can create the Slack webhook and the `CRON_SECRET`. The alert path (table creation, Slack post, push to a real phone) has never run against a real database, Slack or device; tests cover the gate, validation and secrecy. Confirm the Vercel plan allows the daily cron.
- Coordination: another session ("Mobile admin panel session expiry") was editing the same checkout for v1.4.0. `api/index.ts` and `vercel.json` held both sets of hunks. I refused its proposal to commit my files, because `api/index.ts` imports `server/alerts.ts` on the admin sign-in path and would 500 every sign-in if shipped without it. It shipped v1.4.0 from a separate worktree (`73ee497`); that commit also carried this entry and the ROADMAP card while they still said "not committed", corrected here.

**Shipped.** Committed locally on top of `73ee497` (v1.4.0), not pushed. The commit also carries the other session's small `www` URL edits to `Api.kt`, `RoomFinderScreen.kt`, `SettingsScreen.kt` and two URL lines in `AdminPanelScreen.kt`, because the 1.3.0 APK was built with them; `android/admin` was left out (not rebuilt). Contents:
- Web v1.4.1: `server/alerts.ts`, `server/insights.ts` (new); `server/fcm.ts` (dead tokens also pruned from `alert_devices`); `api/index.ts` (`/logs`, `/logs/batch`, `/admin/insights/*`, `/admin/alerts*`, `/cron/daily-digest`, sign-in and ticket hooks); `vercel.json` (crons); `client/src/components/analytics/` (AnalyticsHub, OverviewTab, ErrorsTab, AlertsTab, shared, UsagePanels = the old AdminAnalyticsDashboard stripped of its default component); `AdminDashboard.tsx`, `AppLogsManager.tsx`; `tests/security/owner-alerts.test.ts` (11 tests); `client/src/lib/changelog.ts`, `CHANGELOG.md`
- Android 1.3.0 (versionCode 118): `ui/AdminInsightsScreen.kt`, `data/AdminAlerts.kt` (new); `AdminPanelScreen.kt` (pills: Insights, Alerts), `MainActivity.kt`, `KsykApp.kt`, `KsykFirebaseMessagingService.kt`, `ChangelogScreen.kt`, `build.gradle.kts`. APK `android/app/build/outputs/apk/release/ksykmaps-release-1.3.0.apk` (63 MB, SHA-256 `7735ecc8da16d67c…`) is **not** in `public/releases/` and `shared/release.ts` is **not** bumped: the build guard fails when the version points at a missing APK.
- Rollback: tag `rollback-before-1-4-1` → `73ee497`; `git reset --hard rollback-before-1-4-1`. DB: three tables are created on first use (`alert_devices`, `alert_events`, `alert_signals`); rollback leaves them (safe).
- Gates: `tsc` clean; `test:security` 37/37 (11 new); `test:seo` 41/41; `npm run build` OK; Gradle `:app:compileReleaseKotlin` and `:app:assembleRelease` OK. Web tabs checked against mocked API data in a throwaway harness (desktop, phone width, dark mode, owner-only state): no console errors; harness deleted. Not run: Playwright e2e, install on a phone, a real Slack message, a real push.

---

## 20-11-2026 — v1.4.0 + security hotfix `4d28b56`

**Asked.** A very large list: improve all admin sections (web + mobile) and the mobile analytics; redo `/download` in the Wilma style with a working real latest APK; a whole-project security assessment; search titles (no em dash, `/download` + `/faq` titles and descriptions, all pages, only the www host); a "disable downloads / coming soon" admin option with a future Google Play link; remind them to re-index; error/crash/feedback alerts to Android + Slack; builder: every snap/tool controlled by the toolbar incl. POIs, **real measurements**, multiple maps (edit then publish); a hide-changelog admin toggle (off by default).

**Decided.**
- Order by risk: the builder measurements (named most important) and the security review first.
- **Measurements:** the bug was three inconsistent formulas (flat 111 320 m/deg, spherical haversine, per-file cos) — a typed 100 m labelled 99.89 m while being 100.25 m on the ground — plus rotated buildings being resized along world axes. Fix = one WGS84 module `client/src/lib/geo.ts` tested against an independent Vincenty implementation, used everywhere; oriented width/height; real area + perimeter. Campus is Kulosaari (60.19 N), not Kokkola — an early draft assumed the wrong city and was corrected before release.
- **Snapping:** the POI/door/stair/lift/node tools ignored the Snap toggle and the Grid toggle did nothing. One `placementSnap` rule + a visible, zoom-aware metre grid (off by default).
- **Download:** one version constant (`shared/release.ts`) for page, build guard and the permanent `/api/download/android`; page rebuilt in the FAQ document style; APK served as an attachment; admin switch (`downloadsEnabled`, `playStoreUrl` validated to Google Play https links, `showChangelog` default off). The switch gates the page button and the permanent link; the raw `/releases/*.apk` static URL cannot be gated by Vercel config alone.
- **SEO:** titles without em dashes; `/download` titled as a download with its own en+fi description; `/faq` own description + FAQPage JSON-LD; apex 308 redirect; every URL we emit uses www. Google keeps the old text until re-crawled — hence the re-index reminder.
- **Security assessment** done (the written report is a local, git-ignored file, `SECURITY-ASSESSMENT.md`, because this repository is public and unfixed findings must not be published). One critical issue was verified on production and hotfixed immediately and separately (`4d28b56`, regression test `tests/security/secret-fallback.test.ts`) so it would not wait on the larger release; the remaining items are tracked privately.
- **Another Claude session** ("Analytics page redesign and notifications") is working in this same checkout on owner alerts (Slack + FCM), an insights API and a new analytics hub, with Android wiring still to come. Its files (`server/alerts.ts`, `server/insights.ts`, `client/src/components/analytics/*`, `tests/security/owner-alerts.test.ts`, parts of `api/index.ts`, `vercel.json` crons, `AdminDashboard.tsx`, `AppLogsManager.tsx`) are NOT mine and were not committed by me. I had staged some of them by accident with `git add -u`; unstaged on its request, no file changed. `api/index.ts` and `vercel.json` held both our hunks, so this release was cut from a clean `origin/main` worktree that carries only my hunks of those two files (filtered by hunk, applied with `git apply`); the other session's work ships separately. Android version numbers left to that session (app 1.3.0 / admin 1.1.2 suggested); I will not run Gradle while it builds.
- The security hotfix was built in a throwaway worktree from a clean `origin/main` so neither session's unfinished work rode along.

**Shipped.** Hotfix pushed: `4d28b56` (3 files: `api/index.ts`, `server/routes.ts`, `tests/security/secret-fallback.test.ts`). Rollback: `git revert 4d28b56` (do not reset; reverting re-opens C1).
- **v1.4.0 (this release):** `client/src/lib/geo.ts`, `publicFlags.ts`, `shared/release.ts`, builder (`pages/builder.tsx`, `components/builder/{PropertyPanel,SelectionHandles,ImageOverlay}.tsx`), `RoutePanel`, `KSYKMapView`, `CampusOverlay`, `svgImport`, `pages/download.tsx`, `CampusSettingsPanel`, `AppSettingsManager`, `shared/{seo,schema}.ts`, `server/initDb.ts`, `scripts/prerender/render.ts`, `vercel.json` (redirect + APK headers), URL changes to www in `server/*`, `public/security.txt`, Android `Api.kt` / `AdminApi.kt` / three UI files; tests `tests/geo` (12), `tests/site` (3), +4 SEO, +3 API. Tag: `rollback-before-1-4-0` (`da8c4fd`).
- Gates on the combined tree (mine + the other session's): `tsc` clean, `npm run build` passes, `test:security` 34/34 before the hotfix test, `test:seo` 41/41, `test:geo` 12/12, `test:site` 3/3. Not run: Playwright e2e; Android build (other session's turn); the builder in a real browser (needs an admin login), so snapping/grid/area readouts are verified by unit tests and type-checking only.
- **Not done in this turn:** multiple maps in the builder (needs a map id column across seven tables and a publish switch — touches the shared `api/index.ts`); mobile analytics improvements and the owner alerts UI/Android wiring (the other session's scope); auditing every remaining admin section.

---

## 19-11-2026 — v1.3.2 / Android 1.2.2 / Admin app 1.1.1 — Sessions renew on web + admin app; v1.3.1 deployed

**Asked.**
- Commit the changes, deploy `api/index.ts` ("can't you just do it"), confirm the APK was built, and "improve the admin panel and the whole mobile app and the website admin panel" at the same time (no further spec).

**Decided.**
- Deploy = push `main`: the repo is wired to Vercel. Committed everything for v1.3.0 + v1.3.1 as `8fb2d3f` (no co-author trailer, per the standing rule), pushed (also shipped the previously unpushed v1.2.0 commit `3d2bc14`), Vercel build succeeded, live check: `POST /api/auth/admin-refresh` answers 401 with the route's own messages (a 404 would mean old code), `/`, `/lunch` (prerendered), `/admin`, `/api/buildings` all 200. A valid-token refresh was not exercised against production (no credentials) — only by unit tests. Left out of the commit: the untracked `.agents/` + `.kiro/` skill folders and `android/adb-logs.ps1` (not part of these releases). Open draft PRs #54 (admin-auth 401 reason, already CONFLICTING) and #55 (`/api/debug` TDZ) overlap `api/index.ts` and were left alone.
- "Improve" was undefined, so scope = the reliability gaps this bug exposed, not redesigns: (1) the web admin force-signed out 12 h after sign-in (`hoursSinceLogin > 12`) with no renewal — now renews while open so the same 12 h rule measures inactivity (a design choice: abandoned tabs still sign out; an open dashboard never does); (2) request layer retries a 401 once after renewing and, if the session is truly dead, returns to `/admin` with "Your session expired" — never redirecting public pages; (3) the separate `android/admin` app gets the same sliding session and notice; (4) its login built JSON by string template, so a password with `"` or `\` could never sign in — fixed; (5) the main app's admin Overview said "System OK" while 5 of 6 requests could fail silently — each endpoint now reports; (6) `admin-refresh` no longer returns `twoFactorSecret` / `twoFactorBackupCodes`.
- Not done (flagged, not guessed): visual/UX redesign of any admin screen, new features, and the other ~15 admin sections in `AdminPanelScreen.kt` / `AdminDashboard.tsx` were not audited line by line. `server/routes.ts` (dev server) still stamps 7-day tokens that nothing there verifies. Sign-in itself still returns the full user row including 2FA fields to the client (pre-existing; only the refresh path was tightened).

**Shipped.** v1.3.1 pushed + live (`8fb2d3f`); this round is on top of it, uncommitted at time of writing.
- Tag: `rollback-before-1-3-2` (→ `git reset --hard rollback-before-1-3-2`, commit `8fb2d3f`). No DB migration.
- Web v1.3.2: `client/src/lib/adminAuth.ts` (rewritten), `client/src/lib/queryClient.ts`, `client/src/components/AdminDashboard.tsx`, `AdminLogin.tsx`, `client/src/pages/builder.tsx`, `api/index.ts`, `tests/security/admin-session.test.ts` (new, 8), `tests/security/api-auth.test.ts` (+1), `client/src/lib/changelog.ts`, `CHANGELOG.md`
- Android 1.2.2 (versionCode 117): `ui/AdminPanelScreen.kt` (Overview), `ui/ChangelogScreen.kt`, `build.gradle.kts`
- Android admin 1.1.1 (versionCode 3): `data/AdminApi.kt`, `data/AdminSession.kt`, `MainActivity.kt`, `ui/login/AdminLoginScreen.kt`, `build.gradle.kts`
- Gates: `tsc` clean; `test:security` 20/20; `test:seo` 38/38; one deliberate regression (a 404 treated as "expired") turned the new web test red and was reverted. Not run: Playwright e2e, any on-device test of either APK, a browser walkthrough of the web admin.

---

## 19-11-2026 — v1.3.1 / Android 1.2.1 — Admin session no longer dies after a week on mobile

**Asked.**
- On the mobile app, an admin who signed in ~2 weeks ago can't use the admin panel any more — it just says error. Fix it so it always works, then build the new APK.

**Decided.**
- Root cause: `generateAdminToken` (`api/index.ts`) issued HMAC tokens with a fixed 7-day expiry. The Android app restores the token from SharedPreferences on launch (`Session.load`) and shows the admin tab from the cached role without ever checking it, so after day 7 every admin call returned 401 `Invalid or expired admin token` and the sections showed errors. Only two of the seven admin sections handled 401 at all.
- Fix = sliding session, not just a longer TTL: new `POST /api/auth/admin-refresh` trades a still-valid token for a fresh 30-day one; the app calls it on every `onStart` (≤ 2×/day), so the token only lapses after 30 days of not opening the app. A longer fixed TTL alone would just move the same failure later.
- The refresh re-checks the account (deleted → 401, `canLoginToKsykMaps === false` → 401; owner break-glass id allowed without a DB row). A DB outage or slow lookup (4 s cap) falls back to the token's own claims so an outage can't sign every admin out.
- Client rules: only a definitive 401 from the refresh ends the session. Network errors, 5xx, 429 and an older server without the endpoint (404) never sign anyone out. Any other call that gets a 401 refreshes once and is replayed (skipped within 30 s of a refresh so a non-token 401 such as bad Wilma credentials doesn't loop). When the session really is dead the user gets a "Session expired — sign in" dialog (with "Later"), not erroring screens.
- Considered and rejected: storing the password on the device to re-login silently (credential storage risk), and a grace window that revives already-expired tokens (would quietly extend every old token's life). Cost: tokens already expired on a phone can't be revived — that one sign-in is needed after updating.
- Not done: the separate `android/admin` app and the web admin (`ksyk_admin_token`) still have no refresh/401 handling; they benefit from the 30-day TTL only. `server/routes.ts` (dev server) also still stamps 7 days but nothing there verifies the token. Logged in ROADMAP.

**Shipped.** Working tree on top of `3d2bc14`; nothing committed, pushed or deployed.
- Tag: `rollback-before-1-3-1` (→ `git reset --hard rollback-before-1-3-1`). No DB migration. Web changes in this entry sit on top of the uncommitted v1.3.0 SEO work in the same files (`api/index.ts`, `client/src/lib/changelog.ts`, `CHANGELOG.md`).
- Web v1.3.1: `api/index.ts` (`ADMIN_TOKEN_TTL_MS`, `/auth/admin-refresh`), `tests/security/api-auth.test.ts` (+4), `client/src/lib/changelog.ts`, `CHANGELOG.md`, `ROADMAP.md`
- Android 1.2.1 (versionCode 116): `data/Api.kt` (`refreshAdminToken`, 401 replay), `data/Session.kt` (`applyRefreshedToken`, `refreshIfDue`, `expire`, `sessionExpiredState`), `MainActivity.kt` (`onStart` refresh, session-expired dialog), `ui/ChangelogScreen.kt`, `app/build.gradle.kts`
- Gates: `tsc` clean; `test:security` 11/11. The web deploy is required for renewal to work: until `api/index.ts` is live, the 1.2.1 app still runs (refresh 404 is ignored) but can't renew.
- Also: `npm run build` (Vite + prerender) passes. Not run: Playwright e2e; no device test of the APK (nothing exercised the refresh against a live deployed server, and no phone with an expired token was available).
- APK: `android/app/build/outputs/apk/release/ksykmaps-release-1.2.1.apk` (63 MB, `fi.ksykmaps`, versionCode 116, release-signed), copied to `public/releases/ksykmaps-release-1.2.1.apk` because `download.tsx` links `ANDROID_APP_VERSION` there. SHA-256 `4cd4efd0…9f5c`. `:app:assembleRelease` only — the separate `:admin` app was not rebuilt.
- Build note: Gradle can't start from the assistant's Bash/PowerShell tool shell here (`Selector.open()` fails with "Invalid argument: connect" on every JDK) but works in the user's own Terminal panel; it was run there with `JAVA_HOME=C:\Program Files\Java\jdk-17`. A harmless Kotlin incremental-cache error (`MapScreenKt$…groupingBy`) triggered the automatic non-daemon fallback.

---

## 01-11-2026 — v1.3.0 — Search discoverability: per-page prerendered HTML, crawlable lunch menu, correct host

**Asked.**
- Audit KSYK Maps so Google and other legitimate crawlers can discover its public pages — Google showed only the download page; lunch and other public pages should be findable too.
- Page-specific title / description / canonical / Open Graph / JSON-LD, correct robots.txt + sitemap.xml, crawlable HTML without breaking the SPA, no private data indexed, tests, no production deploy / DNS / secrets changes.

**Decided.**
- Root causes (observed on production): `vercel.json` rewrote every URL to one empty SPA shell (same title, no canonical, empty `#root`, unknown URLs returned 200); `ksykmaps.fi` 307-redirects to `www.ksykmaps.fi` while every canonical / sitemap / JSON-LD URL named the apex; `robots.txt` blocked `/api/` and did not allow `/api/lunch-menu`, so Google's renderer could not load the menu; the sitemap listed `/directory` (not a route) and `/hsl` (iframe kiosk).
- Rendering: build-time prerender (`scripts/prerender.ts`) writes one static HTML file per public route from the built shell. The SPA still mounts with `createRoot`, so the prerendered body is a crawler / no-JS fallback, not a hydration target. No SSR framework, no new dependencies.
- Canonical host = `https://www.ksykmaps.fi` because that is what returns 200; one constant in `shared/seo.ts`. Flip it together with the Vercel domain redirect if the apex should be primary.
- Indexable: `/`, `/lunch`, `/download`, `/faq`, `/support`, `/privacy`. No new map/schedule pages — the FAQ already documents schedule features and `/` is the map. Noindex (header + meta): admin, builder, `/grant/*`, `/api/*`, `/hsl`, `/app`, `/report`, easter eggs; unknown URLs get `app-shell.html` (noindex).
- Lunch: shared parser + feed URL in `shared/lunchFeed.ts` used by the page, both API handlers and the prerender (no second source of truth). Parity kept with the old parser, including its limits: Friday's unlabeled courses show "not available", Thursday's extra dishes after `Lounas:` are dropped — flagged, not guessed.
- Privacy: `GET /api/staff` returned full staff rows (email, phone, bio) to anyone; now directory fields only unless a valid admin token is sent (`shared/staffPublic.ts`); admin panel sends its token.
- Left alone and flagged: `GET /api/rooms` still returns `teacher`, `maintenanceNotes`, `emergencyInfo` publicly (the map UI may use them); `/api/debug` throws a TDZ error even for admins (`storage` used before init).

**Shipped.** Working tree on top of `3d2bc14`; nothing committed, pushed or deployed.
- Tag: `rollback-before-1-3-0` (→ `git reset --hard rollback-before-1-3-0`). No DB migration. `vercel.json` rewrites change, so revert it with the code.
- Web v1.3.0 (Android unchanged, 1.2.0)
- New: `shared/seo.ts`, `shared/lunchFeed.ts`, `shared/staffPublic.ts`, `scripts/prerender.ts`, `scripts/prerender/render.ts`, `client/src/content/faq.ts`, `client/src/content/privacy.ts`, `client/src/components/RouteMeta.tsx`, `tests/seo/*` (helpers, lunchFeed, config, prerender, dist + fixture), `tests/security/api-auth.test.ts`
- Edited: `vercel.json`, `public/robots.txt`, `package.json` (build runs prerender; `test:seo`, `test:security`), `tsconfig.json`, `client/index.html`, `client/src/App.tsx`, `client/src/pages/{lunch,faq,privacy,download,support}.tsx`, `client/src/components/AdminDashboard.tsx`, `api/index.ts`, `server/routes.ts`, `client/src/lib/changelog.ts`, `CHANGELOG.md`
- Removed: `public/sitemap.xml` (now generated), `client/public/robots.txt` + `client/public/sitemap.xml` (unused duplicates — Vite's publicDir is `public/`)
- Gates: `tsc` clean, `npm run build` passes, `test:seo` 38/38, `test:security` 7/7, four deliberate regressions each turned a test red. Browser check on the built output (direct load, client navigation, refresh, lunch with a faked weekday). Not run: Playwright e2e (needs dev server + DB), Android build (untouched).

## 10-10-2026 — v1.2.0 — Android log pipeline fixed; full error tracking architecture

**Asked.**
- "IMPROVE THE schedule system and the like yk so EVERYTHING works in the mobile app."
- "MAKE THE ERROR TRACKING and all errors and logs go from the mobile app to the admin panel."
- "REDESIGN THE WHOLE ERROR AND LOGGING architecture like so it logs everything and that the analytics&logs tab is clean and has everything and everything works."

**Decided.**
- Root cause: `AppLog.flushForward()` was posting to `/api/session/heartbeat` which does not exist — all Android logs silently 404'd.
- Added `source` + `metadata` columns to `app_logs` (safe ALTER TABLE); added `/api/logs/batch` endpoint for batched Android ingestion.
- `ErrorReporter` now posts every error (map/api/general) to `/api/logs` backend in addition to PostHog + Sentry. Auth events emit a warn-level log.
- `KsykApp.installCrashHandler()` synchronously posts a fatal-level log before the process dies.
- Admin Logs tab gains a Source filter pill (All / Android / Web / Server) and per-row colored source badges (green=android, blue=web, amber=server). Detail sheet shows `metadata` (device, app version, Android SDK).
- Deferred schedule validation (startHhmm < endHhmm) and reminder rescheduling — those are Android-only and no reported breakage.

**Shipped.**
- Tag: `rollback-before-1-2-0`
- Web v1.2.0, Android 1.2.0 (versionCode 115)
- `shared/schema.ts` — source + metadata columns in appLogs
- `server/initDb.ts` — ALTER TABLE app_logs ADD COLUMN source/metadata + index
- `server/postgresStorage.ts` — createAppLog + getAppLogs updated (source, metadata, level/range/cursor filters)
- `server/storage.ts` — interface + in-memory stub updated
- `server/routes.ts` — POST /api/logs/batch added; GET /api/logs now passes source/level/range/cursor filters
- `android/.../data/AppLog.kt` — flushForward posts to /api/logs/batch; includes appVersion + device in JSON
- `android/.../data/ErrorReporter.kt` — reportToBackend() helper; called from map/api/auth/general
- `android/.../KsykApp.kt` — crash handler posts fatal log to /api/logs
- `client/src/components/AppLogsManager.tsx` — source filter pills; colored source badges; metadata in detail sheet
- `client/src/lib/changelog.ts` — APP_VERSION=1.2.0, ANDROID_APP_VERSION=1.2.0
- `android/app/build.gradle.kts` — versionCode 115, versionName 1.2.0
- `public/releases/ksykmaps-release-1.2.0.apk`
- `CHANGELOG.md`, `ROADMAP.md`

## 09-10-2026 — v1.1.9 — Swedish courses expanded to full catalogue

**Asked.** Delete old aRU/bRU/svRU entries and replace with 22 numbered courses: a1RU1-7, a2RU1-7, bRU1-5, svRU1-3.

**Decided.**
- Old generic codes deleted via `DELETE FROM subjects WHERE code IN ('aRU','bRU','svRU')` in initDb.ts migration section.
- 22 new numbered courses inserted in main INSERT block (ON CONFLICT DO NOTHING).
- Retroactive color UPDATE regex and `courseAutoColor` in AdminDashboard.tsx both updated from `(a|b|sv)?RU` to `(a1|a2|a|b|sv)?RU` so new codes get #0284C7 automatically.
- Data-only — no APK required.

**Shipped.**
- Commit `4a35ba6`
- Rollback: `git reset --hard rollback-before-1-1-9`
- Files: `initDb.ts`, `changelog.ts`, `AdminDashboard.tsx`

---

## 09-10-2026 — v1.1.8 — widgets show course names + teachers; iCal teacher fix; Swedish courses renamed

**Asked.**
- Widgets still showing raw Wilma codes (e.g. MA1.F) — make them show real course names
- Show the teacher in widget displays too
- Fix classes showing garbage in the teacher slot
- Add Swedish courses: Ruotsi A1-kieli (aRU), Ruotsi B1-kieli (bRU), Ruotsi lyhyt (svRU)

**Decided.**
- All 3 widgets get `runBlocking { LookupStore.ensureLoadedFromCache() }` at the top of `updateWidget`, then resolve subject and teacher synchronously before building `RemoteViews`. `runBlocking` is acceptable here: disk reads complete in <50 ms and widget framework allows 10 s.
- `ScheduleEngine.materialize()` was not passing `teacherAbbrev` from `ScheduleEntry` to `TimedLesson` even though the field existed. Added `teacherAbbrev = e.teacherAbbrev`.
- `extractTeacher` in `icalParser.ts` had a fallback returning the first line of the iCal description when no "opettaja:" keyword was found — this produced garbage (class codes, group names). Removed fallback; now returns '' instead.
- Swedish INSERT values updated to new names; also added explicit UPDATE statements in initDb.ts for the v1.1.8 migration to fix existing rows in production.

**Shipped.**
- Commit `d54fa13` — versionCode 114, versionName 1.1.8
- APK: `public/releases/ksykmaps-release-1.1.8.apk`
- Rollback: `git reset --hard rollback-before-1-1-8`
- Files: `ScheduleEngine.kt`, `CurrentLessonWidget.kt`, `NextLessonWidget.kt`, `TodayScheduleWidget.kt`, `icalParser.ts`, `initDb.ts`, `changelog.ts`, `build.gradle.kts`

---

## 09-10-2026 — v1.1.7 — teacher email addresses seeded

**Asked.**
- Add firstname.lastname@ksyk.fi email for every teacher; ä→a, ö→o (e.g. jukka.lamsa@ksyk.fi)

**Decided.**
- Separate UPDATE...FROM (VALUES ...) in initDb.ts after the INSERT; sets email only WHERE email IS NULL so admin edits are never overwritten on subsequent cold starts
- No Android APK needed — emails are served from the API, no code change

**Shipped.**
- Files: server/initDb.ts, client/src/lib/changelog.ts, CHANGELOG.md
- Web: APP_VERSION 1.1.7 (ANDROID_APP_VERSION stays 1.1.6)

---

## 09-10-2026 — v1.1.6 — teacher subjects in profile, resolved names in notifications

**Asked.**
- Position should be "Teacher" / "Opettaja" for all staff; department should hold their teaching subjects
- Mobile notifications should show course name (resolved from LookupStore), not raw Wilma code

**Decided.**
- initDb.ts teacher INSERT updated: position/position_en/position_fi='Opettaja'/'Teacher'/'Opettaja'; department/department_en/department_fi from subject lists; ON CONFLICT DO UPDATE so existing v1.1.5 rows are corrected on next cold start
- LessonReminderScheduler.buildPendingIntent resolves lesson.subject via LookupStore.resolveSubject and lesson.teacher via LookupStore.resolveTeacher before putting in intent extras; LookupStore is already loaded (Phase 1 disk cache) by the time alarms are scheduled

**Shipped.**
- Commit: (see below)
- Files: server/initDb.ts, android/.../LessonReminderScheduler.kt, android/app/build.gradle.kts, client/src/lib/changelog.ts, CHANGELOG.md
- Android: versionCode 113, versionName 1.1.6
- Web: APP_VERSION 1.1.6

---

## 09-10-2026 — v1.1.5 — language courses, full teacher roster, instant timetable names

**Asked.**
- Seed all KSYK language courses (a1EN, aRU, bRU, svRU, a1RA, a1SA, a1EA, a2EN, vEN, a2RA, a2SA, a2EA, bRA, bSA, bEA, AIEN, vKOR1, OPO) — these were missing from v1.1.4 which only covered subject courses
- Add all ~90 KSYK teachers (bulk-seed with abbrev, first/last name, positionFi/En, subjectsFi/En)
- Make `courseAutoColor` handle language course prefixes (a1EN, aRU, a1RA, etc.)
- Show timetable subject names immediately on Android open — not after network load

**Decided.**
- Language courses inserted in `initDb.ts` with `ON CONFLICT (code) DO NOTHING`; retroactive color UPDATE CASE extended with language regex patterns
- `courseAutoColor` updated with explicit regex guards before generic prefix-strip logic (language codes checked first since a1EN etc. don't respond to sv/v stripping)
- Teachers inserted via new partial unique index `ON staff (abbrev) WHERE abbrev IS NOT NULL`, enabling `ON CONFLICT (abbrev) WHERE abbrev IS NOT NULL DO NOTHING`; skipped: Eklöf Linda (Virkavapaalla), Lankinen Veeti (sijainen), Rytkönen Peppi (no subject), Opettaja Olli (placeholder), Lintunen Emil (Häcker)
- Android `TimetableScreen` split into Phase 1 (disk cache → `loading=false`) and Phase 2 (network refresh background); `LookupStore.ensureLoadedFromCache()` called before `loading=false` so names appear on first frame

**Shipped.**
- Commit: (tag rollback-before-1-1-5 → see below)
- Files: `server/initDb.ts`, `client/src/components/AdminDashboard.tsx`, `android/.../TimetableScreen.kt`, `android/.../LookupStore.kt`, `android/app/build.gradle.kts`, `client/src/lib/changelog.ts`, `CHANGELOG.md`, `ROADMAP.md`
- Android: versionCode 112, versionName 1.1.5
- Web: APP_VERSION 1.1.5

---

## 08-10-2026 — v1.1.4 — course catalogue, auto-color, EN/FI-only admin forms

**Asked.**
- Remove "Default" title/content fields from AnnouncementManager; keep only EN and FI
- Remove plain Position/Department fields from staff form; keep only EN and FI
- Make course auto-color work when adding/editing a course (prefix→color)
- Retroactively color already-created courses that have no color
- Bulk-add ~116 courses with codes, Finnish names, and English names

**Decided.**
- `courseAutoColor(code)` function strips sv/v prefix then maps to subject color; wired to code input onChange for both add and edit forms
- `handleSubmit`/`handleCreate/UpdateStaff` now derive `title`/`content`/`position`/`department` from FI || EN before sending to server — no backend change needed
- Course seed goes in `initDb.ts` with `ON CONFLICT (code) DO NOTHING` so admin edits are never wiped; retroactive color via `UPDATE subjects SET color = CASE ...`
- Android version unchanged (web-only changes)

**Shipped.** Commits `b2ccc48` / `838f14a` / `ab3d154` · web v1.1.4 · Android 1.1.4 (versionCode 111) · tag `rollback-before-1-1-4`
- `client/src/components/AnnouncementManager.tsx` — removed Default fields, EN/FI only, derived title/content in handleSubmit
- `client/src/components/AdminDashboard.tsx` — courseAutoColor(), wired to code inputs, removed plain Position/Department
- `server/initDb.ts` — 116-row INSERT seed + retroactive color UPDATE
- `client/src/lib/changelog.ts` — bumped APP_VERSION + ANDROID_APP_VERSION to 1.1.4
- `android/app/src/main/kotlin/fi/ksykmaps/ui/TimetableScreen.kt` — LookupStore.invalidate() + ensureLoaded() after sync
- `android/app/build.gradle.kts` — versionCode 111, versionName 1.1.4
- `CHANGELOG.md`, `ROADMAP.md` — updated

**Rollback.** `git reset --hard rollback-before-1-1-4`. No DB migrations; seed is idempotent.

---

## 08-10-2026 — v1.1.3 — profile dialog bottom sheet + timetable UX improvements

**Asked.**
- Make the admin profile dialog scrollable on mobile and desktop
- Improve the dialog on mobile
- Improve the Android mobile app

**Decided.**
- Rewrote `AdminProfileDialog` using Radix `DialogPrimitive` directly (bypassing shadcn's `DialogContent` default classes) to get full control over responsive positioning: desktop stays centered modal, mobile becomes a bottom sheet that slides up from the bottom. Added drag handle pill, 16 px inputs (prevents iOS auto-zoom), `env(safe-area-inset-bottom)` footer padding.
- Android timetable: removed `onDelete` from `TimelineRow` (was cluttering every card with a delete button prone to accidental taps). Delete now lives in `ClassInfoSheet` as an outlined button alongside Edit; confirms via `AlertDialog` before deleting. Added `LocalHapticFeedback` calls on card tap, navigate shortcut, and delete confirm button.

**Shipped.**
- web: `client/src/components/AdminProfileDialog.tsx`, `client/src/lib/changelog.ts`
- android: `TimetableScreen.kt`, `build.gradle.kts`
- docs: `CHANGELOG.md`, `ROADMAP.md`, `PROJECT-LOG.md`
- Web v1.1.3 · Android versionCode 110 / versionName 1.1.3
- Rollback: `git reset --hard rollback-before-1-1-3`; no DB changes

## 08-10-2026 — v1.1.2 — course editing, Wilma sync fix, faster jakso load

**Asked.**
- Allow inline editing of all course fields in the admin Courses tab (was create + delete only)
- Fix Wilma sync bug: pressing "Synkronoi" wiped teacher abbreviations and subject codes from all timetable entries
- Make Wilma sync faster (was slow because `loadJaksot` always hit the network even when DataStore cache was populated)

**Decided.**
- Added `editingCourse` state + `updateCourseMutation` + inline edit form to `AdminDashboard.tsx`; extended `PATCH /api/subjects/:id` to accept `code`, `name`, `nameEn` in addition to `color`
- Root cause of sync wipe: `WilmaConnectScreen.connect()` had duplicate (outdated) inline parsing that didn't extract `teacherAbbrev`/`subjectCode`; fixed by routing through `WilmaRefreshWorker.syncNow`
- `WilmaRefreshWorker.syncNow` now returns `Pair<Int, Int>` (total, matched-rooms); removed spurious `withContext(Dispatchers.Main)` around `saveEntries`
- `ScheduleStore.loadJaksot`: added DataStore cache-first guard — returns early if cache is non-empty, only hits `/jaksot` network when cache is empty (first launch or cleared)

**Shipped.**
- web: `api/index.ts`, `client/src/components/AdminDashboard.tsx`, `client/src/lib/changelog.ts`
- android: `WilmaRefreshWorker.kt`, `WilmaConnectScreen.kt`, `ScheduleStore.kt`, `build.gradle.kts`
- docs: `CHANGELOG.md`, `ROADMAP.md`, `PROJECT-LOG.md`
- Web v1.1.2 · Android versionCode 109 / versionName 1.1.2
- Rollback: `git reset --hard rollback-before-1-1-2`; no DB changes

## 08-10-2026 — v1.1.1 — staff 401/500, iCal teacher fix, Android color revert

**Asked.**
- Fix 401 on POST/PUT/DELETE /api/staff (admin auth header missing from mutations)
- Fix 500 on GET /api/staff and GET /api/subjects (DB columns/table missing on cold start)
- Fix iCal parsing: class codes like `K13` appearing in the teacher field instead of teacher abbrevs like `JLä`
- Revert Android accent color from KSYK navy back to Tailwind blue-500

**Decided.**
- `AdminDashboard.tsx`: added `...getAdminHeaders()` to `createStaffMutation`, `updateStaffMutation`, and `deleteStaffMutation`. Root cause: fetch calls only had `Content-Type` header.
- `server/initDb.ts`: added `ALTER TABLE staff ADD COLUMN IF NOT EXISTS abbrev/wilma_profile_url`, `CREATE TABLE IF NOT EXISTS subjects (...)`, `ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS enable_floor_labels/enable_gps`. These columns are defined in Drizzle schema and used by storage queries but were never added to the auto-init block, causing 500 on first request to a fresh DB.
- `api/index.ts` GET /api/staff: added try/catch to return a structured 500 instead of an unhandled exception.
- `server/icalParser.ts` `extractTeacherAbbrev`: rewrote to iterate all `(...)` groups and return the first token that contains a lowercase letter (teacher abbrevs like `JLä`), skipping all-caps tokens like `K13` (class codes) or `K13 Niinistö` (class + optional name).
- Android: reverted all `Color(0xFF003D82)` back to `Color(0xFF3B82F6)` in OnboardingScreen, LogsScreen, AdminPanelScreen, HomeScreen, MapScreen, SettingsScreen, PostSetupWalkthrough, TimetableScreen. theme.kt and colors.xml (which define the Material You theme primary) left as navy.

**Shipped.** Commit `badf3a1` · Web v1.1.1 · Android versionCode 108 versionName 1.1.1
- `server/initDb.ts`
- `server/icalParser.ts`
- `api/index.ts`
- `client/src/components/AdminDashboard.tsx`
- `client/src/lib/changelog.ts`
- `android/app/build.gradle.kts`
- `android/app/src/main/kotlin/fi/ksykmaps/ui/{OnboardingScreen,LogsScreen,AdminPanelScreen,HomeScreen,MapScreen,SettingsScreen,PostSetupWalkthrough,TimetableScreen}.kt`

Rollback: `git reset --hard rollback-before-1-1-1`
DB: new columns all added with `IF NOT EXISTS` — safe, no manual cleanup needed on rollback.

---

## 07-10-2026 — v1.1.0 — public launch: all 7 remaining roadmap items

**Asked.** "BUILD ALL OF THE REMAINING TASKS NOW" — implement all roadmap items in the Future/Next columns.

**Decided.**
- Public launch: flip `showBetaBanner` default to `false` + migration 0008 + bump to 1.1.0
- Admin settings expansion: `enableFloorLabels` + `enableGPS` columns in appSettings schema + API whitelist + AppSettingsManager UI cards
- Accessible routes prefs: `enforceAccessibleRoutingOnly` field in SecuritySettings type + DEFAULT + deep-merge in loadSecuritySettings + toggle in SecuritySettingsPanel + NavigationPanel now reads the flag via `useSecuritySettings` and derives `effectiveAccessibleOnly`
- Microsoft SSO domains: existing DomainEditor + new `/api/auth/microsoft/status` endpoint + status badge in SecuritySettingsPanel login-gate card
- Sentry sourcemaps: `sourcemap: true` in vite.config.ts + `@sentry/vite-plugin` installed + conditionally active when `SENTRY_AUTH_TOKEN` is set
- Critical CSS: `critters` installed + custom `critical-css` Vite post-build plugin inlines first-paint CSS via Critters, defers non-critical stylesheets
- Android visual pass: replaced all `Color(0xFF3B82F6)` Tailwind-blue with brand navy `Color(0xFF003D82)` across AdminPanelScreen, HomeScreen, LogsScreen, MapScreen, OnboardingScreen, PostSetupWalkthrough, SettingsScreen, TimetableScreen. Android versionCode 107, versionName 1.1.0

**Shipped.** Commit `8994e35` · web v1.1.0 · Android build 1.1.0 (APK building)
- `shared/schema.ts` — showBetaBanner default false, enableFloorLabels + enableGPS columns
- `migrations/0008_public_launch.sql` — new migration
- `api/index.ts` — SETTINGS_COLUMNS whitelist + enableFloorLabels/enableGPS
- `client/src/lib/securitySettings.ts` — enforceAccessibleRoutingOnly field + default + deep-merge
- `client/src/components/SecuritySettingsPanel.tsx` — accessible-routes toggle + Microsoft status badge
- `client/src/components/NavigationPanel.tsx` — effectiveAccessibleOnly from secSettings
- `client/src/components/AppSettingsManager.tsx` — Floor labels + GPS FeatureRow cards
- `vite.config.ts` — sourcemap: true + sentryVitePlugin + critters critical-css plugin
- `client/src/lib/changelog.ts` — APP_VERSION 1.1.0, ANDROID_APP_VERSION 1.1.0
- `server/routes.ts` — /api/auth/microsoft/status endpoint
- `android/app/build.gradle.kts` — versionCode 107, versionName 1.1.0
- Android screens — 0xFF3B82F6 → 0xFF003D82 across all 8 screen files
- Rollback: `git reset --hard rollback-before-1-1-0`. Migration 0008 safe to leave in place.

---

## 07-10-2026 — v1.0.12 — motion pass, FAQ +3 entries, ROADMAP cleanup

**Asked.** Continue and finish all tasks from the roadmap.

**Decided.**
- Motion pass: standardized all dialog/sheet animations to 180ms ease-out open / 140ms ease-in close. Changed `dialog.tsx` (was flat 200ms), `sheet.tsx` (was 500ms/300ms), `.ksyk-bottom-sheet` CSS (was 300ms/200ms), `.map-room-sheet` desktop (was 240ms). Existing global `prefers-reduced-motion: reduce` block already covers all.
- FAQ +3 entries: "Does the app work offline?", "How do I navigate to a classroom?", "What do timetable colors mean?" — all bilingual FI/EN.
- Security reset button: already implemented in `SecuritySettingsPanel.tsx` (audit confirmed).
- Announcement dialog scroll: already correctly implemented with `min-h-0 flex-1 overflow-y-auto` (audit confirmed).
- Critical CSS inline: deferred — complex build-step, only "Next" item left.
- ROADMAP: all stale "Now"/"In progress" items moved to ✅ Shipped.

**Shipped.** Commit `1c5f2e0` · web `v1.0.12`
- `client/src/components/ui/dialog.tsx` — 180ms/140ms timing
- `client/src/components/ui/sheet.tsx` — 180ms/140ms timing
- `client/src/index.css` — bottom sheet + map-room-sheet timing update
- `client/src/pages/faq.tsx` — 3 new bilingual Q&A entries
- `client/src/lib/changelog.ts` — APP_VERSION 1.0.12
- `ROADMAP.md` — board cleanup
- Rollback tag: `rollback-before-1-0-12` → `13569a1`

---

## 07-10-2026 — v1.0.11 + Android 1.0.4 — MapLibre crash fix, course colors, class info sheet, strikethrough

**Asked.**
- Fix MapLibre crash: `MapLibreConfigurationException` when opening the map tab
- Build release APK only (debug MapLibre crash was the reason)
- Fix crash when clicking a class in the timetable
- Make tapping a class open a class info page/sheet (not edit dialog)
- Per-course color in admin Courses tab; use in Android timetable
- Cross out/strikethrough finished classes in timetable tab

**Decided.**
- MapLibre crash: missing `MapLibre.getInstance()` call in `KsykApp.onCreate()` — added with `runCatching` wrapper
- Class info sheet: new `ClassInfoSheet` composable (ModalBottomSheet) shows subject, time, room, teacher, Navigate + Edit buttons; click on TimelineRow now calls `onTap` → `infoEntry` instead of `onEdit`
- Course color: `color varchar` column in subjects table (migration 0007); PATCH `/api/subjects/:id` endpoint; admin Courses tab inline color picker (hidden `<input type="color">` behind a swatch dot); web WilmaScheduleCard uses color for left rail accent
- Strikethrough: `TimelineRow` receives `isToday` + `nowMins`; when `endHhmm <= nowMins` and `isToday`, applies `TextDecoration.LineThrough` on subject text + `alpha = 0.4f` on all elements
- Release build: `./gradlew :app:assembleRelease` — APK at `android/app/build/outputs/apk/release/ksykmaps-release-1.0.4.apk`

**Shipped.** Commit `06896e3` · web `v1.0.11` · Android `1.0.4`
- `android/app/src/main/kotlin/fi/ksykmaps/KsykApp.kt` — MapLibre init
- `android/app/src/main/kotlin/fi/ksykmaps/data/LookupStore.kt` — SubjectInfo + color
- `android/app/src/main/kotlin/fi/ksykmaps/ui/TimetableScreen.kt` — ClassInfoSheet, strikethrough, color resolver
- `android/app/build.gradle.kts` — 1.0.3 → 1.0.4, versionCode 105 → 106
- `shared/schema.ts` — `color` column on subjects
- `migrations/0007_subjects_color.sql` — ALTER TABLE subjects ADD COLUMN color varchar
- `api/index.ts` — POST /api/subjects passes color; new PATCH /api/subjects/:id
- `client/src/components/AdminDashboard.tsx` — color picker in Courses tab
- `client/src/components/WilmaScheduleCard.tsx` — left-rail color dot using course color
- `client/src/lib/changelog.ts` — APP_VERSION 1.0.11, ANDROID_APP_VERSION 1.0.4
- `ROADMAP.md`, `CHANGELOG.md` updated
- Rollback tag: `rollback-before-1-0-11` → `c7666bf`

---

## 07-10-2026 — v1.0.10 + Android 1.0.3 — Courses tab, Wilma profile URLs, label rename

**Asked.**
- Change "Nimenlyhennys (Wilma code)" label to English ("Wilma abbreviation").
- Remove subjects from the Staff tab and make it a separate page called "Courses" (because FY1, FY2, FY3 are individual courses of the same subject).
- Add "open teacher profile in Wilma" link — an admin-configurable URL per teacher, clickable from the schedule card.
- Push to main.

**Decided.**
- DB migration `0006_staff_wilma_url.sql`: add `wilma_profile_url varchar` column to staff.
- API: `wilmaProfileUrl` added to staff POST/PATCH handlers and to `/api/teachers` response.
- Web: `AdminDashboard.tsx` — new `courses` tab slug + nav item; subjects panel removed from `staff` tab; full Courses CRUD moved to own tab with updated placeholder `FY1` and description; `Staff.wilmaProfileUrl` interface + form field; label renamed. `WilmaScheduleCard.tsx` — `TeacherMap` now `Map<string, {name,url?}>`; teacher display becomes `<a>` when URL present, plain text otherwise.
- Android admin: `TeachersScreen.kt` — label renamed, `wilmaProfileUrl` field added to form + JSON save; `SubjectsScreen.kt` — fully rewritten to "Courses" display names, correct API paths kept.
- Android main: `LookupStore.kt` — stores `wilmaProfileUrl` per teacher, exposes `resolveTeacherUrl(abbrev)`; `TimetableScreen.kt` — `teacherUrlResolver` wired up, teacher text uses `primary` colour when URL set, `OpenInNew` icon button fires `Intent.ACTION_VIEW`.
- Both Gradle builds clean. Web `tsc` clean. APP_VERSION `1.0.9 → 1.0.10`. Android `1.0.2 → 1.0.3` (versionCode 104 → 105).

**Shipped.**
- Files: `migrations/0006_staff_wilma_url.sql`, `shared/schema.ts`, `api/index.ts`, `client/src/components/AdminDashboard.tsx`, `client/src/components/WilmaScheduleCard.tsx`, `client/src/lib/changelog.ts`, `android/admin/.../ui/subjects/SubjectsScreen.kt`, `android/admin/.../ui/teachers/TeachersScreen.kt`, `android/admin/.../MainActivity.kt`, `android/app/.../data/LookupStore.kt`, `android/app/.../ui/TimetableScreen.kt`, `android/app/build.gradle.kts`.

---

## 07-10-2026 — Android 1.0.2 — Teachers + Subjects pages in admin app + lyhenne system in timetable

**Asked.**
- Continue Android mobile work from last session: finish Teachers and Subjects pages in the Android admin app.
- Implement the lyhenne (teacher abbreviation) resolution system in the main Android timetable screen.
- Build the APK.

**Decided.**
- Admin app: `TeachersScreen.kt` (already created last session) + new `SubjectsScreen.kt` — both full Compose CRUD screens matching the web admin panel features; `AdminApi.kt` got the missing `put()` method; `MainActivity.kt` gets Teachers + Subjects nav destinations (Badge and MenuBook icons).
- Main app: new `LookupStore.kt` singleton — fetches `/api/teachers` + `/api/subjects` on first load, exposes `resolveTeacher(abbrev)` and `resolveSubject(code)` with prefix-match for subject codes; `ScheduleEntry` gains `subjectCode: String = ""` and `teacherAbbrev: String = ""` (default-valued so old serialised data deserialises safely); `WilmaRefreshWorker.syncNow` reads `subjectCode` and `teacherAbbrev` from server JSON; `TimetableScreen` loads `LookupStore` after initial data fetch and passes resolvers into `TimelineRow` and `TodayGlanceCard`; `ScheduleStore.buildWidgetJson` + `parseWidgetEntries` updated for new fields.
- Both `admin` and `app` Gradle builds passed clean (warnings only — deprecated PostHog API, AutoMirrored icon suggestion).
- Android app version bumped `1.0.1 → 1.0.2` (versionCode 103 → 104).

**Shipped.**
- Files: `android/admin/.../ui/subjects/SubjectsScreen.kt` (new), `android/admin/.../data/AdminApi.kt`, `android/admin/.../MainActivity.kt`, `android/app/.../data/LookupStore.kt` (new), `android/app/.../ui/TimetableScreen.kt`, `android/app/.../ui/WilmaRefreshWorker.kt`, `android/app/.../ui/ScheduleStore.kt`, `android/app/build.gradle.kts`, `client/src/lib/changelog.ts`.

---

## 07-10-2026 — v1.0.9 — Wilma schedule enrichment: teacher abbrev + subjects lookup

**Asked.**
- Mobile app schedule card shows Wilma lessons like `FY1.F (JLä) K13`. Add a **Nimenlyhennys** (abbrev) field to staff in the admin panel so `JLä` can be resolved to the full teacher name.
- Add a **Subjects** section to the admin Staff tab where admins map course codes (e.g. `FY1.F`) to Finnish/English subject names.
- When the schedule card renders a lesson, resolve the abbreviation and code to human-readable names.

**Decided.**
- **iCal parser** (`server/icalParser.ts`) already extracts the parenthesis token as `teacherAbbrev` and the prefix before `(` as `subjectCode` from the Wilma SUMMARY field; added `teacherAbbrev`/`subjectCode` to `ExpandedEvent` + `CalendarEvent` interfaces.
- **DB schema**: `abbrev varchar` column on `staff` table + new `subjects` table (code, name, name_en); migration `0005_teachers_subjects.sql`.
- **API**: `GET /api/teachers` (public, active staff with abbrev set), `GET /api/subjects` (public), `POST /api/subjects` (admin upsert), `DELETE /api/subjects/:id` (admin), `POST/PUT/DELETE /api/staff` (admin CRUD incl. abbrev).
- **Admin panel** (`AdminDashboard.tsx`): added `abbrev` input to the staff form (labelled "Nimenlyhennys (Wilma code)"); abbrev shown as a small code badge next to the staff member's name in the list. Added a **Subjects** card below the staff list with inline add-form and per-row delete.
- **Schedule card** (`WilmaScheduleCard.tsx`): fetches `/api/teachers` + `/api/subjects` on mount, builds lookup Maps; `LessonCard` and `TimetableRow` resolve subject codes (exact + prefix match) and teacher abbreviations before display; falls back to raw `event.summary` / `event.teacher` if unresolved.
- Resolution is kept client-side: the server parser stays stateless and the schedule card owns the enrichment.

**Shipped.**  Web `1.0.8 → 1.0.9`.  Files: `shared/schema.ts`, `migrations/0005_teachers_subjects.sql`, `server/icalParser.ts`, `client/src/lib/wilmaCalendar.ts`, `api/index.ts`, `client/src/components/AdminDashboard.tsx`, `client/src/components/WilmaScheduleCard.tsx`, `client/src/lib/changelog.ts`.  `tsc` clean, Vite production build verified.  Rollback: `git reset --hard rollback-before-1-0-9`. DB migration is backward-safe (additive only).

---

## 05-10-2026 — v1.0.7 — Google Fonts un-blocked (~520 ms LCP) · Map back-link removed from lockout

**Asked.**
- Make the website load faster — Lighthouse flagged `fonts.googleapis.com/css2?...` as a 760 ms render-blocking request (biggest single LCP delay), plus `/assets/index-*.css` (300 ms) and `/assets/vendor-ma....css` (150 ms).
- Find why the access-restricted lockout screen "isn't on" — I can access the site when it should be gated.
- (Mid-session.)  Nevermind — dryRun was enabled.  Remove the Map back-link from the lockout page, and also remove the `?debug-access` overlay I just added.  Push to main.

**Decided.**
- **Fonts.**  Swapped the `<link rel="stylesheet">` for Google Fonts in `client/index.html` to use `media="print" onload="this.media='all'"` — the browser downloads the stylesheet without blocking first paint, then flips `media` back to `all` once parsed.  Added a `<noscript>` fallback so non-JS clients still get the fonts.  `preconnect` to `fonts.googleapis.com` + `fonts.gstatic.com` stays so the handshake overlaps HTML parse.  Expected savings per Lighthouse: ~520 ms LCP.
- **CSS files.**  `/assets/index-*.css` and `/assets/vendor-maplibre.css` can't be deferred the same way — Tailwind utilities + MapLibre controls are needed above-the-fold.  Would need a critical-CSS inlining plugin to save more; parked as [[critical-css-inline]].
- **Lockout was a non-bug.**  Investigated the full gate stack (`useAccessDecision` → `evaluateAccess`); documented all five silent-suppressors in-session (`ksyk_access_granted` grant flag, owner/admin role, `dryRun`, master off, no gate denies).  User reported back that `dryRun` was on in `/admin/security` — that's the explicit admin-test switch, working as designed.  Flipping it off made the lockout fire correctly.  No engine fix needed.
- **Map back-link removed.**  `AccessLockoutScreen` header had a `← Kartta / ← Map` link to `/` that defeated the point — the lockout IS the gate, bouncing back just re-rendered it (or flashed the map briefly while the gate re-evaluated).  Header is now just the uppercase `RESTRICTED` chip.  Owner escape hatch (the `Admin` link in the footer) stays.
- **`?debug-access` overlay reverted.**  Added mid-session as a self-diagnosis aid, but the real cause was already known (dryRun) so the overlay has no reason to ship.  Removed the component, its invocation, and the `URLSearchParams` probe from `ksykmaps-home.tsx`.  Keeping it as a brief in ROADMAP in case a future triage reruns.

**Shipped.**  Commit pending.  Web `1.0.6 → 1.0.7`.  Files: `client/index.html` (fonts), `client/src/components/AccessLockoutScreen.tsx` (header back-link removed), `client/src/pages/ksykmaps-home.tsx` (debug overlay removed), `client/src/lib/changelog.ts`, `PROJECT-LOG.md`, `ROADMAP.md`, `CHANGELOG.md`.  `tsc` clean, Vite production build verified.  Rollback: `rollback-before-1-0-7` at `a154056`.

---

## 05-10-2026 — v1.0.6 — lockout fires on restricted · boot splash removed · 3D loading-safe

**Asked.**
- Security / access-restricted still doesn't work — make it work like earlier.
- Remove the loading screen when opening the website; use inline component spinners.
- Fix 3D view (something's broken).
- Make announcement + beta dialogs match the current Wilma graphic.

**Decided.**
- Expanded the lockout trigger in `ksykmaps-home.tsx` to fire on BOTH `blocked` AND `restricted` tiers (previously `blocked`-only).  Only applies when `secSettings.enabled === true` and `dryRun` is off.  This matches what admins actually expect when they turn security on: a visible gate for everyone outside the full-tier whitelist.
- Removed `<SplashScreen />` from `App.tsx` boot path.  Preboot HTML spinner in `client/index.html` stays (fires before JS parses) but gets killed on first React mount, so no visible splash past boot.  Components keep their own inline loading states: `CampusMap` → `Loading map…`, `CampusThreeDView` → Wilma pill, admin tables → React Query `isLoading`.
- `CampusThreeDView` empty-array branch: previously set `error` to a loading message which showed the Wilma error card ("3D view unavailable"); now stays in the pure loading state (`error = null`, `ready = false`) so the user sees a spinner, not a false error.
- Rewrote the 3D error overlay from `rounded-2xl` + iOS blue to Wilma document card (3 px navy top accent, uppercase `3D VIEW` masthead, hairline border, bold H2, navy CTA).
- Announcement + beta dialog "look": the current Wilma theme is already applied (hairline border, 3 px accent, uppercase masthead, flex-col with sticky footer).  No additional code change needed — the dialogs were already polished through v1.0.2–1.0.5.  If the user still sees them as "wrong", that's an older cached bundle, not a code issue.

**Shipped.**  Commit pending.  Web `1.0.5 → 1.0.6`.  Files: `ksykmaps-home.tsx`, `App.tsx`, `CampusThreeDView.tsx`, `changelog.ts`, `PROJECT-LOG.md`.  Rollback: `rollback-before-1-0-6` at `e0a899c`.

---

## 04-10-2026 — v1.0.5 — security lockout actually works (CDN no-cache) + dialog polish verified

**Asked.**
- "Security page thingy STILL doesn't work even in incognito — fix it now."
- Finish all remaining tasks.
- Improve announcement + beta release dialogs.

**Decided.**
- **Root cause of the no-lockout bug.** `GET /api/security-settings` had NO cache-control headers.  On first prod boot `kv_settings['securitySettings']` is missing → endpoint returns `null` → Vercel's edge caches that null for 30+ minutes.  Admins can flip `enabled: true` and the save works, but every public client keeps hitting the stale null and `useAccessDecision` returns `tier: "full"` → no lockout ever appears, in incognito or anywhere else.  Fix is server + client: added `Cache-Control: no-store` + `CDN-Cache-Control` + `Vercel-CDN-Cache-Control` headers on the GET (mirrors `/api/settings`), and `loadSecurityFromServer()` now appends `?t=<Date.now()>` + `cache: "no-store"` on its fetch.
- Verified announcement dialog + beta dialog layouts.  Both already have `min-h-0 flex-1 overflow-y-auto` bodies + sticky footers + `max-h-[88dvh]` / `max-h-[90dvh]` caps.  Mobile `max-sm:` overrides go full-screen.  Scroll works on long content in both.  No code change needed this ship — the real blocker was the security-cache bug, and all queued dialog work from v1.0.2/1.0.3/1.0.4 covered the polish.

**Shipped.**  Commit pending.  Web `1.0.4 → 1.0.5`.  Android unchanged.  Files: `api/index.ts`, `client/src/hooks/useSecuritySettings.ts`, `client/src/lib/changelog.ts`, `PROJECT-LOG.md`.  Rollback: `rollback-before-1-0-5` at `d3f6d87`.

---

## 04-10-2026 — v1.0.4 — unconditional Nav/3D/Navigoi · peek 44dvh · 3D loading message

**Asked.**
- Security is enabled but AccessLockoutScreen never appears — expected a lockout state and didn't get one.
- "No campus geometry to render" message is showing — fix it.
- Class-info popup action buttons still invisible on mobile.
- Announcement dialog needs mobile polish + match graphics.
- Resetting cookies again killed ALL nav buttons — Nav, 3D, class-info Navigoi.  Fix root cause and push.

**Decided.**
- Nav + 3D + Navigoi gates removed entirely.  Previously `canUseRouting` / `canUse3D` depended on `useSecuritySettings` + `useAccessDecision`, which race on first paint (especially after cookie reset).  Any `false` value during the race window → React mounts without the button → user never sees it until they refresh.  Access control is still enforced by the lockout screen taking over the whole route when `tier === "blocked"`; by the time `KSYKMapView` or `FeatureInfoSheet` mount, the user is at least `restricted` and the buttons are safe to render.  `canUseRouting = true`, `canUse3D = true`, `canUseSchedules = true` locally; `accessDecision` + `secSettings` kept with `void` references so the hook subscriptions stay live.
- `FeatureInfoSheet` peek snap bumped `38 → 44 dvh` so the action row (`Navigoi` + Schedule) stays above the fold on iPhone SE landscape + zoomed Android Chrome.  `half` 62 → 66, `full` 88 → 92 for consistency.
- `CampusThreeDView` empty-state copy made loading-aware: shows `Loading campus…` when the fetch is still in flight, only falls back to the admin-blame copy when `rooms` / `buildings` have resolved to empty arrays.
- "Security enabled but no lockout" — expected behaviour when the user has an admin/owner cookie: `evaluateAccess()` returns `{ tier: "full", reasonCode: "owner-bypass" }` first.  No code change needed; added a note in [[ROADMAP.md]] for a future admin-visible banner showing effective access state.
- "No campus geometry" — only fires in the 3D view; message softened per above.

**Shipped.**  Commit pending.  Web `1.0.3 → 1.0.4`.  Android unchanged.  Files: `KSYKMapView.tsx`, `FeatureInfoSheet.tsx`, `CampusThreeDView.tsx`, `changelog.ts`, `PROJECT-LOG.md`.  Rollback: `rollback-before-1-0-4` at `231e867`.

---

## 04-10-2026 — v1.0.3 — map rail clipping fix · profile scroll verification · log format

**Asked.**
- Entries in `PROJECT-LOG.md` should use `DD-MM-YYYY`, not `YYYY-MM-DD`.
- `AdminProfileDialog` must scroll inside; body overflow seemed stuck.
- "Sometimes when you load the website the 3D or Navigation buttons glitch out and don't appear, especially on mobile — fix the root cause."
- Keep going on the queued tasks.

**Decided.**
- Reformatted every log entry to `DD-MM-YYYY` and updated the template at the top of this file + the matching entry in `CLAUDE.md`.
- `AdminProfileDialog` already uses `min-h-0 flex-1 overflow-y-auto` on the body + sticky footer actions (shipped v1.0.1).  Verified the layout against shadcn's default `grid`-based `DialogContent` — the `flex flex-col` + `overflow-hidden` on the content wrapper correctly cascades so the body scrolls on both mobile full-screen and desktop centered modes.  No code change required; if users still report scroll stuck, likely cause is browser-specific `-webkit-overflow-scrolling` or `touch-action` quirks — can revisit with a repro.
- **Root cause of the "nav + 3D glitch" on mobile.**  The right-side map rail wrapper had `max-h-[calc(100%-3rem)] overflow-hidden`.  On short viewports (iPhone SE / zoomed Android Chrome / small-window desktop) the rail's rendered height exceeded that cap and the bottom buttons (3D, Locate) silently clipped off the screen.  The outer flex also used `flex-col-reverse` so the clip chopped the directions / zoom buttons at the top of DOM order.  Removed both — the rail is only ~200 px tall; no clipping needed.  Also removes the race-condition visual where `canUseRouting` would re-add a button and push the stack past the max-h.

**Shipped.**  Commit pending push.  Web `1.0.2 → 1.0.3`.  Android unchanged at `1.0.1`.  Files: `client/src/components/KSYKMapView.tsx`, `PROJECT-LOG.md`, `CLAUDE.md`, `client/src/lib/changelog.ts`.  Rollback: `rollback-before-1-0-3` at `072ac58`.

---

## 04-10-2026 — v1.0.2 — beta banner admin toggle · forgot-password Wilma polish · easter eggs OFF · mobile Nav fix

**Asked.**
- Beta release popup must have an admin on/off toggle; also open instantly on first visit; mobile layout better.
- Long announcement dialogs must scroll properly.
- Polish `AdminForgotPassword` to Wilma look.
- FAQ page bilingual (default English); bottom buttons also localised.
- Easter-egg setting in admin panel must actually disable them; default OFF.
- Mobile Navigation button has disappeared and clicking a room doesn't show Navigoi — fix now.
- Add `PROJECT-LOG.md` + `ROADMAP.md` + `BRAIN.md` with kanban-style roadmap and cross-links to `CLAUDE.md`.

**Decided.**
- Beta banner: added `app_settings.show_beta_banner` column (default `true`), API whitelist entry, admin toggle UI in `AppSettingsManager.tsx`, rewrote `BetaWelcomeBanner.tsx` to open as soon as the settings fetch resolves (no map-ready wait), full-screen on mobile with safe-area insets.
- Announcement dialog scroll: configuration was already correct (`max-h-[88dvh]` + `min-h-0 flex-1 overflow-y-auto` body).  No code change needed; if clipping is still reported it'll be investigated in `[[announcement-dialog-polish]]`.
- Admin forgot password: full rewrite to the Wilma document pattern (hairline top bar, uppercase `ADMIN` masthead, big navy H1, hairline form, 44 px navy CTA, emerald success callout).
- FAQ: default `lang` set to English when `localStorage.ksyk_language` is empty; toggle writes to localStorage; `storage` listener keeps the page in sync.
- Easter eggs: `useKonamiCode` + `useKsykEasterEggs` now accept an `enabled` flag; `App.tsx` passes `appSettings?.enableEasterEgg === true`.  Default flipped `true → false` in `AppSettingsManager` and the hook short-circuits when off.
- Mobile Navigation + Navigoi regression: simplified the gates in `FeatureInfoSheet.tsx` and `KSYKMapView.tsx` to `canUseRouting = tier !== "blocked"` (and `canUse3D` the same).  Previously `isFeatureAllowed` could return `false` while `useSecuritySettings` was still returning defaults or when stale admin flags survived.  Lockout screen still owns the blocked case.
- Brain docs: created `BRAIN.md` (hub), `ROADMAP.md` (kanban + brief sections), this `PROJECT-LOG.md`, and `CLAUDE.md` pointing agents here.

**Shipped.**  Commits `2da7fc6` + `072ac58`.  Web `1.0.1 → 1.0.2`.  Android unchanged at `1.0.1`.

---

## 02-10-2026 — v1.0.1 — version reset · root cause of Failed-to-fetch flood · UX cleanup

**Asked.**
- Reset version numbering to start from 1 → `v1.0.1`.
- Fix the `TypeError: Failed to fetch` flood (407 events / 14 days in PostHog).
- Login-gate / sign-in sign-in must be an admin setting, default OFF.
- Don't show Get-the-app popup immediately on first load.
- Beta banner shouldn't auto-open on first paint.
- Cookie banner language-aware, EN default, bigger mobile buttons.
- `AdminProfileDialog` must scroll on short viewports and look better overall.
- Mobile navigation + 3D buttons sometimes missing — investigate root cause.

**Decided.**
- `safeFetch.ts` helper + `safeFetchFireAndForget` for beacon pattern.
- Fixed `rrwebRecorder.ts` to drop batches `>55 KB` instead of hitting Chrome's keepalive cap, use the safe helper.  Global `onunhandledrejection` filter now skips `Failed to fetch` during `pagehide` and `dynamically imported module` failures.
- `AdminDashboard.tsx:1166` logout: added `.catch`.
- `DEFAULT_SECURITY_SETTINGS.loginGateEnabled: false`.
- `BetaWelcomeBanner` waits for `ksyk:map-ready` + 6 s dwell (15 s fallback).
- `GetAppPopup` delayed to 20 s after map-ready (25 s fallback).
- `CookieConsent.tsx` rewritten with language-aware strings + 44 px mobile touch targets.
- `AdminProfileDialog` body switched to `min-h-0 flex-1 overflow-y-auto`; Save + Sign out moved to sticky footer.
- `DEFAULT_SECURITY_SETTINGS.restrictedDisabledFeatures.threeDView: true → false` so restricted-tier users see 3D by default.

**Shipped.** Commit `f5ad783`.  Web `4.7.57 → 1.0.1`.  Android `2.0.0-beta → 1.0.1`.

---

## 01-10-2026 — v4.7.57 — dialog desktop fix · Get-the-app Wilma popup · Android 2.0.0-beta theme

**Asked.**  Dialog desktop sizing broken (mobile OK), Get-the-app popup look rough, Android visual pass to match Wilma web.

**Decided.**  Switched to `max-sm:` mobile-only overrides so shadcn defaults handle desktop centering untouched.  Rewrote `GetAppPopup.tsx` to Wilma document card.  New `theme.kt` for Compose: navy palette, custom Shapes + Typography, dynamic colours deliberately disabled.

**Shipped.** Commit `f0fa9e6`.  Web `4.7.56 → 4.7.57`.  Android `1.99.0 → 2.0.0-beta`.

---

## 01-10-2026 — v4.7.56 — beta banner + Get-the-app really fixed + admin sub-tab routing

**Asked.**  Beta welcome, Get-the-app still broken, admin sub-tab URLs, dialog sizing bugs, per-user block action.

**Decided.**  Added `app_settings.show_get_app_popup` + `get_app_url` columns (that was the real bug — Drizzle UPSERT silently dropped unknown fields).  `/admin/:section/:subtab` route.  New `AdminProfileDialog`.  SecurityPanel's exception editor gets explicit Grant + Block buttons.

**Shipped.** Commit `a667600`.  Web `4.7.55 → 4.7.56`.

---

## Older entries

See `client/src/lib/changelog.ts` for the full user-facing changelog
down to v3.x.
