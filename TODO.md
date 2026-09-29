# KSYK Maps — Working TODO

Living list of what's done, in progress, and pending across sessions. Update inline; do not delete completed items until they've shipped.

## Legend
- ✅ done + deployed
- 🚧 in progress this session
- ⏳ pending — assigned but not started
- ❌ blocked — needs user input / external work

---

**Where does this file live?** `TODO.md` at the repo root:
`C:\Users\JuusoKaikula\Downloads\KSYK-Map\TODO.md`
Also on GitHub at `main/TODO.md`.

---

## ✅ Just shipped (web 4.7.46 — Real announcement fix, photo back on AdminLogin, bigger dialog)

- **Announcement 400 — actual fix.** v4.7.45's client-side cleanup wasn't enough. Server-side `normalizeAnnouncementBody()` helper now: drops fields not in the schema, coerces `expiresAt` ISO string → real `Date` (or null), drops `authorId` entirely (nullable column, prevents FK-to-`staff.id` violation for owner accounts). PUT route uses same normalization. **Owner role now accepted** for POST/PUT (was admin-only).
- **Client toast surfaces real errors.** No more `Failed to create announcement` generic. Zod issues are printed field-by-field.
- **AdminLogin — photo restored per request.** Campus photo pane back on the left (desktop `lg:` up, hairline vertical border seal). Right side keeps the Wilma document look: uppercase `ADMIN` masthead, navy H1, hairline form, 44 px navy CTA. Column width tightened to a fixed 420/460 px so the photo gets more real estate.
- **Announcement dialog bigger + fits more text.** Was `max-w-[min(90vw,36rem)]` × `max-h-[85dvh]`. Now `max-w-[min(94vw,44rem)]` × `max-h-[88dvh]` on desktop; `h-[92dvh]` on mobile. Header padding y-4/6 → y-5/6-7. Priority chip 10px → 11px. Title 18/22 → 22/28 px, removed line-clamp-3. Body prose 15 → 15-16 with 1.7 line-height. Section spacing bumped.
- **Rollback** — `git tag rollback-before-4-7-46` at `18dc1c9`. Revert: `git reset --hard rollback-before-4-7-46 && git push --force-with-lease origin main`.
- **Files** — `server/routes.ts`, `AnnouncementManager.tsx`, `AdminLogin.tsx`, `AnnouncementBanner.tsx`, `changelog.ts`.
- **Web version bumped** `4.7.45` → `4.7.46`. `tsc` clean.

## ✅ Just shipped (web 4.7.45 — Announcement fix + AdminLogin/NavPanel/SearchDropdown rewrites)

- **Fixed `/api/announcements` 400 error.** Client was sending `expiresAt: ""` — drizzle-zod's `timestamp → z.date().nullable()` rejects empty strings. Client now converts empty → `null`, drops the phantom `publishedAt` (not a column), and only sends optional locale fields when non-empty. Server route now uses `safeParse` and returns real per-field Zod issues on 400 so future validation errors are debuggable.
- **Search dropdown overlap fixed.** The v4.7.43 Header rewrite had dropped the `<header>` HTML tag; `SearchResultsDropdown` uses `document.querySelector('header')` to compute its top offset, so with no element it fell back to a 128 px hardcoded position — landing inside the new 168-172 px header + banner stack. Restored the `<header>` tag.
- **AdminLogin fully rewritten.** Photo-left / narrow-card-right split gone. Now the same institutional document masthead as FAQ / Privacy / Support / Settings: `← Map` + `Protected` in the top bar, uppercase `ADMIN` masthead, big navy H1, hairline `EMAIL` + `PASSWORD` labels, 44 px Wilma-navy CTA, hairline Microsoft SSO outline button.
- **NavigationPanel chrome pass.** Both mobile bottom sheet + desktop card get a 3 px `#003d82` top accent (matches `FeatureInfoSheet`). Radius 28 px / 16 px → 8 px. `shadow-xl` gone. Header switched to Wilma masthead: uppercase `ROUTE` + big `Directions` H2. Close/expand buttons squared 6 px.
- **SearchResultsDropdown restyled.** Container: 2xl radius + backdrop-blur + shadow-lg → 8 px radius + hairline + tighter shadow. Filter chips: `rounded-full` marketing pills → 4 px Wilma tags with uppercase tracked labels. Type chips (K / GYM / LAB / etc.): perfect-circle 32×32 → squared 4 px `min-w-[36px]` rectangles. Hover tint moved from generic blue-50 to Wilma navy tint.
- **Rollback point** — `git tag rollback-before-4-7-45` at commit `fd5010c`. Revert: `git reset --hard rollback-before-4-7-45 && git push --force-with-lease origin main`.
- **Files** — `server/routes.ts`, `AnnouncementManager.tsx`, `Header.tsx` (restore `<header>`), `AdminLogin.tsx` (full rewrite), `NavigationPanel.tsx` (chrome), `SearchResultsDropdown.tsx`.
- **Web version bumped** `4.7.44` → `4.7.45`. `tsc` clean.

## ✅ Just shipped (web 4.7.44 — Settings + Lunch rewrites, bigger top bar)

- **`CampusSettingsPanel.tsx` fully rewritten.** Killed the four-Cards-per-tab stack. Document masthead + compact left rail on desktop / horizontal segmented control on mobile. Hairline-divided `Section` blocks with reusable `RowList` / `SettingRow` / `MetaRow` / `LinkRow` building blocks. Wilma-navy active tab. Language picker now a segmented control with FI first. About tab: identity card + big drop-shadow logo dropped for a compact meta row list.
- **`lunch.tsx` modernized.** Killed the `#FEFBF3` cream background — now uses standard chrome so the page reads as one product with the map. Day strip changed from amber shadow-pill boxes to an evenly-divided Wilma-navy segmented control; today gets an amber dot under the selected date. Menu card lost `rounded-3xl shadow-sm` → hairline-bordered `rounded-[6px]` container with divided dish rows.
- **Top bar bigger + right-side reordered.** Header 48/56 → 56/60 px. Logo scaled `scale-90` for modern balance against the taller bar. Search bar 40 → 44 px, radius 6 → 8 px. Desktop right side reordered per request: **Settings → EN/FI → theme** (was Settings → theme → EN/FI).
- **Announcement strip bigger + text bigger.** Height 32 → 40/44 px. Title 12/13 → 13/14 px. Icon 14 → 16 px. Controls 24 → 28 px.
- **Announcement detail dialog fully redesigned.** Colored gradient header + negative-margin white-body lift replaced with a 3 px navy/amber/red top accent + solid Wilma surface. Priority chip is a squared Wilma tag (was rounded-full pill). H1 in gray-900 (not white-on-gradient).
- **Sidebar drawer footer dropped.** `KSYK Maps · Campus navigation` line under the drawer scroll removed per user request.
- **Map controls redesigned.** Floor selector + right rail: `rounded-[18px]` + `backdrop-blur-xl` glass pill → `rounded-[8px]` + hairline border + no blur. Buttons 44 → 48 px, icons 18 → 20 px. Active floor uses a 3 px `#002d5f` inset-left accent bar (matches sidebar active row).
- **CSS layer mobile spacing pass.** More breathing on masthead blocks at ≤640 px; `scroll-margin-top: 4rem` on `main article > section` so ToC jumps in Privacy land past the sticky header.
- **Rollback point** — `git tag rollback-before-4-7-44` at commit `8e0522e`. Revert: `git reset --hard rollback-before-4-7-44 && git push --force-with-lease origin main`.
- **Files** — `Header.tsx`, `AnnouncementBanner.tsx`, `CampusSettingsPanel.tsx` (full rewrite), `KSYKMapView.tsx`, `lunch.tsx` (full rewrite), `wilma-mazemap.css`, `changelog.ts`.
- **Web version bumped** `4.7.43` → `4.7.44`. `tsc` clean.

## ✅ Just shipped (web 4.7.43 — Component-level rewrites)

**Not restyling — actual component rewrites.**

- **`Header.tsx` fully rewritten.** No more floating chip with backdrop-blur — a proper Wilma-style top bar sits on a hairline bottom border. Desktop shows inline navigation links (Lunch / Transport) with Wilma-navy `#003d82` active pill background. Mobile hamburger opens a full-height side drawer, not a floating card — hairline section separators, `PRIMARY_ROUTES` / `SECONDARY_ROUTES` typed constants, active-route detection with a 3px navy left-edge marker on the active row. Introduces `NavSection` + `NavRow` + `SegRow` internal components for reuse.
- **`AnnouncementBanner.tsx` rewritten as a Wilma-style solid strip.** Was a `rounded-2xl` floating card with `shadow-md` and a decorative colored-pill icon. Now a full-width edge-to-edge 32 px navy strip (amber / red for high / urgent). Framer-motion crossfade preserved. Title + inline body on one line; carousel controls dropped to 24 px `rounded-[4px]` ghosts.
- **`faq.tsx` restructured as a document.** Was rounded-2xl cards with per-question shadow, hover-lift, and staggered fade-in. Now: uppercase `HELP` masthead + big navy H1 + question count; a single bordered container with hairline-divided rows, each with a two-digit tabular numeral (01, 02, …) on the left. Answer text is `whitespace-pre-line` at 1.6 line-height.
- **`privacy.tsx` restructured.** Now: uppercase `DOCUMENT` masthead, big navy H1, a bordered Table-of-Contents nav with jump links, sections with `§01`, `§02` legal-numeral labels + indented 1.65 body prose. Reads like an actual privacy notice.
- **`support.tsx`** — killed the icon-pill card header (`bg-blue-50` circle with a Ticket icon). Uses the same document masthead as FAQ / Privacy. Form flows directly in the page grid — no CardContent wrapper wrapping the form.
- **Same document shell across FAQ / Privacy / Support** — `h-12` hairline header + uppercase masthead + big navy H1 + 13px subtitle + `border-b` divider. Marketing pages now feel like the same product.
- **Files touched** — `client/src/components/Header.tsx` (full rewrite), `client/src/components/AnnouncementBanner.tsx`, `client/src/pages/faq.tsx`, `client/src/pages/privacy.tsx`, `client/src/pages/support.tsx`, `client/src/lib/changelog.ts`.
- **Revert paths** — since these are component rewrites (not CSS-layer overrides), only `git reset --hard rollback-before-wilma-mazemap-redesign` fully restores. Removing the `main.tsx` `setAttribute` still turns off the CSS layer but the rewritten components stay Wilma-shaped.
- **Web version bumped** `4.7.42` → `4.7.43`. `tsc` clean.

