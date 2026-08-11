-- ============================================================
-- KSYK Maps — Fresh database setup
-- Run this in Supabase SQL Editor to drop all old tables and
-- create the correct schema from scratch.
-- ============================================================

-- DROP EVERYTHING (in dependency order, children first)
DROP TABLE IF EXISTS user_history CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS room_sensors CASCADE;
DROP TABLE IF EXISTS room_availability CASCADE;
DROP TABLE IF EXISTS room_bookings CASCADE;
DROP TABLE IF EXISTS campus_services CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS navigation_analytics CASCADE;
DROP TABLE IF EXISTS search_analytics CASCADE;
DROP TABLE IF EXISTS page_views CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS app_logs CASCADE;
DROP TABLE IF EXISTS admin_login_logs CASCADE;
DROP TABLE IF EXISTS map_versions CASCADE;
DROP TABLE IF EXISTS map_packages CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS hallways CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS floors CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any leftover Wilma / coding tables
DROP TABLE IF EXISTS wilma_ai_interactions CASCADE;
DROP TABLE IF EXISTS wilma_analytics CASCADE;
DROP TABLE IF EXISTS wilma_calendar_events CASCADE;
DROP TABLE IF EXISTS wilma_notifications CASCADE;
DROP TABLE IF EXISTS wilma_behavior_notes CASCADE;
DROP TABLE IF EXISTS wilma_exam_results CASCADE;
DROP TABLE IF EXISTS wilma_exams_extended CASCADE;
DROP TABLE IF EXISTS wilma_homework_submissions CASCADE;
DROP TABLE IF EXISTS wilma_homework_extended CASCADE;
DROP TABLE IF EXISTS wilma_detention_log CASCADE;
DROP TABLE IF EXISTS wilma_detentions CASCADE;
DROP TABLE IF EXISTS wilma_detention_settings CASCADE;
DROP TABLE IF EXISTS wilma_lesson_journal CASCADE;
DROP TABLE IF EXISTS wilma_user_desktop_config CASCADE;
DROP TABLE IF EXISTS wilma_desktop_apps CASCADE;
DROP TABLE IF EXISTS wilma_desktop_settings CASCADE;
DROP TABLE IF EXISTS wilma_course_enrollments CASCADE;
DROP TABLE IF EXISTS wilma_courses CASCADE;
DROP TABLE IF EXISTS wilma_classes CASCADE;
DROP TABLE IF EXISTS wilma_attendance_marks CASCADE;
DROP TABLE IF EXISTS wilma_exams CASCADE;
DROP TABLE IF EXISTS wilma_attendance CASCADE;
DROP TABLE IF EXISTS wilma_messages CASCADE;
DROP TABLE IF EXISTS wilma_assignments CASCADE;
DROP TABLE IF EXISTS wilma_grades CASCADE;
DROP TABLE IF EXISTS wilma_schedules CASCADE;
DROP TABLE IF EXISTS wilma_users CASCADE;
DROP TABLE IF EXISTS coding_leaderboard CASCADE;
DROP TABLE IF EXISTS coding_user_stats CASCADE;
DROP TABLE IF EXISTS coding_classroom_assignments CASCADE;
DROP TABLE IF EXISTS coding_classrooms CASCADE;
DROP TABLE IF EXISTS coding_submissions CASCADE;
DROP TABLE IF EXISTS coding_user_progress CASCADE;
DROP TABLE IF EXISTS coding_exercises CASCADE;
DROP TABLE IF EXISTS coding_lessons CASCADE;
DROP TABLE IF EXISTS coding_modules CASCADE;
DROP TABLE IF EXISTS coding_courses CASCADE;

-- ============================================================
-- CREATE TABLES
-- ============================================================

CREATE TABLE "admin_login_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"email" varchar NOT NULL,
	"user_name" varchar,
	"ip_address" varchar,
	"user_agent" varchar,
	"login_status" varchar NOT NULL,
	"failure_reason" varchar,
	"session_id" varchar,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "announcements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"title_en" varchar,
	"title_fi" varchar,
	"content" text NOT NULL,
	"content_en" text,
	"content_fi" text,
	"priority" varchar DEFAULT 'normal',
	"author_id" varchar,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "app_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" varchar NOT NULL,
	"message" text NOT NULL,
	"error_reference_id" varchar,
	"error_stack" text,
	"error_info" jsonb,
	"user_agent" text,
	"url" text,
	"user_id" varchar,
	"ip_address" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "app_logs_error_reference_id_unique" UNIQUE("error_reference_id")
);

