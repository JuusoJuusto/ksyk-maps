# KSYK Maps — Analytics Reference

---

## Overview

KSYK Maps runs two analytics pipelines:

| System | Purpose | Privacy gate |
|--------|---------|-------------|
| **First-party (`analytics-sdk.ts`)** | DAU, session lifecycle, errors, search, navigation — goes to `/api/session/heartbeat` on the same origin | `error`, `session_started`, `session_ended` bypass consent; everything else requires `cookie_consent.analytics = true` |
| **PostHog** | Product analytics, session replay, feature flags, error tracking — routed through proxy at `t.ksykmaps.fi` to avoid adblock | Opted out by default; opted in after cookie consent |

Sentry is a third system for **error monitoring only** (not product analytics). It uses a same-origin tunnel at `/api/sentry-tunnel`.

---

## Setup

### Web

Set in Vercel environment variables (no `VITE_` prefix for server-only values):

```
VITE_POSTHOG_KEY=phc_...          # PostHog project token (public, client-side)
POSTHOG_API_KEY=phc_...           # Same token for server-side Node SDK
POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_CSP_SCRIPT_SRC=https://*.posthog.com
VITE_SENTRY_DSN=https://...@...ingest.de.sentry.io/...   # Optional override
```

PostHog is initialised in `client/src/lib/posthog.ts`. It imports `posthog-js/dist/module.full.no-external` to bundle all PostHog extensions at build time (session replay, autocapture, etc.) so no runtime CDN fetch is needed.

### Android

Set in `.env` or via CI env vars:

```
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://us.i.posthog.com
SENTRY_DSN=https://...
```

These are read in `android/app/build.gradle.kts` and baked into `BuildConfig` at compile time.

---

## Event Naming Convention

All events use `snake_case`. Category prefixes:

| Prefix | Domain |
|--------|--------|
| `map_` | map loading, layers, interactions |
| `search_` | classroom/room search |
| `nav_` | room-to-room navigation |
| `schedule_` | Wilma / iCal import |
| `onboarding_` | first-run flow |
| `auth_` | login, logout |
| `settings_` | settings panel changes |
| `support_` | support tickets |
| `admin_` | admin panel actions |
| `positioning_` | WiFi/beacon positioning |
| `error` | error events (always sent) |
| `session_started` / `session_ended` | lifecycle (always sent) |

---

## Events

### Core lifecycle (always sent, no consent required)

| Event | When | Properties |
|-------|------|-----------|
| `session_started` | Tab/app open | `device` (UA, platform, viewport, timezone) |
| `session_ended` | Tab hidden / app closed | `durationMs` |
| `error` | Unhandled JS exception | `message`, `stack`, `filename`, `lineno` |

### Map

| Event | When | Properties |
|-------|------|-----------|
| `page_view` | Route change | `url` |
| `map_opened` | MapLibre canvas ready | `app_version` |
| `map_load_failed` | MapLibre fails to load | `error_category` |
| `maplibre_transient_error` | Non-fatal MapLibre render error | `message` |

### Search

| Event | When | Properties |
|-------|------|-----------|
| `search` | User searches for a room | `query` (truncated at 200 chars), `hits` |

> **Privacy note:** `query` is truncated but still sent. Do not emit raw Wilma calendar event titles or student names as query values.

### Navigation

| Event | When | Properties |
|-------|------|-----------|
| `navigation` | User starts navigation | `fromRoom`, `toRoom`, `fromBuilding`, `toBuilding`, `distance`, `duration`, `navigationType` |

### Feature usage

| Event | When | Properties |
|-------|------|-----------|
| `feature` | Significant feature used | `name`, `action` (`opened`/`used`/`completed`/`failed`), `metadata` |

### Performance

| Event | When | Properties |
|-------|------|-----------|
| `performance` | Web Vitals | `metric` (cls/lcp/inp/ttfb/fcp), `value`, `rating` |

---

## Properties to Avoid

Never send the following in any event:

- Passwords, tokens, session cookies
- Wilma calendar URLs
- Personal schedules or event titles
- Student names or emails
- Raw API responses
- DB query results

---

## Identity

### Web — anonymous

Every browser gets a stable anonymous ID stored in `localStorage` under `ksyk_user_id`. This is a random string (`usr_<uuid>`), not tied to any personal data.

### Web — identified (admin)

After admin login the app may call `posthog.identify(userId, { role })`. Only `role` (e.g. `"admin"`) is sent as a user property. Email is never sent to PostHog.

### Android

PostHog is initialised with the same project token. Anonymous ID is managed by the PostHog Android SDK. After login, `PostHog.identify(userId)` is called with `role` property.

### Logout

On logout, call `posthog.reset()` (web) or `PostHog.reset()` (Android) to prevent the next anonymous user from inheriting the identified profile.

---

## Privacy — Session Replay

### PostHog session replay

Configured in `client/src/lib/posthog.ts`:

```typescript
session_recording: {
  recordCanvas: true,         // MapLibre canvas captured
  canvasQuality: "0.6",
  maskAllInputs: true,        // All <input> fields masked
  maskTextSelector: "[data-sensitive]",  // Additional masking via data attribute
}
```

**Important:** Pages or components that contain sensitive student data should add `data-sensitive` to wrapper elements to force masking.

### Sentry session replay

Configured in `client/src/lib/sentry.ts`:

```typescript
replayIntegration({
  maskAllText: true,    // All text masked in Sentry replays
  blockAllMedia: true,  // Media blocked
})
```

### Admin panel

The admin panel (`/admin`) handles staff data, student records, login logs, and announcements. Do not enable unrestricted session replay there. The `data-sensitive` attribute should be applied to any panels that display student-identifiable information.

---

## Feature Flags

Feature flags are managed in the PostHog dashboard. Currently no flags are in active use.

**Convention for new flags:**

- Name: `snake_case`, descriptive (`wifi_positioning_v2`, `new_search_ui`)
- Default value: `false` (flags are off unless explicitly enabled)
- Fallback: if PostHog is unavailable or flag not evaluated, the feature is **off**
- Never make a flag removal cause the app to break — always code the `false` path first

---

## Dashboards

### Production Health (check daily)

- **Active users (DAU/WAU):** `session_started` unique `anonymousId` per day/week
- **Map loads:** `page_view` on path `/`
- **Search rate:** `search` events per session
- **Error rate:** `error` events / `session_started` events
- **Navigation success:** `navigation` events where `navigationType !== "failed"` / total `navigation`

### Onboarding Funnel

1. `session_started` (first visit — filter on `returning = false` if tracked)
2. `page_view` on `/`
3. `search` (first search)
4. `navigation` (first navigation)

### Search Quality

- **Zero-results rate:** `search` events where `hits === 0` / total `search`
- **Common zero-result queries:** group `search` events by `query` where `hits === 0`

---

## Testing Analytics

To verify events are firing in development:

1. Open PostHog (us.posthog.com) → Live Events
2. Load the app locally with `VITE_POSTHOG_DEV=true` in your `.env`
3. Accept the cookie consent banner
4. Perform a search — verify `search` event appears
5. Navigate between rooms — verify `navigation` event appears

In production, check PostHog Live Events immediately after a deployment to confirm events are flowing through the `t.ksykmaps.fi` proxy.

---

*Last updated: 2026-09-29 · KSYK Maps v4.7.51*
