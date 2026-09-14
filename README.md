# KSYK Maps

<div align="center">
  <img src="client/public/KSYK-logo-desktop.png" alt="KSYK Logo" width="160"/>

  **Campus navigation for Kulosaaren Yhteiskoulu**

  [![Version](https://img.shields.io/badge/version-4.6.7-blue.svg)](https://github.com/JuusoJuusto/ksyk-maps)
  [![Android](https://img.shields.io/badge/Android-1.82.0-green.svg)](android/BUILD.md)
  [![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
  [![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-5.x-green)](https://maplibre.org/)
</div>

---

## Overview

KSYK Maps is an interactive campus navigation app for Kulosaaren Yhteiskoulu (KSYK). It renders a live floor plan of the school's buildings, lets students search for rooms and POIs, and shows lunch menus and public transport times — all in a MazeMap-style interface. There is also a native Android app with home-screen widgets, timetable integration, and push notifications.

**Live:** [ksykmaps.fi](https://ksykmaps.fi)
**Android APK:** built locally via `./gradlew assembleRelease`, see [`android/BUILD.md`](android/BUILD.md)

---

## Features

### Web — campus map
- MapLibre GL vector map with OpenStreetMap raster basemap
- Building footprints, room polygons, corridor lines, and wall outlines
- Multi-floor selector — switch floors, rooms filter per floor
- 3D mode — extruded hollow building shells, room slabs, stair/elevator towers
- MazeMap-style entrance balloon pins (green) and door pins (dark)
- POI chips: WC, stairs, elevator, info, café, first aid, bike parking, etc.
- Room search with live dropdown — supports Finnish and English names
- Directions panel (A* routing between rooms)
- Compass chip — auto-shows when map is rotated, click to reset north
- GPS location dot (admin only — campus map tab in admin panel)

### Web — announcements, lunch, transit
- Fetches and displays the school's weekly lunch menu
- Nearby bus / metro departures from the HSL API
- Admin-published announcements with priority levels

### Android app
- Native Compose UI, MapLibre native for the map
- Three home-screen widgets (Next Lesson · Current Lesson · Today's Schedule)
- Widget-configure activity (long-press to toggle past-class hiding + auto-roll)
- FCM push notifications for admin broadcasts
- Wilma iCalendar import for timetable
- Lesson reminders (scheduled via WorkManager + AlarmManager)
- Offline map snapshot bundled in APK

### Admin panel (web + mobile)
- User management, analytics, security settings, layer visibility
- Announcements manager with priority
- Notifications tab — FCM broadcast, delivery history, device counts
- Analytics & Logs — usage metrics, error tracking, session replay, feedback + bugs + crashes
- Builder canvas to draw rooms, walls, corridors, POIs, doors, stairs, elevators
- Publish campus snapshot — live map reflects published data within 60 s

---

## Tech stack

| Layer | Tech |
|-------|------|
| Web frontend | React 18, TypeScript, Vite, TailwindCSS |
| Web maps | MapLibre GL 5.x, OpenStreetMap raster tiles |
| Android app | Kotlin, Jetpack Compose (Material 3), MapLibre Native |
| Backend | Express.js on Vercel Serverless Functions |
| Database | PostgreSQL via Drizzle ORM (Supabase-hosted) |
| Auth | JWT + HMAC-signed admin tokens (custom, no external auth provider) |
| Push | Firebase Cloud Messaging (data-only messages) |
| Analytics | PostHog (session replay) + first-party telemetry pipeline in Postgres |
| Errors | Sentry (web + Android) |
| AI | Google Gemini (support-ticket auto-classification) |
| Deployment | Vercel (serverless) |
| i18n | react-i18next (fi / en) |

---

## Project structure

```
ksyk-maps/
├── client/
│   └── src/
│       ├── components/
│       │   ├── CampusOverlay.tsx           # MapLibre layer installer
│       │   ├── CampusMap.tsx               # MapLibre map wrapper
│       │   ├── KSYKMapView.tsx             # Map chrome (floor selector, zoom, 3D)
│       │   ├── AdminDashboard.tsx          # Admin panel entry
│       │   ├── AdminAnalyticsDashboard.tsx # Analytics tab + session replay timeline
│       │   ├── AppLogsManager.tsx          # Logs tab
│       │   └── ...
│       ├── pages/                          # Route pages (map, lunch, hsl, admin, builder)
│       ├── hooks/                          # useCampusData, useAppSettings, useAuth …
│       └── lib/
│           ├── changelog.ts                # APP_VERSION + in-app changelog
│           ├── analytics-sdk.ts            # First-party telemetry SDK
│           ├── posthog.ts                  # PostHog wrapper
│           └── sentry.ts                   # Sentry wrapper
├── android/
│   └── app/
│       └── src/main/kotlin/fi/ksykmaps/
│           ├── KsykApp.kt                  # Application, FCM registration
│           ├── KsykFirebaseMessagingService.kt
│           ├── MainActivity.kt             # Compose entry, tab shell
│           └── ui/
│               ├── MapScreen.kt            # MapLibre native map
│               ├── TimetableScreen.kt      # Weekly timetable + jakso switcher
│               ├── SettingsScreen.kt
│               ├── AdminPanelScreen.kt
│               ├── TodayScheduleWidget.kt  # Full-day widget (6 rows, past dimmed)
│               ├── NextLessonWidget.kt     # Next lesson forward-scan (14 days)
│               ├── CurrentLessonWidget.kt  # Ongoing lesson with progress bar
│               └── ChangelogScreen.kt
├── server/
│   ├── db.ts                               # Drizzle DB client
│   ├── initDb.ts                           # CREATE TABLE IF NOT EXISTS bootstrap
│   ├── fcm.ts                              # Firebase Admin push service
│   ├── emailService.ts                     # SMTP invite / password-reset emails
│   ├── routes.ts                           # REST API routes
│   └── storage.ts                          # DB adapter
├── api/
│   └── index.ts                            # Vercel serverless entry (~4000 lines)
├── shared/                                 # Types shared between client + server
├── TODO.md                                 # Living work list (updated per commit)
└── android/BUILD.md                        # APK build + keystore + FCM setup
```

**Where's the TODO?** — repo root at `TODO.md`. Updated at the end of every round. Contains what's shipped, what's in progress, and what's honestly deferred with reasons.

---

## Releasing

1. Bump `APP_VERSION` in `client/src/lib/changelog.ts` and add a changelog entry (or `versionCode` + `versionName` in `android/app/build.gradle.kts` for the app)
2. Commit + push to `main` — Vercel autodeploys the web
3. Android APK: `cd android && ./gradlew assembleRelease` — output at `android/app/build/outputs/apk/release/ksykmaps-release-<version>.apk`
4. Update `TODO.md` with the shipped commit hash

---

## Environment variables

**Server (Vercel):**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` / `POSTGRES_URL` | Postgres connection string |
| `SESSION_SECRET` | Signs admin JWTs (rotate on incident) |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | FCM Admin SDK |
| `EMAIL_USER` / `EMAIL_PASSWORD` | Gmail app password for invite / reset emails |
| `EMAIL_HOST` / `EMAIL_PORT` | Optional — defaults to smtp.gmail.com:587 |
| `POSTHOG_API_KEY` / `POSTHOG_HOST` | Analytics |
| `KSYK_BYPASS_TOKEN` / `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel WAF bypass for the Android app |
| `APP_URL` | Absolute base URL for email links (default `https://ksykmaps.fi`) |
| `OWNER_EMAIL` | Owner-role email |

**Android build-time:**

Injected into `BuildConfig` by `android/app/build.gradle.kts` — see [`android/BUILD.md`](android/BUILD.md) for the full table.

---

## License

Proprietary — all rights reserved by Nordbyte Studio / Juuso Kaikula.
No copying, modification, or redistribution without explicit written permission.

Copyright © 2025–2026 Nordbyte Studio.

---

## Contact

- Lead developer: Juuso Kaikula
- Email: juusojuusto112@gmail.com
- Discord: https://discord.gg/5ERZp9gUpr