CREATE TABLE "app_settings" (
	"id" varchar PRIMARY KEY DEFAULT 'default' NOT NULL,
	"app_name" varchar DEFAULT 'KSYK Map',
	"app_name_en" varchar DEFAULT 'KSYK Map',
	"app_name_fi" varchar DEFAULT 'KSYK Kartta',
	"logo_url" varchar,
	"primary_color" varchar DEFAULT '#3B82F6',
	"secondary_color" varchar DEFAULT '#F59E0B',
	"success_color" varchar DEFAULT '#10B981',
	"warning_color" varchar DEFAULT '#EF4444',
	"theme" varchar DEFAULT 'light',
	"header_title" varchar DEFAULT 'Campus Map',
	"header_title_en" varchar DEFAULT 'Campus Map',
	"header_title_fi" varchar DEFAULT 'Kampuskartta',
	"footer_text" text,
	"footer_text_en" text,
	"footer_text_fi" text,
	"contact_email" varchar,
	"contact_phone" varchar,
	"show_stats" boolean DEFAULT true,
	"show_announcements" boolean DEFAULT true,
	"enable_search" boolean DEFAULT true,
	"enable_animations" boolean DEFAULT true,
	"enable_auto_save" boolean DEFAULT true,
	"compact_mode" boolean DEFAULT false,
	"default_language" varchar DEFAULT 'en',
	"ai_sensitivity" numeric DEFAULT '0.7',
	"enable_smart_snap" boolean DEFAULT true,
	"enable_room_auto_creation" boolean DEFAULT false,
	"cache_minutes" integer DEFAULT 30,
	"max_image_size_mb" integer DEFAULT 10,
	"enable_preload_images" boolean DEFAULT true,
	"enable_lazy_loading" boolean DEFAULT true,
	"default_zoom_level" numeric DEFAULT '1.0',
	"enable_easter_egg" boolean DEFAULT true,
	"enable_events" boolean DEFAULT true,
	"enable_ticket_system" boolean DEFAULT true,
	"enable_version_info" boolean DEFAULT true,
	"maintenance_mode" boolean DEFAULT false,
	"maintenance_message" text,
	"enable_dark_mode_toggle" boolean DEFAULT true,
	"enable_notifications" boolean DEFAULT true,
	"enable_offline_mode" boolean DEFAULT true,
	"enable_analytics" boolean DEFAULT false,
	"enable_accessibility_mode" boolean DEFAULT true,
	"enable_keyboard_shortcuts" boolean DEFAULT true,
	"enable_advanced_search" boolean DEFAULT true,
	"enable_room_booking" boolean DEFAULT false,
	"enable_qr_code_scanning" boolean DEFAULT true,
	"enable_ar_mode" boolean DEFAULT false,
	"enable_3d_view" boolean DEFAULT false,
	"enable_voice_commands" boolean DEFAULT false,
	"enable_multi_language" boolean DEFAULT true,
	"enable_export_data" boolean DEFAULT true,
	"enable_import_data" boolean DEFAULT true,
	"enable_bulk_operations" boolean DEFAULT true,
	"enable_advanced_filters" boolean DEFAULT true,
	"enable_custom_fields" boolean DEFAULT false,
	"enable_webhooks" boolean DEFAULT false,
	"enable_api_access" boolean DEFAULT false,
	"max_upload_size_mb" integer DEFAULT 50,
	"session_timeout_minutes" integer DEFAULT 60,
	"max_login_attempts" integer DEFAULT 5,
	"password_min_length" integer DEFAULT 8,
	"require_strong_password" boolean DEFAULT true,
	"enable_2fa" boolean DEFAULT false,
	"enable_sso" boolean DEFAULT false,
	"enable_audit_log" boolean DEFAULT true,
	"enable_backups" boolean DEFAULT true,
	"backup_frequency_hours" integer DEFAULT 24,
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "buildings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"name_en" varchar,
	"name_fi" varchar,
	"description" text,
	"description_en" text,
	"description_fi" text,
	"floors" integer DEFAULT 1,
	"floor_min" integer,
	"floor_max" integer,
	"capacity" integer,
	"facilities" text[],
	"access_info" text,
	"map_position_x" integer,
	"map_position_y" integer,
	"color_code" varchar DEFAULT '#3B82F6',
	"is_active" boolean DEFAULT true,
	"opening_hours" jsonb,
	"lobby_services" text[],
	"entrances" jsonb,
	"parking_info" jsonb,
	"photos" text[],
	"address" varchar,
	"postal_code" varchar,
	"city" varchar DEFAULT 'Helsinki',
	"coordinates" jsonb,
	"points" jsonb,
	"rotation_deg" numeric,
	"default_floor" integer,
	"campus" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "campus_services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"name_en" varchar,
	"name_fi" varchar,
	"type" varchar NOT NULL,
	"building_id" varchar,
	"room_id" varchar,
	"floor" integer,
	"description" text,
	"description_en" text,
	"description_fi" text,
	"opening_hours" jsonb,
	"currently_open" boolean DEFAULT false,
	"amenities" text[],
	"dietary_options" text[],
	"payment_methods" text[],
	"icon" varchar DEFAULT 'map-pin',
	"color_code" varchar DEFAULT '#10B981',
	"website" varchar,
	"phone" varchar,
	"email" varchar,
	"map_position_x" integer,
	"map_position_y" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"title_en" varchar,
	"title_fi" varchar,
	"description" text,
	"description_en" text,
	"description_fi" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"location" varchar,
	"room_id" varchar,
	"organizer_id" varchar,
	"is_public" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "floors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" varchar NOT NULL,
	"floor_number" integer NOT NULL,
	"name" varchar,
	"name_en" varchar,
	"name_fi" varchar,
	"description" text,
	"description_en" text,
	"description_fi" text,
	"map_image_url" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "hallways" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" varchar,
	"floor_id" varchar,
	"name" varchar,
	"name_en" varchar,
	"name_fi" varchar,
	"description" text,
	"description_en" text,
	"description_fi" text,
	"start_x" integer,
	"start_y" integer,
	"end_x" integer,
	"end_y" integer,
	"points" jsonb,
	"width" integer DEFAULT 2,
	"color_code" varchar DEFAULT '#9CA3AF',
	"emergency_route" boolean DEFAULT false,
	"accessibility_info" text,
	"is_public" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"surface" varchar,
	"floor" integer,
	"directions" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "map_packages" (
	"id" varchar PRIMARY KEY NOT NULL,
	"pointer" varchar,
	"published_at" timestamp,
	"published_by" varchar
);

CREATE TABLE "map_versions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"package_id" varchar DEFAULT 'current',
	"version" integer NOT NULL,
	"saved_at" timestamp DEFAULT now(),
	"saved_by" varchar,
	"published" boolean DEFAULT false,
	"message" text,
	"payload_key" varchar,
	"payload" jsonb
);

