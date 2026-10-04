# CLAUDE.md — agent instructions for KSYK Maps

Hub: [[BRAIN.md]].  Short-term work queue: [[ROADMAP.md]].  Running
history: [[PROJECT-LOG.md]].

## After every conversation

1. **Append to `PROJECT-LOG.md`.**  New entry at the top using the
   `## DD-MM-YYYY — vX.Y.Z — one-liner` template (project convention is
   day-first, four-digit year).  Record what was asked, what was
   decided + why, what shipped (commit SHA + versions + files touched).
2. **Update `ROADMAP.md`** — move finished items into `✅ Shipped`,
   promote `Next` items into `In progress` if work started, add briefs
   (`[[name]]` + a short section at the bottom) for anything that will
   span multiple sessions.
3. **Bump `APP_VERSION`** in `client/src/lib/changelog.ts` and add a
   release note.  Mirror the headline to `CHANGELOG.md`.
4. **Tag a rollback point** before each release: `git tag
   rollback-before-X.Y.Z <prev HEAD>`.  Mention the tag in the release
   note so revert is one command.

## Design language

Wilma + MazeMap, see [[BRAIN.md]] for tokens.  Rule of thumb:
- Navy `#003d82` for primary.
- Hairline `#d5dae0` / `#2a3040` borders over Material elevation.
- Rounded 4 / 6 / 8 / 10 dp — never larger.
- Uppercase 10 sp mastheads over document H1s.
- No glass, gradients, or emoji icons in chrome.

## Scaffold rules

- Prefer editing existing files to creating new ones.
- Only add new files when they genuinely belong (e.g. `safeFetch.ts`
  utility, or a new component).  Document new files in the matching
  brief.
- Keep comments short.  Explain **why**, not **what**.  Never leave
  dead code / commented-out blocks.

## Build gates before shipping

- `npm run check` must pass (`tsc` clean).
- For UI changes: `npm run build` must pass (Vite build).
- For Android changes: don't push without a successful Gradle build
  log attached.

## Error-tracking posture

- Every network call needs either `safeFetch` / `safeFetchFireAndForget`,
  explicit `.catch`, or `try/catch`.
- The global `window.onunhandledrejection` handler in
  `client/src/lib/posthog.ts` filters `Failed to fetch` during
  `pagehide` and `dynamically imported module` failures.  Don't rely
  on it for actual bugs.

## Rollback discipline

Every release must list:
1. The exact `git reset --hard <tag>` command.
2. The commit SHA before the release.
3. Any DB migration added — note whether rollback leaves the column in
   place (safe) or needs manual cleanup (unsafe).

## PR workflow

Always ask / check for open PRs on
`github.com/JuusoJuusto/ksyk-maps/pulls` before major changes.
Review open PRs, pull / fetch merged ones so local main stays current.
