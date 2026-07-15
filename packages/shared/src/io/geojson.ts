/**
 * @ksyk/shared/io/geojson — MapPackage ↔ GeoJSON `FeatureCollection`.
 *
 * The public map + Builder both need to interop with GIS tools that
 * only speak GeoJSON. This module round-trips a `MapPackage` through a
 * `FeatureCollection`:
 *   - Every building/room/hallway becomes one Feature with a
 *     `properties.kind` discriminator.
 *   - Doors/stairs/elevators become Point features with their metadata.
 *   - Non-geometric config (`mapDefaults`, `manifest`) survives in
 *     the collection's top-level `properties.ksyk` payload — GeoJSON
 *     doesn't have a first-class place for it but every parser preserves
 *     unknown top-level fields.
 *
 * Coordinate convention: GeoJSON is `[lng, lat]`. All KSYK types are
 * `{ lat, lng }` — we swap on the boundary.
 */
import type {
  MapPackage, Building, Room, Hallway, Door, Stair, Elevator, Floor,
  MapPackageManifest, MapDefaults,
} from "../types";

/** Minimal GeoJSON shape — we don't depend on `@types/geojson` here so
 *  this file is dep-free. */
interface Feature {
  type: "Feature";
  geometry: Geometry;
  properties: Record<string, unknown>;
}
type Geometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "LineString"; coordinates: number[][] }
  | { type: "Point"; coordinates: number[] };

interface FeatureCollection {
  type: "FeatureCollection";
  features: Feature[];
  properties?: Record<string, unknown>;
}

/** Turn a MapPackage into a GeoJSON `FeatureCollection`. */
export function packageToGeoJSON(pkg: MapPackage): FeatureCollection {
  const features: Feature[] = [];

  for (const b of pkg.buildings) {
    if (!b.points || b.points.length < 3) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ringFromLatLngs(b.points)] },
      properties: {
        kind: "building",
        id: b.id,
        name: b.name,
        nameEn: b.nameEn ?? null,
        nameFi: b.nameFi ?? null,
        floors: b.floors ?? null,
        colorCode: b.colorCode ?? null,
        address: b.address ?? null,
        rotationDeg: b.rotationDeg ?? null,
        metadata: b.metadata ?? null,
      },
    });
  }

  for (const r of pkg.rooms) {
    if (!r.points || r.points.length < 3) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ringFromLatLngs(r.points)] },
      properties: {
        kind: "room",
        id: r.id,
        buildingId: r.buildingId,
        floor: r.floor,
        roomNumber: r.roomNumber,
        name: r.name ?? null,
        nameEn: r.nameEn ?? null,
        nameFi: r.nameFi ?? null,
        type: r.type ?? null,
        capacity: r.capacity ?? null,
        department: r.department ?? null,
        teacher: r.teacher ?? null,
        tags: r.tags ?? null,
        aliases: r.aliases ?? null,
        colorCode: r.colorCode ?? null,
        metadata: r.metadata ?? null,
      },
    });
  }

  for (const h of pkg.hallways) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [h.startX, h.startY],
          [h.endX, h.endY],
        ],
      },
      properties: {
        kind: "hallway",
        id: h.id,
        buildingId: h.buildingId ?? null,
        floor: h.floor ?? null,
        width: h.width ?? null,
        surface: h.surface ?? null,
        directions: h.directions ?? null,
        accessible: h.accessible ?? null,
      },
    });
  }

  const pointFeats = <T extends { id: string; position: { lat: number; lng: number } }>(
    items: T[] | undefined,
    kind: string,
    extras: (t: T) => Record<string, unknown>,
  ) => {
    if (!items) return;
    for (const it of items) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [it.position.lng, it.position.lat] },
        properties: { kind, id: it.id, ...extras(it) },
      });
    }
  };
  pointFeats(pkg.doors, "door", (d) => ({
    buildingId: d.buildingId,
    floor: d.floor,
    connects: d.connects,
    accessible: d.accessible ?? null,
    swing: d.swing ?? null,
    locked: d.locked ?? null,
    emergencyExit: d.emergencyExit ?? null,
  }));
  pointFeats(pkg.stairs, "stair", (s) => ({
    buildingId: s.buildingId,
    floors: s.floors,
    accessible: s.accessible ?? null,
  }));
  pointFeats(pkg.elevators, "elevator", (e) => ({
    buildingId: e.buildingId,
    floors: e.floors,
    accessible: e.accessible,
    name: e.name ?? null,
  }));

  return {
    type: "FeatureCollection",
    features,
    properties: {
      ksyk: {
        manifest: pkg.manifest,
        mapDefaults: pkg.mapDefaults,
        floors: pkg.floors,
      },
    },
  };
}

