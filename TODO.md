# KSYK Maps — Working TODO

Living list of what's done, in progress, and pending across sessions. Update inline after every session.

## Legend
- ✅ done + deployed
- 🚧 in progress this session
- ⏳ pending — assigned but not started
- ❌ blocked — needs user input / external work

---

## 🔴 Pending (20-11-2026)

- ⏳ Security follow-ups are tracked privately (`SECURITY-ASSESSMENT.md` is git-ignored on purpose: this repository is public). The critical item found today is fixed and live.
- ⏳ **Re-index in Search Console after the v1.4.0 deploy:** URL Inspection → Request indexing for `/`, `/download`, `/faq`, then resubmit `https://www.ksykmaps.fi/sitemap.xml`.
- ✅ v1.4.0 (builder measurements + snapping, `/download` page, SEO titles, downloads/changelog toggles) is released; the other Claude session's alerts + analytics work ships separately.
- ⏳ Not started: multiple maps in the builder; owner-alert Android notifications and mobile analytics (other session).

## ✅ Shipped (v1.3.2 + Android 1.2.2 + Admin app 1.1.1)

- **Admin sessions renew everywhere.** v1.3.1 (live since `8fb2d3f`): `POST /api/auth/admin-refresh`, 30-day sliding token; Android app renews on launch. v1.3.2: the web admin + builder renew while open (the 12 h cut-off now measures inactivity), 401s retry once, a dead session returns to sign-in with "Your session expired"; the separate Android admin app got the same.
- **Fixed:** Android admin app login failed for passwords containing `"` or `\`; Android admin Overview said "System OK" while requests failed; refresh response no longer carries 2FA secrets.
- **APKs:** main app `android/app/build/outputs/apk/release/ksykmaps-release-1.2.2.apk` (also in `public/releases/`, linked by the download page); admin app `android/admin/build/outputs/apk/release/ksykmaps-admin-release-1.1.1.apk` (12 MB, not hosted anywhere). Rollback tags `rollback-before-1-3-1`, `rollback-before-1-3-2`.
- ⏳ Needs you: install the new APK and sign in **once** (a token already expired on the phone can't be revived); tell me what else in the admin panels should be improved — "improve everything" had no spec, see ROADMAP "Next".
- ⏳ Not tested: either APK on a real phone; the web admin in a browser; a valid-token refresh against production.

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