## ✅ Just shipped (web 4.7.42 — Design system finish)

- **404 signature dropped**: removed the trailing "KSYK Maps" + `MapPin` line under the buttons on `not-found.tsx`. The big navy 404 now stands alone.
- **Marketing prose typography** — added to `wilma-mazemap.css`: `main` body 15px / 1.65 line-height, `main` anchors tinted Wilma-navy with 2px underline offset, `<hr>` reduced to a hairline top-only rule, hero h1 capped at 700 weight with `-0.02em` tracking so no page can shout with 60px marketing type.
- **Universal component rules** — badge radius 4px + tighter tracking; `CardTitle` `-0.01em` tracking; `CardDescription` in Wilma-muted; emerald/amber/red button variants forced to 6px radius (Wilma discipline); ghost/outline buttons pull to `--ksyk-wm-hair` and 6px so admin-panel outline buttons match marketing-page outline buttons.
- **Settings panel** — sticky header + tab bar backdrop-blur killed (in addition to the universal blur kill), Wilma-hairline bottom border, active tab now filled Wilma-navy — same treatment as the map's floor selector.
- **Emoji audit** — verified no lingering emoji-as-UI-icon in student-facing chrome. Remaining emojis: SmartSupportOwl bot persona text (chat replies, not chrome — intentional) and hidden easter-egg routes (intentional).
- **Files touched** — `client/src/pages/not-found.tsx`, `client/src/styles/wilma-mazemap.css` (+150 LOC), `client/src/lib/changelog.ts`.
- **Revert paths unchanged** — remove `setAttribute` in `main.tsx`, delete `wilma-mazemap.css` + `@import`, or `git reset --hard rollback-before-wilma-mazemap-redesign`.
- **Web version bumped** `4.7.41` → `4.7.42`. `tsc` clean.

## ✅ Just shipped (web 4.7.41 — Wilma design language, product-wide)

- **Layer widened from map surface to entire product.** `data-ksyk-theme="wilma"` now applied to `<html>` in `client/src/main.tsx`, so `client/src/styles/wilma-mazemap.css` reaches marketing pages (`/lunch`, `/hsl`, `/faq`, `/privacy`, `/support`, `/download`, `/404`), the admin panel, settings, all Radix / Vaul dialogs, sonner + react-toastify toasts, splash screen, and anything portaling to `<body>`.
- **New universal rules in the CSS layer** — `backdrop-blur-*` fully disabled app-wide; `rounded-2xl/xl/[18px]` softened to 10/6/6 px; `bg-blue-600 / text-blue-600 / border-blue-500` overridden to Wilma-navy on `button` and `a` elements; global form focus ring → 3px navy `rgba(0, 61, 130, 0.15)`; shadow scale reduced (`shadow-xl`/`2xl` → soft two-layer, `shadow-md`/`shadow` → single 1px 2px); Wilma-style admin sidebar active state; navy stat-card border override; tight uppercase 11px table headers.
- **Killed last decorative gradients in student-facing chrome** — `not-found.tsx` 404 numeral flat-Wilma-navy; `NavigationPanel.tsx` route summary tint → flat navy tint with hairline; `NavigationPanel.tsx` step-list connector line → 1px hairline; `TwoFactorAuth.tsx` card header → solid navy; `SmartSupportOwl.tsx` card header + 🦉 emoji chip → flat surface with a proper `LifeBuoy` Lucide icon (no more emoji).
- **`ErrorBoundary.tsx`** — red/orange gradient bg + sykkivä (pulsing) 1.5px accent bar + rounded-2xl shadow-2xl removed. Now: clean white/gray-950 backdrop, single hairline card, one solid 1px red accent bar, no pulse. Institutional error message, not a marketing crash screen.
- **Files touched** — `client/src/main.tsx` (`data-ksyk-theme="wilma"` on `<html>`), `client/src/styles/wilma-mazemap.css` (expanded from 260 → 480 LOC with product-wide rules), `client/src/pages/not-found.tsx`, `client/src/components/NavigationPanel.tsx`, `client/src/components/TwoFactorAuth.tsx`, `client/src/components/SmartSupportOwl.tsx`, `client/src/components/ErrorBoundary.tsx`, `client/src/lib/changelog.ts`.
- **Revert (any of three)** — (1) remove the `document.documentElement.setAttribute(...)` line in `main.tsx` — everything snaps back at runtime, no rebuild; (2) delete `wilma-mazemap.css` + the `@import` in `index.css`; (3) `git reset --hard rollback-before-wilma-mazemap-redesign` (nuclear).
- **Not changed (intentional)** — Builder (admin-only surface, already dense enough), `dev-mode.tsx` / `easter-egg.tsx` / `konami.tsx` (hidden dev routes with gradient party themes), AdminDashboard's two scroll-edge fade masks (functional, not decorative). Android app not touched — no design change there.
- **Web version bumped** `4.7.40` → `4.7.41`. `tsc` clean.

## ✅ Just shipped (web 4.7.40 — Wilma + MazeMap redesign, revertable)

- **New file `client/src/styles/wilma-mazemap.css`** — scoped design layer applied via `data-ksyk-theme="wilma"` on the `.ksykmaps-app` root. Everything the layer changes is a single attribute + file removal away from a full revert. The `@import` in `client/src/index.css` is a no-op when the attribute is absent.
- **Rollback tag** — `rollback-before-wilma-mazemap-redesign` (commit `e3a981f`) was created before this pass. `git reset --hard rollback-before-wilma-mazemap-redesign` restores every file. **Do this if the user says "revert".**
- **Header chip → institutional school top bar** — killed the floating rounded card + backdrop blur + iOS shadow. Wilma navy `#003d82` brand title, uppercase muted "Campus navigation" subtitle, Wilma-style rectangular search input (40px, hairline border, navy focus ring — no pill).
- **Map controls MazeMap-style** — unified glass pill split into distinct rectangular buttons with hairline dividers; no blur, sharp radius (6px vs 18px), navy active fill.
- **Floor selector** — basement floors now show Finnish `K1`, `K2` (kellari) prefix instead of raw negative numbers. Active floor is filled navy with a 3px inset navy-dark accent bar down the left edge, corners squared off (via `wilma-mazemap.css`).
- **Room / building info sheet** — `FeatureInfoSheet.tsx` header revamped. Killed the giant colored circular `MapPin` pin, replaced with a **Wilma-style room-code tag** (e.g. `K27` for a room, `LAB` / `GYM` / `BUILDING` for typed features). Title tighter, meta row denser. Primary CTA changed from a 32px iOS-blue pill to a 36px navy rectangle with copy `Get directions` / `Näytä reitti`. Metadata rows converted to label-above-value with tight uppercase captions and hairline dividers.
- **Search results dropdown flattened** — type chips squared off (6px), rows have 10px vertical padding + hairline dividers, filter chips are rectangular. All applied via the scoped CSS layer (no component edit needed).
- **Sheet has a 3px navy top-border accent** so users know at a glance which surface belongs to the map (MazeMap uses a similar accent).
- **Announcement banner** switches to a solid navy strip when the Wilma theme is active.
- **Global softening under `.ksykmaps-app[data-ksyk-theme="wilma"]`** — `.rounded-2xl` → 10px, `.rounded-xl` → 6px, universal `backdrop-blur-*` disabled inside the app surface. Shadow scale reduced (`.shadow-lg` → soft two-layer 2/6, `.shadow-md` → 1/2).
- **Files touched** — `client/src/styles/wilma-mazemap.css` (new), `client/src/index.css` (added `@import`), `client/src/pages/ksykmaps-home.tsx` (attribute), `client/src/components/Header.tsx` (indirect via CSS layer), `client/src/components/KSYKMapView.tsx` (floor label `K1` prefix), `client/src/components/FeatureInfoSheet.tsx` (header chip, CTA copy, InfoRow layout), `client/src/lib/changelog.ts` (bump + entry).
- **Web version bumped** `4.7.39` → `4.7.40`. `tsc` clean.
- **NOT changed** — the admin panel (already went through the Apple-redesign pass in 4.7.38 and is fine there), the Android app (no design change), the marketing / standalone pages (`/lunch`, `/hsl`, `/faq`, `/privacy`, `/support`) which are outside `.ksykmaps-app`, and the Builder.

## ✅ Just shipped (web 4.7.39 — 3D visibility + room highlight + language sync + Get-the-app toggle)

