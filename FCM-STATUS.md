# FCM Push Notifications — Implementation Status

Last verified: v1.90.0 / web 4.7.9

This document is the single source of truth for how push notifications
work in KSYK Maps end-to-end. It exists so any future incident can be
diagnosed against the *actual* architecture, not the docs' guess of it.

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Android app (fi.ksykmaps)                 │
│  ┌────────────────────┐     ┌─────────────────────────────────┐ │
│  │ KsykMessagingService│───▶│  FirebaseMessaging.getToken() │ │
│  │  (data-only handler)│     └─────────────────────────────────┘ │
│  └────────────────────┘                     │                    │
│           ▲                                  ▼                   │
│           │                     ┌────────────────────────────┐   │
│  Displays notification         │  POST /api/push-tokens      │   │
│  via NotificationCompat        │  {token, platform:"android"} │   │
│                                └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              Vercel serverless — api/index.ts                   │
│  POST /push-tokens         → INSERT INTO push_tokens            │
│  DELETE /push-tokens       → DELETE FROM push_tokens (admin)    │
│  POST /notifications/broadcast → firebase-admin sendEachForMulticast │
│  GET  /notifications/status    → { configured, tokenCount, ... }│
└─────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              Firebase Cloud Messaging (Google)                  │
│  Fans out to devices → onMessageReceived callback fires         │
└─────────────────────────────────────────────────────────────────┘
```

## 2. What was broken and how it was fixed

| Version | Bug                                                                                                              | Fix                                                                                                                                       |
| ------: | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1.77    | `require("firebase-admin")` → `require is not defined`                                                           | Project is ESM (`"type": "module"`). Switched to dynamic `import()`.                                                                      |
| 1.78    | `(adminMod as any).default ?? adminMod` — `Cannot read properties of undefined (reading 'length')` on `apps[]`   | Wrong shim: the module namespace has `.apps`, the `default` export doesn't. Switched to modular imports: `firebase-admin/app` + `.../messaging`. |
| 1.80    | FCM worked but silently failed for stale tokens (deleted apps)                                                   | `sendToTokens` now uses `sendEachForMulticast` and tracks per-token success/failure. Stale tokens don't tank the batch.                   |
| 1.81    | "reg fail — Unable to resolve host" on Wi-Fi handoff before first successful upload                              | Client retry with exponential backoff (`FcmTokenSyncWorker`) — 5 attempts, up to 60s between.                                             |
| 1.82    | Message templates + dev buttons cluttered production Settings                                                    | Removed dev-only Copy FCM Token button; templates moved server-side.                                                                      |

## 3. Environment variables (Vercel)

These live in Vercel project settings under **Environment Variables**. All
three are **required** for FCM broadcasts to work — the endpoint returns
"FCM not configured" if any is missing.

| Variable                | Where it comes from                                                            | Notes                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `FIREBASE_PROJECT_ID`   | Firebase Console → Project settings → General tab                              | e.g. `ksyk-maps`                                                                             |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Service accounts → Generate new private key → `client_email` | e.g. `firebase-adminsdk-xxx@ksyk-maps.iam.gserviceaccount.com`                              |
| `FIREBASE_PRIVATE_KEY`  | Same JSON as above, the `private_key` field                                     | Paste the whole PEM including `-----BEGIN/END-----` markers. `\n` literals get converted server-side. |

## 4. Client → server registration

**Client**: `KsykMessagingService.kt` calls `FirebaseMessaging.getInstance().token`
in `onCreate()` of the app and after every login. Posts to
`POST /api/push-tokens` with `{ token, platform: "android", appVersion }`.

**Retry**: `FcmTokenSyncWorker` — WorkManager job, retries on network
failure with exponential backoff (up to 5 attempts).

**Server**: `api/index.ts:2522` handles the POST. Idempotent — same
`token` value UPSERTs (updates `updatedAt`) instead of creating dupes.

## 5. Server → device broadcast

`POST /api/notifications/broadcast` (admin-only):

```json
{
  "title": "New announcement",
  "body":  "The lunch menu has changed",
  "data":  { "route": "/announcements" }
}
```

Internal flow (`server/fcm.ts:179`):
1. Read all rows from `push_tokens` (or filtered by platform).
2. Split into batches of 500 (FCM limit).
3. Call `messaging.sendEachForMulticast()` per batch.
4. Return `{ sent, failed, batches }` for the admin UI.

Data-only messages (no `notification.title`) are supported and preferred
for silent updates — the client's `onMessageReceived` decides whether to
show a notification.

## 6. Client message handling

`KsykMessagingService.onMessageReceived()` in
`android/app/src/main/kotlin/fi/ksykmaps/data/KsykMessagingService.kt`:

- Reads `data` map (server sends `title`, `body`, `route` there for
  data-only messages).
- Builds a `NotificationCompat` with `CHANNEL_ANNOUNCEMENTS` + tap-to-open
  intent that carries `route` as an extra so the app can deep-link.
- Falls back to system notification handling only when the app is in
  foreground (Android's default routes background notifications to the
  system tray automatically for `notification` payloads).

## 7. How to verify in production

1. **Config check**: `GET /api/notifications/status` (admin auth).
   Response should look like:
   ```json
   { "configured": true, "tokenCount": 42, "lastBroadcastAt": "2026-09-16T…" }
   ```
2. **Token registration**: install a debug APK on a real phone, open
   the app once, sign in. Check `SELECT COUNT(*) FROM push_tokens WHERE platform='android'` in Supabase.
3. **Send test broadcast**: from the admin panel → Notifications tab →
   Send. Expect a phone-hand notification within ~2 s. Server response
   includes `{ sent, failed, batches }`.
4. **Foreground test**: keep the app open while sending — the message
   should land in `onMessageReceived` and post a manual notification.
5. **Background test**: force-kill the app, send again — notification
   should still arrive (data-only path via WorkManager not required for
   this since Android delivers FCM to system tray automatically).

## 8. Common failure modes

| Symptom                                                    | Diagnosis                                                                            | Fix                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `configured: false` in status endpoint                     | One of the three env vars is missing / malformed                                     | Check Vercel env vars; PRIVATE_KEY must include header + footer PEM lines              |
| Broadcast returns `sent=0, failed=N` where N=tokenCount    | `firebase-admin` initialised but Firebase project mismatched to Android package name | Check `google-services.json` in the app matches `FIREBASE_PROJECT_ID`                  |
| One specific device never gets pushes                      | Stale token (app was uninstalled + reinstalled → new token)                          | The old token stays in `push_tokens`. Admin can hit "Reset all tokens" or wait for the next registration cycle |
| No devices in `push_tokens` table                          | Client-side registration failing silently                                            | Enable dev logging via `adb logcat -s FirebaseMessaging`. Check network / Google Play Services install |
| Notifications only arrive when app is open                 | Background delivery restrictions (Battery Saver, MIUI aggressive killer, etc.)       | Not fixable server-side. Educate users to whitelist the app.                           |

## 9. Files worth knowing

| Concern                        | File                                                             |
| ------------------------------ | ---------------------------------------------------------------- |
| Server FCM adapter (init, send)| `server/fcm.ts`                                                  |
| Broadcast endpoint             | `api/index.ts:2611` (`/notifications/broadcast`)                 |
| Status endpoint                | `api/index.ts:2694` (`/notifications/status`)                    |
| Token-store endpoints          | `api/index.ts:2522` (POST) and `:2574` (DELETE all, admin)       |
| Android messaging service      | `android/app/src/main/kotlin/fi/ksykmaps/data/KsykMessagingService.kt` |
| Client token retry             | `android/app/src/main/kotlin/fi/ksykmaps/data/FcmTokenSyncWorker.kt`  |
| Schema                         | `shared/schema.ts` → `pushTokens` table                          |

## 10. Non-goals / deliberate omissions

- **iOS**: not implemented. `platform` column is a string discriminator so we can add `ios` later without a migration.
- **Topics**: currently broadcast fans out to every token. Topics would let us scope by class / role / grade — deferred until we have user roles wired.
- **Delivery receipts**: FCM doesn't return per-device delivered/read state. If we want that, we need round-trip beacons from the client.
- **Rich notifications**: images / actions / expanded layouts not implemented. The current design keeps the payload flat.
