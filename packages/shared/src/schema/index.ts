/**
 * @ksyk/shared/schema — zod schemas mirroring `types`.
 *
 * Use these on trust boundaries: HTTP request bodies, imported files,
 * builder autosave payloads. Internal TS code should keep using the
 * `types` interfaces directly — zod validation is not free.
 *
 * The mapping is intentionally 1:1 with `types/index.ts`. If you touch
 * a type there, touch its schema here.
 */
import { z } from "zod";

export const LatLngSchema = z.object({
  lat: z.number().finite(),
  lng: z.number().finite(),
});

export const PolygonSchema = z.array(LatLngSchema).min(3);

export const BBoxSchema = z.object({
  minLat: z.number().finite(),
  minLng: z.number().finite(),
  maxLat: z.number().finite(),
  maxLng: z.number().finite(),
});

export const RoomTypeSchema = z.enum([
  "classroom", "lab", "office", "lobby", "auditorium", "gym", "storage",
  "bathroom", "locker_room", "elevator", "stairs", "mechanical",
  "cafeteria", "library", "entrance", "exit", "outdoor", "emergency",
  "other",
]);

export const OutdoorAreaTypeSchema = z.enum([
  "road", "path", "grass", "parking", "trees", "bike_parking",
  "entrance_zone", "bus_stop", "drop_off",
]);

export const MapThemeSchema = z.object({
  mode: z.enum(["light", "dark", "auto"]),
  schoolColor: z.string().optional(),
  accentColor: z.string().optional(),
  selectionColor: z.string().optional(),
  hoverColor: z.string().optional(),
  errorColor: z.string().optional(),
  accessibleColor: z.string().optional(),
});

