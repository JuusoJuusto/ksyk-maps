# apps/

Frontend application entries. During the monorepo migration (Milestone
5) the existing Vite `client/` will be split into two Next.js apps
under this folder:

- **`apps/maps/`** — the public campus map (currently `client/` → `/`)
- **`apps/builder/`** — the CAD-style editor (currently `client/` → `/builder`)

Both consume `packages/renderer`, `packages/routing`, `packages/shared`,
and `packages/api`.

## Why two apps instead of one?

- **Different audiences** — students hit `maps.ksyk.fi` and never need
  the editor bundle; admins hit `builder.ksyk.fi` and load the heavier
  CAD toolset only when they actually edit.
- **Different perf budgets** — the public map targets sub-second first
  paint on 3G; the builder can afford a larger bundle since admins are
  on desktop.
- **Different deploy cadence** — public map is high-traffic and gets
  cautious deploys; builder can move fast without user impact.

## Status

- **M5.0** — placeholder only; existing single-app Vite build stays
  live in `client/` until we're ready to cut over.
- **M5.1** — split `client/src/pages/*` into per-app trees.
- **M5.2** — Next.js config, per-app deploy targets, shared UI kit
  extracted to `packages/ui`.
- **M5.3** — DNS + Vercel project split, redirect layer.