CREATE TABLE "navigation_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar,
	"from_room" varchar,
	"to_room" varchar,
	"from_building" varchar,
	"to_building" varchar,
	"navigation_type" varchar,
	"distance" numeric,
	"duration" integer,
	"waypoints" jsonb,
	"user_agent" text,
	"ip_address" varchar,
	"country" varchar,
	"city" varchar,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"title_en" varchar,
	"title_fi" varchar,
	"message" text NOT NULL,
	"message_en" text,
	"message_fi" text,
	"priority" varchar DEFAULT 'normal',
	"action_url" varchar,
	"action_label" varchar,
	"read" boolean DEFAULT false,
	"read_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "page_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar,
	"url" text NOT NULL,
	"referrer" text,
	"user_agent" text,
	"ip_address" varchar,
	"country" varchar,
	"city" varchar,
	"browser" varchar,
	"browser_version" varchar,
	"os" varchar,
	"device_type" varchar,
	"screen_resolution" varchar,
	"language" varchar,
	"time_zone" varchar,
	"duration" integer,
	"is_bounce" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "room_availability" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar NOT NULL,
	"end_time" varchar NOT NULL,
	"is_available" boolean DEFAULT true,
	"recurring_type" varchar DEFAULT 'weekly',
	"exception_date" varchar,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "room_bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar NOT NULL,
	"user_id" varchar,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"purpose" varchar,
	"attendees" integer,
	"status" varchar DEFAULT 'confirmed',
	"notes" text,
	"check_in_time" timestamp,
	"check_out_time" timestamp,
	"qr_code" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "room_bookings_qr_code_unique" UNIQUE("qr_code")
);