- **3D mode reworked for visibility** — wall shells removed (they were occluding rooms), all shadows off, chunky 5-unit room slabs on subtle floor plates, hairline edges, room-number pills with `depthTest: false` so they always render on top, camera auto-fits the whole campus on load. Colored roof cap now only at the top floor. `CampusThreeDView.tsx` fully rewritten.
- **Room click highlight (`FeatureHighlight.tsx`)** — Apple-Maps style: soft blue polygon fill (16% opacity) + hairline edge as the resting selection + one clean pulse ring that expands once (1.2s) then fades. No looping.
- **Privacy page (`privacy.tsx`)** — language toggle now writes to `localStorage.ksyk_language`, so the choice persists and syncs everywhere via the existing storage event listener.
- **`GetAppPopup.tsx`** — added `GET_APP_USER_ENABLED_KEY = "ksyk_get_app_enabled_v1"` per-user kill switch. If localStorage key is "0" the popup is disabled regardless of the admin flag.
- **User toggle in `CampusSettingsPanel.tsx` › Appearance** — new "Notifications" card with a switch for the "Get the app" popup, writes `ksyk_get_app_enabled_v1`.
- **`NavigationPanel.tsx` peek bar** — the whole "Tap to open navigation" row is now a button that expands the sheet (was: only the drag handle worked). Close X remains a separate button on the right.
- **`SearchResultsDropdown.tsx`** — gap between header and dropdown is now 14px on desktop, 8px on mobile (was 6px flat). No more collision with the search bar.
- **`Header.tsx` hamburger drawer** — replaced loud colored icon-square pills (blue/orange/green/purple/red) with clean monochrome lucide icons + hairline hover states, iOS-Settings-style. Removed flag emojis from language selector. Softened header shadow.
- **Floor picker (`KSYKMapView.tsx`)** — buttons bumped to 40×40 with subtle blue shadow on active, matches the map-controls pill exactly.
- **Settings sticky header** — dropped the "KSYK Maps · | Settings" editorial split; single clean title. Back button hover uses black/[0.05] instead of muted.
- **`.hover-lift` CSS utility** in `index.css` — Apple-style subtle 1px lift on hover for `hover:` capable devices, with `prefers-reduced-motion` fallback.

## ✅ Just shipped (web 4.7.38 · Android 1.99.0 — admin Apple redesign + Android polish + dead-code purge)

- **Admin panel full Apple redesign** — colored stat-card backgrounds and icon-in-pill decorations gone, hairline-bordered neutral cards throughout, monochrome icons (`text-gray-400/500` at `h-[18px]`), pastel status/priority badges replaced with outlined chips + colored dot pattern, big drop shadows removed. Files: `AdminDashboard.tsx`, `AdminAnalyticsDashboard.tsx`, `OverviewInsightsCards.tsx`, `SecuritySettingsPanel.tsx`, `AnalyticsExternalPanel.tsx`, `TicketManager.tsx`, `AppSettingsManager.tsx`, `AppLogsManager.tsx`, `AnnouncementManager.tsx`, `PostHogReplaysPanel.tsx`, `HallwayManagement.tsx`, `admin-forgot-password.tsx`, `admin-reset-password.tsx`.
- **Android Material 3 + Apple-quality pass** (8 Kotlin files):
  - `MainActivity.kt` — bottom-nav swaps to `Icons.Rounded.{Home, Map, CalendarMonth, Restaurant, Settings}` on selected tab, bar 72dp → 80dp per M3 spec, icons 22dp → 24dp, labels use `typography.labelMedium`.
  - `HomeScreen.kt` + `TimetableScreen.kt` — greeting/day headers use `typography.headlineMedium`, Finnish weekday now lowercase (`torstai`), navigate FABs 48dp with `contentDescription`, decorative shadows removed.
  - `LunchScreen.kt` — **9 emoji category icons replaced with real Material Rounded icons** (Grass, SetMeal, LunchDining, LocalFireDepartment, SoupKitchen, Bolt, Cake, LocalDining, BakeryDining, RestaurantMenu). Dish text uses `bodyLarge`.
  - `AnnouncementsScreen.kt`, `RoomFinderScreen.kt`, `AccountScreen.kt` — all cards flattened to `RoundedCornerShape(16dp)` + `surfaceContainerLow` + `elevation = 0.dp` — matches web hairline aesthetic.
  - `MapScreen.kt` — `PillButton` + `GroupedPill` (right-edge Apple-Maps controls) get 0.5dp hairline border, softer 3dp shadow, 14dp corners, 46/48dp tap targets, and localized Finnish/English `contentDescription`s for zoom, my-location, refresh.
- **Dead code purge** — deleted 11 confirmed-unused React components (no imports anywhere): `TicketSystem.tsx`, `TicketSystemNew.tsx`, `NavigationModal.tsx`, `VirtualRoomTours.tsx`, `VersionInfo.tsx`, `RoomRatingSystem.tsx`, `Room3DVisualization.tsx`, `MatterportTour.tsx`, `EnvironmentalMonitoring.tsx`, `SmartRecommendations.tsx`, `StaffDirectory.tsx`. Also removed the never-called `loadFeatureModule` helper from `client/src/utils/performance.ts`. Roughly ~4500 lines of dead code gone.
- **2FA copy** — removed emoji warning, plain amber alert.
- **Web bumped** `4.7.37` → `4.7.38`. **Android bumped** `1.98.0` (versionCode 100) → `1.99.0` (versionCode 101).

## ✅ Just shipped (web 4.7.37 — map chrome + 3D + settings + mobile pass)

- **Map controls (Apple Maps style)** — right rail collapsed into ONE unified glass pill (Directions, Zoom+/-, 3D, Recenter) with hairline dividers and a single soft shadow. Floor selector matches the same visual family. GPS + compass float as standalone chips above the pill.
- **Bottom Kahvila / WC / Portaat pill bar removed** — took up prime bottom real estate on mobile and duplicated what search already does. Also removed the associated `findNearestPOI` callback (dead code).
- **3D mode rebuilt (MazeMap-inspired)** — `CampusThreeDView.tsx` fully rewritten. Warm neutral ground (no grid), muted Apple-Maps-style room palette (cool blues/greens/purples desaturated), 42%-opacity glass building shells, cream floor plates, hairline room edges, room-number pills that fade out as the camera pulls back, subtle auto-rotate on entry that stops on first drag, segmented Overview/Walk toggle at bottom, LocateFixed reset button top-right, minimap redesigned (no dashed lines, no title footer).
- **Privacy Policy language sync** — `client/src/pages/privacy.tsx` now reads `ksyk_language` from localStorage and follows the app language. `storage` event listener keeps it in sync when the user switches language elsewhere.
- **Settings redesign** — `CampusSettingsPanel.tsx`: all cards flattened to hairline borders + no shadow, colored icon-in-pill decorations removed from card headers, About-tab colored icon rows converted to monochrome (Globe/Smartphone/School/LifeBuoy/ScrollText/ExternalLink/Code2/Sparkles), theme + language selectors use single-width borders, tab bar loses shadow-md.
- **Marketing pages / mobile UX pass** — `download.tsx`, `faq.tsx`, `support.tsx`, `privacy.tsx`, `hsl.tsx`, `lunch.tsx`, `not-found.tsx`, `Header.tsx`, `GetAppPopup.tsx`, `AnnouncementBanner.tsx`. Added `.animate-fade-in`, `.animate-fade-in-up`, `.animate-scale-in` (respecting `prefers-reduced-motion`), 44px touch targets, safe-area padding, iOS 16px input fix, Apple-blue primary CTAs, unified button heights. Header search bar reworked to Apple-Maps rounded pill.
- **Full 404 page rebuild** — big gradient 404, staggered fade-ins, primary "Go to map" + secondary "Get help", no more header/banner clutter.
- **2FA copy** — removed emoji warning, use amber alert with plain text.
- **SmartSupportOwl privacy label** — "Tietosuojaseloste" → "Privacy Policy" for English mode.
- **Version bumped** — `4.7.36` → `4.7.37`.

## ✅ Just shipped (web 4.7.36 — icon polish + CSS cleanup + copy fixes)

- **Emoji icons removed** — every emoji used as a UI element replaced with lucide-react icons: `AnnouncementManager` (Calendar, Megaphone, Clock), `ARRoomFinder` (MapPin, Compass, Building2), `CampusEventsLayer` (Star, MapPin), `FMIWeatherWidget` (Droplets), `ErrorBoundary` (CheckCircle), `SearchResultsDropdown` (text abbreviations).
- **CSS dead-code removal** — `client/src/index.css` reduced from 1692 → 839 lines. Removed: EduWilma legacy design system (~200 lines), 30+ unused animation keyframes, duplicate animation utility classes, `dark-ambient` pulsing background, a duplicate `* { transition }` rule, and Wilma Classic color overrides.
- **Server log hygiene** — 100+ `console.log` debug calls removed from `routes.ts`, `postgresStorage.ts`, `resendEmail.ts`, `emailService.ts`, `campusRoutes.ts`, `rateLimiter.ts`, `fcm.ts`, `index.ts` — these were leaking PII (emails, ticket IDs) in production logs.
- **Admin panel copy** — FCM broadcast toast copy improved to "Push sent to X device(s)"; stat cards simplified to neutral styling.
- **Copy fixes** — 404 page now sets `document.title` and CTA reads "Go to map"; iOS download label "Not yet" → "Coming later"; support success screen email confirmation conditional on email being provided.
- **PostHogReplaysPanel TS fix** — `isUnconfigured(data ?? null)` fixes pre-existing `T | undefined` vs `T | null` type error.
- **Web version bumped** — `4.7.35` → `4.7.36`.

## ✅ Just shipped (web 4.7.35 — session recording + admin URL fix)

