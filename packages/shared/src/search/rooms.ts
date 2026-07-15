/**
 * @ksyk/shared/search/rooms — domain-specific search helpers.
 *
 * The generic `SearchIndex` accepts any `SearchDoc`. This file bridges
 * the KSYK domain (Buildings + Rooms) into that shape so callers just
 * do:
 *
 *   const idx = buildRoomSearchIndex(rooms, buildings);
 *   const hits = idx.search("phys 105");
 *
 * The index stores the underlying `Room` on `hit.doc.data` so the UI
 * can jump straight to it.
 */
import type { Room, Building } from "../types";
import { SearchIndex, type SearchHit } from "./index";

/** Payload returned in each hit's `doc.data`. */
export interface RoomSearchPayload {
  room: Room;
  building: Building | null;
}

/**
 * Build a fresh search index over `rooms`. Buildings are looked up by
 * `room.buildingId` and their name is included in the subtitle so a
 * query like "haave 105" (partial building name + room number) still
 * scores.
 */
export function buildRoomSearchIndex(
  rooms: Room[],
  buildings: Building[] = [],
): SearchIndex<RoomSearchPayload> {
  // Defensive — a 404 leaking a {message:"..."} object into either
  // argument would explode the for-of loop. Skip non-array inputs
  // gracefully so the caller UI still renders (empty index).
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const safeBuildings = Array.isArray(buildings) ? buildings : [];

  const bIdx = new Map<string, Building>();
  for (const b of safeBuildings) bIdx.set(b.id, b);

  const idx = new SearchIndex<RoomSearchPayload>();
  for (const room of safeRooms) {
    const building = bIdx.get(room.buildingId) ?? null;
    idx.add({
      id: `room:${room.id}`,
      kind: "room",
      // "912 Physics Lab" — room number lands first so number-first
      // queries prefix-match instantly.
      title: [room.roomNumber, room.name ?? room.nameEn ?? ""].filter(Boolean).join(" ").trim(),
      subtitle: [
        building?.name ?? null,
        room.floor !== undefined ? `Floor ${room.floor}` : null,
        room.type ?? null,
      ].filter(Boolean).join(" · "),
      keywords: [
        room.roomNumber,
        room.name ?? "",
        room.nameEn ?? "",
        room.nameFi ?? "",
        room.type ?? "",
        ...(room.tags ?? []),
      ].filter((k) => k && k.length > 0),
      data: { room, building },
    });
  }
  return idx;
}

/** Convenience — one-shot search without holding an index. Rebuilds the
 *  index every call; use `buildRoomSearchIndex` for hot paths. */
export function searchRooms(
  query: string,
  rooms: Room[],
  buildings: Building[] = [],
  limit = 20,
): Array<SearchHit<RoomSearchPayload>> {
  return buildRoomSearchIndex(rooms, buildings).search(query, { limit });
}
