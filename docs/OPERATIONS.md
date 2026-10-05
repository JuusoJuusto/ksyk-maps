# KSYK Maps — Operations Guide

---

## Production Architecture

```
Browser / Android app
       │
       ▼
  Vercel CDN (ksykmaps.fi)
  ┌────────────────────────────────────────────────────┐
  │  Static assets: dist/public/assets/*               │
  │  (immutable cache, 1 year)                         │
  │                                                    │
  │  Serverless function: api/index.ts                 │
  │  ├── /api/health         (uptime probe)            │
  │  ├── /api/auth/*         (login/session)           │
  │  ├── /api/buildings      (map data)                │
  │  ├── /api/rooms          (map data)                │
  │  ├── /api/search         (classroom search)        │
  │  ├── /api/session/*      (first-party analytics)   │
  │  ├── /api/sentry-tunnel  (error monitoring proxy)  │
  │  └── /api/*              (all other API routes)    │
  └────────────────────────────────────────────────────┘
         │                         │
         ▼                         ▼
  PostgreSQL (Neon/Supabase)   Firestore (Firebase)
  Primary data store           Session/KV store, login attempts
  (users, buildings, rooms,    FCM push, beacon surveys
   announcements, logs)
```

**Note:** `server/index.ts` is the local development server (Express). Production runs `api/index.ts` as a Vercel serverless function.

---

## Deployments

### Web (Vercel)

Vercel deploys automatically on every push to `main`.

**Manual deployment:**
```bash
vercel --prod
```

**Check current deployment:**
```bash
vercel ls
```

**Rollback to previous deployment:**
```bash
vercel rollback
```

Or via git tag (preferred — keeps history clean):
```bash
git reset --hard rollback-before-X.Y.Z
git push --force-with-lease origin main
```

Every release should have a `rollback-before-X.Y.Z` git tag. Check `PROJECT-LOG.md` for the exact tag name.

### Android

1. Build release APK:
   ```bash
   cd android
   KSYK_KEYSTORE_FILE=/path/to/ksyk-release.jks \
   KSYK_KEYSTORE_PASSWORD=<password> \
   KSYK_KEY_ALIAS=ksyk \
   KSYK_KEY_PASSWORD=<password> \
   KSYK_BYPASS_TOKEN=<production-token> \
   ./gradlew assembleRelease
   ```
2. APK is at `android/app/build/outputs/apk/release/app-release.apk`
3. Upload to `public/releases/` and update `ANDROID_APP_VERSION` in `client/src/lib/changelog.ts`
4. Android rollback: redistribute the previous APK from `public/releases/`

---

## Rollback Decision Tree

```
Production incident
       │
       ├─ Is it a frontend-only issue (UI broken, CSS wrong)?
       │    └─ Vercel rollback via dashboard or `vercel rollback`
       │
       ├─ Is it a backend/API issue (500s, auth broken)?
       │    ├─ Was a schema migration deployed?
       │    │    └─ YES: Do NOT rollback Vercel until you understand migration impact.
       │    │           Migrations do NOT auto-rollback. Contact DB admin.
       │    │    └─ NO: `git reset --hard rollback-before-X.Y.Z && git push --force-with-lease`
       │    │
       │    └─ No migration: Vercel rollback safe.
       │
       └─ Is it a data corruption issue?
            └─ Restore from Neon/Supabase backup. Do not use git rollback.
```

---

## Health Checks

### API health endpoint

```
GET https://ksykmaps.fi/api/health
```

Expected healthy response:
```json
{
  "status": "ok",
  "version": "3.33.0",
  "db": "connected",
  "wilma": "not-configured",
  "ts": "2026-09-29T12:00:00.000Z"
}
```

Degraded response (503):
```json
{
  "status": "degraded",
  "db": "unreachable",
  "ts": "..."
}
```

The endpoint does NOT expose error details or internal infrastructure.

### Recommended Uptime Kuma configuration

| Monitor | URL | Method | Expected | Interval |
|---------|-----|--------|----------|---------|
| Web app | `https://ksykmaps.fi/` | GET | 200 | 60 s |
| API health | `https://ksykmaps.fi/api/health` | GET | JSON `status == "ok"` | 60 s |

Set up alerts to notify via email and/or Discord webhook when any monitor goes down.

---

## Common Failures

### `GET /api/health` returns 503

1. Check `POSTGRES_URL` (or `DATABASE_URL`) is set in Vercel env vars.
2. Check Neon / Supabase dashboard — is the database running?
3. Check Vercel function logs: `vercel logs --follow`.
4. If the database is available but the function crashes on cold start, check for missing env vars.

### Admin login returns 401 for correct credentials

1. Check `OWNER_EMAIL` env var matches the email being used.
2. Confirm the owner user exists in the database (check `users` table).
3. If the password was recently changed, verify it was hashed with bcrypt.