- **Multi-map feature removed** — `useMaps` hook, `MapSwitcherButton`, builder Maps tab, and `/api/maps` CRUD routes all deleted.
- **Session replay: every visitor recorded** — removed all skip conditions from `rrwebRecorder.ts` except explicit `ksyk_no_replay=1` opt-out. The `enableSessionReplay` admin flag check and the `ksyk_admin_token` / route-based skips are gone. Every session now records and appears in Admin → Analytics → Sessions as a playable replay.
- **Admin auto-logout URL fixed** — `wipeAndRedirect()` no longer appends `?redirect=...` to the URL; always redirects cleanly to `/admin`.
- **Web version bumped** — `4.7.34` → `4.7.35`.

## ✅ Just shipped (web 4.7.34 — builder Maps tab)

- **Builder Maps tab** — new first tab in the LeftSidebar ("Maps", MapPin icon). Admins can create/edit/delete named campus maps with name, description, color, and camera position (lat, lng, zoom, bearing). "Use current view" button captures the builder's live camera. "Set active" marks the map for the public switcher. Clicking a map in the builder flies the camera to it instantly.
- **MapsManagerPanel removed from user Settings** — was in CampusSettingsPanel → Map tab; moved entirely to the Builder where it belongs.
- **Web version bumped** — `4.7.33` → `4.7.34` with changelog entry.

## ✅ Just shipped (web 4.7.33 · Android 1.98.0 — multi-map + schedule fix)

- **Multi-map capability** — admins can add/edit/delete named map views with name, center, zoom, bearing, pitch, color. Users see a map-switcher button (Layers icon) in the bottom-left of the map that flies to any saved map. `/api/maps` CRUD endpoints added (admin-write, public-read). `useMaps` hook + `MapSwitcherButton` component.
- **Class info popup centering fixed** — `sm:left-1/2 sm:-translate-x-1/2` conflicted with the slide-up animation's transform; replaced with `sm:left-0 sm:right-0 sm:mx-auto` so the card is always centered regardless of animation state.
- **Widget asetukset scroll fixed** — `TodayScheduleWidgetConfigActivity` `Column` was missing `verticalScroll(rememberScrollState())`; content now scrolls on small screens.
- **Wilma schedule auto-refresh** — new `WilmaRefreshWorker` (WorkManager, every 3 h) re-fetches the Wilma iCal URL in the background. `TimetableScreen` also refreshes on open whenever the last sync was on a previous calendar day. Old stale Wilma entries are replaced automatically; manual entries are preserved.
- **Animation polish** — bottom sheet now uses spring overshoot curve (cubic-bezier(0.34, 1.56, 0.64, 1)); global transition easing tightened from 150 ms Ease to 120 ms spring; interactive elements (buttons, tabs) respond in 100 ms.
- **Web version bumped** — `4.7.32` → `4.7.33`. **Android version bumped** — `1.97.0` (versionCode 99) → `1.98.0` (versionCode 100).

## ✅ Just shipped (web 4.7.32 · dark mode map + animations)

- **Map dark mode toggle fixed** — replaced the remove+re-add tile source approach with `setPaintProperty` calls. The filter (brightness/saturation/contrast) now applies instantly via MapLibre paint interpolation; no tile re-fetch, no flicker.
- **Smooth background transition** — map container fades `background-color` over 400 ms when theme changes; eliminates the brief white flash on slower devices.
- **FeatureInfoSheet entrance animation** — room/building info cards now slide up from the bottom on mobile (slideUp 240 ms) and fade up on desktop (fadeInUp 240 ms) via the `.map-room-sheet` CSS class.
- **MapLibre dark mode controls** — attribution panel and scale bar now render dark in dark mode; previously stayed white and clashed with the dark map.
- **Web version bumped** — `4.7.31` → `4.7.32` with changelog entry.

## ✅ Just shipped (Android 1.97.0 + web 4.7.31)

- **AnimatedContent screen transitions** — tab switching in `AppShell` (MainActivity.kt) now uses `AnimatedContent` with directional slide + fade. Tapping a tab further right slides content in from the right (1/4 parallax on outgoing screen). Tapping back slides left. Opening any sub-screen (Room Finder, Announcements, Wilma Connect, Changelog, etc.) slides in from the right like a native push; Back pops it back to the left. `slideInHorizontally + fadeIn togetherWith slideOutHorizontally + fadeOut` — compositor-layer, no layout pass.
- **AnimatedVisibility loading & offline banners** — loading progress indicator and the offline/no-connection banner in `HomeScreen.kt` now fade + expand into view (`fadeIn + expandVertically`) instead of snapping in/out of the list.
- **Animated lesson progress bar** — the "Now" card progress bar in `LessonStatusCard` uses `animateFloatAsState(tween(800, FastOutSlowInEasing))` to ease from 0 → current position on load instead of jumping to the value immediately.
- **ShortcutTile press-scale** — the four quick-action tiles (Map, Timetable, Lunch, News) scale down to 92% on press and spring back (`animateFloatAsState(tween(120))`) — matches iOS and Material You spring physics.
- **Android version bumped** — `1.96.0` (versionCode 98) → `1.97.0` (versionCode 99).
- **Web version bumped** — `4.7.30` → `4.7.31` with changelog entry.

## ✅ Just shipped (web 4.7.30 · FAQ + motion)

- FAQ page standalone redesign, animated accordion (CSS grid trick), APK warning FAQ removed, motion system (`.page-enter` fadeInUp + `prefers-reduced-motion` support).

## ✅ Just shipped (web 4.7.29 · commit 5673f62)

- **SplashScreen dark mode flash fixed** — `SplashScreen` now reads `window.matchMedia('(prefers-color-scheme: dark)')` synchronously at init. Dark-mode users see `#030712` background (matching the `#preboot` spinner) instead of a white flash. Spinner track also adapts via a `@media` CSS block. `isDark` computed in `useState` initializer so it runs once and never flickers.
- **Support page redesigned** — removed `<Header />` and `<AnnouncementBanner />` from both the form and success views. Replaced with a minimal `<header>` containing a back-to-map link, matching the FAQ/download standalone page style. `Link + ArrowLeft` imported from wouter/lucide respectively.
- **New `/privacy` page** — honest bilingual (Finnish + English) privacy policy. Covers: PostHog analytics, support ticket data, HttpOnly admin session cookie, localStorage preferences. Lazy-loaded, route added to App.tsx. Language toggle matches FAQ pattern.
- **FAQ: removed internal TODO question** — "Missä TODO tai kehityssuunnitelma on?" entry removed from QUESTIONS array. Was exposing development internals to end-users.
- **CampusChangelog: Firebase release-notes panel removed** — the `useQuery`-driven amber panel that fetched `/api/announcements` and labeled them "Release notes (Firebase)" showed implementation details in the user-facing settings. Removed. `useQuery` import also dropped.
- **Privacy Policy links added** — FAQ, download, and support pages now have "Privacy Policy" links in their footer sections pointing to `/privacy`.
- **README badges updated** — `4.6.7 → 4.7.29` (web) and `1.82.0 → 1.93.0` (Android).
- TypeScript `tsc` clean.

## ✅ Just shipped (web 4.7.28 · pending push)

**Production-readiness audit pass 3 — design consistency + stale data fixes**

- **`forgot-password.tsx` rewrite** — removed old `bg-gradient-to-br from-[#003d82]` design, dot-grid pattern background, "Nordbyte Studio" copyright, and gradient buttons. Replaced with clean flat `bg-gray-50 dark:bg-gray-950` page, bordered card matching the `admin-forgot-password` design language, solid `bg-blue-600` button, proper dark mode via `useDarkMode`.
- **`reset-password.tsx` rewrite** — same treatment. Removed gradient design. Clean card, password toggle buttons (`Eye/EyeOff`), `autoComplete="new-password"` on both fields, Finnish copy preserved.
- **Android version stale in About tab** — `CampusSettingsPanel` About tab showed `v1.55.0` for Android version. Introduced `ANDROID_APP_VERSION` constant in `changelog.ts` and used it in both `CampusSettingsPanel` and `download.tsx` so there's one source of truth.
- **FAQ page rewrite** — replaced bare `<header>` with proper floating chip `Header` + `AnnouncementBanner`. Dark mode via `useDarkMode`. Language toggle now shows full words ("In English" / "Suomeksi") instead of opaque codes.
- **not-found.tsx** — added missing `AnnouncementBanner` component.
- **Header admin mode buttons** — replaced emoji buttons (`🍽️`) and colored card-style variants with the same clean icon-button pattern used in normal mode.
- **CookieConsent rewrite** — removed gradient buttons, uncontrolled DOM checkbox (React anti-pattern), no dark mode. Replaced with controlled `useState(analyticsEnabled)` toggle, solid `bg-blue-600`, dark mode variants throughout.
- **HSL page title** — `"Ksyk HSL Näyttö"` → `"HSL — KSYK Maps"` (consistent capitalization + format).
- **LoadingSpinner stage text** — `"Preparing wings…" / "Valmistellaan siipiä…"` → `"Fetching rooms…" / "Haetaan huoneita…"` (sensible messages).
- TypeScript `tsc` clean · Vite build clean.

## 🚧 In progress (session 2 deep pass — not yet pushed)

