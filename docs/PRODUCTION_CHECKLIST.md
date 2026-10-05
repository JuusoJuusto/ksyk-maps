# KSYK Maps — Production Checklist

Run through this before every production release. Tick each item only after you have verified it, not just changed it.

---

## Build

- [ ] `npm run check` exits 0 (TypeScript clean)
- [ ] `npm run build` exits 0 (Vite production build)
- [ ] No chunks exceed 500 kB after gzip (current: index.js 490 kB gzip — watch it)
- [ ] Build output is in `dist/public/`
- [ ] Android: `./gradlew assembleRelease` exits 0 with the real keystore (`KSYK_KEYSTORE_FILE`)
- [ ] Android `versionCode` incremented; `versionName` matches web `APP_VERSION`

---

## Security

- [ ] `serviceAccountKey.json` is NOT committed (listed in `.gitignore`; verify with `git status`)
- [ ] `.env`, `.env.local`, `.env.production` are NOT committed
- [ ] No `VITE_*` env vars set in Vercel that contain server-only secrets (Discord webhooks, email passwords, DB passwords)
- [ ] `VITE_GEMINI_API_KEY` is either unset in Vercel (SmartSupportOwl is unused) or proxied server-side
- [ ] Android bypass token overridden via `KSYK_BYPASS_TOKEN` env var (not the default `ksyk-mobile-2b9d47f83c6e5a1`)
- [ ] Android keystore password is NOT `ksyk1234` in production
- [ ] Sentry session replay `maskAllText: true` (confirmed in `client/src/lib/sentry.ts`)
- [ ] Health endpoint 503 does NOT return `error.message` (confirmed in `server/routes.ts`)
- [ ] `POST /api/admin/cleanup-all` is owner-only, not admin-only
- [ ] Search query length capped at 200 chars in `server/routes.ts`
- [ ] Rate limiters active: `rateLimiters.auth` on login, `rateLimiters.passwordReset` on reset, `rateLimiters.mutation` on writes
- [ ] Firestore per-account lockout wired in login handler (v4.7.51)
- [ ] OWNER_EMAIL set in Vercel env vars
- [ ] DB indexes applied (`npm run db:push` with `POSTGRES_URL` set)

---

## Authentication

- [ ] Admin login works with owner credentials
- [ ] Admin login works with admin credentials
- [ ] Login fails with wrong password (returns 401, not 500)
- [ ] Account lockout fires after 5 failed attempts
- [ ] Password reset email is sent and link expires
- [ ] 2FA TOTP flow works end-to-end
- [ ] Logout clears the session cookie
- [ ] Session cookie is `HttpOnly`, `Secure` (in production), `SameSite=Strict`
- [ ] Expired session redirects to login
- [ ] Student/user cannot access admin routes (test `/admin` while logged out)

---

## Authorization

- [ ] `owner` role can use all admin routes (v4.7.48 fix — verified)
- [ ] `admin` role can use all admin routes except cleanup-all
- [ ] `user`/`editor`/`student` roles cannot access admin write endpoints
- [ ] `GET /api/buildings`, `GET /api/rooms` are publicly readable (map needs them)
- [ ] `POST /api/buildings` etc. require auth
- [ ] `GET /api/users` requires admin auth
- [ ] No unauthenticated user can create/delete/modify building or room data

---

## Database

- [ ] `POSTGRES_URL` (or `DATABASE_URL`) is set in Vercel env vars
- [ ] Connection succeeds (`GET /api/health` returns `"db":"connected"`)
- [ ] New schema indexes deployed (`npm run db:push`)
- [ ] Indexes present: `IDX_users_password_reset_token`, `IDX_rooms_building_id`, `IDX_floors_building_id`, `IDX_hallways_building_id`, `IDX_admin_login_logs_email`, `IDX_app_logs_created_at`, `IDX_page_views_created_at`, `IDX_search_analytics_created_at`
- [ ] No pending migrations that could lose data

---

## API

- [ ] `GET /api/health` returns `{ status: "ok" }` in under 2 s
- [ ] `GET /api/buildings` returns building array
- [ ] `GET /api/rooms` returns room array
- [ ] `GET /api/announcements` returns announcement array
- [ ] `POST /api/auth/admin-login` with valid credentials → 200
- [ ] `POST /api/auth/admin-login` with invalid credentials → 401
- [ ] `POST /api/support/ticket` creates a support ticket
- [ ] `GET /api/lunch-menu` returns today's menu (or error if school not configured)
- [ ] No 500 errors on cold start
- [ ] All `/api/*` routes return JSON, not HTML

---

## PostHog

- [ ] `VITE_POSTHOG_KEY` set in Vercel (uses proxy at `t.ksykmaps.fi`)
- [ ] PostHog captures `page_view` on first load
- [ ] PostHog is opted OUT by default (only activates after cookie consent)
- [ ] Cookie consent banner appears on first visit
- [ ] Session replay is active (with `maskAllInputs: true`, canvas recording enabled)
- [ ] Error tracking captures unhandled exceptions
- [ ] PostHog captures map load, search, navigation events
- [ ] Distinct ID is per-user (not shared/hardcoded)
- [ ] Logout does NOT carry the identified user's ID to the next anonymous session

