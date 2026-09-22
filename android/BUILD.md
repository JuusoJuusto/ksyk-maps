# Building the KSYK Maps Android APK

## Prerequisites (one-time install)

1. **JDK 17** — `winget install Microsoft.OpenJDK.17` or download from <https://adoptium.net/>
2. **Android Studio** (free) — <https://developer.android.com/studio>
   - During first launch it installs the Android SDK + Android 14 platform.

## Debug vs release

- **Debug APK** — signed with the SDK's auto-generated debug key, `applicationId` is `fi.ksykmaps.debug`, and Android **shows a "Google Play Protect — sovellus voi olla haitallinen"** warning on install because the OS treats debug builds as unverified. Use this only during development on your own phone.
- **Release APK** — signed with a real keystore, `applicationId` is `fi.ksykmaps`, and the install warning does **not** appear. This is what you distribute to testers or upload to Play.

## Fast path (release APK from a clean machine)

```powershell
cd android
$env:KSYK_KEYSTORE_FILE     = "$PWD\app\ksyk-release.jks"    # will be created below
$env:KSYK_KEYSTORE_PASSWORD = "ksyk1234"
$env:KSYK_KEY_ALIAS         = "ksyk"
$env:KSYK_KEY_PASSWORD      = "ksyk1234"

# 1. Generate a self-signed keystore ONCE (skip if the .jks already exists).
keytool -genkeypair -v `
    -keystore app\ksyk-release.jks -alias ksyk `
    -keyalg RSA -keysize 2048 -validity 10000 `
    -storepass ksyk1234 -keypass ksyk1234 `
    -dname "CN=KSYK Maps, OU=School, O=KSYK, L=Kokkola, C=FI"

# 2. Build the signed release APK.
.\gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/ksykmaps-release-<versionName>.apk`.

## Production keystore

The self-signed keystore above is fine for internal testing. **For Play Store distribution use the one-shot generator script:**

```powershell
cd android
.\make-production-keystore.ps1
```

The script (`android/make-production-keystore.ps1`) prompts you for:
- Where to save the keystore (default: `~/ksyk-keystore/ksyk-production.jks`, **outside the repo**)
- Keystore password (typed twice, must match, min 6 chars)
- Key password (typed twice, must match)

Then it:
- Runs `keytool -genkeypair` with `RSA 4096` + 68-year validity
- Prints the SHA-1 + SHA-256 fingerprints (paste these into Play Console → App integrity)
- Prints the exact `$env:` lines to paste for the next build
- Prints a backup checklist

**Then build a signed Play Bundle:**

```powershell
$env:KSYK_KEYSTORE_FILE     = "C:\Users\<you>\ksyk-keystore\ksyk-production.jks"
$env:KSYK_KEYSTORE_PASSWORD = "..."   # the one you chose above
$env:KSYK_KEY_ALIAS         = "ksyk"
$env:KSYK_KEY_PASSWORD      = "..."   # the one you chose above
.\gradlew bundleRelease
```

Upload `app/build/outputs/bundle/release/app-release.aab` to Play Console.

### Backup rules — do all three

1. Save `ksyk-production.jks` as an attachment inside a password-manager entry.
2. Copy it to an encrypted USB drive as a physical backup.
3. Store both passwords in the same password-manager entry.

**If you lose the keystore you cannot publish updates. Ever.** Google Play cannot recover it, cannot bypass it, and cannot re-sign the app under a new key.

### Manual (if you don't want to run the script)

```powershell
keytool -genkeypair -v `
    -keystore C:\Users\<you>\ksyk-keystore\ksyk-production.jks `
    -alias ksyk `
    -keyalg RSA -keysize 4096 -validity 25000 `
    -dname "CN=KSYK Maps, O=Kulosaaren yhteiskoulu, L=Helsinki, C=FI"
```

Then set the four env vars above and `bundleRelease`.

## Firebase Cloud Messaging (FCM) setup

FCM is already wired in the app. What must be configured externally:

- **`google-services.json`** at `android/app/src/google-services.json` — grab it from the Firebase Console under Project settings → General → Your apps. Two entries are needed (release + debug):
  - `fi.ksykmaps` — release package
  - `fi.ksykmaps.debug` — debug package (uses the `.debug` suffix)
- **Backend env vars** on Vercel:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY` (single-line, `\n` for newlines)
- Firebase Analytics is deliberately **disabled** in `AndroidManifest.xml` (`firebase_analytics_collection_deactivated=true`) — analytics runs through PostHog. Do not re-enable it; it clashed with MapLibre in v1.68-1.70.

Test path: admin panel → Notifications → **Lähetä testi** — the device should receive a notification within seconds.

## Environment variables (build-time)

Injected into `BuildConfig` by `app/build.gradle.kts`:

| Env var                          | Purpose                                            | Fallback                        |
| -------------------------------- | -------------------------------------------------- | ------------------------------- |
| `POSTHOG_API_KEY`                | Web analytics                                      | Read from repo-root `.env`      |
| `POSTHOG_HOST`                   | PostHog ingestion host                             | Read from repo-root `.env`      |
| `SENTRY_DSN`                     | Crash reporting                                    | Hardcoded default DSN           |
| `KSYK_BYPASS_TOKEN`              | Vercel Attack Challenge bypass header value        | `ksyk-mobile-2b9d47f83c6e5a1`   |
| `KSYK_KEYSTORE_FILE`             | Absolute path to the signing keystore              | `ksyk-release.jks` under `app/` |
| `KSYK_KEYSTORE_PASSWORD`         | Keystore password                                  | `ksyk1234` (dev only)           |
| `KSYK_KEY_ALIAS`                 | Signing key alias                                  | `ksyk`                          |
| `KSYK_KEY_PASSWORD`              | Signing key password                               | `ksyk1234` (dev only)           |

## Side-load to a phone

```powershell
adb install app\build\outputs\apk\release\ksykmaps-release-<versionName>.apk
```

Or email/AirDrop the APK to the device and tap to install ("Install unknown apps" must be allowed for the source app once).

## Version bump checklist

Every user-facing change:

1. Bump `versionCode` (+1) and `versionName` (semver) in `app/build.gradle.kts`.
2. Add an entry at the top of `ChangelogScreen.kt` `CHANGELOG` list.
3. Add an entry to `client/src/lib/changelog.ts` `KSYK_CHANGELOG` (web changelog).
4. Commit + push. Vercel picks up the web change automatically.
