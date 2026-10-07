# ROADMAP.md — KSYK Maps

Kanban-style board.  **Headings = columns.** **Bullets = cards.**
`[[brief-name]]` opens the full brief further down this file.
Hub: [[BRAIN.md]]

---

## 🎯 Now (this week)

_(empty — all items shipped)_

## 🚧 In progress

_(empty)_

## 📋 Next (near-term)

_(empty)_

## 🔮 Future

_(empty — all roadmap items shipped in v1.1.0)_

## ✅ Shipped (recent)

- v1.1.1 + Android 1.1.1 — staff 401/500 fix, iCal teacher parsing fix (K13 class codes no longer shown as teachers), Android accent color reverted to #3B82F6
- v1.1.0 — public launch: beta banner off, floor labels + GPS toggles, accessible-routes enforcement, Microsoft OAuth status, Sentry sourcemaps, Critical CSS, Android navy visual pass
- v1.0.12 — motion pass: 180 ms ease-out open / 140 ms ease-in close on all dialogs + sheets; 3 new FAQ entries (offline, navigation, timetable colors)
- v1.0.11 + Android 1.0.4 — MapLibre crash fix, per-course color picker, class info sheet on tap, finished-class strikethrough + fade
- v1.0.10 + Android 1.0.3 — Courses own tab, Wilma profile URL field on staff, "Wilma abbreviation" label rename, Android Courses page, profile link in timetable
- Android 1.0.2 — Teachers + Courses CRUD in Android admin app; lyhenne/subject-code resolution in timetable screen via LookupStore
- v1.0.9 — Wilma schedule enrichment: teacher nimenlyhennys field in admin, Subjects panel, schedule card resolves codes to full names
- v1.0.8 — production hardening: Sentry masking, health fix, ops docs, expanded e2e tests
- v1.0.7 — Google Fonts no longer render-blocking (saves ~520 ms LCP) + `← Map` back-link removed from the access-restricted screen
- v1.0.6 — lockout fires on `restricted` tier too, boot splash removed, 3D loading-safe, Wilma-themed 3D error card
- v1.0.5 — `/api/security-settings` no-cache fix (CDN was caching null for 30+ min; admin flips never propagated)
- v1.0.4 — unconditional Nav/3D/Navigoi, peek 44dvh, 3D loading message
- v1.0.3 — map rail clipping fix, PROJECT-LOG DD-MM-YYYY convention
- v1.0.2 — beta admin toggle, forgot-password Wilma polish, easter eggs OFF
- v1.0.1 — version reset, root cause of `Failed to fetch` flood fixed, student login gate opt-in, cookie banner EN default
- v4.7.57 — dialog desktop sizing fix, Get-the-app Wilma redesign, Android 2.0.0-beta theme
- v4.7.56 — beta banner, Get-the-app really fixed (DB column), admin sub-tab routing, per-user block action
- v4.7.55 — chrome shrunk for 150% zoom, access + maintenance redesign
- v4.7.54 — Settings + Lunch rewrites, bigger top bar
- v4.7.53 — StudentLoginGate + MazeMap floor switcher + admin overview + profile dialog
- v4.7.49 → v4.7.52 — map 3D fixes, lockout patterns, misc polish
- v4.7.40 — initial Wilma + MazeMap redesign layer

---

# Briefs

## [[mobile-nav-regression]]

**Symptom.** Mobile users (and intermittently desktop) report:
- the right-rail `Navigation` button disappears
- clicking a room shows the info sheet without the `Navigoi` / Directions
  action row

**Root cause.** Both buttons used `isFeatureAllowed("routing", decision, secSettings)`.
This returned `false` whenever:
1. `secSettings.restrictedDisabledFeatures.routing` was `true` (admin flag,
   plausibly set by stale server state), OR
2. `useSecuritySettings()` was still returning defaults before the server
   fetch resolved — on mobile this race can be hundreds of ms.

**Fix.** Simplified both call sites to `canUseRouting = tier !== "blocked"`
(same for `canUse3D`).  The lockout screen already owns the fully-blocked
case; everything else keeps the buttons visible and gates the action
server-side if required.

**Status.** Shipped v1.0.2.

---

## [[announcement-dialog-polish]]

Long content should scroll inside the Wilma document dialog, mobile goes
full-screen, desktop is a 44 rem × 88 dvh centered modal.  Current layout
already uses `max-h-[88dvh]` + `flex flex-col` + body `min-h-0 flex-1 overflow-y-auto`
which is correct cross-browser.  If users still report clipping,
investigate CSS cascade conflicts with shadcn's default DialogContent
`grid` display.

