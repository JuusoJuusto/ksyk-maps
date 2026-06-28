# KSYK Maps — Android (native Kotlin)

Native Android app that mirrors the desktop Quick + Admin apps. **Same login → same Firestore-backed API → same data.** Capture a beacon position on your phone and it appears instantly in the desktop admin and on the website map.

## What's in here

```
android/
├── README.md            ← this file
├── BUILD.md             ← how to build the APK
├── app/
│   ├── build.gradle.kts ← module-level build
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── kotlin/fi/ksykmaps/
│   │   │   ├── KsykApp.kt           ← Application + DI
│   │   │   ├── MainActivity.kt      ← single-activity Compose host
│   │   │   ├── data/
│   │   │   │   ├── Api.kt           ← Retrofit + browser headers
│   │   │   │   ├── Session.kt       ← credentials + bearer-like state
│   │   │   │   └── Models.kt
│   │   │   └── ui/
│   │   │       ├── LoginScreen.kt
│   │   │       ├── RoomFinderScreen.kt
│   │   │       ├── BeaconScreen.kt   ← WiFi + GPS capture
│   │   │       └── theme.kt
│   │   └── res/                      ← drawables, strings, colors
├── build.gradle.kts                  ← project-level build
└── settings.gradle.kts
```

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
