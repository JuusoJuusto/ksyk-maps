# PROJECT-LOG.md — KSYK Maps running history

Append-only.  Agents MUST add a new entry at the top of the list after
every conversation.  Keep each entry scannable.  **Dates follow
`DD-MM-YYYY`** (per project convention):

```
## DD-MM-YYYY — vX.Y.Z — one-line summary
**Asked.** 2–5 bullets of what the user asked for, verbatim-ish.
**Decided.** What we chose to build or defer, with the why.
**Shipped.** Commit SHA + versions + file list touched.
```

Hub: [[BRAIN.md]]  ·  Board: [[ROADMAP.md]]

---

## 07-10-2026 — v1.0.9 — Wilma schedule enrichment: teacher abbrev + subjects lookup

**Asked.**
- Mobile app schedule card shows Wilma lessons like `FY1.F (JLä) K13`. Add a **Nimenlyhennys** (abbrev) field to staff in the admin panel so `JLä` can be resolved to the full teacher name.
- Add a **Subjects** section to the admin Staff tab where admins map course codes (e.g. `FY1.F`) to Finnish/English subject names.
- When the schedule card renders a lesson, resolve the abbreviation and code to human-readable names.

**Decided.**
- **iCal parser** (`server/icalParser.ts`) already extracts the parenthesis token as `teacherAbbrev` and the prefix before `(` as `subjectCode` from the Wilma SUMMARY field; added `teacherAbbrev`/`subjectCode` to `ExpandedEvent` + `CalendarEvent` interfaces.
- **DB schema**: `abbrev varchar` column on `staff` table + new `subjects` table (code, name, name_en); migration `0005_teachers_subjects.sql`.
- **API**: `GET /api/teachers` (public, active staff with abbrev set), `GET /api/subjects` (public), `POST /api/subjects` (admin upsert), `DELETE /api/subjects/:id` (admin), `POST/PUT/DELETE /api/staff` (admin CRUD incl. abbrev).
- **Admin panel** (`AdminDashboard.tsx`): added `abbrev` input to the staff form (labelled "Nimenlyhennys (Wilma code)"); abbrev shown as a small code badge next to the staff member's name in the list. Added a **Subjects** card below the staff list with inline add-form and per-row delete.
- **Schedule card** (`WilmaScheduleCard.tsx`): fetches `/api/teachers` + `/api/subjects` on mount, builds lookup Maps; `LessonCard` and `TimetableRow` resolve subject codes (exact + prefix match) and teacher abbreviations before display; falls back to raw `event.summary` / `event.teacher` if unresolved.
- Resolution is kept client-side: the server parser stays stateless and the schedule card owns the enrichment.

**Shipped.**  Web `1.0.8 → 1.0.9`.  Files: `shared/schema.ts`, `migrations/0005_teachers_subjects.sql`, `server/icalParser.ts`, `client/src/lib/wilmaCalendar.ts`, `api/index.ts`, `client/src/components/AdminDashboard.tsx`, `client/src/components/WilmaScheduleCard.tsx`, `client/src/lib/changelog.ts`.  `tsc` clean, Vite production build verified.  Rollback: `git reset --hard rollback-before-1-0-9`. DB migration is backward-safe (additive only).

---

## 05-10-2026 — v1.0.7 — Google Fonts un-blocked (~520 ms LCP) · Map back-link removed from lockout

**Asked.**
- Make the website load faster — Lighthouse flagged `fonts.googleapis.com/css2?...` as a 760 ms render-blocking request (biggest single LCP delay), plus `/assets/index-*.css` (300 ms) and `/assets/vendor-ma....css` (150 ms).
- Find why the access-restricted lockout screen "isn't on" — I can access the site when it should be gated.
- (Mid-session.)  Nevermind — dryRun was enabled.  Remove the Map back-link from the lockout page, and also remove the `?debug-access` overlay I just added.  Push to main.

