# KSYK Maps — Working TODO

Living list of what's done, in progress, and pending across sessions. Update inline after every session.

## Legend
- ✅ done + deployed
- 🚧 in progress this session
- ⏳ pending — assigned but not started
- ❌ blocked — needs user input / external work

---

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
