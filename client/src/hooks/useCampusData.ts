/**
 * useCampusData — single source of truth for the public map.
 *
 * Read order:
 *   1. `/api/map-package/published` — the last publish snapshot (if any).
 *      Returned as a MapPackage; we destructure it into the same shape
 *      the rest of the app expects.
 *   2. Live per-kind endpoints — `/api/buildings`, `/api/rooms`, etc.
 *      Used when nothing is published yet.
 *
 * Draft-vs-publish semantics:
 *   - The Builder writes straight to the live tables via
 *     POST /api/buildings etc. These edits are the "draft".
 *   - When the admin hits Publish, mapRoutes snapshots the current live
 *     tables into an immutable version doc and swaps the
 *     `mapPackages/published` pointer. Public visitors see that
 *     snapshot until the next publish — mid-edit drafts don't leak.
 *
 * Consumers get exactly the same shape they used to get from the live
 * queries, so callers don't need to know which source served them.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Building, Room, Hallway, Door, Stair, Elevator, MapPackage } from "@ksyk/shared";
import { fetchList } from "@/lib/fetchList";

export interface CampusData {
  buildings: Building[];
  rooms: Room[];
  hallways: Hallway[];
  doors: Door[];
  stairs: Stair[];
  elevators: Elevator[];
  /** Which source served this snapshot. Useful for a "viewing published"
   *  badge on the public map. */
  source: "published" | "live" | "loading";
  /** True once at least one source has responded — lets callers avoid
   *  rendering empty states while the first fetch is in flight. */
  isReady: boolean;
}

const EMPTY: Omit<CampusData, "source" | "isReady"> = {
  buildings: [], rooms: [], hallways: [], doors: [], stairs: [], elevators: [],
};

/** Try the published snapshot first, fall back to live tables. */
export function useCampusData(): CampusData {
  const published = useQuery<MapPackage | null>({
    queryKey: ["/api/map-package/published"],
    queryFn: async () => {
      try {
        // Cache-bust the browser cache — SW sometimes returns a stale
        // /api response on hard reset (Vercel edge cache + PWA cache
        // together). Cache: 'no-store' guarantees a network round-trip.
        const r = await fetch("/api/map-package/published", { cache: "no-store" });
        if (!r.ok) return null;
        const body = await r.json();
        return body && typeof body === "object" && Array.isArray((body as MapPackage).buildings)
          ? (body as MapPackage)
          : null;
      } catch {
        return null;
      }
    },
    // Published data is stable — refresh every 5 minutes rather than
    // every 60 seconds so we don't hammer Firestore.
    staleTime: 300_000,
    refetchInterval: 300_000,
    // Always re-fetch on component mount so a hard reload never
    // renders against a stale published snapshot from React Query's
    // in-memory cache.
    refetchOnMount: "always",
  });

  // Prefer live tables when published is present-but-empty (test
  // publish, wiped campus, etc.). Otherwise fall back to whatever's
  // in the published snapshot.
  const publishedHasData =
    !!published.data
    && ((published.data.buildings?.length ?? 0) > 0
       || (published.data.rooms?.length ?? 0) > 0
       || (published.data.hallways?.length ?? 0) > 0);

  // Fire the live queries whenever the published payload is missing OR
  // empty — that way an empty publish still shows drafted data instead
  // of a blank map.
  const shouldUseLive = !publishedHasData;

  // Live queries — always registered so React Query dedupes correctly
  // with other components, but only surface as CampusData when the
  // published payload is absent.
  const buildingsQ = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
    queryFn: () => fetchList<Building>("/api/buildings"),
    enabled: shouldUseLive,
    refetchInterval: shouldUseLive ? 60_000 : false,
    refetchOnMount: "always",
  });
  const roomsQ = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    queryFn: () => fetchList<Room>("/api/rooms"),
    enabled: shouldUseLive,
    refetchInterval: shouldUseLive ? 60_000 : false,
    refetchOnMount: "always",
  });
  const hallwaysQ = useQuery<Hallway[]>({
    queryKey: ["/api/hallways"],
    queryFn: () => fetchList<Hallway>("/api/hallways"),
    enabled: shouldUseLive,
    refetchInterval: shouldUseLive ? 60_000 : false,
    refetchOnMount: "always",
  });
  const doorsQ = useQuery<Door[]>({
    queryKey: ["/api/doors"],
    queryFn: () => fetchList<Door>("/api/doors"),
    enabled: shouldUseLive,
    refetchInterval: shouldUseLive ? 60_000 : false,
    refetchOnMount: "always",
  });
  const stairsQ = useQuery<Stair[]>({
    queryKey: ["/api/stairs"],
    queryFn: () => fetchList<Stair>("/api/stairs"),
    enabled: shouldUseLive,
    refetchInterval: shouldUseLive ? 60_000 : false,
    refetchOnMount: "always",
  });
  const elevatorsQ = useQuery<Elevator[]>({
    queryKey: ["/api/elevators"],
    queryFn: () => fetchList<Elevator>("/api/elevators"),
    enabled: shouldUseLive,
    refetchInterval: shouldUseLive ? 60_000 : false,
    refetchOnMount: "always",
  });

  return useMemo<CampusData>(() => {
    // Case 1: published snapshot has real content — use it verbatim.
    if (publishedHasData && published.data) {
      const p = published.data;
      return {
        buildings: p.buildings ?? [],
        rooms:     p.rooms ?? [],
        hallways:  p.hallways ?? [],
        doors:     p.doors ?? [],
        stairs:    p.stairs ?? [],
        elevators: p.elevators ?? [],
        source: "published",
        isReady: true,
      };
    }
    // Case 2: published fetch still in flight AND live hasn't answered
    // either. Show empty + report loading so consumers can render a
    // skeleton instead of "no data".
    if (!published.isFetched && !buildingsQ.isFetched && !roomsQ.isFetched) {
      return { ...EMPTY, source: "loading", isReady: false };
    }
    // Case 3: use live tables — the common path for a campus mid-edit,
    // and the safe fallback when a publish went out empty.
    return {
      buildings: buildingsQ.data ?? [],
      rooms:     roomsQ.data ?? [],
      hallways:  hallwaysQ.data ?? [],
      doors:     doorsQ.data ?? [],
      stairs:    stairsQ.data ?? [],
      elevators: elevatorsQ.data ?? [],
      source: "live",
      isReady: buildingsQ.isFetched && roomsQ.isFetched,
    };
  }, [
    publishedHasData, published.data, published.isFetched,
    buildingsQ.data, buildingsQ.isFetched,
    roomsQ.data, roomsQ.isFetched,
    hallwaysQ.data,
    doorsQ.data,
    stairsQ.data,
    elevatorsQ.data,
  ]);
}
