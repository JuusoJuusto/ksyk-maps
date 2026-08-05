/**
 * @ksyk/shared/types — canonical KSYK Maps domain types.
 *
 * Every consumer (public map, builder, renderer, routing, server)
 * agrees on these shapes. Schema-drift-y persistence fields
 * (`createdAt`, `updatedAt`) live on the DB-shape supertypes; the
 * runtime view stays lean.
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

/** Timestamp fields common to all persisted entities. */
export interface Timestamped {
  createdAt?: string | null;
  updatedAt?: string | null;
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

/** Outdoor area category. Feeds routing (paths ARE traversable, grass
 *  is NOT unless the profile explicitly allows it) and rendering. */
export type OutdoorAreaType =
  | "road"
  | "path"
  | "grass"
  | "parking"
  | "trees"
  | "bike_parking"
  | "entrance_zone"
  | "bus_stop"
  | "drop_off";

/** A building on the campus. Buildings own floors, which own rooms. */
export interface Building extends Timestamped {
  id: string;
  name: string;
  nameEn?: string | null;
  nameFi?: string | null;
  description?: string | null;
  address?: string | null;
  colorCode?: string | null;
  /** Number of floors this building has (informational — the source of
   *  truth is the `Floor` table). */
  floors?: number | null;
  /** Explicit floor range for this building. Set when the building
   *  spans a non-1-based range (e.g. a wing that only sits on
   *  floors 2..4, or a basement gym at -1..0). When unset the range
   *  defaults to `1..(floors ?? 1)`. */
  floorMin?: number | null;
  floorMax?: number | null;
  defaultFloor?: number | null;
  campus?: string | null;
  /** Ordered polygon corners defining the building footprint. */
  points?: Polygon;
  /** Cached center for quick sort/label rendering. */
  center?: LatLng;
  /** Cached bbox for spatial indexing. */
  bbox?: BBox;
  /** Rotation of the building's local coordinate frame, degrees CW from
   *  north. Renderer uses this when computing label rotation for label
   *  "along building" mode. */
  rotationDeg?: number | null;
  /** Free-form metadata (opening hours, contact, etc.). */
  metadata?: Record<string, unknown> | null;
  /** Building-specific theme override. See `MapTheme`. */
  theme?: Partial<MapTheme> | null;
}

/** A floor inside a building. Number 0 = ground floor, -1 = basement. */
export interface Floor extends Timestamped {
  id: string;
  buildingId: string;
  floorNumber: number;
  name?: string | null;
  nameEn?: string | null;
  nameFi?: string | null;
  /** Physical height above campus datum in metres. Used for 3D building
   *  extrusion + elevator/stair cost heuristics. */
  elevationMeters?: number | null;
  /** Physical floor height in metres (top of this floor - bottom). */
  heightMeters?: number | null;
  /** Optional URL for a floor-plan raster to display beneath the vector
   *  geometry. */
  backgroundImageUrl?: string | null;
  /** Outline polygon of the floor slab (may differ from the building
   *  footprint for tiered buildings). */
  outline?: Polygon;
  /** Default camera state when the user first opens this floor. */
  defaultZoom?: number | null;
  defaultBearing?: number | null;
}

/** A room inside a building on a specific floor. */
export interface Room extends Timestamped {
  id: string;
  buildingId: string;
  floor: number;
  roomNumber: string;
  name?: string | null;
  nameEn?: string | null;
  nameFi?: string | null;
  displayName?: string | null;
  description?: string | null;
  type?: RoomType | null;
  capacity?: number | null;
  department?: string | null;
  /** Primary teacher / owner of the room. */
  teacher?: string | null;
  /** Extra aliases (e.g. "the physics lab", "computer lab") used by
   *  search. */
  aliases?: string[] | null;
  points?: Polygon;
  /** Rotation of the room's local frame in degrees CW. Renderer uses
   *  it to orient the room's label. */
  rotationDeg?: number | null;
  colorCode?: string | null;
  /** Free-form tags for search (e.g. "piano", "computer_lab"). */
  tags?: string[] | null;
  /** Presentation area in square metres — for the info panel. */
  areaSquareMeters?: number | null;
  /** URL to an icon override; falls back to the type-derived icon. */
  iconUrl?: string | null;
  /** Availability schedule reference (external system id). */
  availabilityId?: string | null;
  /** v3.29.0 — first-class photo URL surfaced by the info drawer as
   *  the hero image. Also read-through from `metadata.photoUrl` for
   *  backward compatibility with rooms authored before this column. */
  photoUrl?: string | null;
  /** v3.29.0 — first-class opening/usage hours string. Free-form so
   *  admins can write "Mon-Fri 8-16" or a longer note. */
  hours?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** A hallway segment. Multi-point corridors are stored as a chain of
 *  segments so the routing graph can add nodes at every waypoint. */
export interface Hallway extends Timestamped {
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
  /** Surface type — affects routing cost (e.g. gravel ↑ cost). The
   *  special value "wall" reuses this table to store non-traversable
   *  wall segments; the router treats them as obstacles and the
   *  renderer draws them as thick dark lines instead of amber lanes. */
  surface?: "concrete" | "carpet" | "tile" | "gravel" | "asphalt" | "wall" | null;
  /** Allowed traversal direction. Undirected by default. */
  directions?: "both" | "start_to_end" | "end_to_start" | null;
  accessible?: boolean | null;
}

/** A door between two spaces. Doors are what connect the navigation
 *  graph across room + hallway boundaries. */
export interface Door extends Timestamped {
  id: string;
  buildingId: string;
  floor: number;
  position: LatLng;
  connects: [string, string]; // (roomId, hallwayId) or (roomA, roomB)
  /** Which direction the door opens. */
  swing?: "in" | "out" | "both" | null;
  /** Rotation in degrees for the door swing arc. */
  swingArcDeg?: number | null;
  widthMeters?: number | null;
  accessible?: boolean | null;
  emergencyExit?: boolean | null;
  locked?: boolean | null;
  autoClose?: boolean | null;
  visible?: boolean | null;
}

/** A window in a room wall. Purely visual — not part of routing. */
export interface Window extends Timestamped {
  id: string;
  buildingId: string;
  floor: number;
  position: LatLng;
  widthMeters?: number | null;
  rotationDeg?: number | null;
  metadata?: Record<string, unknown> | null;
}

/** A staircase connecting two or more floors. */
export interface Stair extends Timestamped {
  id: string;
  buildingId: string;
  /** Floors this staircase reaches, in order. */
  floors: number[];
  position: LatLng;
  accessible?: boolean | null;
  /** Direction restriction if any (rare — usually two-way). */
  directions?: "both" | "up" | "down" | null;
}

/** An elevator connecting one or more floors. */
export interface Elevator extends Timestamped {
  id: string;
  buildingId: string;
  floors: number[];
  position: LatLng;
  accessible: boolean;
  /** Human-facing name/label. */
  name?: string | null;
}

/** An outdoor area — road, path, grass, parking, etc. */
export interface OutdoorArea extends Timestamped {
  id: string;
  campus?: string | null;
  type: OutdoorAreaType;
  points: Polygon;
  name?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** A rendering/logical layer. Analogous to Photoshop layers. */
export interface MapLayer extends Timestamped {
  id: string;
  name: string;
  /** Group name for the layer picker. */
  group?: string | null;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0..1
  /** Draw order (lower = drawn first, i.e. behind). */
  z: number;
  blendMode?: "normal" | "multiply" | "screen" | "overlay" | null;
  /** Whether children are grouped in the layer picker. */
  collapsed?: boolean;
}

/** Admin-published defaults for the campus map. This is the full schema
 *  — a subset is exposed via `/api/map-defaults`. */
export interface MapDefaults {
  /** Camera defaults. */
  center: LatLng;
  zoom: number;
  bearing: number;
  pitch: number;
  minZoom: number;
  maxZoom: number;