- **SplashScreen white background**: reverted session-1 dark-mode adaptive background — user requirement. Removed `isDark` matchMedia state. `background` hard-coded to `"#ffffff"` always. `BootSpinner` simplified back to zero props. All adaptive colors removed. First visible frame is white, no flash.
- **SplashScreen progress bar stall fix**: the `useMemo` only recalculated when explicit deps changed — bar froze at ~80% waiting for `ksyk:map-ready` event. Fix: added 200ms `tick` state (setInterval) as a memo dep so the time-based fill animates continuously. Progress formula changed from linear `timeFloor = elapsed/8s` to exponential fill `signalProgress + remaining*(1 - e^(-elapsed/9.6s))` — bar always moves, never stalls, snaps to 100% when `ready` is true.
- **LoadingSpinner progress fix**: `Math.min(90, p + (90-p)*0.08)` asymptotic approach froze near 90% with sub-1% increments. Replaced with `Math.max(0.15, (97-p)*0.06)` floor — always at least 0.15% per tick, cap at 97% so bar never hits 100% until real completion.
- **Session replay audit**: verified rrweb (`maskAllInputs: true`, `maskTextClass: "ksyk-mask"`) and PostHog (`maskAllInputs: true`, `maskTextSelector: "[data-sensitive]"`) both properly mask inputs. Wilma iCalendar URL is always in a masked input field — never leaked in either replay system. PostHog deep-link in `SessionDrillDialog` is real (authenticated URL to posthog.com, filtered by `ksyk_session_id`). rrweb-player in `RrwebPlayerModal` is real (plays actual DOM snapshots).
- **Android APK builds**: both completed successfully.
  - Debug: `android/app/build/outputs/apk/debug/ksykmaps-debug-1.92.0-debug.apk` (67 MB)
  - Release (signed with `ksyk-release.jks`): `android/app/build/outputs/apk/release/ksykmaps-release-1.92.0.apk` (60 MB)
- **TypeScript check**: zero errors (`npm run check` → exit 0).

## ✅ Just shipped (web 4.7.25 · pending push)

- **Session replay auto-migration.** Endpoint POST `/api/sessions/rrweb` now creates the `rrweb_batches` table on first write if it doesn't exist — no manual `psql` step required. If the initial `INSERT` fails with `relation does not exist`, the server runs `CREATE TABLE IF NOT EXISTS` + the two indexes in-band and retries once. Fresh deploys record from batch #1.
- **`/api/sessions/rrweb/status` diagnostic endpoint** returns `{ tableExists, recordingEnabled, batchesLast24h, batchesTotal, lastBatchAt, migrationHint }`. Sessions tab shows an amber banner explaining exactly why no videos appear — table missing / recording toggled off / no traffic yet — with the migration hint inline.
- **home.tsx map controls polish**: floor indicator `w-16 h-16 md:w-20 md:h-20 font-black text-3xl shadow-lg` → `w-14 h-14 md:w-16 md:h-16 font-bold shadow-sm`. Zoom/reset FABs: dropped `shadow-xl + backdrop-blur-md + border-2 + bg-white/95` glass-panel maximalism → `shadow-md + border + bg-white`. `active:scale-90 → 95` (90 looked broken).

## ✅ Shipped (web 4.7.24 · pushed 4ad372b)

- **Full UX/UI quality pass — web + Android (apple-design audit pass 2)**
  - **LoadingSpinner freeze fix (root cause)**: `SpinningRing` extracted into `React.memo` component (`SpinRing`). The 320ms `setInterval` no longer causes React to reconcile the spinner arc div → CSS animation stays on the GPU compositor thread uninterrupted. Removed `Math.random()` jitter from progress formula. Transition corrected to `transition-[width] duration-500`.
  - **SplashScreen dark mode**: hardcoded `background: "#ffffff"` replaced with `isDark ? "#0f172a" : "#ffffff"` computed synchronously from `matchMedia`. All text/track colours adapt. `BootSpinner` receives `dark` prop so track ring matches the dark background.
  - **WilmaScheduleCard navigate button**: removed `opacity-0 group-hover:opacity-100` — navigate-to-room button was invisible on all touch devices. Now always-visible with `p-1.5 rounded-lg hover:bg + active:scale-95`.
  - **Android LoadingScreen**: removed `private val SplashBlue = Color(0xFF2563EB)` hardcode; replaced with `MaterialTheme.colorScheme.primary` + `outlineVariant` for the track. Adapts to Material You dynamic colors on Android 12+.
  - **Android LoginScreen**: banner and sign-in button now use `MaterialTheme.colorScheme.primary` / `onPrimary`. Hardcoded `Color(0xFF2563EB)` removed from both.
  - **Android MapScreen**: added `AnimatedVisibility` live-data refresh chip (CircularProgressIndicator + "Päivitetään…") while `dataFetching` is true. Fades in/out.
  - **Android HomeScreen**: `DisposableEffect(Unit)` was only firing once (bug — Unit key prevents repeats). Replaced with `LifecycleEventObserver` on `ON_RESUME` that re-reads both `homeLayout` and refreshes `greetingTime`. Fixes stale greetings after background sessions and picks up settings changes without a restart.
- TypeScript `tsc` clean · Vite build clean.

## ✅ Just shipped (web 4.7.23 · pending push)

- **Apple-design audit — UI/UX overhaul pass 1** (admin panel + schedule card + Wilma setup):
  - `AppLogsManager`: added `debug` and `fatal` log levels with proper color tokens; new filter pills; `normalizeLevel` handles `critical`/`crit` → `fatal` mapping.
  - `AdminDashboard`: NAV_GROUPS restructured — Overview / Analytics / Map / Content / Users / System for logical IA.
  - `AdminAnalyticsDashboard`: stat grid split into "Product Analytics" and "Technical Health" labeled sections; detail tabs grouped into Usage row + Health row.
  - `WilmaScheduleCard`: fully converted from hardcoded dark slate to responsive `light/dark:` variants — card, rows, buttons, icons, footer all adapt.
  - `WilmaConnectPanel`: same dark→responsive pass — instructions card, URL input, button states, help text.
- TypeScript `tsc` clean · Vite build clean.

## ✅ Just shipped (web 4.7.23 · pending push)

- **Grant link recovery for pre-4.7.22 broken tokens.** The 4.7.22 fix stopped NEW tokens from getting overwritten, but the DB still had a pile of `approved` rows with `grantToken: null` from before. Now PATCH re-mints whenever approve hits a null-token row — admins can just click Approve again to send a fresh magic link, and the client `redeemedAt` stamp is reset so the new link is single-use again. `/grant/:token` invalid state shows a real "Request access again" CTA back to the request form.
- **rrweb player inline in Sessions tab.** RrwebSessionsCard removed from above the tabs; the Sessions sub-tab now shows all telemetry sessions with a blue **Play** button on any row that has a recorded replay. Uses one shared `/api/sessions/rrweb?range=` fetch, intersects via Set of session IDs, opens the lazy-loaded rrweb-player modal on click. Header now shows `X sessions · Y with replay`.
- **Sentry tunnel 403 fix**: parse envelope header, extract `{host}/{projectId}` from the DSN, forward dynamically instead of hardcoding a stale project ID. Works with any DSN rotation.
- **SplashScreen dark-mode** — BootSpinner accepts `dark` prop; splash matches system theme instead of hardcoded white.

## ✅ Just shipped (web 4.7.22 · pushed 887d7f8)

- **Grant-token overwrite bug fixed.** Admin approving an access request minted a one-shot grant token server-side, but the panel's auto-save then PUT the whole securitySettings blob back with the client-side accessRequests (which didn't have the token) — silently nuking it. Result: user clicked the email link, got "Link no longer valid" immediately. Fix in `SecuritySettingsPanel.tsx#onApprove`: refetch server state after PATCH and merge before saving. Also had to update `loadSecurityFromServer` to return the fetched settings (was `Promise<void>`).
- **`/api/sessions/rrweb` soft-fail** — 500 → 202 when the `rrweb_batches` table isn't migrated in prod, so the client recorder doesn't retry-storm every batch. Server logs the missing migration once so ops knows how to enable session replay.
- **Map `destroy()` crash on Sheet close** — `TypeError: Cannot read properties of undefined (reading 'destroy')` at MapLibre teardown was firing when a Radix Sheet unmounted a map instance after the 6s recovery watchdog had already removed it. Fix: clear the watchdog in the cleanup effect + wrap `map.remove()` in try/catch.
- **Keystore script auto-detects Android Studio's bundled JDK.** No more "keytool not found" if you have Android Studio installed. Searches `%LOCALAPPDATA%\Programs\Android Studio\jbr\bin`, `%ProgramFiles%\Android\Android Studio\jbr\bin`, older `jre\bin` layout, and `%JAVA_HOME%\bin` before erroring.
- **Mobile / a11y / AI-slop batch** — mobile burger `p-2.5 → p-3` + focus-visible ring (44×44 tap target), drag handle `aria-hidden`, AnnouncementBanner counter `role="status"` + descriptive aria-label, `👆✌️` big emoji → Lucide `Smartphone`, settings-panel card titles stripped of `🎫 📝 ℹ️ 📋`, nav-panel `text-[10px] → text-xs` for mobile legibility.
- **Support-page TYPE_META unification** — four competing tint colors (red/amber/blue/emerald) collapsed to single blue accent; semantic hint stays on the icon. Added `aria-pressed` + focus-visible ring.

_Note: Header lunch/HSL clickable divs from prior audit turned out to already be inside `<Link>` (wouter renders `<a>`), so keyboard-accessible via the wrapping anchor — no extra `tabIndex/onKeyDown` needed._

## ✅ Shipped (web 4.7.20 · pushed 3a0d760)

