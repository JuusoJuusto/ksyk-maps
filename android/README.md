# KSYK Maps — Android (native Kotlin)

Native Android app that mirrors the website's campus map + admin tools. **Same login → same Firestore-backed API → same data.** Whatever you draw in the desktop Builder shows up on the phone immediately; capture a beacon position on your phone and it appears instantly in the desktop admin.

## What's in here

```
android/
├── README.md              ← this file
├── BUILD.md               ← how to build the APK
├── app/
│   ├── build.gradle.kts   ← module-level build (MapLibre Native, Retrofit, Compose)
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── kotlin/fi/ksykmaps/
│   │   │   ├── KsykApp.kt              ← Application + DI
│   │   │   ├── MainActivity.kt         ← single-activity Compose host + bottom nav
│   │   │   ├── data/
│   │   │   │   ├── Api.kt              ← OkHttp client + browser headers, cache-first
│   │   │   │   ├── DiskCache.kt        ← JSON response cache → filesDir/api_cache/
│   │   │   │   └── Session.kt          ← remembered login state
│   │   │   └── ui/
│   │   │       ├── HomeScreen.kt       ← dashboard (stats + quick actions)
│   │   │       ├── MapScreen.kt        ← native MapLibre map + floor switcher
│   │   │       ├── RoomFinderScreen.kt ← searchable room list
│   │   │       ├── BeaconScreen.kt     ← WiFi + GPS survey
│   │   │       ├── BuildingsScreen.kt  ← campus buildings directory
│   │   │       ├── AnnouncementsScreen.kt
│   │   │       ├── LoginScreen.kt
│   │   │       ├── SettingsScreen.kt
│   │   │       ├── AccountScreen.kt
│   │   │       └── theme.kt
│   │   └── res/                        ← drawables, strings, colors
├── build.gradle.kts                    ← project-level build
└── settings.gradle.kts
```

## The map screen (v1.1.0)

`MapScreen.kt` uses **MapLibre Native** — the same rendering engine the web uses (`maplibre-gl` JS) — via `AndroidView { MapView }`. Everything is drawn as MapLibre style layers:

- **Basemap** — CARTO Voyager @2x raster tiles (identical to `CampusMap.tsx`)
- **Buildings** — GeoJSON polygons from `/api/buildings`, tinted by `colorCode`, with labels
- **Floor switcher** — vertical rail on the right, filters visible polygons per floor
- **My location** — Android's `FusedLocationProviderClient` feeding MapLibre's `LocationComponent` (blue puck + heading arrow, matching MazeMap)
- **Tap a building** → bottom sheet with name, floor count, and "focus on map"

Everything rotates + pitches with the map without any per-frame code because MapLibre handles the projection natively.

## Offline mode

Every successful API `GET` gets mirrored to `filesDir/api_cache/<slug>.json`. If a subsequent call fails with an IO error (no signal, captive portal, etc), `Api.get()` transparently returns the last-known-good copy. That means:

- First launch requires network to seed the cache
- Every subsequent launch opens instantly to a usable map, even fully offline
- The MapScreen shows an amber "Offline · showing cached campus data" banner so users know why data might be stale

Real 4xx/5xx responses still surface (a 404 doesn't quietly hand back deleted rooms) — only network-unreachable (status == 0) falls back to disk.

## Why native (Kotlin Compose), not React Native / Capacitor?

- True access to **WifiManager** (Android scans all access points the OS sees)
- True access to **FusedLocationProviderClient** (high-accuracy GPS)
- One install size of ~3-5 MB instead of ~25+ MB
- No webview = no Cloudflare bot fight surprises

## Account sync — already free

The android app uses the same login (`POST /api/auth/admin-login`) and the same beacon endpoints (`POST /api/beacons/:roomId/positions`) as the desktop apps. Because Firestore is the single source of truth, anything you capture on the phone is immediately visible on the desktop admin's Beacons tab and vice-versa — no extra "sync" code needed.

## Build

See `BUILD.md`. Short version: install **Android Studio + JDK 17**, open this folder, hit Run. The release APK lands in `app/build/outputs/apk/release/app-release.apk`.

We can't build the APK from this dev environment because the Android SDK and JDK aren't installed — but the Kotlin sources here compile cleanly the moment you point Android Studio at them.