  /** Camera behaviour. */
  allowFreeRotation?: boolean;
  snapRotationDeg?: number | null;
  smoothZoom?: boolean;
  smoothPan?: boolean;
  inertia?: boolean;
  doubleClickZoom?: boolean;
  wheelSensitivity?: number;
  touchSensitivity?: number;

  /** Navigation defaults. */
  walkingSpeedMps?: number;
  wheelchairSpeedMps?: number;
  stairCostMultiplier?: number;
  elevatorCostMultiplier?: number;
  outdoorCostMultiplier?: number;
  accessibleRouting?: boolean;
  defaultRoutingProfile?: "walking" | "wheelchair" | "fast";
  preferredEntranceIds?: string[];
  graphPrecisionMeters?: number;
  waypointSpacingMeters?: number;
  cornerSmoothing?: boolean;

  /** Rendering defaults. */
  antialiasing?: boolean;
  labelQuality?: "low" | "medium" | "high";
  targetFps?: number;
  renderDistanceMeters?: number;
  dynamicCulling?: boolean;
  occlusionCulling?: boolean;
  lod?: boolean;

  /** Labels. */
  labelFont?: string;
  labelScaling?: number;
  labelCollisionAvoidance?: boolean;
  labelFadeStart?: number;
  labelRotationMode?: "auto" | "upright" | "along";
  labelHaloWidth?: number;