- **Admin login redesigned.** Killed the AI-slop: full-page `bg-gradient-to-br`, 3× `animate-pulse blur-3xl` blob divs, glassmorphism card, gradient `bg-clip-text` title, gradient buttons, iridescent shadows, decorative "Admin Portal" badge. Replaced with a quiet centered form on plain `bg-gray-50 dark:bg-black`, standard bordered card, solid blue button — matches Apple's own sign-in surfaces. Same treatment for 2FA + Change-password screens.
- **Keystore instruction fix**: `.\\make-production-keystore.ps1` fails in Bash because Bash can't execute `.ps1`. Added `powershell -ExecutionPolicy Bypass -File .\\android\\make-production-keystore.ps1` as shell-agnostic one-liner in BUILD.md.
- **Motion tuned**: entry animations 0.3s → 0.18s, ease → easeOut, scale removed. Every button gets an explicit `focus-visible` ring.

## ✅ Shipped (web 4.7.19 · pushed a968254)

- **Load older logs button** — App-events tab now consumes v4.7.18 `nextCursor`. Stack-based pagination: first page auto-loads (100 rows), 'Load older' appends via `?cursor=<lastCreatedAt>`, disappears when `hasMore=false`. Cursor stack resets on the 30s auto-refetch.
- **Production keystore generator** — `android/make-production-keystore.ps1` — one-shot foolproof flow. Prompts for passwords (twice), runs `keytool -genkeypair` (4096 bit, 68-year validity), prints SHA-1/SHA-256 fingerprints for Play Console, prints exact `$env:` lines for the next build, prints backup checklist. Written for someone who's never touched `keytool` before.
- **Zero TypeScript errors** — cleaned the stale `@ts-expect-error` in `server/rateLimiter.ts` (was tripping tsc every run for 6+ rounds).
- **Dead code purge** — deleted `EnhancedScheduleBuilder.tsx` and `EnhancedSubstituteSystem.tsx` (never imported).

## ⏳ Genuinely open work

- **Real device mobile testing** — narrow-viewport interactions need real device time from you.

## ❌ Blocked on you

- **Production keystore** — need to run `android\make-production-keystore.ps1` and store the file + passwords somewhere permanent.

## ✅ Shipped (web 4.7.16 · pushed 2dffe1c)

- **Sub-panel card-hell removed** — Features / Errors / Performance / Recent panels dropped their outer bordered-card wrappers. Content flows directly under the tab strip. Row counts moved to a compact toolbar.
- **`<ErrorRetry>` wired into every sub-panel fetch** — Features, Errors, Performance, Sessions, RecentEvents. Any failed fetch now shows the honest banner + Try-again instead of silently zero.
- **Empty states standardized** across sub-panels: title (factual, short) + hint (one sentence, actionable). No emoji, no version refs, no hype.
- **Focus rings + `aria-expanded`** on expandable error rows and CSV buttons. Same focus-visible pattern everywhere in the dashboard.

## ✅ Shipped (web 4.7.15 · pushed bf02107)

- **Boot-splash spinner freeze — real fix.** Two layers:
  1. Inline `#preboot` HTML spinner rendered by the parser before JS parses; pure CSS conic-gradient + mask on a `contain: layout paint` compositor layer. MutationObserver kills it seamlessly once React inserts into `#root`.
  2. React's `SplashScreen` spinner extracted to a memo'd `BootSpinner` component with no props; `contain: layout paint` isolates it, so query state ticks never reconcile the animated subtree.
- **New `<ErrorRetry>` component** — standard error banner for admin fetches. Honest copy ("Couldn't load X"), `role="alert"` + `aria-live="polite"` for screen readers, real `refetch()`-backed retry button. Compact + full variants. Wired into the analytics overview query; panel-by-panel wiring next round.
- **`aria-live="polite"` on every loading paragraph** in admin analytics so screen readers announce state changes.
- **Toast copy audit** — no "Success!" / "Something happened" / other robotic language found; existing copy is already factual ("Changes saved", "Reset scheduled", etc).

## ✅ Shipped (web 4.7.14 · pushed a6e80b1)

- **Access magic-link approval flow.** Admin approves → server mints one-shot token → email link `/grant/:token` → landing page stamps `localStorage.ksyk_access_granted=1` → `useAccessDecision` shortcuts to full access. Single-use, idempotent, honest error states.
- **Fixed the 401 bug** — approve/deny/clear on access requests now attach `getAdminHeaders()`.
- **Fixed boot-splash spinner freeze** — `decoding=\"async\"` on the logo, GPU-composited `.ksyk-spinner` with `will-change: transform`, honours `prefers-reduced-motion`.
- **Admin redesign pass 2** (Log explorer): killed 4 colored stat cards, replaced with quiet inline `StatInline` row. Log page went from card grid + big colored icons to a proper information-dense header.
- **Admin redesign pass 3** (Login redirect + open-redirect guard): AdminDashboard session-expiry preserves current path as `?redirect=…`; `admin-login.tsx` validates via `resolveRedirect()` — rejects absolute URLs, protocol-relative `//`, non-http schemes, cross-origin. Falls back to canonical admin base if the param is missing or fails validation.

## ✅ Shipped (web 4.7.13 · pushed d26fdea)

**Admin redesign — pass 1 of ~5.** Following the full rework spec, this pass covers:

- **Analytics header** rebuilt per HIG: Live/refresh/timestamp meta row with pulsing green dot, tighter 17px semibold h2, translucent `bg-white/85 backdrop-blur-md` sticky backdrop, hierarchical color usage (`slate-900/dark:white` for values, `slate-500/400` for meta).
- **StatCard** apple-design pass: rounded-xl instead of shadow-heavy cards, 26px semibold value with `tabular-nums` + `tracking-tight`, sparkline strip dedicated space below (no more overlap of numbers), quieter uppercase label with 0.12em tracking.
- **RangePicker** rebuilt as proper segmented control: 0.5px gap inner spacing, active state uses subtle shadow on white/slate-800 fill, hover on inactive tabs, focus rings, `role="tablist"` + `aria-selected` for a11y.
- **Sub-tabs got a 'Details' section header** so the strip isn't floating between cards.
- **Audit log promoted** out of a floating Card into its own section with matching Details-style header.

**Empty-state audit — 8 rewrites.** Killed AI-slop copy across analytics cards. Before/after examples:
- ~~"No route telemetry yet. `route_computed` fires from the navigation panel every time a graph route resolves for a unique from→to pair (v4.7.11+)."~~ → "No routes computed / Every time a student computes a route on the map, it lands here."
- ~~"No performance samples yet. Web Vitals populate this after real page loads."~~ → "No performance samples in this range."
- ~~"No firehose events yet. Every non-dedicated event type lands here."~~ → "No events recorded in this range."
- ~~"No audit rows yet."~~ → "No admin actions logged in the last 7 days."

All loading states properly gate empty states via `!isLoading && data.length === 0` so nothing flickers.

**Settings → Features tab (new).** New tab in `AppSettingsManager` with 6 admin toggles: session replay recording, campus events layer, panorama spots, admin heatmap card, announcement banner, footer credits. Custom `FeatureRow` component with icon+title+subtitle+switch layout. `enableSessionReplay` respected by rrweb recorder — checks `/api/settings` on start, caches in sessionStorage, fail-open on network error so we don't silently drop analytics from a transient outage.

## ✅ Shipped (web 4.7.12 · pushed c4d0490)

- **rrweb DOM session replay foundation.** Recorder in `client/src/lib/rrwebRecorder.ts` — records public routes only (skips admin/builder/opt-outs/DNT), batches every 5s or 300 events, uses `sendBeacon` where available. New `rrweb_batches` schema + migration `0003_rrweb_batches.sql`. Server: `POST /api/sessions/rrweb` (upload), `GET /api/sessions/rrweb` (admin list with counts), `GET /api/sessions/rrweb/:id` (concatenated events). New `RrwebSessionsCard` in admin analytics with per-session Play button that lazy-loads `rrweb-player` in a fullscreen modal. Escape closes.
- **`/download` and `/app` routes** with signed Android APK direct install (`public/releases/ksykmaps-release-1.91.0.apk`), iOS honestly marked coming-later, telemetry (`download_page_view`, `download_apk_click`). `GetAppPopup` now defaults its href to relative `/download` instead of a hardcoded domain.
- **One-click access-request approval** — new `PATCH /api/security-settings/access-requests/:id` (also DELETE for bulk-clear). Admin `SecuritySettingsPanel` `onApprove`/`onDeny` now hit the endpoint directly and auto-`saveSecurityToServer` so admins never need to press Save. Approval side-effects (email, add user exception) fire in one action.
- **Access-restricted page button polish** — request submit + Microsoft sign-in get real hover/focus/active states (shadow lift, focus ring, press translate). Success state redesigned as a proper emerald card with icon instead of a plain green line.
- **Missing telemetry wired** — `search_performed` fires from the header search debounce for any query ≥2 chars. `navigation_opened` fires when the map's directions panel opens. Both feed the Analytics dashboard's Searches / Navigations tiles.
- **Search + Nav telemetry now visible in Admin → Analytics** — Searches / Navigations tiles will stop showing 0 as students start using v4.7.12.

## ✅ Shipped (Android v1.91.0 · web 4.7.11 · pushed 3388107)

- **Route popularity top-20** — client `NavigationPanel` fires `route_computed` telemetry once per unique from→to endpoint pair per session when a graph route resolves. Metadata carries `fromId`, `toId`, `fromLabel`, `toLabel`, `distanceMeters`, `floors`, `accessibleOnly`. `/api/analytics/route-popularity` groups by from+to, computes AVG distance, returns top-20. New `RoutePopularityCard` in admin analytics with ranked list, violet proportional bars, average-distance display, CSV export.
- **Material You dynamic-color widgets (Android 12+)** — new `drawable-v31/` versions of `widget_background`, `widget_background_active`, `widget_row_current` using `@android:color/system_accent1_800/700/900`, `system_accent2_600/500/700`, `system_neutral1_200`. Res qualifier applies automatically on Android 12+; older versions keep the shipped navy gradient. No opt-in switch.
- **Admin URL routing** — the Analytics & Logs pill (Analytics / Live logs / Errors / Feedback / External) now persists in `window.location.hash`. Reload lands on the same pill, share links deep-link. `hashchange` listener wires browser back/forward.
- **Range picker sanity** (from last round follow-through) — italic hint in analytics header, sessions/recent endpoints honor range, "Web · Android" tile fixed.