### Map tiles not loading

1. Check the browser console for CSP violations (tile URLs not in `connect-src`).
2. Verify the tile provider (CartoCDN, Stadia) is reachable.
3. Check `vercel.json` CSP header — tile provider hostnames must be in `connect-src`.

### Announcements returning 400

1. Check the request body — `expiresAt` must be a `Date` object or `null`, not an empty string.
2. The `api/index.ts` normaliser coerces ISO strings to `Date` — make sure this code path is running (production uses `api/index.ts`, not `server/routes.ts`).

### Android app can't reach the API

1. Confirm `KSYK_BYPASS_TOKEN` env var matches the Vercel WAF Custom Rule bypass secret.
2. Check `BuildConfig.BYPASS_TOKEN` in the APK matches the rule value.
3. Verify the WAF rule: "Skip Attack Challenge when `x-ksyk-bypass-token` equals <secret>".

---

## Database Migrations

Schema changes are managed with Drizzle ORM.

**Generate migration SQL:**
```bash
npm run db:generate
```

**Apply migration to database:**
```bash
POSTGRES_URL=<connection-string> npm run db:push
```

**Before applying any migration in production:**
1. Back up the database (Neon: create a branch; Supabase: point-in-time restore).
2. Test on a staging DB first.
3. Understand whether the migration is additive (safe) or destructive (adds/drops columns, changes constraints).
4. Note in `PROJECT-LOG.md` whether rollback would leave the column in place (safe) or require manual cleanup.

**Current pending:** Apply the 10+ indexes added in v4.7.48:
```bash
POSTGRES_URL=<your-connection-string> npm run db:push
```
This is additive (adds indexes only) — safe to apply without downtime.

---

## Environment Variables

All variables must be set in the **Vercel dashboard** (not committed to git).

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_URL` | PostgreSQL connection string | `postgres://user:pass@host/db` |
| `OWNER_EMAIL` | Owner account email | `owner@school.fi` |
| `SESSION_SECRET` | Express session secret | Random 32-char string |
| `JWT_SECRET` | JWT signing secret | Random 32-char string |
| `POSTHOG_API_KEY` | PostHog server-side token | `phc_...` |
| `POSTHOG_HOST` | PostHog host | `https://us.i.posthog.com` |
| `VITE_POSTHOG_KEY` | PostHog client-side token (same as above) | `phc_...` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_USER` | SMTP username | `ksykmaps@gmail.com` |
| `EMAIL_PASSWORD` | SMTP password/app password | (rotate after any exposure) |
| `EMAIL_PORT` | SMTP port | `587` |

### Optional

| Variable | Description |
|----------|-------------|
| `DISCORD_TICKETS_WEBHOOK` | Discord webhook for support tickets |
| `DISCORD_WEBHOOK_URL` | Discord webhook for general notifications |
| `VITE_SENTRY_DSN` | Sentry DSN (has a hardcoded fallback) |
| `WILMA_BASE_URL` | Wilma API base URL for server-side schedule proxy |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK JSON (as env var, not file) |

### Security — what must NOT have VITE_ prefix

Server secrets must NOT be prefixed with `VITE_` because Vite bakes all `VITE_*` vars into the client-side JavaScript bundle.

| Must stay server-side (no VITE_ prefix) |
|-----------------------------------------|
| `DATABASE_URL` / `POSTGRES_URL` |
| `SESSION_SECRET` |
| `JWT_SECRET` |
| `EMAIL_PASSWORD` |
| `DISCORD_TICKETS_WEBHOOK` |
| `DISCORD_WEBHOOK_URL` |
| `FIREBASE_SERVICE_ACCOUNT` |
| `POSTHOG_API_KEY` (server SDK) |
| Any `GEMINI_API_KEY` if used |

---

## Support Process

1. User submits a ticket at `https://ksykmaps.fi/support`
2. Ticket is stored in the `tickets` database table
3. Discord notification fires to the configured webhook (if set)
4. Admin views ticket at `/admin` → Support tab
5. Admin can reply via email (uses Resend/nodemailer)
6. Admin marks ticket resolved

For urgent issues (map data wrong, classroom mislabelled), use the admin Builder tool to correct room data.

---

## Credentials to Rotate After Any Exposure

If any of the following appear in a public git commit, an error log, or an analytics event, rotate them immediately:

- `EMAIL_PASSWORD` (Gmail app password)
- `JWT_SECRET` / `SESSION_SECRET`
- `POSTGRES_URL` (includes password)
- Discord webhook URLs (anyone with the URL can post)
- Firebase service account private key (`serviceAccountKey.json`)

**Important:** Deleting a secret from a file does not remove it from git history. Use `git filter-repo` or contact GitHub support to scrub history. Until then, treat any secret that was ever committed as compromised.

---

*Last updated: 2026-09-29 · KSYK Maps v4.7.51*
