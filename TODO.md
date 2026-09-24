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

## ✅ Just shipped (web 4.7.24 · android patch · pending push)

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