## ✅ Shipped (web 4.7.10 · pushed 36044fe)

- **Removed 🔥 heatmap toggle from public map** — `KSYKMapView` no longer imports/renders `heatmapOn` state, the useEffect layer, or the toggle button. Same data now shows in `AdminAnalyticsDashboard` as a `RoomPopularityCard` (top-10 horizontal-bar list with CSV export). Reuses the existing `/api/analytics/room-popularity` endpoint.
- **Announcement CTR** — new `/api/analytics/announcement-ctr` endpoint aggregates `feature_usage` `announcement_view` vs `announcement_click` rows grouped by `metadata.announcementId`, joins to `announcements` for titles. Returns rows sorted by CTR%. New `AnnouncementCtrCard` in the admin dashboard with color-coded CTR% (green ≥30%, amber ≥10%, grey below) and overall CTR summary. Client `AnnouncementBanner` now fires `announcement_view` once per id shown + `announcement_click` when the banner is tapped.
- **Range picker fixes** — `SessionsPanel` and `RecentEventsPanel` now take a `range` prop and pass it to their endpoints. Server-side, `/api/admin/analytics/sessions` and `.../recent-events` both read `range=` and compute `since` from it (24h / 7d / 30d / 90d).
- **UX clarity** — new italic hint in the sticky Analytics header: "Range affects every card except Eggs (lifetime) & the audit log (7d)". `Web / Android` tile renamed to `Web · Android` since it was misread as a fraction.

## ✅ Shipped (Android v1.90.0 · web 4.7.9 · pushed 956175c)

- **Campus events on the map** — new `/api/events/map` endpoint returns future active events with resolved lat/lng (roomId polygon centroid, or `lat,lng` regex fallback on the `location` field). New `CampusEventsLayer` component renders as amber ★ pins on `KSYKMapView` with a glow halo; click opens a floating popover with title, start/end time, location, and description. Auto-refreshes every 60s.
- **Post-Wilma-setup walkthrough (Android)** — new `PostSetupWalkthrough` composable, 3 pages via `HorizontalPager` (Home · Timetable · Widgets). `WilmaConnectScreen.onImported` calls `schedulePostSetupWalkthrough(ctx)`; `AppShell` checks `isPostSetupWalkthroughPending(ctx)` on next composition and shows the tour full-screen. `markPostSetupWalkthroughSeen` on dismiss so it never nags again. All state in `SharedPreferences("ksyk_walkthrough")`.
- **FCM verification report** — new `FCM-STATUS.md` at repo root documenting architecture, env-vars, historical bug fixes with commit refs, common failure modes with diagnosis + fix table, and deliberate non-goals (iOS, topics, delivery receipts, rich notifications).
- Kotlin compile clean, TypeScript clean.

## ✅ Shipped (Android v1.89.0 · web 4.7.8 · pushed 41e8198)

- **Home tab section reorder (Android)** — new `HomeSectionsScreen` reached from Settings → Appearance → Customize home. Long-press the drag handle on the right side of any row and drag up/down. Each section (6 of them: Quick actions · Now/next lesson · Rest of day · Tomorrow preview · Campus stats · Announcements) can also be hidden via a Switch. Persisted in `SharedPreferences("ksyk_home_layout")` as a CSV of `section_id:visible` pairs. `HomeScreen` iterates `HomeSectionPrefs.load(ctx).sections.forEach` so the same handlers all still work — just in user-chosen order.
- **Retention chart in admin analytics** — new `RetentionChart` card below the timeseries. Line chart of D0→D30 cohort retention over the last 60 days. `/api/analytics/retention` cohort SQL uses `COALESCE(user_id, anonymous_id, session_id)` so anonymous students still track. D1 / D7 / D30 quick-look numbers in the card header.
- Kotlin compile clean; TypeScript clean.

## ✅ Shipped (Android v1.88.0 · web 4.7.7 · pushed 1f62dcb)

- **Widget long-press config actually does something now.** The TodayScheduleWidget config activity had 3 toggles (Hide Past / Auto Roll / Show Chip) that never took effect because the widget's `updateWidget()` never read them. Fixed: every render honors all three per widget-id. Added a **fourth pref — Default Day** picker (`-1 = Yesterday · 0 = Today · 1 = Tomorrow · 2 · 3`) so users can pin a widget to a specific day.
- **Session replay scrubber upgraded** in `AdminAnalyticsDashboard.tsx`:
  - **Kind filter chips** (Errors · Search · Pageviews · Nav · Other) with per-kind counts. Click to hide/show.
  - **Playback speed selector** (0.5× · 1× · 2× · 4×) — big time-saver on long sessions.
  - **Loop toggle** for repeated review.
  - **Real mm:ss / total elapsed display** replacing "+Ns from start".
  - **Keyboard shortcuts**: `Space` play/pause · `←/→` step · `L` loop.
  - Event list opens by default with a max-height scroller instead of a giant page-height list, and rows now show `+elapsed` offset from session start instead of wall-clock time.

## ✅ Shipped (web 4.7.6 · pushed 7304c37)

- **Admin Analytics & Logs cleanup — the primary ask.**
  - `AppLogsManager` (Logs pill) had **7 tabs**: All Logs, Live Events, Logins, App Events, Analytics, Insights, Easter Eggs. The last three all had aggregate views that ALSO existed in `AdminAnalyticsDashboard`. Trimmed to **4 tabs** — raw log streams only.
  - Top stat cards in Logs went from **5 → 4** — dropped Total Visitors, Total Searches, Page Views (those live in Analytics tab). Kept Total Logs / Live Events / Logins / App Events.
  - Reorganized pill nav in `InsightsPanel` — clearer order (Analytics → Live logs → Errors → Feedback → External), each pill has a hint tooltip, header subtitle updates to match the active pill.
  - Removed 3 redundant `/api/telemetry/*` fetches that only fed the deleted duplicate cards.
  - Renamed the Logs card title from "Application Logs" → "Live log stream" with an explanatory sub-text pointing admins to the Analytics pill for aggregate views.

## ✅ Shipped (Android v1.87.0 · web 4.7.5 · pushed fa8022d)

- **Fixed duplicate 360° icon on the public map.** `installPOIs` and `installPoiPillars` now skip `kind='panorama'` so only the dedicated fuchsia layer shows. Was rendering the panorama TWICE — once as a grey POI chip and once as the fuchsia 360° badge stacked on top.
- **Popular-rooms heatmap (admin-only)** — 🔥 toggle in the bottom-right button stack, visible only when `ksyk_admin_token` is present. New `/api/analytics/room-popularity` aggregates last-30-day `room_view` events grouped by `metadata.roomId`, joins to `rooms.points` centroid, returns `{ roomId, count, lat, lng }`. Rendered as a MapLibre heatmap layer with green→yellow→orange→red gradient.
- **Updated `room_view` telemetry** — every call site now passes `roomId + roomNumber` in metadata so the heatmap has real data going forward.
- **Widget scaling for stretched sizes.** New XXL bucket (>1400dp) on all three widgets. NextLesson/CurrentLesson subject text up to 84sp; TodaySchedule subject up to 56sp.
- **WAY bigger day-navigation buttons in TodaySchedule** — 72×60dp (was 56×48) with 42sp arrows (was 34sp).

## ✅ Shipped (Android v1.86.0 · web 4.7.4 · pushed 84682f9)

- **Panorama viewer — Polycam support.** `poly.cam` / `polycam.ai` share URLs auto-rewrite to `/embed` form; kuula.co gets `?fs=1`; direct `.jpg` panoramas render via pannellum (lazy-loaded from CDN) for proper spherical projection with mouse/touch/gyro. Recognizes roundme, momento360, panoraven, 360cities, Google Street View.
- **PanoramaViewer extracted to `client/src/components/PanoramaViewer.tsx`** so both the Builder AND the public map use the same viewer + URL classifier.
- **`usePanoramaViewer` hook + `ksyk:panorama:open` window event** — CampusOverlay dispatches; KSYKMapView listens. Clean pub/sub, no prop drilling.
- **Panorama markers on the public map** — new fuchsia glow + white ring + "360°" label rendered above every other POI layer. Same styling as the Builder now.
- **Better Builder markers** — soft outer glow halo, 3px white ring, tighter letterspacing on the "360°" label.
- **"Import Floor Plan" button in TopToolbar** — no longer hidden in the command palette. If a building is selected before importing, every SVG shape becomes a *room* in that building on the current floor (Polycam workflow); otherwise shapes still land as buildings.
- **SvgImportDialog copy updated** — mentions Polycam explicitly, explains the room-vs-building selection behavior.
- **Server contract unchanged** — panoramas still ride on `campus_pois` with `kind="panorama"`, URL in `metadata.url`; no new tables.

## ✅ Shipped (Android v1.85.0 · web 4.7.3 · pushed b7d327b)

