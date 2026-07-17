/**
 * recentSearches — small localStorage-backed store for the last N
 * search picks. Persists across reloads so users can jump back to
 * "the physics lab I opened last week" without re-typing.
 *
 * Stored payload is intentionally MINIMAL — just the ids + a display
 * name — so the store doesn't bloat when rooms carry lots of metadata.
 * At recall time we look the full entity back up from live campus data.
 */
import type { Room, Building } from "@ksyk/shared";

const KEY = "ksyk_recent_searches_v1";
const MAX = 6;

export interface RecentPickStub {
  kind: "room" | "building";
  id: string;
  /** Display title captured at record time (fallback if the entity
   *  disappears — deleted room / renamed building). */
  title: string;
  subtitle?: string | null;
  /** For rooms we also carry the parent building id so we can rebuild
   *  a full SearchPick on recall. */
  buildingId?: string | null;
  savedAt: number;
}

export function loadRecentPicks(): RecentPickStub[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is RecentPickStub =>
        v && typeof v === "object" && typeof v.id === "string" && typeof v.title === "string",
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

function saveRecents(list: RecentPickStub[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* quota / private mode — silent */ }
}

/** Push a fresh pick to the top of the recents list, deduping by id. */
export function recordPick(pick:
  | { kind: "room"; room: Room; building: Building | null }
  | { kind: "building"; building: Building },
): void {
  const stub: RecentPickStub = pick.kind === "room"
    ? {
        kind: "room",
        id: pick.room.id,
        title: [pick.room.roomNumber, pick.room.name].filter(Boolean).join(" · ") || "(unnamed room)",
        subtitle: pick.building?.name ?? null,
        buildingId: pick.room.buildingId ?? null,
        savedAt: Date.now(),
      }
    : {
        kind: "building",
        id: pick.building.id,
        title: pick.building.name || "(unnamed building)",
        subtitle: pick.building.address ?? null,
        buildingId: null,
        savedAt: Date.now(),
      };
  const existing = loadRecentPicks().filter((r) => !(r.id === stub.id && r.kind === stub.kind));
  saveRecents([stub, ...existing]);
}

export function clearRecents(): void {
  try { window.localStorage.removeItem(KEY); } catch { /* silent */ }
}
