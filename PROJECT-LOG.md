# PROJECT-LOG.md — KSYK Maps running history

Append-only.  Agents MUST add a new entry at the top of the list after
every conversation.  Keep each entry scannable:

```
## YYYY-MM-DD — vX.Y.Z — one-line summary
**Asked.** 2–5 bullet points of what the user asked for, verbatim-ish.
**Decided.** What we chose to build or defer, with the why.
**Shipped.** Commit SHA + versions + file list touched.
```

Hub: [[BRAIN.md]]  ·  Board: [[ROADMAP.md]]

---

## 2026-10-04 — v1.0.2 — beta banner admin toggle · forgot-password Wilma polish · easter eggs OFF · mobile Nav fix

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

**Shipped.**
- Commit: pending push on `main`.  Prior HEAD `f5ad783` tagged `rollback-before-1-0-2`.
- Web `1.0.1 → 1.0.2`.  Android unchanged at `1.0.1`.
- Files: `BetaWelcomeBanner.tsx`, `AppSettingsManager.tsx`, `shared/schema.ts`, `server/initDb.ts`, `api/index.ts`, `pages/admin-forgot-password.tsx`, `pages/faq.tsx`, `App.tsx`, `hooks/useKsykEasterEggs.ts`, `components/FeatureInfoSheet.tsx`, `components/KSYKMapView.tsx`, `lib/changelog.ts`, `BRAIN.md`, `ROADMAP.md`, `PROJECT-LOG.md`, `CLAUDE.md`.
- Deferred: mobile class-info peek button prominence, animation pass, security-settings "reset to defaults" button, FAQ content refresh.

---

## 2026-10-02 — v1.0.1 — version reset · root cause of Failed-to-fetch flood · UX cleanup

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

## 2026-10-01 — v4.7.57 — dialog desktop fix · Get-the-app Wilma popup · Android 2.0.0-beta theme

**Asked.**  Dialog desktop sizing broken (mobile OK), Get-the-app popup look rough, Android visual pass to match Wilma web.

**Decided.**  Switched to `max-sm:` mobile-only overrides so shadcn defaults handle desktop centering untouched.  Rewrote `GetAppPopup.tsx` to Wilma document card.  New `theme.kt` for Compose: navy palette, custom Shapes + Typography, dynamic colours deliberately disabled.

**Shipped.** Commit `f0fa9e6`.  Web `4.7.56 → 4.7.57`.  Android `1.99.0 → 2.0.0-beta`.

---

## 2026-10-01 — v4.7.56 — beta banner + Get-the-app really fixed + admin sub-tab routing

**Asked.**  Beta welcome, Get-the-app still broken, admin sub-tab URLs, dialog sizing bugs, per-user block action.

**Decided.**  Added `app_settings.show_get_app_popup` + `get_app_url` columns (that was the real bug — Drizzle UPSERT silently dropped unknown fields).  `/admin/:section/:subtab` route.  New `AdminProfileDialog`.  SecurityPanel's exception editor gets explicit Grant + Block buttons.

**Shipped.** Commit `a667600`.  Web `4.7.55 → 4.7.56`.

---

## Older entries

See `client/src/lib/changelog.ts` for the full user-facing changelog
down to v3.x.