---

## Error Monitoring (Sentry)

- [ ] Sentry initialises in production (check Sentry Issues feed after a test error)
- [ ] Sentry tunnel at `/api/sentry-tunnel` is active
- [ ] `replaysOnErrorSampleRate: 1.0` (full replay on every error session)
- [ ] `maskAllText: true` (student names not captured in replays)
- [ ] MapLibre transient render errors are filtered from Sentry Issues
- [ ] Sentry DSN set via `VITE_SENTRY_DSN` or using the hardcoded fallback

---

## Uptime Monitoring

- [ ] Uptime Kuma (or equivalent) monitors `https://ksykmaps.fi/`
- [ ] Uptime Kuma monitors `https://ksykmaps.fi/api/health`
- [ ] Alert channel configured (email / Discord)
- [ ] Alert fires when `/api/health` returns 503

---

## Web App

- [ ] Map loads at `/` on Chrome (desktop)
- [ ] Map loads at `/` on Chrome (mobile viewport — 390 px)
- [ ] Search returns results for `K27`
- [ ] Search returns results for `liikuntasali`
- [ ] Search returns nothing for a nonsense string (no false positives)
- [ ] Navigation panel appears after clicking a room
- [ ] Language toggle switches between FI and EN
- [ ] Announcement banner appears when an announcement is active
- [ ] Settings panel opens and all toggles respond
- [ ] Admin login page loads at `/admin`
- [ ] Offline banner appears when network is disconnected

---

## Android

- [ ] APK is a release build (not debug)
- [ ] `applicationId = "fi.ksykmaps"` (not `.debug` suffix)
- [ ] `versionCode` matches intended release
- [ ] App loads the production API (`https://ksykmaps.fi/api`)
- [ ] PostHog and Sentry are initialised (check dashboards after install)
- [ ] Bypass token is the production value (not `ksyk-mobile-2b9d47f83c6e5a1`)
- [ ] Map loads
- [ ] Search works
- [ ] Schedule import works

---

## Map

- [ ] Buildings render at correct positions
- [ ] Rooms are visible with correct labels
- [ ] Floor selector switches floors correctly
- [ ] Dark/light mode toggles map style
- [ ] No MapLibre console errors on load (other than known transient render errors)

---

## Wilma / iCalendar

- [ ] Wilma import URL field validates input
- [ ] Valid calendar URL imports schedule successfully
- [ ] Invalid URL shows a friendly error
- [ ] Five school periods are separated, not merged into one day

---

## HSL / Digitransit

- [ ] HSL route suggestions load on the HSL page
- [ ] HSL API failure shows a friendly error, not a crash

---

## Positioning

- [ ] WiFi positioning shows a position on the map when beacons are visible
- [ ] Positioning failure shows a fallback message, not a crash
- [ ] App is fully usable if positioning is unavailable

---

## Performance

- [ ] LCP < 2.5 s on a simulated slow 4G (Lighthouse)
- [ ] No unnecessary full-page reloads on SPA navigation
- [ ] `index.js` gzip < 500 kB (current 490 kB — at the limit)
- [ ] Map tiles load within 3 s on WiFi

---

## Privacy

- [ ] Cookie consent banner is shown before any analytics fires
- [ ] Accepting analytics opts in to PostHog
- [ ] Rejecting analytics keeps PostHog opted out
- [ ] No student names, Wilma URLs, or personal schedules in PostHog events
- [ ] Sentry replay masks all text (`maskAllText: true`)
- [ ] Search queries sent to analytics are truncated at 200 chars

---

## Deployment

- [ ] Git tag `rollback-before-X.Y.Z` exists at previous HEAD
- [ ] Vercel deployment is linked to the correct branch (`main`)
- [ ] All required env vars are set in Vercel dashboard
- [ ] `npm run db:push` was run if schema changed
- [ ] Vercel deployment preview URL tested before production promotion
- [ ] Production URL (`https://ksykmaps.fi`) returns 200 after deploy

---

## Rollback

- [ ] Rollback command documented in PROJECT-LOG.md for this release
- [ ] If DB migration was applied: rollback procedure is documented (migrations do NOT auto-rollback)
- [ ] Previous version tag exists: `git reset --hard rollback-before-X.Y.Z && git push --force-with-lease origin main`

---

## Support

- [ ] Support form at `/support` submits successfully
- [ ] Support ticket appears in admin panel
- [ ] Discord notification fires on new ticket (if `DISCORD_TICKETS_WEBHOOK` is set)
- [ ] User receives a confirmation

---

*Last updated: 2026-09-29 · KSYK Maps v4.7.51*
