import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  real,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"),
  password: varchar("password"),
  isTemporaryPassword: boolean("is_temporary_password").default(false),
  canLoginToKsykMaps: boolean("can_login_to_ksyk_maps").default(true),
  twoFactorSecret: varchar("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorBackupCodes: text("two_factor_backup_codes"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_users_password_reset_token").on(table.passwordResetToken),
]);

// Buildings table — no extra indexes needed (queried by PK only on writes)
export const buildings = pgTable("buildings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  nameEn: varchar("name_en"),
  nameFi: varchar("name_fi"),
  description: text("description"),
  descriptionEn: text("description_en"),
  descriptionFi: text("description_fi"),
  floors: integer("floors").default(1),
  // Explicit floor range. When both are set the map's floor selector
  // uses these instead of `1..floors`. Nullable â€” old rows keep working.
  floorMin: integer("floor_min"),
  floorMax: integer("floor_max"),
  capacity: integer("capacity"),
  facilities: text("facilities").array(),
  accessInfo: text("access_info"),
  mapPositionX: integer("map_position_x"),
  mapPositionY: integer("map_position_y"),
  colorCode: varchar("color_code").default("#3B82F6"),
  isActive: boolean("is_active").default(true),
  // KSYK Maps: Building enhancement fields
  openingHours: jsonb("opening_hours"), // { monday: { open: "07:00", close: "22:00" }, ... }
  lobbyServices: text("lobby_services").array(), // reception, security, info_desk, etc.
  entrances: jsonb("entrances"), // [{ type: "main", accessible: true, x: 100, y: 200 }, ...]
  parkingInfo: jsonb("parking_info"), // { bike: 50, car: 20, accessible: 5 }
  photos: text("photos").array(), // Building photos
  address: varchar("address"),
  postalCode: varchar("postal_code"),
  city: varchar("city").default("Helsinki"),
  coordinates: jsonb("coordinates"),
  points: jsonb("points"),
  rotationDeg: numeric("rotation_deg"),
  defaultFloor: integer("default_floor"),
  campus: varchar("campus"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rooms table
export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").references(() => buildings.id).notNull(),
  roomNumber: varchar("room_number").notNull(),
  name: varchar("name"),
  nameEn: varchar("name_en"),
  nameFi: varchar("name_fi"),
  floor: integer("floor").default(1),
  capacity: integer("capacity"),
  type: varchar("type"), // classroom, lab, office, hallway, toilet, emergency_exit, storage, cafeteria, library_room, music_room, gym, etc.
  subType: varchar("sub_type"), // More specific categorization
  equipment: text("equipment").array(),
  features: text("features").array(), // accessibility features, emergency equipment, etc.
  mapPositionX: integer("map_position_x"),
  mapPositionY: integer("map_position_y"),
  width: integer("width"),
  height: integer("height"),
  colorCode: varchar("color_code").default("#6B7280"),
  emergencyInfo: text("emergency_info"), // For emergency exits and safety info
  accessibilityInfo: text("accessibility_info"),
  maintenanceNotes: text("maintenance_notes"),
  lastInspected: timestamp("last_inspected"),
  isPublic: boolean("is_public").default(true), // Whether to show on public maps
  isAccessible: boolean("is_accessible").default(true),
  isActive: boolean("is_active").default(true),
  // KSYK Maps: Room booking fields
  isBookable: boolean("is_bookable").default(false),
  bookingDuration: integer("booking_duration").default(60), // minutes
  maxOccupancy: integer("max_occupancy"),
  amenities: text("amenities").array(), // projector, whiteboard, tv, computers, outlets, wifi, etc.
  currentStatus: varchar("current_status").default("unknown"), // free, occupied, reserved, maintenance, unknown
  nextAvailableAt: timestamp("next_available_at"),
  photos: text("photos").array(), // URLs to room photos
  virtualTourUrl: varchar("virtual_tour_url"), // 360Â° tour link
  bookingRules: text("booking_rules"), // Special rules or requirements
  requiresApproval: boolean("requires_approval").default(false),
  description: text("description"),
  points: jsonb("points"),
  rotationDeg: numeric("rotation_deg"),
  department: varchar("department"),
  teacher: varchar("teacher"),
  scheduleUrl: varchar("schedule_url"),
  scheduleLabel: varchar("schedule_label"),
  photoUrl: varchar("photo_url"),
  coordinates: jsonb("coordinates"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_rooms_building_id").on(table.buildingId),
  index("IDX_rooms_is_active").on(table.isActive),
]);

// Staff table
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique(),
  phone: varchar("phone"),
  position: varchar("position"),
  positionEn: varchar("position_en"),
  positionFi: varchar("position_fi"),
  department: varchar("department"),
  departmentEn: varchar("department_en"),
  departmentFi: varchar("department_fi"),
  officeRoomId: varchar("office_room_id").references(() => rooms.id),
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  bioEn: text("bio_en"),
  bioFi: text("bio_fi"),
  /** Teacher abbreviation used in Wilma schedules, e.g. "JLä". */
  abbrev: varchar("abbrev"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subjects — course/subject codes used in Wilma schedules.
// code is the prefix that appears in course codes (e.g. "FY" for FY1.F).
export const subjects = pgTable("subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  name: varchar("name").notNull(),
  nameEn: varchar("name_en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  titleEn: varchar("title_en"),
  titleFi: varchar("title_fi"),
  description: text("description"),
  descriptionEn: text("description_en"),
  descriptionFi: text("description_fi"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: varchar("location"),
  roomId: varchar("room_id").references(() => rooms.id),
  organizerId: varchar("organizer_id").references(() => staff.id),
  isPublic: boolean("is_public").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Floors table
export const floors = pgTable("floors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").references(() => buildings.id).notNull(),
  floorNumber: integer("floor_number").notNull(),
  name: varchar("name"),
  nameEn: varchar("name_en"),
  nameFi: varchar("name_fi"),
  description: text("description"),
  descriptionEn: text("description_en"),
  descriptionFi: text("description_fi"),
  mapImageUrl: varchar("map_image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_floors_building_id").on(table.buildingId),
]);

// Hallways table  
export const hallways = pgTable("hallways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").references(() => buildings.id),
  floorId: varchar("floor_id").references(() => floors.id),
  name: varchar("name"),
  nameEn: varchar("name_en"),
  nameFi: varchar("name_fi"),
  description: text("description"),
  descriptionEn: text("description_en"),
  descriptionFi: text("description_fi"),
  startX: real("start_x"),
  startY: real("start_y"),
  endX: real("end_x"),
  endY: real("end_y"),
  // v3.30.0 â€” multi-vertex polyline. When set, this array of
  // { lat, lng } wins over startX/Y + endX/Y (which we still keep
  // in sync as the first/last points for backward compat).
  points: jsonb("points"),
  width: integer("width").default(2),
  colorCode: varchar("color_code").default("#9CA3AF"),
  emergencyRoute: boolean("emergency_route").default(false),
  accessibilityInfo: text("accessibility_info"),
  isPublic: boolean("is_public").default(true),
  isActive: boolean("is_active").default(true),
  surface: varchar("surface"),
  floor: integer("floor"),
  directions: varchar("directions"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_hallways_building_id").on(table.buildingId),
  index("IDX_hallways_floor_id").on(table.floorId),
]);

// Announcements table
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  titleEn: varchar("title_en"),
  titleFi: varchar("title_fi"),
  content: text("content").notNull(),
  contentEn: text("content_en"),
  contentFi: text("content_fi"),
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  authorId: varchar("author_id").references(() => staff.id),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tickets table
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().unique(),
  type: varchar("type").notNull(), // bug, feature, support, error
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  name: varchar("name"),
  email: varchar("email"),
  status: varchar("status").default("pending"), // pending, in_progress, resolved, closed
  priority: varchar("priority").default("normal"), // low, normal, high, critical
  assignedTo: varchar("assigned_to").references(() => users.id),
  response: text("response"),
  errorReferenceId: varchar("error_reference_id"), // For automatic error submissions
  errorStack: text("error_stack"), // Stack trace
  errorInfo: jsonb("error_info"), // Additional error context
  userAgent: text("user_agent"), // Browser info
  url: text("url"), // Page where error occurred
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Admin Login Logs table
export const adminLoginLogs = pgTable("admin_login_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  email: varchar("email").notNull(),
  userName: varchar("user_name"),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  loginStatus: varchar("login_status").notNull(), // success, failed
  failureReason: varchar("failure_reason"),
  sessionId: varchar("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_admin_login_logs_email").on(table.email),
  index("IDX_admin_login_logs_created_at").on(table.createdAt),
]);

// App Logs table for error tracking
export const appLogs = pgTable("app_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  level: varchar("level").notNull(), // error, warn, info, debug
  message: text("message").notNull(),
  errorReferenceId: varchar("error_reference_id").unique(), // Unique ID for errors
  errorStack: text("error_stack"),
  errorInfo: jsonb("error_info"),
  userAgent: text("user_agent"),
  url: text("url"),
  userId: varchar("user_id").references(() => users.id),
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_app_logs_created_at").on(table.createdAt),
  index("IDX_app_logs_level_created_at").on(table.level, table.createdAt),
]);