CREATE TABLE "room_sensors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar NOT NULL,
	"sensor_type" varchar NOT NULL,
	"last_activity" timestamp DEFAULT now(),
	"occupancy_status" varchar DEFAULT 'unknown',
	"confidence" numeric DEFAULT '0.0',
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "rooms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" varchar NOT NULL,
	"room_number" varchar NOT NULL,
	"name" varchar,
	"name_en" varchar,
	"name_fi" varchar,
	"floor" integer DEFAULT 1,
	"capacity" integer,
	"type" varchar,
	"sub_type" varchar,
	"equipment" text[],
	"features" text[],
	"map_position_x" integer,
	"map_position_y" integer,
	"width" integer,
	"height" integer,
	"color_code" varchar DEFAULT '#6B7280',
	"emergency_info" text,
	"accessibility_info" text,
	"maintenance_notes" text,
	"last_inspected" timestamp,
	"is_public" boolean DEFAULT true,
	"is_accessible" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"is_bookable" boolean DEFAULT false,
	"booking_duration" integer DEFAULT 60,
	"max_occupancy" integer,
	"amenities" text[],
	"current_status" varchar DEFAULT 'unknown',
	"next_available_at" timestamp,
	"photos" text[],
	"virtual_tour_url" varchar,
	"booking_rules" text,
	"requires_approval" boolean DEFAULT false,
	"description" text,
	"points" jsonb,
	"rotation_deg" numeric,
	"department" varchar,
	"teacher" varchar,
	"schedule_url" varchar,
	"schedule_label" varchar,
	"photo_url" varchar,
	"coordinates" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "search_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar,
	"query" text NOT NULL,
	"results_count" integer DEFAULT 0,
	"clicked_result" varchar,
	"search_type" varchar DEFAULT 'room',
	"filters" jsonb,
	"user_agent" text,
	"ip_address" varchar,
	"country" varchar,
	"city" varchar,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);

CREATE TABLE "staff" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"position" varchar,
	"position_en" varchar,
	"position_fi" varchar,
	"department" varchar,
	"department_en" varchar,
	"department_fi" varchar,
	"office_room_id" varchar,
	"profile_image_url" varchar,
	"bio" text,
	"bio_en" text,
	"bio_fi" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);

CREATE TABLE "tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"name" varchar,
	"email" varchar,
	"status" varchar DEFAULT 'pending',
	"priority" varchar DEFAULT 'normal',
	"assigned_to" varchar,
	"response" text,
	"error_reference_id" varchar,
	"error_stack" text,
	"error_info" jsonb,
	"user_agent" text,
	"url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	CONSTRAINT "tickets_ticket_id_unique" UNIQUE("ticket_id")
);

CREATE TABLE "user_favorites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"room_id" varchar,
	"service_id" varchar,
	"type" varchar NOT NULL,
	"nickname" varchar,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "user_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"session_id" varchar,
	"room_id" varchar,
	"service_id" varchar,
	"action" varchar NOT NULL,
	"search_query" text,
	"timestamp" timestamp DEFAULT now()
);

CREATE TABLE "user_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar,
	"ip_address" varchar,
	"user_agent" text,
	"country" varchar,
	"city" varchar,
	"browser" varchar,
	"os" varchar,
	"device_type" varchar,
	"language" varchar,
	"referrer" text,
	"landing_page" text,
	"exit_page" text,
	"page_views" integer DEFAULT 1,
	"session_duration" integer,
	"is_new_visitor" boolean DEFAULT true,
	"is_returning_visitor" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"last_activity" timestamp DEFAULT now(),
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);

CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'user',
	"password" varchar,
	"is_temporary_password" boolean DEFAULT false,
	"can_login_to_ksyk_maps" boolean DEFAULT true,
	"two_factor_secret" varchar,
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_backup_codes" text,
	"password_reset_token" varchar,
	"password_reset_expiry" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

ALTER TABLE "admin_login_logs" ADD CONSTRAINT "admin_login_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_staff_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "app_logs" ADD CONSTRAINT "app_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "campus_services" ADD CONSTRAINT "campus_services_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "campus_services" ADD CONSTRAINT "campus_services_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "events" ADD CONSTRAINT "events_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_staff_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "floors" ADD CONSTRAINT "floors_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "hallways" ADD CONSTRAINT "hallways_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "hallways" ADD CONSTRAINT "hallways_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "navigation_analytics" ADD CONSTRAINT "navigation_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "room_availability" ADD CONSTRAINT "room_availability_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "room_sensors" ADD CONSTRAINT "room_sensors_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "search_analytics" ADD CONSTRAINT "search_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "staff" ADD CONSTRAINT "staff_office_room_id_rooms_id_fk" FOREIGN KEY ("office_room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_service_id_campus_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."campus_services"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_history" ADD CONSTRAINT "user_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_history" ADD CONSTRAINT "user_history_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_history" ADD CONSTRAINT "user_history_service_id_campus_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."campus_services"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");
-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- Insert default app settings row
INSERT INTO app_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
