/**
 * One-time schema initialisation that runs on the first API request per cold
 * start (module-level singleton guard). Creates all tables that the app needs
 * but that Drizzle migrations may not have pushed to the live database yet.
 *
 * Using CREATE TABLE IF NOT EXISTS means the statement is a no-op when the
 * table already exists — no risk of data loss, no failed deploy.
 */

import { db } from "./db.js";
import { sql } from "drizzle-orm";

let initialised = false;

export async function ensureSchema(): Promise<void> {
  if (initialised) return;
  initialised = true;

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS kv_settings (
        key        varchar PRIMARY KEY,
        value      jsonb   NOT NULL,
        updated_at timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS campus_pois (
        id            varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
        kind          varchar   NOT NULL,
        floor         integer   DEFAULT 1,
        map_position_x real,
        map_position_y real,
        position      jsonb,
        label         varchar,
        metadata      jsonb,
        created_at    timestamp DEFAULT now(),
        updated_at    timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS beacon_surveys (
        id             varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id        varchar   NOT NULL,
        position_label varchar   NOT NULL,
        captured_at    timestamp,
        readings       jsonb,
        lat            real,
        lng            real,
        accuracy_m     real,
        created_at     timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS room_aliases (
        id           varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
        wilma_string varchar(512) NOT NULL UNIQUE,
        room_id      varchar   NOT NULL,
        confidence   integer   DEFAULT 99,
        method       varchar   DEFAULT 'manual',
        approved     boolean   DEFAULT true,
        approved_by  varchar,
        created_at   timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS unknown_locations (
        id              varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
        wilma_string    varchar(512) NOT NULL,
        occurrences     integer   DEFAULT 1,
        last_seen       timestamp DEFAULT now(),
        resolved        boolean   DEFAULT false,
        resolved_room_id varchar
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id          varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
        title       varchar   NOT NULL,
        title_en    varchar,
        title_fi    varchar,
        content     text      NOT NULL,
        content_en  text,
        content_fi  text,
        priority    varchar   DEFAULT 'normal',
        author_id   varchar,
        expires_at  timestamp,
        is_active   boolean   DEFAULT true,
        created_at  timestamp DEFAULT now(),
        updated_at  timestamp DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS campus_pois_kind_idx  ON campus_pois (kind);
      CREATE INDEX IF NOT EXISTS campus_pois_floor_idx ON campus_pois (floor);
      CREATE INDEX IF NOT EXISTS beacon_surveys_room_idx ON beacon_surveys (room_id);
    `);
  } catch (e: any) {
    // Non-fatal: tables might already exist or DB might be unreachable.
    // Log a warning but don't block the request.
    console.warn("[initDb] Schema init warning:", e?.message?.slice(0, 120));
    // Reset flag so we retry on the next cold start if something was wrong.
    initialised = false;
  }
}