  /** Grid + snap (Builder). */
  gridSizeMeters?: number;
  snapToGrid?: boolean;
  snapAngleDeg?: number | null;
  magneticSnap?: boolean;
  alignmentGuides?: boolean;

  /** Theme. */
  theme?: MapTheme;

  /** Export defaults (Builder). */
  compression?: "none" | "gzip" | "brotli";
  chunkSizeKb?: number;
  lazyLoading?: boolean;
  atlasGeneration?: boolean;
}

/** Rendering theme. */
export interface MapTheme {
  mode: "light" | "dark" | "auto";
  schoolColor?: string;
  accentColor?: string;
  selectionColor?: string;
  hoverColor?: string;
  errorColor?: string;
  accessibleColor?: string;
}

/** Navigation graph node. */
export interface NavGraphNode {
  id: string;
  position: LatLng;
  floor: number;
  buildingId?: string | null;
  type: "room" | "door" | "hallway_waypoint" | "stair" | "elevator" | "outdoor";
}

/** Navigation graph edge. */
export interface NavGraphEdge {
  id: string;
  from: string; // NavGraphNode.id
  to: string;
  distance: number; // metres
  accessible: boolean;
  /** Free-form restrictions ("locked", "emergency_only", …) — the
   *  router filters against a profile's restriction set. */
  restrictions?: string[] | null;
}

/**
 * Manifest for a versioned map export. Builder produces one; Maps
 * consumes it. Everything downstream is deterministic given a Manifest.
 */
export interface MapPackageManifest {
  /** Semver of the package format. */
  version: string;
  /** Human-readable title (e.g. "KSYK Campus – 2026 fall term"). */
  title: string;
  /** ISO date this snapshot was published. */
  publishedAt: string;
  /** Editor's user id. */
  publishedBy?: string | null;
  /** Optional short description. */
  description?: string | null;
  /** Names of the assets included (relative to the package root). */
  assets?: string[];
  /** SHA-256 of the payload for integrity checking. */
  contentHash?: string | null;
}

/**
 * A full map package. Serialisable, versionable, and self-contained.
 */
export interface MapPackage {
  manifest: MapPackageManifest;
  mapDefaults: MapDefaults;
  buildings: Building[];
  floors: Floor[];
  rooms: Room[];
  hallways: Hallway[];
  doors: Door[];
  windows?: Window[];
  stairs: Stair[];
  elevators: Elevator[];
  outdoorAreas?: OutdoorArea[];
  layers?: MapLayer[];
  /** Prebuilt nav graph — optional; server can rebuild on demand. */
  navGraph?: { nodes: NavGraphNode[]; edges: NavGraphEdge[] };
}

/**
 * Version-history entry for the Builder. Each `save()` in the Builder
 * creates one; `publish()` promotes the head draft.
 */
export interface MapVersion {
  id: string;
  /** Package id these versions belong to. */
  packageId: string;
  /** Version number (monotonic). */
  version: number;
  /** ISO date. */
  savedAt: string;
  /** Editor's user id. */
  savedBy?: string | null;
  /** Whether this version has been published (visible in Maps). */
  published: boolean;
  /** Short human-facing comment. */
  message?: string | null;
  /** Storage key for the serialised payload. */
  payloadKey: string;
}