// Analytics tables
export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  userId: varchar("user_id").references(() => users.id),
  url: text("url").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  country: varchar("country"),
  city: varchar("city"),
  browser: varchar("browser"),
  browserVersion: varchar("browser_version"),
  os: varchar("os"),
  deviceType: varchar("device_type"), // desktop, mobile, tablet
  screenResolution: varchar("screen_resolution"),
  language: varchar("language"),
  timeZone: varchar("time_zone"),
  duration: integer("duration"), // in seconds
  isBounce: boolean("is_bounce").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_page_views_created_at").on(table.createdAt),
]);

export const searchAnalytics = pgTable("search_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  userId: varchar("user_id").references(() => users.id),
  query: text("query").notNull(),
  resultsCount: integer("results_count").default(0),
  clickedResult: varchar("clicked_result"), // room/building ID that was clicked
  searchType: varchar("search_type").default("room"), // room, staff, building
  filters: jsonb("filters"), // applied filters
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  country: varchar("country"),
  city: varchar("city"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_search_analytics_created_at").on(table.createdAt),
]);

export const navigationAnalytics = pgTable("navigation_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  userId: varchar("user_id").references(() => users.id),
  fromRoom: varchar("from_room"), // room ID
  toRoom: varchar("to_room"), // room ID
  fromBuilding: varchar("from_building"), // building ID
  toBuilding: varchar("to_building"), // building ID
  navigationType: varchar("navigation_type"), // walking, driving, etc.
  distance: numeric("distance"), // in meters
  duration: integer("duration"), // estimated time in seconds
  waypoints: jsonb("waypoints"), // route waypoints
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  country: varchar("country"),
  city: varchar("city"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().unique(),
  userId: varchar("user_id").references(() => users.id),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  country: varchar("country"),
  city: varchar("city"),
  browser: varchar("browser"),
  os: varchar("os"),
  deviceType: varchar("device_type"),
  language: varchar("language"),
  referrer: text("referrer"),
  landingPage: text("landing_page"),
  exitPage: text("exit_page"),
  pageViews: integer("page_views").default(1),
  sessionDuration: integer("session_duration"), // in seconds
  isNewVisitor: boolean("is_new_visitor").default(true),
  isReturningVisitor: boolean("is_returning_visitor").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
});

