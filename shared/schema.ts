import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
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
});

// Buildings table
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
  // uses these instead of `1..floors`. Nullable — old rows keep working.
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
  coordinates: jsonb("coordinates"), // { lat: 60.1699, lng: 24.9384 }
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
  virtualTourUrl: varchar("virtual_tour_url"), // 360° tour link
  bookingRules: text("booking_rules"), // Special rules or requirements
  requiresApproval: boolean("requires_approval").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  isActive: boolean("is_active").default(true),
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
});

// Hallways table  
export const hallways = pgTable("hallways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").references(() => buildings.id).notNull(),
  floorId: varchar("floor_id").references(() => floors.id),
  name: varchar("name").notNull(),
  nameEn: varchar("name_en"),
  nameFi: varchar("name_fi"),
  description: text("description"),
  descriptionEn: text("description_en"),
  descriptionFi: text("description_fi"),
  startX: integer("start_x"),
  startY: integer("start_y"),
  endX: integer("end_x"),
  endY: integer("end_y"),
  width: integer("width").default(2),
  colorCode: varchar("color_code").default("#9CA3AF"),
  emergencyRoute: boolean("emergency_route").default(false),
  accessibilityInfo: text("accessibility_info"),
  isPublic: boolean("is_public").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
});

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
});

// Wilma Users table
export const wilmaUsers = pgTable("wilma_users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(), // Numeric auto-increment ID
  studentId: varchar("student_id").notNull().unique(), // Unique 6-digit student ID
  username: varchar("username").notNull().unique(),
  password: varchar("password").notNull(), // ALWAYS HASHED with bcrypt
  isTemporaryPassword: boolean("is_temporary_password").default(true), // Force password change on first login
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  role: varchar("role").notNull().default("student"), // Primary role
  roles: text("roles").array(), // Multiple roles support: ['teacher', 'admin', 'counselor']
  customRoleName: varchar("custom_role_name"), // For custom roles
  studentClass: varchar("student_class"), // For students: 9A, 8B, etc.
  department: varchar("department"), // For staff: administration, counseling, health, etc.
  position: varchar("position"), // Job title for staff
  specialization: varchar("specialization"), // For social workers, counselors, etc.
  officeRoom: varchar("office_room"), // Office location
  officeHours: jsonb("office_hours"), // Available hours
  bio: text("bio"), // Profile description
  profileImageUrl: varchar("profile_image_url"),
  calendarSyncEnabled: boolean("calendar_sync_enabled").default(false),
  calendarSyncToken: varchar("calendar_sync_token"), // For Google/Apple Calendar sync
  calendarProvider: varchar("calendar_provider"), // 'google', 'apple', 'outlook'
  // Student details - REQUIRED for students
  dateOfBirth: varchar("date_of_birth"), // REQUIRED for students
  gender: varchar("gender"),
  nationality: varchar("nationality"),
  address: varchar("address"),
  postalCode: varchar("postal_code"),
  city: varchar("city"),
  // Parent/Guardian relationships - REQUIRED for students
  parent1Id: integer("parent1_id"), // Reference to parent user numeric ID
  parent2Id: integer("parent2_id"), // Reference to parent user numeric ID
  // Parent 1 info (stored for display purposes)
  parent1FirstName: varchar("parent1_first_name"),
  parent1LastName: varchar("parent1_last_name"),
  parent1Email: varchar("parent1_email"),
  parent1Phone: varchar("parent1_phone"),
  parent1Relationship: varchar("parent1_relationship"),
  // Parent 2 info (stored for display purposes)
  parent2FirstName: varchar("parent2_first_name"),
  parent2LastName: varchar("parent2_last_name"),
  parent2Email: varchar("parent2_email"),
  parent2Phone: varchar("parent2_phone"),
  parent2Relationship: varchar("parent2_relationship"),
  // Emergency contact
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  emergencyContactRelation: varchar("emergency_contact_relation"),
  // Medical info
  allergies: text("allergies"),
  medications: text("medications"),
  specialNeeds: text("special_needs"),
  // Academic
  startYear: varchar("start_year"),
  previousSchool: varchar("previous_school"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Schedules table
export const wilmaSchedules = pgTable("wilma_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(), // 6-digit student ID
  dayOfWeek: integer("day_of_week").notNull(), // 1=Monday, 5=Friday
  timeSlot: varchar("time_slot").notNull(), // e.g., "08:00-09:30"
  subject: varchar("subject").notNull(),
  room: varchar("room").notNull(),
  teacherId: varchar("teacher_id"), // Reference to teacher's studentId
  teacherName: varchar("teacher_name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Grades table
export const wilmaGrades = pgTable("wilma_grades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  subject: varchar("subject").notNull(),
  grade: varchar("grade").notNull(), // 4-10 or letter grades
  teacherId: varchar("teacher_id"),
  teacherName: varchar("teacher_name").notNull(),
  term: varchar("term"), // e.g., "Fall 2026", "Spring 2026"
  comments: text("comments"),
  trend: varchar("trend").default("stable"), // up, down, stable
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Assignments table
export const wilmaAssignments = pgTable("wilma_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  title: varchar("title").notNull(),
  subject: varchar("subject").notNull(),
  description: text("description"),
  dueDate: varchar("due_date").notNull(),
  status: varchar("status").default("pending"), // pending, submitted, graded
  grade: varchar("grade"),
  teacherId: varchar("teacher_id"),
  teacherName: varchar("teacher_name").notNull(),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Messages table
export const wilmaMessages = pgTable("wilma_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull(),
  fromUserName: varchar("from_user_name").notNull(),
  toUserId: varchar("to_user_id").notNull(),
  toUserName: varchar("to_user_name").notNull(),
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Attendance table
export const wilmaAttendance = pgTable("wilma_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  date: varchar("date").notNull(),
  status: varchar("status").notNull(), // present, absent, late, excused
  hours: integer("hours").default(0),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Exams table
export const wilmaExams = pgTable("wilma_exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  subject: varchar("subject").notNull(),
  date: varchar("date").notNull(),
  time: varchar("time").notNull(),
  room: varchar("room").notNull(),
  topics: text("topics"),
  teacherId: varchar("teacher_id"),
  teacherName: varchar("teacher_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
});

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
});

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
// the shared TypeScript type but aren't yet real DB columns — Firestore
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

// Same story as insertBuildingSchema — the builder POSTs a lightweight
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

export const insertWilmaUserSchema = createInsertSchema(wilmaUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaScheduleSchema = createInsertSchema(wilmaSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaGradeSchema = createInsertSchema(wilmaGrades).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaAssignmentSchema = createInsertSchema(wilmaAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaMessageSchema = createInsertSchema(wilmaMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaAttendanceSchema = createInsertSchema(wilmaAttendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaExamSchema = createInsertSchema(wilmaExams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// Types
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
export type WilmaUser = typeof wilmaUsers.$inferSelect;
export type InsertWilmaUser = z.infer<typeof insertWilmaUserSchema>;
export type WilmaSchedule = typeof wilmaSchedules.$inferSelect;
export type InsertWilmaSchedule = z.infer<typeof insertWilmaScheduleSchema>;
export type WilmaGrade = typeof wilmaGrades.$inferSelect;
export type InsertWilmaGrade = z.infer<typeof insertWilmaGradeSchema>;
export type WilmaAssignment = typeof wilmaAssignments.$inferSelect;
export type InsertWilmaAssignment = z.infer<typeof insertWilmaAssignmentSchema>;
export type WilmaMessage = typeof wilmaMessages.$inferSelect;
export type InsertWilmaMessage = z.infer<typeof insertWilmaMessageSchema>;
export type WilmaAttendance = typeof wilmaAttendance.$inferSelect;
export type InsertWilmaAttendance = z.infer<typeof insertWilmaAttendanceSchema>;
export type WilmaExam = typeof wilmaExams.$inferSelect;
export type InsertWilmaExam = z.infer<typeof insertWilmaExamSchema>;


// ============================================
// WILMA EXTENDED TABLES - Full Implementation
// ============================================

// Wilma Classes table (for grouping students)
export const wilmaClasses = pgTable("wilma_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // e.g., "9A", "8B"
  gradeLevel: integer("grade_level").notNull(), // 7, 8, 9
  teacherId: varchar("teacher_id"), // Class teacher (reference to wilmaUsers)
  teacherName: varchar("teacher_name"),
  students: text("students").array(), // Array of student IDs
  year: varchar("year").notNull(), // Academic year: "2025-2026"
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Courses table (subjects taught)
export const wilmaCourses = pgTable("wilma_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // e.g., "Mathematics", "English"
  code: varchar("code").notNull().unique(), // e.g., "MATH9A", "ENG8B"
  teacherId: varchar("teacher_id").notNull(),
  teacherName: varchar("teacher_name").notNull(),
  classId: varchar("class_id"), // Reference to wilmaClasses
  className: varchar("class_name"),
  schedule: jsonb("schedule"), // Weekly schedule: [{day: 1, time: "08:00-09:30", room: "A101"}]
  credits: integer("credits").default(1),
  description: text("description"),
  learningObjectives: text("learning_objectives").array(),
  year: varchar("year").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Lesson Journal (Tuntipäiväkirja)
export const wilmaLessonJournal = pgTable("wilma_lesson_journal", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull(),
  courseName: varchar("course_name").notNull(),
  teacherId: varchar("teacher_id").notNull(),
  teacherName: varchar("teacher_name").notNull(),
  date: varchar("date").notNull(), // YYYY-MM-DD
  timeSlot: varchar("time_slot").notNull(), // "08:00-09:30"
  topic: varchar("topic").notNull(), // What was taught
  content: text("content"), // Detailed lesson content
  homework: text("homework"), // Homework assigned
  notes: text("notes"), // Additional notes
  attachments: jsonb("attachments"), // File attachments: [{name, url, type}]
  attendanceMarked: boolean("attendance_marked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Detention Settings (Jälki-istunto asetukset)
export const wilmaDetentionSettings = pgTable("wilma_detention_settings", {
  id: varchar("id").primaryKey().default('default'),
  enabled: boolean("enabled").default(true),
  lateMarksThreshold: integer("late_marks_threshold").default(3), // Number of late marks before detention
  absentMarksThreshold: integer("absent_marks_threshold").default(5), // Number of absences before detention
  autoAssignDetention: boolean("auto_assign_detention").default(true),
  autoSendMessage: boolean("auto_send_message").default(true),
  messageTemplate: text("message_template").default('Hei {studentName},\n\nSinulle on määrätty jälki-istunto {date} klo {time} luokassa {room}.\n\nSyy: {reason}\n\nYstävällisin terveisin,\n{teacherName}'),
  detentionDuration: integer("detention_duration").default(60), // Minutes
  detentionRoom: varchar("detention_room").default('A101'),
  detentionTime: varchar("detention_time").default('15:00'),
  notifyParents: boolean("notify_parents").default(true),
  requireConfirmation: boolean("require_confirmation").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Detentions (Jälki-istunnot)
export const wilmaDetentions = pgTable("wilma_detentions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: integer("student_id").notNull(), // Numeric student ID
  studentName: varchar("student_name").notNull(),
  studentClass: varchar("student_class").notNull(),
  reason: text("reason").notNull(), // Why detention was assigned
  reasonType: varchar("reason_type").notNull(), // 'late', 'absent', 'behavior', 'homework', 'other'
  date: varchar("date").notNull(), // YYYY-MM-DD
  time: varchar("time").notNull(), // HH:MM
  duration: integer("duration").default(60), // Minutes
  room: varchar("room").notNull(),
  assignedBy: varchar("assigned_by").notNull(), // Teacher/admin name
  assignedById: integer("assigned_by_id"), // Teacher/admin ID
  status: varchar("status").default('pending'), // 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
  notes: text("notes"), // Additional notes
  parentNotified: boolean("parent_notified").default(false),
  parentNotifiedAt: timestamp("parent_notified_at"),
  studentNotified: boolean("student_notified").default(false),
  studentNotifiedAt: timestamp("student_notified_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: varchar("cancelled_by"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Detention Log (History of automatic assignments)
export const wilmaDetentionLog = pgTable("wilma_detention_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: integer("student_id").notNull(),
  studentName: varchar("student_name").notNull(),
  triggerType: varchar("trigger_type").notNull(), // 'late_marks', 'absent_marks', 'manual'
  triggerCount: integer("trigger_count"), // Number of marks that triggered detention
  detentionId: varchar("detention_id"), // Reference to created detention
  autoAssigned: boolean("auto_assigned").default(false),
  messageSent: boolean("message_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wilma Homework Extended (with rubrics and advanced features)
export const wilmaHomeworkExtended = pgTable("wilma_homework_extended", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull(),
  courseName: varchar("course_name").notNull(),
  teacherId: varchar("teacher_id").notNull(),
  teacherName: varchar("teacher_name").notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  instructions: text("instructions"),
  dueDate: varchar("due_date").notNull(), // YYYY-MM-DD
  dueTime: varchar("due_time"), // HH:MM
  maxScore: integer("max_score").default(100),
  rubric: jsonb("rubric"), // Grading rubric: [{criteria, points, description}]
  attachments: jsonb("attachments"), // Teacher attachments
  allowLateSubmission: boolean("allow_late_submission").default(false),
  latePenalty: integer("late_penalty").default(0), // Percentage penalty
  requiresFile: boolean("requires_file").default(false),
  fileTypes: text("file_types").array(), // Allowed file types: ['pdf', 'docx']
  maxFileSize: integer("max_file_size").default(10), // MB
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Homework Submissions
export const wilmaHomeworkSubmissions = pgTable("wilma_homework_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeworkId: varchar("homework_id").notNull(),
  studentId: varchar("student_id").notNull(),
  studentName: varchar("student_name").notNull(),
  content: text("content"), // Text submission
  files: jsonb("files"), // Submitted files: [{name, url, type, size}]
  submittedAt: timestamp("submitted_at").defaultNow(),
  isLate: boolean("is_late").default(false),
  grade: integer("grade"), // Score received
  feedback: text("feedback"), // Teacher feedback
  rubricScores: jsonb("rubric_scores"), // Scores per rubric criteria
  gradedAt: timestamp("graded_at"),
  gradedBy: varchar("graded_by"), // Teacher ID
  status: varchar("status").default("submitted"), // submitted, graded, returned
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Exams Extended (detailed exam management)
export const wilmaExamsExtended = pgTable("wilma_exams_extended", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull(),
  courseName: varchar("course_name").notNull(),
  teacherId: varchar("teacher_id").notNull(),
  teacherName: varchar("teacher_name").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  date: varchar("date").notNull(), // YYYY-MM-DD
  startTime: varchar("start_time").notNull(), // HH:MM
  endTime: varchar("end_time").notNull(), // HH:MM
  duration: integer("duration").notNull(), // Minutes
  room: varchar("room").notNull(),
  topics: text("topics").array(), // Topics covered
  maxScore: integer("max_score").default(100),
  instructions: text("instructions"),
  materials: text("materials"), // Allowed materials
  seatingPlan: jsonb("seating_plan"), // Seating arrangement
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Exam Results
export const wilmaExamResults = pgTable("wilma_exam_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examId: varchar("exam_id").notNull(),
  studentId: varchar("student_id").notNull(),
  studentName: varchar("student_name").notNull(),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  percentage: numeric("percentage"), // Calculated percentage
  grade: varchar("grade"), // Letter grade or numeric
  feedback: text("feedback"),
  sectionScores: jsonb("section_scores"), // Scores per section
  timeSpent: integer("time_spent"), // Minutes
  submittedAt: timestamp("submitted_at"),
  gradedAt: timestamp("graded_at"),
  gradedBy: varchar("graded_by"), // Teacher ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Behavior Notes (teacher observations)
export const wilmaBehaviorNotes = pgTable("wilma_behavior_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  studentName: varchar("student_name").notNull(),
  teacherId: varchar("teacher_id").notNull(),
  teacherName: varchar("teacher_name").notNull(),
  type: varchar("type").notNull(), // positive, negative, neutral, warning, incident
  category: varchar("category"), // behavior, academic, attendance, other
  title: varchar("title").notNull(),
  note: text("note").notNull(),
  date: varchar("date").notNull(), // YYYY-MM-DD
  visibility: varchar("visibility").default("teacher"), // teacher, parent, student, admin
  severity: varchar("severity").default("low"), // low, medium, high, critical
  actionTaken: text("action_taken"),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: varchar("follow_up_date"),
  parentNotified: boolean("parent_notified").default(false),
  parentNotifiedAt: timestamp("parent_notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Notifications (system notifications)
export const wilmaNotifications = pgTable("wilma_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Recipient
  userName: varchar("user_name").notNull(),
  type: varchar("type").notNull(), // message, grade, homework, exam, attendance, announcement, behavior
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  link: varchar("link"), // Link to related content
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  sendEmail: boolean("send_email").default(false),
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Wilma Calendar Events (integrated calendar)
export const wilmaCalendarEvents = pgTable("wilma_calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // If personal event, otherwise null for school-wide
  userName: varchar("user_name"),
  type: varchar("type").notNull(), // lesson, exam, homework, meeting, event, holiday, other
  title: varchar("title").notNull(),
  description: text("description"),
  startDate: varchar("start_date").notNull(), // YYYY-MM-DD
  startTime: varchar("start_time"), // HH:MM
  endDate: varchar("end_date"),
  endTime: varchar("end_time"),
  location: varchar("location"),
  room: varchar("room"),
  isAllDay: boolean("is_all_day").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: varchar("recurrence_rule"), // RRULE format
  color: varchar("color").default("#3B82F6"),
  relatedId: varchar("related_id"), // ID of related homework/exam/etc
  relatedType: varchar("related_type"), // homework, exam, etc
  attendees: text("attendees").array(), // User IDs
  reminders: jsonb("reminders"), // [{type: 'email', minutes: 60}]
  isPublic: boolean("is_public").default(false),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wilma Analytics (usage and performance data)
export const wilmaAnalytics = pgTable("wilma_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  userRole: varchar("user_role"), // student, teacher, parent, admin
  eventType: varchar("event_type").notNull(), // login, view_grades, submit_homework, etc
  eventCategory: varchar("event_category"), // academic, attendance, messaging, etc
  eventData: jsonb("event_data"), // Additional event-specific data
  sessionId: varchar("session_id"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  duration: integer("duration"), // Seconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Wilma AI Interactions (AI feature usage tracking)
export const wilmaAiInteractions = pgTable("wilma_ai_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userName: varchar("user_name").notNull(),
  userRole: varchar("user_role").notNull(),
  featureType: varchar("feature_type").notNull(), // homework_help, study_planner, grade_explanation, lesson_summary
  prompt: text("prompt").notNull(), // User's question/request
  response: text("response").notNull(), // AI's response
  model: varchar("model"), // AI model used
  tokensUsed: integer("tokens_used"),
  responseTime: integer("response_time"), // Milliseconds
  rating: integer("rating"), // User rating 1-5
  feedback: text("feedback"), // User feedback
  wasHelpful: boolean("was_helpful"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for new tables
export const insertWilmaClassSchema = createInsertSchema(wilmaClasses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaCourseSchema = createInsertSchema(wilmaCourses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaLessonJournalSchema = createInsertSchema(wilmaLessonJournal).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaHomeworkExtendedSchema = createInsertSchema(wilmaHomeworkExtended).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaHomeworkSubmissionSchema = createInsertSchema(wilmaHomeworkSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaExamExtendedSchema = createInsertSchema(wilmaExamsExtended).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaExamResultSchema = createInsertSchema(wilmaExamResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaBehaviorNoteSchema = createInsertSchema(wilmaBehaviorNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaNotificationSchema = createInsertSchema(wilmaNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertWilmaCalendarEventSchema = createInsertSchema(wilmaCalendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaAnalyticSchema = createInsertSchema(wilmaAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertWilmaAiInteractionSchema = createInsertSchema(wilmaAiInteractions).omit({
  id: true,
  createdAt: true,
});

// Types for new tables
export type WilmaClass = typeof wilmaClasses.$inferSelect;
export type InsertWilmaClass = z.infer<typeof insertWilmaClassSchema>;
export type WilmaCourse = typeof wilmaCourses.$inferSelect;
export type InsertWilmaCourse = z.infer<typeof insertWilmaCourseSchema>;
export type WilmaLessonJournal = typeof wilmaLessonJournal.$inferSelect;
export type InsertWilmaLessonJournal = z.infer<typeof insertWilmaLessonJournalSchema>;
export type WilmaHomeworkExtended = typeof wilmaHomeworkExtended.$inferSelect;
export type InsertWilmaHomeworkExtended = z.infer<typeof insertWilmaHomeworkExtendedSchema>;
export type WilmaHomeworkSubmission = typeof wilmaHomeworkSubmissions.$inferSelect;
export type InsertWilmaHomeworkSubmission = z.infer<typeof insertWilmaHomeworkSubmissionSchema>;
export type WilmaExamExtended = typeof wilmaExamsExtended.$inferSelect;
export type InsertWilmaExamExtended = z.infer<typeof insertWilmaExamExtendedSchema>;
export type WilmaExamResult = typeof wilmaExamResults.$inferSelect;
export type InsertWilmaExamResult = z.infer<typeof insertWilmaExamResultSchema>;
export type WilmaBehaviorNote = typeof wilmaBehaviorNotes.$inferSelect;
export type InsertWilmaBehaviorNote = z.infer<typeof insertWilmaBehaviorNoteSchema>;
export type WilmaNotification = typeof wilmaNotifications.$inferSelect;
export type InsertWilmaNotification = z.infer<typeof insertWilmaNotificationSchema>;
export type WilmaCalendarEvent = typeof wilmaCalendarEvents.$inferSelect;
export type InsertWilmaCalendarEvent = z.infer<typeof insertWilmaCalendarEventSchema>;
export type WilmaAnalytic = typeof wilmaAnalytics.$inferSelect;
export type InsertWilmaAnalytic = z.infer<typeof insertWilmaAnalyticSchema>;
export type WilmaAiInteraction = typeof wilmaAiInteractions.$inferSelect;
export type InsertWilmaAiInteraction = z.infer<typeof insertWilmaAiInteractionSchema>;

// Detention insert schemas
export const insertWilmaDetentionSettingsSchema = createInsertSchema(wilmaDetentionSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaDetentionSchema = createInsertSchema(wilmaDetentions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaDetentionLogSchema = createInsertSchema(wilmaDetentionLog).omit({
  id: true,
  createdAt: true,
});

// ============================================
// WILMA DESKTOP ENVIRONMENT TABLES
// ============================================

// Desktop Settings - Global configuration for the desktop environment
export const wilmaDesktopSettings = pgTable("wilma_desktop_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  enabled: boolean("enabled").default(false).notNull(), // Enable/disable desktop feature
  defaultWallpaper: text("default_wallpaper").default("/wilma-bg.jpg"),
  defaultTheme: varchar("default_theme", { length: 50 }).default("light"),
  allowCustomWallpaper: boolean("allow_custom_wallpaper").default(true),
  allowCustomTheme: boolean("allow_custom_theme").default(true),
  availableApps: jsonb("available_apps").default([]).notNull(), // Array of app IDs that are available
  defaultApps: jsonb("default_apps").default([]).notNull(), // Default apps for new users
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Desktop Apps - Available applications in the desktop environment
export const wilmaDesktopApps = pgTable("wilma_desktop_apps", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  appId: varchar("app_id", { length: 100 }).unique().notNull(), // Unique identifier like "calculator", "notepad"
  name: varchar("name", { length: 100 }).notNull(),
  nameFi: varchar("name_fi", { length: 100 }),
  icon: varchar("icon", { length: 100 }).notNull(), // Icon name or emoji
  description: text("description"),
  descriptionFi: text("description_fi"),
  category: varchar("category", { length: 50 }).default("utility"), // utility, education, entertainment, productivity
  appType: varchar("app_type", { length: 50 }).notNull(), // iframe, component, external
  appUrl: text("app_url"), // For iframe apps
  componentName: varchar("component_name", { length: 100 }), // For React component apps
  width: integer("width").default(800),
  height: integer("height").default(600),
  resizable: boolean("resizable").default(true),
  minimizable: boolean("minimizable").default(true),
  maximizable: boolean("maximizable").default(true),
  allowedRoles: text("allowed_roles").array().default(["student", "teacher", "parent", "admin"]), // Who can access
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Desktop Configuration - Per-user desktop customization
export const wilmaUserDesktopConfig = pgTable("wilma_user_desktop_config", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(), // References wilmaUsers.id
  wallpaper: text("wallpaper"),
  theme: varchar("theme", { length: 50 }).default("light"),
  installedApps: jsonb("installed_apps").default([]).notNull(), // Array of app IDs
  desktopLayout: jsonb("desktop_layout").default({}).notNull(), // Icon positions, etc.
  pinnedApps: jsonb("pinned_apps").default([]).notNull(), // Taskbar pinned apps
  recentApps: jsonb("recent_apps").default([]).notNull(), // Recently used apps
  customSettings: jsonb("custom_settings").default({}).notNull(), // User preferences
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Desktop insert schemas
export const insertWilmaDesktopSettingsSchema = createInsertSchema(wilmaDesktopSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaDesktopAppsSchema = createInsertSchema(wilmaDesktopApps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWilmaUserDesktopConfigSchema = createInsertSchema(wilmaUserDesktopConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================
// CODING PLATFORM TABLES
// ============================================

// Coding Courses - Programming courses available on the platform
export const codingCourses = pgTable("coding_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(),
  title: jsonb("title").notNull(), // {fi: string, en: string}
  description: jsonb("description").notNull(), // {fi: string, en: string}
  language: varchar("language").notNull(), // python, javascript, html-css, csharp
  difficulty: varchar("difficulty").notNull(), // beginner, intermediate, advanced
  estimatedHours: integer("estimated_hours").notNull(),
  prerequisites: text("prerequisites").array().default([]),
  isPublished: boolean("is_published").default(true),
  isFree: boolean("is_free").default(true),
  tags: text("tags").array().default([]),
  thumbnailUrl: varchar("thumbnail_url"),
  createdBy: varchar("created_by"), // Teacher/admin ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coding Modules - Modules within courses
export const codingModules = pgTable("coding_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => codingCourses.id, { onDelete: 'cascade' }),
  order: integer("order").notNull(),
  title: jsonb("title").notNull(), // {fi: string, en: string}
  description: jsonb("description").notNull(), // {fi: string, en: string}
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coding Lessons - Individual lessons within modules
export const codingLessons = pgTable("coding_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull().references(() => codingModules.id, { onDelete: 'cascade' }),
  order: integer("order").notNull(),
  title: jsonb("title").notNull(), // {fi: string, en: string}
  type: varchar("type").notNull(), // tutorial, exercise, quiz, project
  content: jsonb("content").notNull(), // {fi: string, en: string}
  starterCode: text("starter_code"),
  solutionCode: text("solution_code"),
  codeLanguage: varchar("code_language"), // python, javascript, etc.
  xpReward: integer("xp_reward").default(10),
  estimatedMinutes: integer("estimated_minutes").default(15),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coding Exercises - Exercises within lessons
export const codingExercises = pgTable("coding_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => codingLessons.id, { onDelete: 'cascade' }),
  title: jsonb("title").notNull(), // {fi: string, en: string}
  description: jsonb("description").notNull(), // {fi: string, en: string}
  starterCode: text("starter_code").notNull(),
  solutionCode: text("solution_code").notNull(),
  testCases: jsonb("test_cases").notNull(), // [{input, expectedOutput, hidden}]
  hints: jsonb("hints").notNull(), // {fi: string[], en: string[]}
  difficulty: varchar("difficulty").default("medium"),
  xpReward: integer("xp_reward").default(20),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Progress - Track user progress through courses
export const codingUserProgress = pgTable("coding_user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Wilma user ID
  courseId: varchar("course_id").notNull().references(() => codingCourses.id, { onDelete: 'cascade' }),
  completedLessons: text("completed_lessons").array().default([]), // Array of lesson IDs
  completedExercises: text("completed_exercises").array().default([]), // Array of exercise IDs
  currentModuleId: varchar("current_module_id"),
  currentLessonId: varchar("current_lesson_id"),
  progressPercentage: integer("progress_percentage").default(0),
  totalXpEarned: integer("total_xp_earned").default(0),
  startedAt: timestamp("started_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Code Submissions - User code submissions for exercises
export const codingSubmissions = pgTable("coding_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  exerciseId: varchar("exercise_id").notNull().references(() => codingExercises.id, { onDelete: 'cascade' }),
  code: text("code").notNull(),
  language: varchar("language").notNull(),
  passed: boolean("passed").default(false),
  testResults: jsonb("test_results"), // Results of test cases
  executionTime: integer("execution_time"), // Milliseconds
  xpEarned: integer("xp_earned").default(0),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Coding Classrooms - Teacher-managed coding classrooms
export const codingClassrooms = pgTable("coding_classrooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  teacherId: varchar("teacher_id").notNull(), // Wilma user ID
  teacherName: varchar("teacher_name").notNull(),
  joinCode: varchar("join_code").notNull().unique(), // 6-character code
  students: text("students").array().default([]), // Array of student IDs
  assignedCourses: text("assigned_courses").array().default([]), // Array of course IDs
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Classroom Assignments - Assignments given by teachers
export const codingClassroomAssignments = pgTable("coding_classroom_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  classroomId: varchar("classroom_id").notNull().references(() => codingClassrooms.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").references(() => codingCourses.id),
  lessonId: varchar("lesson_id").references(() => codingLessons.id),
  exerciseId: varchar("exercise_id").references(() => codingExercises.id),
  title: varchar("title").notNull(),
  description: text("description"),
  dueDate: varchar("due_date"), // YYYY-MM-DD
  assignedBy: varchar("assigned_by").notNull(), // Teacher ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Stats - Overall user statistics
export const codingUserStats = pgTable("coding_user_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  totalXp: integer("total_xp").default(0),
  level: integer("level").default(1),
  streak: integer("streak").default(0), // Days
  lastActiveDate: varchar("last_active_date"), // YYYY-MM-DD
  coursesCompleted: integer("courses_completed").default(0),
  lessonsCompleted: integer("lessons_completed").default(0),
  exercisesCompleted: integer("exercises_completed").default(0),
  badges: text("badges").array().default([]), // Array of badge IDs
  rank: integer("rank"), // Global rank
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leaderboard - Competition leaderboard
export const codingLeaderboard = pgTable("coding_leaderboard", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userName: varchar("user_name").notNull(),
  type: varchar("type").notNull(), // weekly, monthly, alltime
  score: integer("score").notNull(),
  rank: integer("rank").notNull(),
  period: varchar("period").notNull(), // e.g., "2026-W20" for week 20 of 2026
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for coding platform
export const insertCodingCourseSchema = createInsertSchema(codingCourses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodingModuleSchema = createInsertSchema(codingModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodingLessonSchema = createInsertSchema(codingLessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodingExerciseSchema = createInsertSchema(codingExercises).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodingUserProgressSchema = createInsertSchema(codingUserProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodingSubmissionSchema = createInsertSchema(codingSubmissions).omit({
  id: true,
  submittedAt: true,
});

export const insertCodingClassroomSchema = createInsertSchema(codingClassrooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodingClassroomAssignmentSchema = createInsertSchema(codingClassroomAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodingUserStatsSchema = createInsertSchema(codingUserStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodingLeaderboardSchema = createInsertSchema(codingLeaderboard).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for coding platform
export type CodingCourse = typeof codingCourses.$inferSelect;
export type InsertCodingCourse = z.infer<typeof insertCodingCourseSchema>;
export type CodingModule = typeof codingModules.$inferSelect;
export type InsertCodingModule = z.infer<typeof insertCodingModuleSchema>;
export type CodingLesson = typeof codingLessons.$inferSelect;
export type InsertCodingLesson = z.infer<typeof insertCodingLessonSchema>;
export type CodingExercise = typeof codingExercises.$inferSelect;
export type InsertCodingExercise = z.infer<typeof insertCodingExerciseSchema>;
export type CodingUserProgress = typeof codingUserProgress.$inferSelect;
export type InsertCodingUserProgress = z.infer<typeof insertCodingUserProgressSchema>;
export type CodingSubmission = typeof codingSubmissions.$inferSelect;
export type InsertCodingSubmission = z.infer<typeof insertCodingSubmissionSchema>;
export type CodingClassroom = typeof codingClassrooms.$inferSelect;
export type InsertCodingClassroom = z.infer<typeof insertCodingClassroomSchema>;
export type CodingClassroomAssignment = typeof codingClassroomAssignments.$inferSelect;
export type InsertCodingClassroomAssignment = z.infer<typeof insertCodingClassroomAssignmentSchema>;
export type CodingUserStats = typeof codingUserStats.$inferSelect;
export type InsertCodingUserStats = z.infer<typeof insertCodingUserStatsSchema>;
export type CodingLeaderboard = typeof codingLeaderboard.$inferSelect;
export type InsertCodingLeaderboard = z.infer<typeof insertCodingLeaderboardSchema>;
