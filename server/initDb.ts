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

      -- v4.5.52 first-party telemetry tables (mirror of migrations/0002).
      CREATE TABLE IF NOT EXISTS telemetry_sessions (
        id               varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id       varchar NOT NULL UNIQUE,
        anonymous_id     varchar,
        user_id          varchar,
        platform         varchar NOT NULL,
        app_version      varchar,
        os_version       varchar,
        device_type      varchar,
        browser          varchar,
        browser_version  varchar,
        language         varchar,
        timezone         varchar,
        country          varchar,
        started_at       timestamptz DEFAULT now(),
        last_seen_at     timestamptz DEFAULT now(),
        ended_at         timestamptz,
        duration_ms      integer,
        created_at       timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_tsessions_platform    ON telemetry_sessions (platform);
      CREATE INDEX IF NOT EXISTS idx_tsessions_started_at  ON telemetry_sessions (started_at);
      CREATE INDEX IF NOT EXISTS idx_tsessions_last_seen   ON telemetry_sessions (last_seen_at);

      CREATE TABLE IF NOT EXISTS telemetry_events (
        id              varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id      varchar NOT NULL,
        user_id         varchar,
        platform        varchar NOT NULL,
        app_version     varchar,
        event_name      varchar NOT NULL,
        event_category  varchar,
        route           varchar,
        screen          varchar,
        duration_ms     integer,
        success         boolean,
        error_code      varchar,
        metadata        jsonb,
        created_at      timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_tevents_created_at  ON telemetry_events (created_at);
      CREATE INDEX IF NOT EXISTS idx_tevents_event_name  ON telemetry_events (event_name);
      CREATE INDEX IF NOT EXISTS idx_tevents_session_id  ON telemetry_events (session_id);
      CREATE INDEX IF NOT EXISTS idx_tevents_platform    ON telemetry_events (platform);

      CREATE TABLE IF NOT EXISTS feature_usage (
        id           varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id   varchar NOT NULL,
        user_id      varchar,
        platform     varchar NOT NULL,
        app_version  varchar,
        feature      varchar NOT NULL,
        action       varchar NOT NULL DEFAULT 'used',
        duration_ms  integer,
        metadata     jsonb,
        created_at   timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_feature_created_at  ON feature_usage (created_at);
      CREATE INDEX IF NOT EXISTS idx_feature_feature     ON feature_usage (feature);
      CREATE INDEX IF NOT EXISTS idx_feature_action      ON feature_usage (action);

      CREATE TABLE IF NOT EXISTS easter_egg_events (
        id          varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id  varchar NOT NULL,
        user_id     varchar,
        platform    varchar NOT NULL,
        egg_id      varchar NOT NULL,
        action      varchar NOT NULL DEFAULT 'discovered',
        metadata    jsonb,
        created_at  timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_egg_created_at  ON easter_egg_events (created_at);
      CREATE INDEX IF NOT EXISTS idx_egg_egg_id      ON easter_egg_events (egg_id);

      CREATE TABLE IF NOT EXISTS performance_events (
        id           varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id   varchar NOT NULL,
        user_id      varchar,
        platform     varchar NOT NULL,
        app_version  varchar,
        metric_name  varchar NOT NULL,
        value_ms     real,
        endpoint     varchar,
        status_code  integer,
        metadata     jsonb,
        created_at   timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_perf_created_at  ON performance_events (created_at);
      CREATE INDEX IF NOT EXISTS idx_perf_metric      ON performance_events (metric_name);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id             varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        admin_user_id  varchar,
        admin_email    varchar,
        action         varchar NOT NULL,
        resource       varchar,
        ip_address     varchar,
        user_agent     text,
        metadata       jsonb,
        created_at     timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_created_at  ON audit_logs (created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_action      ON audit_logs (action);
      CREATE INDEX IF NOT EXISTS idx_audit_admin       ON audit_logs (admin_user_id);

      CREATE TABLE IF NOT EXISTS app_feedback (
        id          varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
        category    varchar   NOT NULL DEFAULT 'general',
        message     text      NOT NULL,
        app_version varchar,
        device_info varchar,
        status      varchar   NOT NULL DEFAULT 'new',
        created_at  timestamp DEFAULT now(),
        updated_at  timestamp DEFAULT now()
      );
      ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS status     varchar NOT NULL DEFAULT 'new';
      ALTER TABLE app_feedback ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
      CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON app_feedback (created_at);
      CREATE INDEX IF NOT EXISTS idx_feedback_status     ON app_feedback (status);

      CREATE TABLE IF NOT EXISTS app_bug_reports (
        id          varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
        description text      NOT NULL,
        steps       text,
        app_version varchar,
        device_info varchar,
        status      varchar   NOT NULL DEFAULT 'open',
        created_at  timestamp DEFAULT now(),
        updated_at  timestamp DEFAULT now()
      );
      -- v1.71.0: workflow states on bugs so admins can move them through
      -- open → in_progress → closed without hand-editing rows.
      ALTER TABLE app_bug_reports ADD COLUMN IF NOT EXISTS status     varchar NOT NULL DEFAULT 'open';
      ALTER TABLE app_bug_reports ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
      CREATE INDEX IF NOT EXISTS idx_bugs_created_at ON app_bug_reports (created_at);
      CREATE INDEX IF NOT EXISTS idx_bugs_status     ON app_bug_reports (status);

      -- v4.7.56 — Get-the-app popup columns.  The admin toggle +
      -- API whitelist were wired, but the columns themselves were
      -- missing from the app_settings table, so UPSERTs silently
      -- dropped the values.  Add them idempotently.
      ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS show_get_app_popup boolean DEFAULT false;
      ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS get_app_url varchar DEFAULT '/download';

      CREATE TABLE IF NOT EXISTS push_tokens (
        id          varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     varchar,
        fcm_token   varchar   NOT NULL UNIQUE,
        platform    varchar   NOT NULL DEFAULT 'android',
        app_version varchar,
        created_at  timestamptz DEFAULT now(),
        updated_at  timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_push_tokens_user    ON push_tokens (user_id);
      CREATE INDEX IF NOT EXISTS idx_push_tokens_updated ON push_tokens (updated_at);

      -- v1.80.0: broadcast history — every FCM send from the admin panel
      -- is recorded here so admins can audit "what did I send to whom" and
      -- see delivery stats retroactively.
      CREATE TABLE IF NOT EXISTS fcm_broadcasts (
        id           varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
        title        varchar   NOT NULL,
        body         text      NOT NULL,
        type         varchar,
        screen       varchar,
        target_count integer   NOT NULL DEFAULT 0,
        sent_count   integer   NOT NULL DEFAULT 0,
        failed_count integer   NOT NULL DEFAULT 0,
        sent_by      varchar,
        created_at   timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_fcm_broadcasts_created_at ON fcm_broadcasts (created_at DESC);

      -- v1.71.0: crash reports uploaded from the mobile app so admins can
      -- see them in the panel without users going through a share sheet.
      CREATE TABLE IF NOT EXISTS app_crash_reports (
        id           varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
        app_version  varchar,
        platform     varchar   DEFAULT 'android',
        device_info  varchar,
        log_body     text      NOT NULL,
        log_lines    integer,
        status       varchar   NOT NULL DEFAULT 'open',
        created_at   timestamptz DEFAULT now()
      );
      ALTER TABLE app_crash_reports ADD COLUMN IF NOT EXISTS status varchar NOT NULL DEFAULT 'open';
      CREATE INDEX IF NOT EXISTS idx_crash_created_at ON app_crash_reports (created_at);
      CREATE INDEX IF NOT EXISTS idx_crash_status     ON app_crash_reports (status);
    `);
  } catch (e: any) {
    // Non-fatal: tables might already exist or DB might be unreachable.
    // Log a warning but don't block the request.
    console.warn("[initDb] Schema init warning:", e?.message?.slice(0, 120));
    // Reset flag so we retry on the next cold start if something was wrong.
    initialised = false;
  }
}
