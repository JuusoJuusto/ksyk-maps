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

/** Payload returned in each hit's `doc.data`.
 *
 *  Kind "room" — `room` is always set, `building` is the parent (or null
 *    if the room references a non-existent building).
 *  Kind "building" — `building` is always set, `room` is null. The
 *    dropdown flies the camera to the building centroid.
 */
export interface RoomSearchPayload {
  room: Room | null;
  building: Building | null;
}

/**
 * Build a fresh search index over rooms **and** buildings. Buildings
 * are looked up by `room.buildingId` and their name is included in the
 * subtitle so a query like "haave 105" (partial building name + room
 * number) still scores. Buildings themselves are indexed as their own
 * hits (kind "building") so a search bar can offer "fly to Building A"
 * even before any rooms exist inside it.
 *
 * Name kept for backwards-compat with existing callers.
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

  // Buildings first — so a naked "A" or "Haavikko" surfaces the parent
  // before a room named "A-101" would. The title packs ALL localised
  // names AND uses one variant per index entry too, so a user typing
  // any of {name, nameEn, nameFi} hits via title-weighted score even
  // when the map surface renders only one of them.
  for (const building of safeBuildings) {
    const names = [building.name, building.nameEn, building.nameFi]
      .filter((s): s is string => !!s && s.length > 0);
    const uniqueNames = Array.from(new Set(names.map((n) => n.trim()))).filter(Boolean);
    if (uniqueNames.length === 0) continue;
    idx.add({
      id: `building:${building.id}`,
      kind: "building",
      // Concatenated so every language variant scores as title. Space-
      // separated (not " · ") so tokenizer sees them as separate tokens
      // and prefix matching works on each name individually.
      title: uniqueNames.join(" "),
      subtitle: [
        building.address ?? null,
        typeof building.floors === "number"
          ? `${building.floors} floor${building.floors === 1 ? "" : "s"}`
          : null,
      ].filter(Boolean).join(" — "),
      // Repeat the names in keywords too so a token like "kulo" hits
      // both fields — belt-and-suspenders after the earlier weight
      // rebalance. Even at WEIGHT_KEYWORDS 0.8 this only helps
      // rank-tie-breaking; the title match dominates.
      keywords: [
        ...uniqueNames,
        building.address ?? "",
        "building",
      ].filter((k) => k && k.length > 0),
      data: { room: null, building },
    });
  }

  for (const room of safeRooms) {
    const building = bIdx.get(room.buildingId) ?? null;
    // Prefer the human name as the title — it's what shows on the map.
    // The room number goes into the title only if there's no name (so
    // "912" still resolves to that room). Number always sits in
    // keywords so "912" still finds "Physics Lab" too.
    const nameParts = [room.name, room.nameEn, room.nameFi, room.displayName]
      .filter((s): s is string => !!s && s.length > 0);
    const uniqueNames = Array.from(new Set(nameParts.map((n) => n.trim()))).filter(Boolean);
    const primaryName =
      uniqueNames.length > 0
        ? uniqueNames.join(" ")
        : null;
    // Show "101 — Physics Lab" so searching the number highlights it in
    // the title, not buried in the subtitle. Pure-number rooms still just
    // show the number without the dash.
    const primaryTitle = primaryName
      ? (room.roomNumber ? `${room.roomNumber} — ${primaryName}` : primaryName)
      : (room.roomNumber || "(unnamed room)");
    idx.add({
      id: `room:${room.id}`,
      kind: "room",
      title: primaryTitle,
      subtitle: [
        building?.name ?? null,
        room.floor !== undefined ? `Floor ${room.floor}` : null,
        room.type ?? null,
      ].filter(Boolean).join(" — "),
      keywords: [
        room.roomNumber,
        // Include names in keywords too — belt-and-suspenders like buildings.
        ...uniqueNames,
        room.type ?? "",
        ...(room.tags ?? []),
        ...(room.aliases ?? []),
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
