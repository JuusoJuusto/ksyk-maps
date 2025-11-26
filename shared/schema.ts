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
  capacity: integer("capacity"),
  facilities: text("facilities").array(),
  accessInfo: text("access_info"),
  mapPositionX: integer("map_position_x"),
  mapPositionY: integer("map_position_y"),
  colorCode: varchar("color_code").default("#3B82F6"),
  isActive: boolean("is_active").default(true),
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

// Insert schemas
export const insertBuildingSchema = createInsertSchema(buildings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertHallwaySchema = createInsertSchema(hallways).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
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
  secondaryColor: varchar("secondary_color").default("#2563EB"),
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
  defaultLanguage: varchar("default_language").default("en"),
  updatedAt: timestamp("updated_at").defaultNow(),
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