/** Parse a GeoJSON `FeatureCollection` back into a `MapPackage`. Throws
 *  on malformed input. Silently drops features it can't classify. */
export function geoJSONToPackage(collection: unknown): MapPackage {
  if (!isFeatureCollection(collection)) {
    throw new Error("Not a FeatureCollection");
  }
  const buildings: Building[] = [];
  const rooms: Room[] = [];
  const hallways: Hallway[] = [];
  const doors: Door[] = [];
  const stairs: Stair[] = [];
  const elevators: Elevator[] = [];

  for (const f of collection.features) {
    const kind = f.properties?.kind;
    if (kind === "building" && f.geometry.type === "Polygon") {
      buildings.push(readBuilding(f));
    } else if (kind === "room" && f.geometry.type === "Polygon") {
      rooms.push(readRoom(f));
    } else if (kind === "hallway" && f.geometry.type === "LineString") {
      hallways.push(readHallway(f));
    } else if (kind === "door" && f.geometry.type === "Point") {
      doors.push(readDoor(f));
    } else if (kind === "stair" && f.geometry.type === "Point") {
      stairs.push(readStair(f));
    } else if (kind === "elevator" && f.geometry.type === "Point") {
      elevators.push(readElevator(f));
    }
  }

  const ksyk = (collection.properties?.ksyk ?? {}) as {
    manifest?: MapPackageManifest;
    mapDefaults?: MapDefaults;
    floors?: Floor[];
  };
  const manifest: MapPackageManifest = ksyk.manifest ?? {
    version: "1.0.0",
    title: "Imported map",
    publishedAt: new Date().toISOString(),
  };
  const mapDefaults: MapDefaults = ksyk.mapDefaults ?? {
    center: { lat: 0, lng: 0 },
    zoom: 16,
    bearing: 0,
    pitch: 0,
    minZoom: 12,
    maxZoom: 22,
  };
  const floors: Floor[] = ksyk.floors ?? [];

  return {
    manifest,
    mapDefaults,
    buildings,
    floors,
    rooms,
    hallways,
    doors,
    stairs,
    elevators,
  };
}

// ── Feature readers ────────────────────────────────────────────────

function readBuilding(f: Feature): Building {
  const p = f.properties;
  return {
    id: readString(p.id),
    name: readString(p.name),
    nameEn: readNullableString(p.nameEn),
    nameFi: readNullableString(p.nameFi),
    floors: typeof p.floors === "number" ? p.floors : null,
    colorCode: readNullableString(p.colorCode),
    address: readNullableString(p.address),
    rotationDeg: typeof p.rotationDeg === "number" ? p.rotationDeg : null,
    points: latLngsFromRing((f.geometry as { coordinates: number[][][] }).coordinates[0]),
    metadata: (p.metadata as Record<string, unknown> | null) ?? null,
  };
}

