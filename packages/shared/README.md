# @ksyk/shared

Shared TypeScript types + domain models used across every KSYK Maps
package. Zero runtime dependencies — pure types + a few pure helpers.

## What lives here

- **`types/`** — `Building`, `Room`, `Hallway`, `Floor`, `Door`, `Stair`,
  `Elevator`, `MapDefaults`, `NavGraphNode`, `NavGraphEdge`, etc.
- **`schemas/`** — Zod validation schemas for the same domain models,
  so runtime and TypeScript stay in sync.
- **`geo/`** — pure geometry helpers (`polygonBounds`, `centroid`,
  `haversineMeters`, `svgToLatLng`).

## Consumers

- `apps/maps/` — the public campus map (currently at `client/`)
- `apps/builder/` — the CAD-style editor (currently at `/builder`)
- `packages/renderer/` — GPU rendering engine (planned M3)
- `packages/routing/` — A*/Dijkstra navigation (planned M4)
- `packages/api/` — HTTP client + server types (planned M6)

## Import path

Until the monorepo migration is complete, imports use a Vite alias:

```ts
import type { Building, Room } from "@ksyk/shared";
```

The alias is wired up in `vite.config.ts` and `tsconfig.json` to
resolve `@ksyk/shared` → `packages/shared/src/index.ts`.

## Roadmap

- M2 (now) — extract types from `client/src/` into `packages/shared/`
- M3 — add renderer-specific types (`Chunk`, `SpriteAtlas`)
- M4 — add routing-specific types (`Waypoint`, `Route`, `Turn`)
- M5 — full monorepo split into `apps/` + `packages/`
