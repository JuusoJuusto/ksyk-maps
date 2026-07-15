# @ksyk/api

Typed HTTP client for the KSYK Maps backend + shared request/response
types.

## Current status (M6.0)

- **Client** — a thin wrapper around `fetch` that adds JSON parsing,
  error normalisation, and JWT header injection. Same interface as
  `apiRequest()` in `client/src/lib/queryClient.ts`, just typed at
  the resource level (`api.buildings.list()`, `api.rooms.create(...)`).
- **Types** — re-exports the shared domain types from `@ksyk/shared`
  with server-only extensions (`createdAt`, `updatedAt`, `ownerId`).

## Roadmap

- **M6.0** (now) — typed client skeleton
- **M6.1** — swap Firebase for PostgreSQL + Prisma on the server
- **M6.2** — JWT + refresh token auth with RBAC middleware
- **M6.3** — Socket.io realtime channel (live occupancy, live edits)
- **M6.4** — full migration off Firestore; script to import existing
  Firestore data into Postgres