function readRoom(f: Feature): Room {
  const p = f.properties;
  return {
    id: readString(p.id),
    buildingId: readString(p.buildingId),
    floor: typeof p.floor === "number" ? p.floor : 0,
    roomNumber: readString(p.roomNumber),
    name: readNullableString(p.name),
    nameEn: readNullableString(p.nameEn),
    nameFi: readNullableString(p.nameFi),
    type: p.type as Room["type"] | null,
    capacity: typeof p.capacity === "number" ? p.capacity : null,
    department: readNullableString(p.department),
    teacher: readNullableString(p.teacher),
    tags: Array.isArray(p.tags) ? (p.tags as string[]) : null,
    aliases: Array.isArray(p.aliases) ? (p.aliases as string[]) : null,
    colorCode: readNullableString(p.colorCode),
    points: latLngsFromRing((f.geometry as { coordinates: number[][][] }).coordinates[0]),
    metadata: (p.metadata as Record<string, unknown> | null) ?? null,
  };
}

function readHallway(f: Feature): Hallway {
  const p = f.properties;
  const coords = (f.geometry as { coordinates: number[][] }).coordinates;
  return {
    id: readString(p.id),
    buildingId: readNullableString(p.buildingId),
    floor: typeof p.floor === "number" ? p.floor : null,
    startX: coords[0][0],
    startY: coords[0][1],
    endX: coords[coords.length - 1][0],
    endY: coords[coords.length - 1][1],
    width: typeof p.width === "number" ? p.width : null,
    surface: p.surface as Hallway["surface"] ?? null,
    directions: p.directions as Hallway["directions"] ?? null,
    accessible: typeof p.accessible === "boolean" ? p.accessible : null,
  };
}

function readDoor(f: Feature): Door {
  const p = f.properties;
  const c = (f.geometry as { coordinates: number[] }).coordinates;
  return {
    id: readString(p.id),
    buildingId: readString(p.buildingId),
    floor: typeof p.floor === "number" ? p.floor : 0,
    position: { lng: c[0], lat: c[1] },
    connects: Array.isArray(p.connects) && p.connects.length === 2
      ? (p.connects as [string, string])
      : ["", ""] as [string, string],
    accessible: typeof p.accessible === "boolean" ? p.accessible : null,
    swing: p.swing as Door["swing"] ?? null,
    locked: typeof p.locked === "boolean" ? p.locked : null,
    emergencyExit: typeof p.emergencyExit === "boolean" ? p.emergencyExit : null,
  };
}

function readStair(f: Feature): Stair {
  const p = f.properties;
  const c = (f.geometry as { coordinates: number[] }).coordinates;
  return {
    id: readString(p.id),
    buildingId: readString(p.buildingId),
    floors: Array.isArray(p.floors) ? (p.floors as number[]) : [],
    position: { lng: c[0], lat: c[1] },
    accessible: typeof p.accessible === "boolean" ? p.accessible : null,
  };
}

function readElevator(f: Feature): Elevator {
  const p = f.properties;
  const c = (f.geometry as { coordinates: number[] }).coordinates;
  return {
    id: readString(p.id),
    buildingId: readString(p.buildingId),
    floors: Array.isArray(p.floors) ? (p.floors as number[]) : [],
    position: { lng: c[0], lat: c[1] },
    accessible: typeof p.accessible === "boolean" ? p.accessible : false,
    name: readNullableString(p.name),
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function ringFromLatLngs(pts: Array<{ lat: number; lng: number }>): number[][] {
  const ring = pts.map((p) => [p.lng, p.lat]);
  // GeoJSON polygons must be closed — last coord = first.
  if (
    ring.length &&
    (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
  ) {
    ring.push([ring[0][0], ring[0][1]]);
  }
  return ring;
}

function latLngsFromRing(ring: number[][]): Array<{ lat: number; lng: number }> {
  // Strip the closing coordinate so the KSYK convention (implicit close)
  // is preserved.
  const out = ring.map(([lng, lat]) => ({ lat, lng }));
  if (
    out.length > 1 &&
    out[0].lat === out[out.length - 1].lat &&
    out[0].lng === out[out.length - 1].lng
  ) {
    out.pop();
  }
  return out;
}

function readString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function readNullableString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function isFeatureCollection(x: unknown): x is FeatureCollection {
  return (
    typeof x === "object" && x !== null &&
    (x as { type?: unknown }).type === "FeatureCollection" &&
    Array.isArray((x as { features?: unknown }).features)
  );
}