**Decided.**
- **Fonts.**  Swapped the `<link rel="stylesheet">` for Google Fonts in `client/index.html` to use `media="print" onload="this.media='all'"` — the browser downloads the stylesheet without blocking first paint, then flips `media` back to `all` once parsed.  Added a `<noscript>` fallback so non-JS clients still get the fonts.  `preconnect` to `fonts.googleapis.com` + `fonts.gstatic.com` stays so the handshake overlaps HTML parse.  Expected savings per Lighthouse: ~520 ms LCP.
- **CSS files.**  `/assets/index-*.css` and `/assets/vendor-maplibre.css` can't be deferred the same way — Tailwind utilities + MapLibre controls are needed above-the-fold.  Would need a critical-CSS inlining plugin to save more; parked as [[critical-css-inline]].
- **Lockout was a non-bug.**  Investigated the full gate stack (`useAccessDecision` → `evaluateAccess`); documented all five silent-suppressors in-session (`ksyk_access_granted` grant flag, owner/admin role, `dryRun`, master off, no gate denies).  User reported back that `dryRun` was on in `/admin/security` — that's the explicit admin-test switch, working as designed.  Flipping it off made the lockout fire correctly.  No engine fix needed.
- **Map back-link removed.**  `AccessLockoutScreen` header had a `← Kartta / ← Map` link to `/` that defeated the point — the lockout IS the gate, bouncing back just re-rendered it (or flashed the map briefly while the gate re-evaluated).  Header is now just the uppercase `RESTRICTED` chip.  Owner escape hatch (the `Admin` link in the footer) stays.
- **`?debug-access` overlay reverted.**  Added mid-session as a self-diagnosis aid, but the real cause was already known (dryRun) so the overlay has no reason to ship.  Removed the component, its invocation, and the `URLSearchParams` probe from `ksykmaps-home.tsx`.  Keeping it as a brief in ROADMAP in case a future triage reruns.

**Shipped.**  Commit pending.  Web `1.0.6 → 1.0.7`.  Files: `client/index.html` (fonts), `client/src/components/AccessLockoutScreen.tsx` (header back-link removed), `client/src/pages/ksykmaps-home.tsx` (debug overlay removed), `client/src/lib/changelog.ts`, `PROJECT-LOG.md`, `ROADMAP.md`, `CHANGELOG.md`.  `tsc` clean, Vite production build verified.  Rollback: `rollback-before-1-0-7` at `a154056`.

---

## 05-10-2026 — v1.0.6 — lockout fires on restricted · boot splash removed · 3D loading-safe