export const BuildingSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameEn: z.string().nullable().optional(),
  nameFi: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  colorCode: z.string().nullable().optional(),
  floors: z.number().int().nullable().optional(),
  defaultFloor: z.number().int().nullable().optional(),
  campus: z.string().nullable().optional(),
  points: z.array(LatLngSchema).optional(),
  center: LatLngSchema.optional(),
  bbox: BBoxSchema.optional(),
  rotationDeg: z.number().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  theme: MapThemeSchema.partial().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const FloorSchema = z.object({
  id: z.string(),
  buildingId: z.string(),
  floorNumber: z.number().int(),
  name: z.string().nullable().optional(),
  nameEn: z.string().nullable().optional(),
  nameFi: z.string().nullable().optional(),
  elevationMeters: z.number().nullable().optional(),
  heightMeters: z.number().nullable().optional(),
  backgroundImageUrl: z.string().nullable().optional(),
  outline: z.array(LatLngSchema).optional(),
  defaultZoom: z.number().nullable().optional(),
  defaultBearing: z.number().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const RoomSchema = z.object({
  id: z.string(),
  buildingId: z.string(),
  floor: z.number().int(),
  roomNumber: z.string(),
  name: z.string().nullable().optional(),
  nameEn: z.string().nullable().optional(),
  nameFi: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  type: RoomTypeSchema.nullable().optional(),
  capacity: z.number().int().nullable().optional(),
  department: z.string().nullable().optional(),
  teacher: z.string().nullable().optional(),
  aliases: z.array(z.string()).nullable().optional(),
  points: z.array(LatLngSchema).optional(),
  rotationDeg: z.number().nullable().optional(),
  colorCode: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  areaSquareMeters: z.number().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  availabilityId: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const HallwaySchema = z.object({
  id: z.string(),
  buildingId: z.string().nullable().optional(),
  floor: z.number().int().nullable().optional(),
  startX: z.number().finite(),
  startY: z.number().finite(),
  endX: z.number().finite(),
  endY: z.number().finite(),
  width: z.number().nullable().optional(),
  surface: z.enum(["concrete", "carpet", "tile", "gravel", "asphalt"]).nullable().optional(),
  directions: z.enum(["both", "start_to_end", "end_to_start"]).nullable().optional(),
  accessible: z.boolean().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const DoorSchema = z.object({
  id: z.string(),
  buildingId: z.string(),
  floor: z.number().int(),
  position: LatLngSchema,
  connects: z.tuple([z.string(), z.string()]),
  swing: z.enum(["in", "out", "both"]).nullable().optional(),
  swingArcDeg: z.number().nullable().optional(),
  widthMeters: z.number().nullable().optional(),
  accessible: z.boolean().nullable().optional(),
  emergencyExit: z.boolean().nullable().optional(),
  locked: z.boolean().nullable().optional(),
  autoClose: z.boolean().nullable().optional(),
  visible: z.boolean().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const StairSchema = z.object({
  id: z.string(),
  buildingId: z.string(),
  floors: z.array(z.number().int()).min(2),
  position: LatLngSchema,
  accessible: z.boolean().nullable().optional(),
  directions: z.enum(["both", "up", "down"]).nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const ElevatorSchema = z.object({
  id: z.string(),
  buildingId: z.string(),
  floors: z.array(z.number().int()).min(1),
  position: LatLngSchema,
  accessible: z.boolean(),
  name: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const OutdoorAreaSchema = z.object({
  id: z.string(),
  campus: z.string().nullable().optional(),
  type: OutdoorAreaTypeSchema,
  points: PolygonSchema,
  name: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const MapLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  group: z.string().nullable().optional(),
  visible: z.boolean(),
  locked: z.boolean(),
  opacity: z.number().min(0).max(1),
  z: z.number(),
  blendMode: z.enum(["normal", "multiply", "screen", "overlay"]).nullable().optional(),
  collapsed: z.boolean().optional(),
});

export const MapDefaultsSchema = z.object({
  center: LatLngSchema,
  zoom: z.number(),
  bearing: z.number(),
  pitch: z.number(),
  minZoom: z.number(),
  maxZoom: z.number(),
  allowFreeRotation: z.boolean().optional(),
  snapRotationDeg: z.number().nullable().optional(),
  smoothZoom: z.boolean().optional(),
  smoothPan: z.boolean().optional(),
  inertia: z.boolean().optional(),
  doubleClickZoom: z.boolean().optional(),
  wheelSensitivity: z.number().optional(),
  touchSensitivity: z.number().optional(),
  walkingSpeedMps: z.number().optional(),
  wheelchairSpeedMps: z.number().optional(),
  stairCostMultiplier: z.number().optional(),
  elevatorCostMultiplier: z.number().optional(),
  outdoorCostMultiplier: z.number().optional(),
  accessibleRouting: z.boolean().optional(),
  defaultRoutingProfile: z.enum(["walking", "wheelchair", "fast"]).optional(),
  preferredEntranceIds: z.array(z.string()).optional(),
  graphPrecisionMeters: z.number().optional(),
  waypointSpacingMeters: z.number().optional(),
  cornerSmoothing: z.boolean().optional(),
  antialiasing: z.boolean().optional(),
  labelQuality: z.enum(["low", "medium", "high"]).optional(),
  targetFps: z.number().optional(),
  renderDistanceMeters: z.number().optional(),
  dynamicCulling: z.boolean().optional(),
  occlusionCulling: z.boolean().optional(),
  lod: z.boolean().optional(),
  labelFont: z.string().optional(),
  labelScaling: z.number().optional(),
  labelCollisionAvoidance: z.boolean().optional(),
  labelFadeStart: z.number().optional(),
  labelRotationMode: z.enum(["auto", "upright", "along"]).optional(),
  labelHaloWidth: z.number().optional(),
  gridSizeMeters: z.number().optional(),
  snapToGrid: z.boolean().optional(),
  snapAngleDeg: z.number().nullable().optional(),
  magneticSnap: z.boolean().optional(),
  alignmentGuides: z.boolean().optional(),
  theme: MapThemeSchema.optional(),
  compression: z.enum(["none", "gzip", "brotli"]).optional(),
  chunkSizeKb: z.number().optional(),
  lazyLoading: z.boolean().optional(),
  atlasGeneration: z.boolean().optional(),
});

export const NavGraphNodeSchema = z.object({
  id: z.string(),
  position: LatLngSchema,
  floor: z.number().int(),
  buildingId: z.string().nullable().optional(),
  type: z.enum(["room", "door", "hallway_waypoint", "stair", "elevator", "outdoor"]),
});

export const NavGraphEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  distance: z.number().nonnegative(),
  accessible: z.boolean(),
  restrictions: z.array(z.string()).nullable().optional(),
});

export const MapPackageManifestSchema = z.object({
  version: z.string(),
  title: z.string(),
  publishedAt: z.string(),
  publishedBy: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  assets: z.array(z.string()).optional(),
  contentHash: z.string().nullable().optional(),
});

export const MapPackageSchema = z.object({
  manifest: MapPackageManifestSchema,
  mapDefaults: MapDefaultsSchema,
  buildings: z.array(BuildingSchema),
  floors: z.array(FloorSchema),
  rooms: z.array(RoomSchema),
  hallways: z.array(HallwaySchema),
  doors: z.array(DoorSchema),
  stairs: z.array(StairSchema),
  elevators: z.array(ElevatorSchema),
  outdoorAreas: z.array(OutdoorAreaSchema).optional(),
  layers: z.array(MapLayerSchema).optional(),
  navGraph: z.object({
    nodes: z.array(NavGraphNodeSchema),
    edges: z.array(NavGraphEdgeSchema),
  }).optional(),
});