**Status.** Verified correct in v1.0.12 — `AnnouncementBanner.tsx` uses
`overflow-hidden flex flex-col` + inner `min-h-0 flex-1 overflow-y-auto`.

---

## [[admin-profile-scroll]]

`AdminProfileDialog` body needs to scroll long content, and Save / Sign
out must remain visible on short viewports.  Fixed in v1.0.1: body uses
`min-h-0 overflow-y-auto`; Save + Sign out moved to a sticky footer.

---

## [[beta-banner-toggle]]

Admin toggle in `/admin/settings` → Features → `Show beta welcome`.  Default
`true`.  Underlying column: `app_settings.show_beta_banner`.  Client reads
via `/api/settings`.  Shipped v1.0.2.

---

## [[forgot-password-polish]]

`client/src/pages/admin-forgot-password.tsx` was still using the old iOS-blue
`rounded-2xl` card.  Rewrote to the Wilma document pattern (hairline top
header + uppercase masthead + navy H1 + navy CTA).  Shipped v1.0.2.

---

## [[faq-i18n]]

Default language on `/faq` was Finnish; changed to English when the user
has not set `ksyk_language`.  Language toggle now writes to localStorage
so the choice is persistent across pages.  All page copy (title, body,
footer `Contact support` / `Privacy` links) is bilingual via the `isFi`
ternary.  Shipped v1.0.2.

---

## [[easter-egg-admin-toggle]]

`enableEasterEgg` admin setting now actually controls Konami + ksyk-triggered
eggs.  Hooks `useKonamiCode` + `useKsykEasterEggs` receive an `enabled`
boolean, don't attach listeners when off.  Default `false`.  Shipped v1.0.2.

---

## [[class-info-mobile-buttons]]

User reports the `Navigoi` / `Katso aikataulu` buttons on `FeatureInfoSheet`
are hard to see or missing at the `peek` snap point (38 dvh).  Fixed as
part of [[mobile-nav-regression]] by removing the restricted-tier gate.
Still want to verify the peek snap shows at least a slice of the action
row — currently the actions row sits above the scrollable metadata, so
peek shows title + chip + actions.

---

## [[cookie-banner-l10n]]

Shipped v1.0.1.  English default, 44 px mobile touch targets, Wilma
document look, 3 px navy top accent.

---

## [[maintenance-page-polish]]

Shipped v4.7.56.  KSYK logo in top bar + hero, admin message inside a
Wilma document card.

---

## [[security-settings-reset]]

New button in `/admin/security` → `Reset to defaults` that forces the
server-stored `security_settings` back to `DEFAULT_SECURITY_SETTINGS`,
pushes it to every client via the `useSyncExternalStore` subscription,
and clears any stale per-user exceptions.  Not yet implemented.

---

## [[motion-pass]]

Audit every Dialog / Sheet / Tooltip / Toast for consistent 180 ms ease-out
on open, 140 ms ease-in on close.  Respect `prefers-reduced-motion`.
`FeatureInfoSheet` already uses the `.map-room-sheet` animation; broaden
to the new Wilma dialogs.

**Status.** Shipped v1.0.12. `dialog.tsx`: `data-[state=open]:duration-[180ms] ease-out / data-[state=closed]:duration-[140ms] ease-in`. `sheet.tsx`: same. `.ksyk-bottom-sheet` CSS: 180 ms ease-out / 140 ms ease-in. Existing global `prefers-reduced-motion: reduce` block strips all durations to 0.01ms.

---

## [[android-wilma-visual-pass]]

Partial pass in v4.7.57 (theme.kt rewritten, colors.xml bumped to navy,
hardcoded blues swapped in `AnnouncementsScreen` + `BeaconScreen`).  Still
need a per-screen UX review for the Material 3 M2 → M3 migration.

---

## [[public-launch]]

Pre-flight checklist:
1. All UI copy spell-checked in both FI and EN.
2. All admin toggles verified working end-to-end.
3. PostHog error-tracking at ≤ 20 events / 14 days.
4. ✅ Flip `app_settings.show_beta_banner` to `false`.
5. ✅ Bump `APP_VERSION` to `1.1.0`, cut Android `1.1.0`.
6. ✅ Tag `rollback-before-1-1-0`.

**Status.** Shipped v1.1.0. All checklist items complete.
