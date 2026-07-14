/**
 * @ksyk/shared/types — canonical KSYK Maps domain types.
 *
 * Every consumer (public map, builder, renderer, routing, server)
 * agrees on these shapes. Anything schema-drift-y (extra optional
 * server-only fields like `createdAt`) goes on the type that
 * represents the persistence view; the runtime view stays lean.
 */

/** Latitude / longitude pair (degrees). Order matches GeoJSON `[lng, lat]`
 *  when serialised to that format — but here fields are named so callers
 *  don't confuse the axes. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** A polygon expressed as an ordered list of `LatLng` corners. Closed
 *  implicitly — the last point is NOT a repeat of the first. */
export type Polygon = LatLng[];

/** Axis-aligned bounding box in lat/lng space. */
export interface BBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/** Category of a room. Drives the icon + color used by the renderer +
 *  the router (some rooms are non-traversable, e.g. mechanical). */
export type RoomType =
  | "classroom"
  | "lab"
  | "office"
  | "auditorium"
  | "gym"
  | "storage"
  | "bathroom"
  | "locker_room"
  | "elevator"
  | "stairs"
  | "mechanical"
  | "cafeteria"
  | "library"
  | "entrance"
  | "exit"
  | "outdoor"
  | "emergency"
  | "other";

/** A building on the campus. Buildings own floors, which own rooms. */
export interface Building {
  id: string;
  name: string;
  nameEn?: string | null;
  nameFi?: string | null;
  description?: string | null;
  address?: string | null;
  colorCode?: string | null;
  floors?: number | null;
  /** Ordered polygon corners defining the building footprint. */
  points?: Polygon;
  /** Cached center for quick sort/label rendering. */
  center?: LatLng;
  /** Cached bbox for spatial indexing. */
  bbox?: BBox;
}

/** A floor inside a building. Number 0 = ground floor. */
export interface Floor {
  id: string;
  buildingId: string;
  floorNumber: number;
  name?: string | null;
  nameEn?: string | null;
  nameFi?: string | null;
}

/** A room inside a building on a specific floor. */
export interface Room {
  id: string;
  buildingId: string;
  floor: number;
  roomNumber: string;
  name?: string | null;
  nameEn?: string | null;
  nameFi?: string | null;
  type?: RoomType | null;
  capacity?: number | null;
  points?: Polygon;
  colorCode?: string | null;
  /** Free-form tags for search (e.g. "piano", "computer_lab"). */
  tags?: string[] | null;
}

/** A hallway segment. Multi-point corridors are stored as a chain of
 *  segments so the routing graph can add nodes at every waypoint. */
export interface Hallway {
  id: string;
  buildingId?: string | null;
  floor?: number | null;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  /** Optional physical width in metres — the router uses this to prefer
   *  wider corridors when routing wheelchair users. */
  width?: number | null;
}

/** A door between two spaces. Doors are what connect the navigation
 *  graph across room + hallway boundaries. */
export interface Door {
  id: string;
  buildingId: string;
  floor: number;
  position: LatLng;
  connects: [string, string]; // (roomId, hallwayId) or (roomA, roomB)
  swing?: "in" | "out" | "both" | null;
  accessible?: boolean | null;
  emergencyExit?: boolean | null;
  locked?: boolean | null;
}

/** A staircase connecting two or more floors. */
export interface Stair {
  id: string;
  buildingId: string;
  /** Floors this staircase reaches, in order. */
  floors: number[];
  position: LatLng;
  accessible?: boolean | null;
}

/** An elevator connecting one or more floors. */
export interface Elevator {
  id: string;
  buildingId: string;
  floors: number[];
  position: LatLng;
  accessible: boolean;
}

/** Admin-published defaults for the campus map. */
export interface MapDefaults {
  center: LatLng;
  zoom: number;
  bearing: number;
  pitch: number;
  minZoom: number;
  maxZoom: number;
}

/** Navigation graph node (planned M4). */
export interface NavGraphNode {
  id: string;
  position: LatLng;
  floor: number;
  buildingId?: string | null;
  type: "room" | "door" | "hallway_waypoint" | "stair" | "elevator" | "outdoor";
}

/** Navigation graph edge (planned M4). */
export interface NavGraphEdge {
  id: string;
  from: string; // NavGraphNode.id
  to: string;
  distance: number; // metres
  accessible: boolean;
  restrictions?: string[] | null;
}
