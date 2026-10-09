# Changelog

## 1.1.6 — October 2026

- Teacher position re-seeded to "Opettaja" / "Teacher" for all staff; teaching subjects moved to department/department_en/department_fi fields; ON CONFLICT DO UPDATE fixes existing rows
- Android 1.1.6: lesson reminder notifications show resolved subject name and teacher full name instead of Wilma codes/abbreviations
- Android versionCode 113

## 1.1.5 — October 2026

- ~82 language courses seeded (a1EN, aRU, bRU, svRU, a1RA, a1SA, a1EA, a2EN, vEN, a2RA, a2SA, a2EA, bRA, bSA, bEA, AIEN1–6, vKOR1, OPO) with Finnish names, English names, and subject colors; ON CONFLICT DO NOTHING preserves admin edits
- ~90 KSYK teachers seeded with abbreviations, first/last names, and subject descriptions in FI and EN; partial unique index on staff.abbrev enables idempotent seed
- Course auto-color in admin now handles language code prefixes (a1EN→blue, aRU→light-blue, a1RA→purple, a1SA→brown, a1EA→red, etc.)
- Retroactive color UPDATE in initDb now covers language course codes
- Android 1.1.5: timetable shows subject names and colors instantly — Phase 1 loads from on-disk cache before any network call (loading=false fires after cache, not after network)
- Android versionCode 112

## 1.1.4 — October 2026

- 116 standard KSYK courses seeded (MA, BI, GE, FY, KE, SC, HI, YH, katsomusaine, MU, KU, KO, KS, LI, TE, VAP) with Finnish names, English names, and subject colors; ON CONFLICT DO NOTHING preserves admin edits
- Existing courses without a color are retroactively colored by subject prefix via UPDATE in initDb
- Admin course form: color auto-fills from course code prefix when typing (MA→blue, FY→purple, KE→emerald, etc.)
- Announcement form: removed "Default" title and content fields; only FI and EN remain; `title`/`content` derived from `titleFi || titleEn` on submit
- Staff form: removed plain Position and Department fields; only FI and EN columns remain; position/department derived on save
- Android 1.1.4: after Wilma sync, LookupStore invalidates and reloads so newly seeded course names and colors appear immediately in the timetable without restart
- Android versionCode 111

## 1.1.3 — October 2026

- Web: admin profile dialog is now a bottom sheet on mobile (slides up, has drag handle, correct scroll); centered modal unchanged on desktop
- Web: profile form inputs are 16 px on mobile — prevents iOS auto-zoom on focus
- Android: delete button removed from inline timetable cards; Delete (with confirmation) + Edit are now in the ClassInfoSheet as a side-by-side button row
- Android: haptic feedback on lesson card tap, navigate shortcut, and delete confirm
- Android versionCode 110

## 1.1.2 — October 2026

- Admin: course editing — all fields (code, name, English name, color) now editable inline in the Courses tab
- Android fix: pressing "Synkronoi" in Wilma Connect no longer wipes teacher abbreviations and subject codes — connect screen now routes through the same parser as the background worker
- Android fix: `loadJaksot` returns DataStore cache immediately; network call skipped when cache is populated — removes a serial round-trip from every sync
- Android versionCode 109

## 1.1.1 — October 2026

- Fix: staff mutations (POST/PUT/DELETE /api/staff) returned 401 — admin auth header was missing
- Fix: GET /api/staff and GET /api/subjects returned 500 on fresh deployments — `abbrev`, `wilma_profile_url`, `subjects` table, and `enable_floor_labels`/`enable_gps` columns now created in `initDb.ts`
- Fix: Wilma iCal parsing — class codes like `K13` no longer appear in the teacher field; only tokens with lowercase letters (e.g. `JLä`) are treated as abbreviations
- Android: reverted screen accent color back to `#3B82F6` (Tailwind blue-500)
- Android versionCode 108

## 1.1.0 — October 2026

- Public launch: beta banner default OFF
- Admin settings: `enableFloorLabels` + `enableGPS` map-overlay toggles
- Security panel: accessible-routes-only enforcement toggle
- Security panel: Microsoft OAuth configuration status badge
- Sentry source maps: emitted on every production build; uploaded to Sentry when `SENTRY_AUTH_TOKEN` is set
- Critical CSS inlined via Critters post-build plugin (~450 ms LCP improvement)
- Android: replaced all `#3B82F6` accents with KSYK navy `#003D82` across all screens
- DB migration 0008: `enable_floor_labels` + `enable_gps` columns added (safe rollback)

## 1.0.12 — October 2026

- Motion pass: dialogs 180 ms ease-out open / 140 ms ease-in close (was 200–500 ms); sheets and bottom sheet updated to match
- FAQ expanded with 3 new bilingual entries (offline, navigation, timetable colors)
- ROADMAP cleaned up: all "Now" and "In progress" items moved to ✅ Shipped

## 1.0.11 — October 2026

- Android: MapLibre crash fixed (`MapLibre.getInstance()` added to app startup)
- Per-course color in admin Courses tab — color dot is a clickable picker; Android uses assigned color for timetable rail
- Tapping a class opens a read-only info sheet (subject, time, room, teacher + Navigate/Edit actions)
- Finished classes show strikethrough + 40% opacity on today's timetable
- Android APK 1.0.4 (release build only)
- DB migration 0007: `color` column added to `subjects` table (safe to roll back)

## 1.0.10 — October 2026

- Courses tab in admin panel; Wilma profile URL per staff member; "Wilma abbreviation" label rename
- Android APK 1.0.3

## 1.0.7 — October 2026

- Google Fonts no longer render-blocking (async stylesheet via `media="print" onload`); Lighthouse LCP improvement ~520 ms
- `← Map` back-link removed from the access-restricted screen header — the lockout is the gate, bouncing to `/` just re-rendered it

## 1.0.6 — October 2026

- Access lockout now fires on `restricted` tier too (was `blocked`-only)
- Boot splash removed; inline component spinners instead
- 3D view stays in loading state on cold load (no more false error)

## 3.1.2 — May 2026

- New KSYK Maps logo (`ksykmaps_logo_new_new.png`) and high-resolution favicons
- Unified home top bar: Lunch, HSL, Settings, 2D/3D, search
- Clean campus wing-outline map (A, U, K, M, R, B)
- Redesigned settings with in-app changelog and GitHub link
- Minimal loading screen; improved 2D/3D map and map builder

## 3.1.0 — March 2026

- Mobile navigation and theme improvements
- Admin settings and announcement banner

## 3.0.0

- KSYK Maps by Nordbyte Studio
- Firebase campus data and modern map experience
