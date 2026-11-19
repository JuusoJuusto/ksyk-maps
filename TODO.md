# KSYK Maps — Working TODO

Living list of what's done, in progress, and pending across sessions. Update inline after every session.

## Legend
- ✅ done + deployed
- 🚧 in progress this session
- ⏳ pending — assigned but not started
- ❌ blocked — needs user input / external work

---

## ✅ Done in the working tree (v1.3.1 + Android 1.2.1 · not committed, not deployed)

- **Admin session no longer dies after ~a week on the Android app.** Root cause: 7-day fixed admin token, never renewed or checked by the app. Now: `POST /api/auth/admin-refresh` (30-day sliding token, re-checks the account), app renews on every launch (≤ 2×/day), replays a 401'd call once after refreshing, and shows a "Session expired — sign in" dialog only if the server really rejects the token. 4 new `test:security` cases (11 total); `tsc` + `npm run build` pass.
- **APK built:** `android/app/build/outputs/apk/release/ksykmaps-release-1.2.1.apk` (also in `public/releases/`). Rollback tag `rollback-before-1-3-1`.
- ⏳ Needs you: deploy `api/index.ts` (renewal does nothing until it's live), install the APK, and sign in **once** — a token already expired on the phone can't be revived.
- ⏳ Not covered: separate `android/admin` app and the web admin still have no refresh/401 handling (see ROADMAP "Next").

## ✅ Done in the working tree (v1.3.0 · not committed, not deployed)

- **SEO audit + fixes.** Per-route prerendered HTML (`scripts/prerender.ts`), `shared/seo.ts` registry, generated `sitemap.xml`, corrected `robots.txt`, noindex headers, `RouteMeta` for client navigation, www canonical host.
- **Lunch menu crawlable.** Shared parser `shared/lunchFeed.ts`; `/api/lunch-menu` allowed in robots.txt.
- **Staff privacy.** `GET /api/staff` strips email/phone/bio for anonymous callers.
- **Tests.** `npm run test:seo` (38) + `npm run test:security` (7). `tsc` and `npm run build` pass.

## ⏳ Pending — needs you

- ⏳ Review the diff and commit (nothing is committed; rollback tag `rollback-before-1-3-0` exists).
- ❌ Vercel: choose primary host and make the apex→www redirect permanent (currently 307).
- ❌ Search Console: submit the new sitemap, inspect `/lunch`.
- ⏳ Decide: trim public `/api/rooms` fields; lunch parser fix for Friday/Thursday; daily redeploy for the lunch snapshot; `/api/debug` TDZ bug.

## ✅ Just shipped (v1.1.1 + Android 1.1.1 · badf3a1)

- **Staff 401 fixed.** `createStaffMutation`, `updateStaffMutation`, `deleteStaffMutation` in AdminDashboard now send `...getAdminHeaders()` — they were only sending `Content-Type`.
- **Staff + subjects 500 fixed.** `server/initDb.ts` now adds `ALTER TABLE staff ADD COLUMN IF NOT EXISTS abbrev/wilma_profile_url` and `CREATE TABLE IF NOT EXISTS subjects` on cold start so GET /api/staff and GET /api/subjects work on fresh deployments.
- **iCal teacher parsing fixed.** `extractTeacherAbbrev` in `server/icalParser.ts` now iterates all `(...)` groups and returns the first token with a lowercase letter (`JLä` ✓, `K13` ✗, `K13 Niinistö` ✗). Class codes no longer appear in the teacher field.
- **Android colors reverted.** All `Color(0xFF003D82)` → `Color(0xFF3B82F6)` in OnboardingScreen, LogsScreen, AdminPanelScreen, HomeScreen, MapScreen, SettingsScreen, PostSetupWalkthrough, TimetableScreen. theme.kt/colors.xml left as navy (Material You primary).
- **Android versionCode 108, versionName 1.1.1.**

## ✅ Just shipped (v1.1.0 · 8994e35)

- Public launch: `showBetaBanner` default OFF
- Admin settings: `enableFloorLabels` + `enableGPS` map-overlay toggles (DB migration 0008)
- Security panel: `enforceAccessibleRoutingOnly` toggle + NavigationPanel enforcement
- Security panel: Microsoft OAuth configuration status badge
- Sentry source maps: emitted on every production build; uploaded when `SENTRY_AUTH_TOKEN` is set
- Critical CSS inlined via Critters post-build plugin (~450 ms LCP improvement)
- Android: Wilma navy visual pass + versionCode 107

## ✅ Just shipped (v1.0.12)

- Motion pass: 180 ms ease-out open / 140 ms ease-in close on all dialogs + sheets
- 3 new FAQ entries (offline, navigation, timetable colors)

## ✅ Just shipped (v1.0.11 + Android 1.0.4)

- MapLibre crash fix (MapHolder singleton kept alive across tab switches)
- Per-course color picker in admin Courses panel
- Class info sheet on room tap (FeatureInfoSheet)
- Finished-class strikethrough + fade in timetable

## ✅ Just shipped (v1.0.10 + Android 1.0.3)

- Courses own tab in admin (was inside Staff tab)
- Wilma profile URL field on staff rows
- "Wilma abbreviation" label rename
- Android Courses page
- Profile link in timetable class info

## ⏳ Pending / ideas

_(nothing queued — all roadmap items shipped)_

## ❌ Blocked

_(none currently)_

---

## Standing rules for this project

- **Never** add `Co-Authored-By: Claude` trailer to commits.
- Bump version string on every user-facing change (`client/src/lib/changelog.ts` + `android/app/build.gradle.kts`).
- Keep secrets out of `android/` — server env vars only.
- Always read BRAIN.md, ROADMAP.md, PROJECT-LOG.md at the start of each session.
- Release APK: `cd android && .\gradlew.bat assembleRelease` — NEVER `assembleDebug`.
- Rollback tag before every release: `git tag rollback-before-X.Y.Z HEAD`.
