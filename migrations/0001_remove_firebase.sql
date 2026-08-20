-- Migration: replace Firestore collections with Supabase tables (v3.99.0)

CREATE TABLE IF NOT EXISTS "campus_pois" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "kind" varchar NOT NULL,
  "floor" integer DEFAULT 1,
  "map_position_x" real,
  "map_position_y" real,
  "position" jsonb,
  "label" varchar,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "kv_settings" (
  "key" varchar PRIMARY KEY,
  "value" jsonb NOT NULL,
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "beacon_surveys" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "room_id" varchar NOT NULL,
  "position_label" varchar NOT NULL,
  "captured_at" timestamp,
  "readings" jsonb,
  "lat" real,
  "lng" real,
  "accuracy_m" real,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "campus_pois_kind_idx" ON "campus_pois" ("kind");
CREATE INDEX IF NOT EXISTS "campus_pois_floor_idx" ON "campus_pois" ("floor");
CREATE INDEX IF NOT EXISTS "beacon_surveys_room_idx" ON "beacon_surveys" ("room_id");