// Map package versioning tables (replaces Firebase mapPackages/mapVersions collections)
export const mapVersions = pgTable("map_versions", {
  id: varchar("id").primaryKey(),
  packageId: varchar("package_id").default("current"),
  version: integer("version").notNull(),
  savedAt: timestamp("saved_at").defaultNow(),
  savedBy: varchar("saved_by"),
  published: boolean("published").default(false),
  message: text("message"),
  payloadKey: varchar("payload_key"),
  payload: jsonb("payload"),
});

export const mapPackages = pgTable("map_packages", {
  id: varchar("id").primaryKey(),
  pointer: varchar("pointer"),
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by"),
});

// Campus POIs — replaces Firestore campus_stairs / campus_elevators /
// campus_doors / campus_pois collections. `kind` is free-form so the
// builder can place new POI types without schema migrations.
export const campusPois = pgTable("campus_pois", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kind: varchar("kind").notNull(),  // stairs | elevators | doors | wc | info | …
  floor: integer("floor").default(1),
  mapPositionX: real("map_position_x"),  // lng
  mapPositionY: real("map_position_y"),  // lat
  position: jsonb("position"),           // { lat, lng }
  label: varchar("label"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Key-value settings — replaces Firestore single-doc collections:
// scheduleSettings, appearanceSettings, mapDefaults, securitySettings,
// mapLayers, easterEggCounters, easterEggRecent.
export const kvSettings = pgTable("kv_settings", {
  key: varchar("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WiFi beacon survey positions (indoor positioning research data).
export const beaconSurveys = pgTable(
  "beacon_surveys",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    roomId: varchar("room_id").notNull(),
    positionLabel: varchar("position_label").notNull(),
    capturedAt: timestamp("captured_at"),
    readings: jsonb("readings"),  // [{ bssid, rssi, ssid? }]
    lat: real("lat"),
    lng: real("lng"),
    accuracyM: real("accuracy_m"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("IDX_beacon_surveys_room_id").on(table.roomId)],
);

// Relations
export const buildingsRelations = relations(buildings, ({ many }) => ({
  rooms: many(rooms),
  floors: many(floors),
  hallways: many(hallways),
}));

export const floorsRelations = relations(floors, ({ one, many }) => ({
  building: one(buildings, {
    fields: [floors.buildingId],
    references: [buildings.id],
  }),
  hallways: many(hallways),
}));

export const hallwaysRelations = relations(hallways, ({ one }) => ({
  building: one(buildings, {
    fields: [hallways.buildingId],
    references: [buildings.id],
  }),
  floor: one(floors, {
    fields: [hallways.floorId],
    references: [floors.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  building: one(buildings, {
    fields: [rooms.buildingId],
    references: [buildings.id],
  }),
  staff: many(staff),
  events: many(events),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  user: one(users, {
    fields: [staff.userId],
    references: [users.id],
  }),
  officeRoom: one(rooms, {
    fields: [staff.officeRoomId],
    references: [rooms.id],
  }),
  events: many(events),
  announcements: many(announcements),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  room: one(rooms, {
    fields: [events.roomId],
    references: [rooms.id],
  }),
  organizer: one(staff, {
    fields: [events.organizerId],
    references: [staff.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(staff, {
    fields: [announcements.authorId],
    references: [staff.id],
  }),
}));

// Insert schemas.
//
// The base drizzle-zod schema strips unknown keys. But the client persists
// several fields (polygon `points`, `floorMin`, `floorMax`, `metadata`,
// `rotationDeg`, `defaultFloor`, `campus`, `description*`) that live on
// the shared TypeScript type but aren't yet real DB columns â€” Firestore
// stores them fine as jsonb-ish blobs, so we `.extend` the base schema
// to let them pass through instead of being silently dropped. Without
// this, every fresh building would save with no polygon and never
// render on the map.
export const insertBuildingSchema = createInsertSchema(buildings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  points: z.any().optional(),
  floorMin: z.number().nullable().optional(),
  floorMax: z.number().nullable().optional(),
  defaultFloor: z.number().nullable().optional(),
  rotationDeg: z.number().nullable().optional(),
  campus: z.string().nullable().optional(),
  metadata: z.any().optional(),
  theme: z.any().optional(),
  center: z.any().optional(),
  bbox: z.any().optional(),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  points: z.any().optional(),
  rotationDeg: z.number().nullable().optional(),
  displayName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  aliases: z.array(z.string()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  areaSquareMeters: z.number().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  availabilityId: z.string().nullable().optional(),
  metadata: z.any().optional(),
  teacher: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFloorSchema = createInsertSchema(floors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Same story as insertBuildingSchema â€” the builder POSTs a lightweight
// polyline (startX/Y, endX/Y, surface, floor) without buildingId/name
// because hallways/walls span the whole campus. Relax the required
// fields + let the extra ones pass through.
export const insertHallwaySchema = createInsertSchema(hallways).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().nullable().optional(),
  buildingId: z.string().nullable().optional(),
  startX: z.number().nullable().optional(),
  startY: z.number().nullable().optional(),
  endX: z.number().nullable().optional(),
  endY: z.number().nullable().optional(),
  surface: z.string().nullable().optional(),
  directions: z.string().nullable().optional(),
  accessible: z.boolean().nullable().optional(),
  floor: z.number().nullable().optional(),
  metadata: z.any().optional(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminLoginLogSchema = createInsertSchema(adminLoginLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAppLogSchema = createInsertSchema(appLogs).omit({
  id: true,
  createdAt: true,
});

export const insertPageViewSchema = createInsertSchema(pageViews).omit({
  id: true,
  createdAt: true,
});

export const insertSearchAnalyticSchema = createInsertSchema(searchAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertNavigationAnalyticSchema = createInsertSchema(navigationAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
});


// App Settings table
export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default('default'),
  appName: varchar("app_name").default("KSYK Map"),
  appNameEn: varchar("app_name_en").default("KSYK Map"),
  appNameFi: varchar("app_name_fi").default("KSYK Kartta"),
  logoUrl: varchar("logo_url"),
  primaryColor: varchar("primary_color").default("#3B82F6"),
  secondaryColor: varchar("secondary_color").default("#F59E0B"),
  successColor: varchar("success_color").default("#10B981"),
  warningColor: varchar("warning_color").default("#EF4444"),
  theme: varchar("theme").default("light"), // light, dark, system
  headerTitle: varchar("header_title").default("Campus Map"),
  headerTitleEn: varchar("header_title_en").default("Campus Map"),
  headerTitleFi: varchar("header_title_fi").default("Kampuskartta"),
  footerText: text("footer_text"),
  footerTextEn: text("footer_text_en"),
  footerTextFi: text("footer_text_fi"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  showStats: boolean("show_stats").default(true),
  showAnnouncements: boolean("show_announcements").default(true),
  enableSearch: boolean("enable_search").default(true),
  enableAnimations: boolean("enable_animations").default(true),
  enableAutoSave: boolean("enable_auto_save").default(true),
  compactMode: boolean("compact_mode").default(false),
  defaultLanguage: varchar("default_language").default("en"),
  aiSensitivity: numeric("ai_sensitivity").default("0.7"),
  enableSmartSnap: boolean("enable_smart_snap").default(true),
  enableRoomAutoCreation: boolean("enable_room_auto_creation").default(false),
  cacheMinutes: integer("cache_minutes").default(30),
  maxImageSizeMB: integer("max_image_size_mb").default(10),
  enablePreloadImages: boolean("enable_preload_images").default(true),
  enableLazyLoading: boolean("enable_lazy_loading").default(true),
  defaultZoomLevel: numeric("default_zoom_level").default("1.0"),
  enableEasterEgg: boolean("enable_easter_egg").default(true),
  enableEvents: boolean("enable_events").default(true),
  enableTicketSystem: boolean("enable_ticket_system").default(true),
  enableVersionInfo: boolean("enable_version_info").default(true),
  maintenanceMode: boolean("maintenance_mode").default(false),
  maintenanceMessage: text("maintenance_message"),
  // NEW ADVANCED FEATURES
  enableDarkModeToggle: boolean("enable_dark_mode_toggle").default(true),
  enableNotifications: boolean("enable_notifications").default(true),
  enableOfflineMode: boolean("enable_offline_mode").default(true),
  enableAnalytics: boolean("enable_analytics").default(false),
  enableAccessibilityMode: boolean("enable_accessibility_mode").default(true),
  enableKeyboardShortcuts: boolean("enable_keyboard_shortcuts").default(true),
  enableAdvancedSearch: boolean("enable_advanced_search").default(true),
  enableRoomBooking: boolean("enable_room_booking").default(false),
  enableQRCodeScanning: boolean("enable_qr_code_scanning").default(true),
  enableARMode: boolean("enable_ar_mode").default(false),
  enable3DView: boolean("enable_3d_view").default(false),
  enableVoiceCommands: boolean("enable_voice_commands").default(false),
  enableMultiLanguage: boolean("enable_multi_language").default(true),
  enableExportData: boolean("enable_export_data").default(true),
  // v4.7.56 — admin-controlled "Get the app" popup.  Columns were missing
  // from the schema, so the UPSERT silently dropped the values and the
  // toggle in /admin/settings never persisted.
  showGetAppPopup: boolean("show_get_app_popup").default(false),
  getAppUrl: varchar("get_app_url").default("/download"),
  // v1.0.2 — admin can hide the first-visit beta welcome popup entirely.
  // Default ON; admin flips to OFF once the public launch happens.
  showBetaBanner: boolean("show_beta_banner").default(true),
  enableImportData: boolean("enable_import_data").default(true),
  enableBulkOperations: boolean("enable_bulk_operations").default(true),
  enableAdvancedFilters: boolean("enable_advanced_filters").default(true),
  enableCustomFields: boolean("enable_custom_fields").default(false),
  enableWebhooks: boolean("enable_webhooks").default(false),
  enableAPIAccess: boolean("enable_api_access").default(false),
  maxUploadSizeMB: integer("max_upload_size_mb").default(50),
  sessionTimeoutMinutes: integer("session_timeout_minutes").default(60),
  maxLoginAttempts: integer("max_login_attempts").default(5),
  passwordMinLength: integer("password_min_length").default(8),
  requireStrongPassword: boolean("require_strong_password").default(true),
  enable2FA: boolean("enable_2fa").default(false),
  enableSSO: boolean("enable_sso").default(false),
  enableAuditLog: boolean("enable_audit_log").default(true),
  enableBackups: boolean("enable_backups").default(true),
  backupFrequencyHours: integer("backup_frequency_hours").default(24),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// AALTO SPACE TRANSFORMATION - ROOM BOOKING
// ============================================

// Room Bookings table
export const roomBookings = pgTable("room_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => rooms.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  purpose: varchar("purpose"), // study, meeting, group_work, lecture, exam
  attendees: integer("attendees"),
  status: varchar("status").default("confirmed"), // pending, confirmed, cancelled, completed
  notes: text("notes"),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  qrCode: varchar("qr_code").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Room Availability Schedule
export const roomAvailability = pgTable("room_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => rooms.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 6=Saturday
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(), // HH:MM format
  isAvailable: boolean("is_available").default(true),
  recurringType: varchar("recurring_type").default("weekly"), // weekly, daily, once
  exceptionDate: varchar("exception_date"), // YYYY-MM-DD for one-time exceptions
  createdAt: timestamp("created_at").defaultNow(),
});

// Campus Services (restaurants, cafes, gyms, etc.)
export const campusServices = pgTable("campus_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  nameEn: varchar("name_en"),
  nameFi: varchar("name_fi"),
  type: varchar("type").notNull(), // restaurant, cafe, gym, library, charging, recycling, atm, printer, health, counseling
  buildingId: varchar("building_id").references(() => buildings.id),
  roomId: varchar("room_id").references(() => rooms.id),
  floor: integer("floor"),
  description: text("description"),
  descriptionEn: text("description_en"),
  descriptionFi: text("description_fi"),
  openingHours: jsonb("opening_hours"), // { monday: { open: "08:00", close: "16:00" }, ... }
  currentlyOpen: boolean("currently_open").default(false),
  amenities: text("amenities").array(), // wifi, outlets, quiet, group_space, etc.
  dietaryOptions: text("dietary_options").array(), // vegetarian, vegan, gluten_free, halal, etc.
  paymentMethods: text("payment_methods").array(), // cash, card, mobile, student_card
  icon: varchar("icon").default("map-pin"),
  colorCode: varchar("color_code").default("#10B981"),
  website: varchar("website"),
  phone: varchar("phone"),
  email: varchar("email"),
  mapPositionX: integer("map_position_x"),
  mapPositionY: integer("map_position_y"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Room Sensors (for real-time occupancy)
export const roomSensors = pgTable("room_sensors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => rooms.id).notNull(),
  sensorType: varchar("sensor_type").notNull(), // motion, door, booking, manual
  lastActivity: timestamp("last_activity").defaultNow(),
  occupancyStatus: varchar("occupancy_status").default("unknown"), // free, occupied, reserved, unknown
  confidence: numeric("confidence").default("0.0"), // 0.0 to 1.0
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Favorites
export const userFavorites = pgTable("user_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  roomId: varchar("room_id").references(() => rooms.id),
  serviceId: varchar("service_id").references(() => campusServices.id),
  type: varchar("type").notNull(), // room, service, building
  nickname: varchar("nickname"), // Custom name for favorite
  createdAt: timestamp("created_at").defaultNow(),
});

// User Navigation History
export const userHistory = pgTable("user_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  roomId: varchar("room_id").references(() => rooms.id),
  serviceId: varchar("service_id").references(() => campusServices.id),
  action: varchar("action").notNull(), // visited, booked, searched, navigated
  searchQuery: text("search_query"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Push Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type").notNull(), // booking_reminder, announcement, service_update, maintenance
  title: varchar("title").notNull(),
  titleEn: varchar("title_en"),
  titleFi: varchar("title_fi"),
  message: text("message").notNull(),
  messageEn: text("message_en"),
  messageFi: text("message_fi"),
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  actionUrl: varchar("action_url"),
  actionLabel: varchar("action_label"),
  read: boolean("read").default(false),
  readAt: timestamp("read_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for new tables
export const roomBookingsRelations = relations(roomBookings, ({ one }) => ({
  room: one(rooms, {
    fields: [roomBookings.roomId],
    references: [rooms.id],
  }),
  user: one(users, {
    fields: [roomBookings.userId],
    references: [users.id],
  }),
}));

export const campusServicesRelations = relations(campusServices, ({ one }) => ({
  building: one(buildings, {
    fields: [campusServices.buildingId],
    references: [buildings.id],
  }),
  room: one(rooms, {
    fields: [campusServices.roomId],
    references: [rooms.id],
  }),
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
  room: one(rooms, {
    fields: [userFavorites.roomId],
    references: [rooms.id],
  }),
  service: one(campusServices, {
    fields: [userFavorites.serviceId],
    references: [campusServices.id],
  }),
}));

// Insert schemas for new tables
export const insertRoomBookingSchema = createInsertSchema(roomBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomAvailabilitySchema = createInsertSchema(roomAvailability).omit({
  id: true,
  createdAt: true,
});

export const insertCampusServiceSchema = createInsertSchema(campusServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomSensorSchema = createInsertSchema(roomSensors).omit({
  id: true,
  updatedAt: true,
});

export const insertUserFavoriteSchema = createInsertSchema(userFavorites).omit({
  id: true,
  createdAt: true,
});

export const insertUserHistorySchema = createInsertSchema(userHistory).omit({
  id: true,
  timestamp: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
  updatedAt: true,
});

// Classroom aliases — map Wilma location strings to KSYK Maps room IDs.
export const roomAliases = pgTable("room_aliases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wilmaString: varchar("wilma_string", { length: 512 }).notNull().unique(),
  roomId: varchar("room_id").references(() => rooms.id).notNull(),
  confidence: integer("confidence").default(99),
  method: varchar("method").default("manual"),
  approved: boolean("approved").default(true),
  approvedBy: varchar("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoomAliasSchema = createInsertSchema(roomAliases).omit({
  id: true,
  createdAt: true,
});

// Unknown location reports — Wilma strings that couldn't be matched.
export const unknownLocations = pgTable("unknown_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wilmaString: varchar("wilma_string", { length: 512 }).notNull(),
  occurrences: integer("occurrences").default(1),
  lastSeen: timestamp("last_seen").defaultNow(),
  resolved: boolean("resolved").default(false),
  resolvedRoomId: varchar("resolved_room_id").references(() => rooms.id),
});

// Types
export type RoomAlias = typeof roomAliases.$inferSelect;
export type InsertRoomAlias = z.infer<typeof insertRoomAliasSchema>;
export type UnknownLocation = typeof unknownLocations.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;
export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type Floor = typeof floors.$inferSelect;
export type InsertFloor = z.infer<typeof insertFloorSchema>;
export type Hallway = typeof hallways.$inferSelect;
export type InsertHallway = z.infer<typeof insertHallwaySchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export const insertSubjectSchema = createInsertSchema(subjects).omit({ id: true, createdAt: true, updatedAt: true });
export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type AdminLoginLog = typeof adminLoginLogs.$inferSelect;
export type InsertAdminLoginLog = z.infer<typeof insertAdminLoginLogSchema>;
export type AppLog = typeof appLogs.$inferSelect;
export type InsertAppLog = z.infer<typeof insertAppLogSchema>;
export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type SearchAnalytic = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytic = z.infer<typeof insertSearchAnalyticSchema>;
export type NavigationAnalytic = typeof navigationAnalytics.$inferSelect;
export type InsertNavigationAnalytic = z.infer<typeof insertNavigationAnalyticSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

// ── v4.5.52 telemetry additions ────────────────────────────────────
// Added 2026-08-30. Reuses existing pageViews / searchAnalytics /
// navigationAnalytics / appLogs where possible; the new tables here
// cover event categories the existing schema didn't have a home for.

/**
 * Session lifecycle (session_started, session_ended, heartbeat).
 * Anonymous IDs are fine — we never require a real userId.
 */
export const telemetrySessions = pgTable(
  "telemetry_sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").notNull().unique(),
    anonymousId: varchar("anonymous_id"),
    userId: varchar("user_id"),
    platform: varchar("platform").notNull(),      // web | android | ios
    appVersion: varchar("app_version"),
    osVersion: varchar("os_version"),
    deviceType: varchar("device_type"),           // mobile | tablet | desktop
    browser: varchar("browser"),
    browserVersion: varchar("browser_version"),
    language: varchar("language"),
    timezone: varchar("timezone"),
    country: varchar("country"),
    startedAt: timestamp("started_at").defaultNow(),
    lastSeenAt: timestamp("last_seen_at").defaultNow(),
    endedAt: timestamp("ended_at"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_tsessions_platform").on(table.platform),
    index("idx_tsessions_started_at").on(table.startedAt),
    index("idx_tsessions_last_seen").on(table.lastSeenAt),
  ],
);

/**
 * Generic first-party firehose. Every event that doesn't have its own
 * dedicated table (pageView, search, navigation, appLog, easterEgg,
 * performance) lands here. Metadata is JSONB so we can add new event
 * shapes without migrations.
 */
export const telemetryEvents = pgTable(
  "telemetry_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").notNull(),
    userId: varchar("user_id"),
    platform: varchar("platform").notNull(),
    appVersion: varchar("app_version"),
    eventName: varchar("event_name").notNull(),
    eventCategory: varchar("event_category"),     // ui | map | schedule | auth | …
    route: varchar("route"),
    screen: varchar("screen"),
    durationMs: integer("duration_ms"),
    success: boolean("success"),
    errorCode: varchar("error_code"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_tevents_created_at").on(table.createdAt),
    index("idx_tevents_event_name").on(table.eventName),
    index("idx_tevents_session_id").on(table.sessionId),
    index("idx_tevents_platform").on(table.platform),
  ],
);

/**
 * Feature usage counters — feature_opened, feature_used, feature_completed,
 * feature_failed. Denormalised on purpose so we can aggregate cheaply.
 */
export const featureUsage = pgTable(
  "feature_usage",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").notNull(),
    userId: varchar("user_id"),
    platform: varchar("platform").notNull(),
    appVersion: varchar("app_version"),
    feature: varchar("feature").notNull(),        // map | schedule | search | …
    action: varchar("action").notNull().default("used"), // opened | used | completed | failed
    durationMs: integer("duration_ms"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_feature_created_at").on(table.createdAt),
    index("idx_feature_feature").on(table.feature),
    index("idx_feature_action").on(table.action),
  ],
);

/**
 * v4.7.12 — rrweb DOM snapshot storage. Each row is a batch of
 * serialized rrweb events (typically 50–500 events per batch, ~5 s
 * of wall-clock activity). Session id + batch seq lets the player
 * replay in order across multiple upload batches without ambiguity.
 *
 * We keep the events blob raw — no server-side parsing. The rrweb
 * player deserializes on demand in the admin viewer.
 */
export const rrwebBatches = pgTable(
  "rrweb_batches",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").notNull(),
    seq: integer("seq").notNull(),               // batch order within the session
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at").notNull(),
    eventCount: integer("event_count").notNull(),
    events: jsonb("events").notNull(),           // raw rrweb event array
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_rrweb_session").on(table.sessionId),
    index("idx_rrweb_created_at").on(table.createdAt),
  ],
);

/**
 * Easter-egg discoveries. Duplicated from the existing easterEggCounters
 * KV blob so admins can see the time series (when eggs were found), not
 * just totals.
 */
export const easterEggEvents = pgTable(
  "easter_egg_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").notNull(),
    userId: varchar("user_id"),
    platform: varchar("platform").notNull(),
    eggId: varchar("egg_id").notNull(),
    action: varchar("action").notNull().default("discovered"), // discovered | triggered | viewed
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_egg_created_at").on(table.createdAt),
    index("idx_egg_egg_id").on(table.eggId),
  ],
);

/**
 * Web Vitals + custom perf metrics. Stored per-observation; roll up in
 * the admin dashboard via percentile queries.
 */
export const performanceEvents = pgTable(
  "performance_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").notNull(),
    userId: varchar("user_id"),
    platform: varchar("platform").notNull(),
    appVersion: varchar("app_version"),
    metricName: varchar("metric_name").notNull(), // lcp | cls | inp | map_load | api_latency | …
    valueMs: real("value_ms"),                    // stored as milliseconds; unit-agnostic values like CLS use the raw number
    endpoint: varchar("endpoint"),                // only for api_* metrics
    statusCode: integer("status_code"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_perf_created_at").on(table.createdAt),
    index("idx_perf_metric").on(table.metricName),
  ],
);

/**
 * Admin audit trail — every privileged action lands here. Never store
 * credentials or tokens; store *what* was done and *by whom*.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    adminUserId: varchar("admin_user_id"),
    adminEmail: varchar("admin_email"),
    action: varchar("action").notNull(),          // announcement_created | settings_changed | analytics_viewed | …
    resource: varchar("resource"),                // e.g. announcements/<id>
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_audit_created_at").on(table.createdAt),
    index("idx_audit_action").on(table.action),
    index("idx_audit_admin").on(table.adminUserId),
  ],
);

export const insertTelemetrySessionSchema = createInsertSchema(telemetrySessions).omit({ id: true, createdAt: true });
export const insertTelemetryEventSchema = createInsertSchema(telemetryEvents).omit({ id: true, createdAt: true });
export const insertFeatureUsageSchema = createInsertSchema(featureUsage).omit({ id: true, createdAt: true });
export const insertEasterEggEventSchema = createInsertSchema(easterEggEvents).omit({ id: true, createdAt: true });
export const insertPerformanceEventSchema = createInsertSchema(performanceEvents).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });

export type TelemetrySession = typeof telemetrySessions.$inferSelect;
export type InsertTelemetrySession = z.infer<typeof insertTelemetrySessionSchema>;
export type TelemetryEvent = typeof telemetryEvents.$inferSelect;
export type InsertTelemetryEvent = z.infer<typeof insertTelemetryEventSchema>;
export type FeatureUsage = typeof featureUsage.$inferSelect;
export type InsertFeatureUsage = z.infer<typeof insertFeatureUsageSchema>;
export type EasterEggEvent = typeof easterEggEvents.$inferSelect;
export type InsertEasterEggEvent = z.infer<typeof insertEasterEggEventSchema>;
export type PerformanceEvent = typeof performanceEvents.$inferSelect;
export type InsertPerformanceEvent = z.infer<typeof insertPerformanceEventSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
