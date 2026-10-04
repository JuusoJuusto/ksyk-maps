# BRAIN.md — KSYK Maps project epicenter

Hub for every long-lived project document.  Keep each linked doc short
and scannable; keep this file flat so humans and agents can see the whole
project state at a glance.

## Core docs

- [[ROADMAP.md]] — current / near-term / future work as a kanban-style board.
  Headings are columns, bullets are cards, `[[name]]` opens the full brief.
- [[PROJECT-LOG.md]] — append-only running history.  Every conversation
  logs: what was asked, what was decided + why, what shipped (version +
  commit).  Agents MUST append after each turn.
- [[CLAUDE.md]] — agent instructions.  Links back here.
- [[TODO.md]] — short-term checklist of pending UI / UX work.
- [[CHANGELOG.md]] — public, user-facing release notes (also mirrored
  into `client/src/lib/changelog.ts` for the in-app changelog).

## Project context (one-liner)

KSYK Maps — Wilma-style campus map + schedule + navigation PWA for
Kulosaaren Yhteiskoulu.  Vite + React 18 + Tailwind + MapLibre GL +
Drizzle (Postgres) on Vercel serverless.  Companion Android app in
`android/app` (Compose).

## Design language (short reference)

Wilma + MazeMap aesthetic:
- Navy `#003d82` is the sole brand accent (not iOS blue).
- Hairline borders `#d5dae0` (`#2a3040` dark).
- Rounded 4 / 6 / 8 / 10 / 12 dp.  Never Material 16 / 24 / 28.
- Uppercase 10 sp labels, 14–16 sp body, 20–26 sp titles with tight tracking.
- No glass, no gradients, no emoji icons in chrome.

## Linked repos / services

- Prod: https://ksykmaps.fi — Vercel
- Issues + PRs: https://github.com/JuusoJuusto/ksyk-maps
- Error tracking: PostHog project `KSYK Maps`
- Android APK releases: `public/releases/ksykmaps-release-<version>.apk`

## Conventions

- Never commit without bumping `APP_VERSION` in `client/src/lib/changelog.ts`.
- Rollback tags: `rollback-before-<version>` at the commit before every
  release.  Mentioned in each release note.
- Prefix fetches that can throw: use `safeFetch` / `safeFetchFireAndForget`
  from `client/src/lib/safeFetch.ts` so no silent unhandled rejections.