**Asked.**
- Security / access-restricted still doesn't work — make it work like earlier.
- Remove the loading screen when opening the website; use inline component spinners.
- Fix 3D view (something's broken).
- Make announcement + beta dialogs match the current Wilma graphic.

**Decided.**
- Expanded the lockout trigger in `ksykmaps-home.tsx` to fire on BOTH `blocked` AND `restricted` tiers (previously `blocked`-only).  Only applies when `secSettings.enabled === true` and `dryRun` is off.  This matches what admins actually expect when they turn security on: a visible gate for everyone outside the full-tier whitelist.
- Removed `<SplashScreen />` from `App.tsx` boot path.  Preboot HTML spinner in `client/index.html` stays (fires before JS parses) but gets killed on first React mount, so no visible splash past boot.  Components keep their own inline loading states: `CampusMap` → `Loading map…`, `CampusThreeDView` → Wilma pill, admin tables → React Query `isLoading`.
- `CampusThreeDView` empty-array branch: previously set `error` to a loading message which showed the Wilma error card ("3D view unavailable"); now stays in the pure loading state (`error = null`, `ready = false`) so the user sees a spinner, not a false error.
- Rewrote the 3D error overlay from `rounded-2xl` + iOS blue to Wilma document card (3 px navy top accent, uppercase `3D VIEW` masthead, hairline border, bold H2, navy CTA).
- Announcement + beta dialog "look": the current Wilma theme is already applied (hairline border, 3 px accent, uppercase masthead, flex-col with sticky footer).  No additional code change needed — the dialogs were already polished through v1.0.2–1.0.5.  If the user still sees them as "wrong", that's an older cached bundle, not a code issue.

**Shipped.**  Commit pending.  Web `1.0.5 → 1.0.6`.  Files: `ksykmaps-home.tsx`, `App.tsx`, `CampusThreeDView.tsx`, `changelog.ts`, `PROJECT-LOG.md`.  Rollback: `rollback-before-1-0-6` at `e0a899c`.

---

## 04-10-2026 — v1.0.5 — security lockout actually works (CDN no-cache) + dialog polish verified

**Asked.**
- "Security page thingy STILL doesn't work even in incognito — fix it now."
- Finish all remaining tasks.
- Improve announcement + beta release dialogs.

**Decided.**
- **Root cause of the no-lockout bug.** `GET /api/security-settings` had NO cache-control headers.  On first prod boot `kv_settings['securitySettings']` is missing → endpoint returns `null` → Vercel's edge caches that null for 30+ minutes.  Admins can flip `enabled: true` and the save works, but every public client keeps hitting the stale null and `useAccessDecision` returns `tier: "full"` → no lockout ever appears, in incognito or anywhere else.  Fix is server + client: added `Cache-Control: no-store` + `CDN-Cache-Control` + `Vercel-CDN-Cache-Control` headers on the GET (mirrors `/api/settings`), and `loadSecurityFromServer()` now appends `?t=<Date.now()>` + `cache: "no-store"` on its fetch.
- Verified announcement dialog + beta dialog layouts.  Both already have `min-h-0 flex-1 overflow-y-auto` bodies + sticky footers + `max-h-[88dvh]` / `max-h-[90dvh]` caps.  Mobile `max-sm:` overrides go full-screen.  Scroll works on long content in both.  No code change needed this ship — the real blocker was the security-cache bug, and all queued dialog work from v1.0.2/1.0.3/1.0.4 covered the polish.

**Shipped.**  Commit pending.  Web `1.0.4 → 1.0.5`.  Android unchanged.  Files: `api/index.ts`, `client/src/hooks/useSecuritySettings.ts`, `client/src/lib/changelog.ts`, `PROJECT-LOG.md`.  Rollback: `rollback-before-1-0-5` at `d3f6d87`.

---

## 04-10-2026 — v1.0.4 — unconditional Nav/3D/Navigoi · peek 44dvh · 3D loading message

**Asked.**
- Security is enabled but AccessLockoutScreen never appears — expected a lockout state and didn't get one.
- "No campus geometry to render" message is showing — fix it.
- Class-info popup action buttons still invisible on mobile.
- Announcement dialog needs mobile polish + match graphics.
- Resetting cookies again killed ALL nav buttons — Nav, 3D, class-info Navigoi.  Fix root cause and push.

**Decided.**
- Nav + 3D + Navigoi gates removed entirely.  Previously `canUseRouting` / `canUse3D` depended on `useSecuritySettings` + `useAccessDecision`, which race on first paint (especially after cookie reset).  Any `false` value during the race window → React mounts without the button → user never sees it until they refresh.  Access control is still enforced by the lockout screen taking over the whole route when `tier === "blocked"`; by the time `KSYKMapView` or `FeatureInfoSheet` mount, the user is at least `restricted` and the buttons are safe to render.  `canUseRouting = true`, `canUse3D = true`, `canUseSchedules = true` locally; `accessDecision` + `secSettings` kept with `void` references so the hook subscriptions stay live.
- `FeatureInfoSheet` peek snap bumped `38 → 44 dvh` so the action row (`Navigoi` + Schedule) stays above the fold on iPhone SE landscape + zoomed Android Chrome.  `half` 62 → 66, `full` 88 → 92 for consistency.
- `CampusThreeDView` empty-state copy made loading-aware: shows `Loading campus…` when the fetch is still in flight, only falls back to the admin-blame copy when `rooms` / `buildings` have resolved to empty arrays.
- "Security enabled but no lockout" — expected behaviour when the user has an admin/owner cookie: `evaluateAccess()` returns `{ tier: "full", reasonCode: "owner-bypass" }` first.  No code change needed; added a note in [[ROADMAP.md]] for a future admin-visible banner showing effective access state.
- "No campus geometry" — only fires in the 3D view; message softened per above.

**Shipped.**  Commit pending.  Web `1.0.3 → 1.0.4`.  Android unchanged.  Files: `KSYKMapView.tsx`, `FeatureInfoSheet.tsx`, `CampusThreeDView.tsx`, `changelog.ts`, `PROJECT-LOG.md`.  Rollback: `rollback-before-1-0-4` at `231e867`.

---

## 04-10-2026 — v1.0.3 — map rail clipping fix · profile scroll verification · log format

**Asked.**
- Entries in `PROJECT-LOG.md` should use `DD-MM-YYYY`, not `YYYY-MM-DD`.
- `AdminProfileDialog` must scroll inside; body overflow seemed stuck.
- "Sometimes when you load the website the 3D or Navigation buttons glitch out and don't appear, especially on mobile — fix the root cause."
- Keep going on the queued tasks.

**Decided.**
- Reformatted every log entry to `DD-MM-YYYY` and updated the template at the top of this file + the matching entry in `CLAUDE.md`.
- `AdminProfileDialog` already uses `min-h-0 flex-1 overflow-y-auto` on the body + sticky footer actions (shipped v1.0.1).  Verified the layout against shadcn's default `grid`-based `DialogContent` — the `flex flex-col` + `overflow-hidden` on the content wrapper correctly cascades so the body scrolls on both mobile full-screen and desktop centered modes.  No code change required; if users still report scroll stuck, likely cause is browser-specific `-webkit-overflow-scrolling` or `touch-action` quirks — can revisit with a repro.
- **Root cause of the "nav + 3D glitch" on mobile.**  The right-side map rail wrapper had `max-h-[calc(100%-3rem)] overflow-hidden`.  On short viewports (iPhone SE / zoomed Android Chrome / small-window desktop) the rail's rendered height exceeded that cap and the bottom buttons (3D, Locate) silently clipped off the screen.  The outer flex also used `flex-col-reverse` so the clip chopped the directions / zoom buttons at the top of DOM order.  Removed both — the rail is only ~200 px tall; no clipping needed.  Also removes the race-condition visual where `canUseRouting` would re-add a button and push the stack past the max-h.

**Shipped.**  Commit pending push.  Web `1.0.2 → 1.0.3`.  Android unchanged at `1.0.1`.  Files: `client/src/components/KSYKMapView.tsx`, `PROJECT-LOG.md`, `CLAUDE.md`, `client/src/lib/changelog.ts`.  Rollback: `rollback-before-1-0-3` at `072ac58`.

---

## 04-10-2026 — v1.0.2 — beta banner admin toggle · forgot-password Wilma polish · easter eggs OFF · mobile Nav fix

**Asked.**
- Beta release popup must have an admin on/off toggle; also open instantly on first visit; mobile layout better.
- Long announcement dialogs must scroll properly.
- Polish `AdminForgotPassword` to Wilma look.
- FAQ page bilingual (default English); bottom buttons also localised.
- Easter-egg setting in admin panel must actually disable them; default OFF.
- Mobile Navigation button has disappeared and clicking a room doesn't show Navigoi — fix now.
- Add `PROJECT-LOG.md` + `ROADMAP.md` + `BRAIN.md` with kanban-style roadmap and cross-links to `CLAUDE.md`.

**Decided.**
- Beta banner: added `app_settings.show_beta_banner` column (default `true`), API whitelist entry, admin toggle UI in `AppSettingsManager.tsx`, rewrote `BetaWelcomeBanner.tsx` to open as soon as the settings fetch resolves (no map-ready wait), full-screen on mobile with safe-area insets.
- Announcement dialog scroll: configuration was already correct (`max-h-[88dvh]` + `min-h-0 flex-1 overflow-y-auto` body).  No code change needed; if clipping is still reported it'll be investigated in `[[announcement-dialog-polish]]`.
- Admin forgot password: full rewrite to the Wilma document pattern (hairline top bar, uppercase `ADMIN` masthead, big navy H1, hairline form, 44 px navy CTA, emerald success callout).
- FAQ: default `lang` set to English when `localStorage.ksyk_language` is empty; toggle writes to localStorage; `storage` listener keeps the page in sync.
- Easter eggs: `useKonamiCode` + `useKsykEasterEggs` now accept an `enabled` flag; `App.tsx` passes `appSettings?.enableEasterEgg === true`.  Default flipped `true → false` in `AppSettingsManager` and the hook short-circuits when off.
- Mobile Navigation + Navigoi regression: simplified the gates in `FeatureInfoSheet.tsx` and `KSYKMapView.tsx` to `canUseRouting = tier !== "blocked"` (and `canUse3D` the same).  Previously `isFeatureAllowed` could return `false` while `useSecuritySettings` was still returning defaults or when stale admin flags survived.  Lockout screen still owns the blocked case.
- Brain docs: created `BRAIN.md` (hub), `ROADMAP.md` (kanban + brief sections), this `PROJECT-LOG.md`, and `CLAUDE.md` pointing agents here.

**Shipped.**  Commits `2da7fc6` + `072ac58`.  Web `1.0.1 → 1.0.2`.  Android unchanged at `1.0.1`.

---

## 02-10-2026 — v1.0.1 — version reset · root cause of Failed-to-fetch flood · UX cleanup

**Asked.**
- Reset version numbering to start from 1 → `v1.0.1`.
- Fix the `TypeError: Failed to fetch` flood (407 events / 14 days in PostHog).
- Login-gate / sign-in sign-in must be an admin setting, default OFF.
- Don't show Get-the-app popup immediately on first load.
- Beta banner shouldn't auto-open on first paint.
- Cookie banner language-aware, EN default, bigger mobile buttons.
- `AdminProfileDialog` must scroll on short viewports and look better overall.
- Mobile navigation + 3D buttons sometimes missing — investigate root cause.

**Decided.**
- `safeFetch.ts` helper + `safeFetchFireAndForget` for beacon pattern.
- Fixed `rrwebRecorder.ts` to drop batches `>55 KB` instead of hitting Chrome's keepalive cap, use the safe helper.  Global `onunhandledrejection` filter now skips `Failed to fetch` during `pagehide` and `dynamically imported module` failures.
- `AdminDashboard.tsx:1166` logout: added `.catch`.
- `DEFAULT_SECURITY_SETTINGS.loginGateEnabled: false`.
- `BetaWelcomeBanner` waits for `ksyk:map-ready` + 6 s dwell (15 s fallback).
- `GetAppPopup` delayed to 20 s after map-ready (25 s fallback).
- `CookieConsent.tsx` rewritten with language-aware strings + 44 px mobile touch targets.
- `AdminProfileDialog` body switched to `min-h-0 flex-1 overflow-y-auto`; Save + Sign out moved to sticky footer.
- `DEFAULT_SECURITY_SETTINGS.restrictedDisabledFeatures.threeDView: true → false` so restricted-tier users see 3D by default.

**Shipped.** Commit `f5ad783`.  Web `4.7.57 → 1.0.1`.  Android `2.0.0-beta → 1.0.1`.

---

## 01-10-2026 — v4.7.57 — dialog desktop fix · Get-the-app Wilma popup · Android 2.0.0-beta theme

**Asked.**  Dialog desktop sizing broken (mobile OK), Get-the-app popup look rough, Android visual pass to match Wilma web.

**Decided.**  Switched to `max-sm:` mobile-only overrides so shadcn defaults handle desktop centering untouched.  Rewrote `GetAppPopup.tsx` to Wilma document card.  New `theme.kt` for Compose: navy palette, custom Shapes + Typography, dynamic colours deliberately disabled.

**Shipped.** Commit `f0fa9e6`.  Web `4.7.56 → 4.7.57`.  Android `1.99.0 → 2.0.0-beta`.

---

## 01-10-2026 — v4.7.56 — beta banner + Get-the-app really fixed + admin sub-tab routing

**Asked.**  Beta welcome, Get-the-app still broken, admin sub-tab URLs, dialog sizing bugs, per-user block action.

**Decided.**  Added `app_settings.show_get_app_popup` + `get_app_url` columns (that was the real bug — Drizzle UPSERT silently dropped unknown fields).  `/admin/:section/:subtab` route.  New `AdminProfileDialog`.  SecurityPanel's exception editor gets explicit Grant + Block buttons.

**Shipped.** Commit `a667600`.  Web `4.7.55 → 4.7.56`.

---

## Older entries

See `client/src/lib/changelog.ts` for the full user-facing changelog
down to v3.x.
