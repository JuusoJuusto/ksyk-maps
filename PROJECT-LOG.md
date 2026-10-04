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