- **Builder — Measure tool HUD** (M key). Floating right-side panel with per-segment lengths + total. Copy button exports "12.3 m + 4.5 m = 16.8 m" to clipboard. Clear button (or Esc) resets waypoints; tool stays active so you can chain measurements.
- **Builder — Midpoint snapping** for doors, POIs, and every tool that used `computeSmartSnap`. New `snapPointToNearestMidpoint()` — snaps to the halfway point of the nearest wall segment or room/building edge, sitting between "existing point" and "wall segment" in the precedence chain. Amber indicator distinguishes midpoint snaps from vertex/wall snaps.
- **Builder — 360° panorama spots**. New tool in the POI palette under a new "Immersive" group; hotkey `3`. Places a `campus_pois` row with `kind = "panorama"` and a URL in metadata. Fullscreen viewer detects hosted panorama URLs (kuula, roundme, momento360, panoraven, 360cities) and embeds as iframe; direct JPG/PNG URLs get a drag-to-look-around pan/tilt viewer. Panorama markers render as fuchsia circles with "360°" label on the Builder map.
- **Server** — `/api/pois/:id` PATCH / PUT endpoint (via new `updatePoi()` in kvStorage) so panorama metadata is editable after placement.

## ✅ Shipped (Android v1.84.0 · web 4.7.2 · pushed 7d8dd78)

- **ScheduleEngine — root fix for the "Nyt meneillään" wrong-lesson bug.**
  - New pure-function `fi.ksykmaps.schedule.ScheduleEngine` (no Android deps, unit-testable).
  - Materializes weekly-recurring `ScheduleEntry` + `Jakso` date ranges into concrete-dated `TimedLesson` objects backed by `LocalDateTime`.
  - Every widget + the reminder alarm scheduler now goes through this single source of truth. No more inline HH:mm math drifting between consumers.
  - Migrated: `NextLessonWidget` (materialize 14-day window + `nextLesson()`), `CurrentLessonWidget` (`currentLesson()` + `Duration.between` progress bar), `TodayScheduleWidget` (`classifyForDate` PAST/CURRENT/FUTURE + `nextSchoolDayWithLessons` auto-roll), `LessonReminderScheduler` (materialize + first-lesson-with-lead-time-in-future).
  - `ScheduleStore.saveEntries()` now also persists `jaksot_json` to widget SharedPreferences so widgets can filter by jakso date ranges synchronously.
  - `LessonReminderReceiver` drops its manual `activeJaksoId` filter — engine handles it natively.

## ✅ Shipped (web 4.7.1 · pushed fdb8ca4)

- **Smart guides on Builder canvas** — the one from the "deferred" list.
  - Snap POI / door / entrance / stair / elevator / nav-node placement to nearest existing point (2.5m), wall segment (doors, 3m), or polygon vertex (2.5m). Precedence: point > wall > vertex > raw.
  - Green visual snap indicator on hover: a target circle at the snap point + dashed line from cursor.
  - Connect tool falls back to nearest-node-within-3m when MapLibre pixel query misses.
  - Duplicate-door guard within 0.5m.

## ✅ Shipped (web 4.7.0 · a86f867)

- **Admin → Analytics → Insights tab** with 4 new data cards:
  - Search zero-results table (content gap finder)
  - Peak-usage heatmap (24 × 7 grid, Europe/Helsinki)
  - Device / OS / app-version breakdown (3 side-by-side bars)
  - Bounce rate by landing page (color-coded ≥70% red)
- **Fixed duplicate easter-egg logs** — server-side dedup on (egg, user) within 5 min

## ✅ Shipped (Android v1.83.0 · pushed 7ef73c2)

- **Removed "Delete ALL map data"** danger button — too easy to trigger, no undo path
- **Reminder lead-time slider** in mobile Settings → Notifications (0–30 min, was fixed at 5)
- **`/faq` page** — 9 common questions (Wilma / notifications / widgets / cache / feedback / TODO location / …)
- **"Get the app" popup** with feature flag in admin Settings → Content (dismissible, once per session)
- **Lunch tab per-category emojis** (🥗 kasvis / 🐟 kala / 🍗 kana / 🥩 liha / 🍲 keitto / 🥬 salaatti / 🍰 jälki / 🥖 leipä) — deterministic Finnish-keyword mapping

## ✅ Shipped (v1.82.0)

- **Map "API KEY REQUIRED" watermarks GONE** — CartoDB added the watermark in Sep 2026 for unauthenticated use; switched back to OSM standard tiles which are fine for school-scale traffic.
- **Dev-facing FCM buttons removed** from mobile Settings ("Rekisteröi push-token" / "Kopioi FCM-token") — production-ready now, registration is automatic with retry backoff.
- **Message templates removed** from admin Notifications tab per request.
- **Reset analytics/logs** — new "Danger zone" in admin Settings → Maintenance with three wipe buttons: events / logs / all.
- **README rewritten** — reflects the current stack (Android app, native widgets, PostgreSQL/Drizzle, PostHog, Sentry). Copyright dates now 2025–2026 per your correction.

## ✅ Shipped (v1.81.0)

- FCM upload retry with exponential backoff (fixes "reg fail — Unable to resolve host" on Wi-Fi handoffs)
- Admin: DELETE /push-tokens endpoint + "Reset all tokens" button
- Admin: 6 pre-canned message templates for common broadcasts
- Admin: character counters (65 / 240) on title + body fields

## ✅ Shipped (v1.80.0)

- **FCM finally actually fixed** — switched to modular `firebase-admin/app` + `firebase-admin/messaging` imports (the `.default ?? mod` shim was wrong, module namespace has `apps` not the default export).
- Widget XXXXL bucket (width > 1000dp): subject 40sp / 56sp.
- Copy FCM token button in Settings → Diagnostics for Firebase Console debugging.
- Admin: Broadcast history card with delivery stats (last 50 sends).

## ✅ Just shipped (v1.79.0)

- Widget: config activity on drop (hide-past / auto-roll / show-chip toggles)
- Widget: arrows 56×48dp / 34sp, rows 8dp vertical padding
- Web admin: inline scrubbable session replay timeline (play/pause/prev/next/slider + jump-to-error)

## 🚧 Still working (v1.79.0)

- 🚧 **Widgets stretch to max + bigger text + WAY bigger buttons** — bump text buckets, bigger arrow tap targets, wider row padding so it looks right when stretched large.
- 🚧 **Widget long-press configure activity** — new ConfigActivity + XML for TodaySchedule (default day / show-past toggle).
- 🚧 **Admin panel reorganize Analytics & Logs** — clearer nav pills, remove duplicate cards, add explicit sub-page structure.
- 🚧 **In-app session replay viewer** — build a scrubbable event-timeline in the session drill dialog. Own it instead of shelling to PostHog for the basic case.
- 🚧 **FCM verification report** — user asked for structured FCM implementation report.

## ⏳ Deferred honestly — each needs its own focused round

- ⏳ **Full ScheduleEngine rewrite** — 10+ files (ScheduleEntry model → LocalDateTime, ScheduleStore, TimetableScreen, all 3 widgets, LessonReminderReceiver, LessonReminderScheduler, Wilma iCalendar parser, HomeScreen). Rushing this will break "Nyt meneillään" for real users. Needs a solo round.
- ⏳ **Dynamic-color Material You widgets** — RemoteViews limitation; can only reference `@android:color/system_accent1_*` inline (Android 12+). Investigate + prototype next round.
- ⏳ **Production keystore** — blocked on you (private key material). Docs in `android/BUILD.md`.

## ❌ Blocked

- ❌ Vercel WAF Custom Rule (Skip Attack Challenge on `x-ksyk-bypass-token`) — user must configure in Vercel Firewall UI. Docs in `android/BUILD.md`.

## ✅ Recently done (last few commits)

- ✅ v1.78.0 · bac34f6 · **CRITICAL FCM require→dynamic import fix** (was throwing ReferenceError silently on Vercel). Admin panel: init error banner + last-5 recent devices list + per-token error codes + 15s auto-refresh + Copy button on crash logs. Widget XXXL text bucket at width>800dp (subject 44sp/32sp). Widget maxResize 2000dp.
- ✅ v1.77.0 · ccc1bba · Mobile Settings → Diagnostics: manual "Register push token" retry button with visible OK/FAIL + error message. Mobile admin → Actions: "Send test push to all" (calls `/notifications/test`, warns on 0 devices) + FCM status card showing config + registered count + init error. Widget max resize doubled to 1080dp, XXL text bucket at width>560dp (subject up to 32sp), bigger 44×40dp nav arrow buttons.
- ✅ v1.76.0 · 3426cd9 · FCM as data-only so onMessageReceived always fires (fixes the "sent:1 but nothing arrived" bug). 6-step logging in KsykFirebaseMessagingService with clear failure points. Channel auto-recovery if missing. POST_NOTIFICATIONS explicit permission check with clear log. Widgets: past classes STRIKETHROUGH via HTML span, per-subject color dot from deterministic 10-hue palette, larger minResize/maxResize dimensions, subject font up to 24sp on widest widgets.
- ✅ v1.75.0 · cf37134 · Widget past-class dimming, day rollover, next-lesson 14-day lookahead, Sentry errors tab.
- ✅ v1.74.0 · cb48ff9 · TODO.md, FCM /notifications/status returns initError + recentDevices + per-env-var flags, per-token errors, ksyk_session_id super-property (web + Android), admin session drill "Watch replay in PostHog" button.

---

## Standing rules for this project

- **Never** add `Co-Authored-By: Claude` trailer to commits.
- **Never** link feedback / support to `juuso.kaikula@gmail.com`.
- Bump version string on every user-facing change (client `changelog.ts` + Android `build.gradle.kts`).
- Keep secrets out of `android/` — server env vars only.
- Always maintain this TODO.md; recap done/pending at the end of every response.
