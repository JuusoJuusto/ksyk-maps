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
      -- v1.0.2 — admin can hide the first-visit beta welcome banner.
      ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS show_beta_banner boolean DEFAULT true;

      -- v1.0.9 — teacher abbreviation + Wilma profile URL on staff rows.
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS abbrev varchar;
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS wilma_profile_url varchar;

      -- v1.0.9 — subject / course lookup table for Wilma schedule resolution.
      CREATE TABLE IF NOT EXISTS subjects (
        id         varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
        code       varchar   NOT NULL UNIQUE,
        name       varchar   NOT NULL,
        name_en    varchar,
        color      varchar,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects (code);

      -- v1.1.0 — map overlay toggles (floor labels, GPS dot).
      ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS enable_floor_labels boolean DEFAULT true;
      ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS enable_gps boolean DEFAULT true;

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

      -- v1.1.4 — seed standard KSYK course catalogue (ON CONFLICT = no-op so admin edits are preserved).
      INSERT INTO subjects (id, code, name, name_en, color) VALUES
        (gen_random_uuid(),'MA1','Matematiikka 1','Mathematics 1','#3B82F6'),
        (gen_random_uuid(),'MA2','Matematiikka 2','Mathematics 2','#3B82F6'),
        (gen_random_uuid(),'MA3','Matematiikka 3','Mathematics 3','#3B82F6'),
        (gen_random_uuid(),'MA4','Matematiikka 4','Mathematics 4','#3B82F6'),
        (gen_random_uuid(),'MA5','Matematiikka 5','Mathematics 5','#3B82F6'),
        (gen_random_uuid(),'MA6','Matematiikka 6','Mathematics 6','#3B82F6'),
        (gen_random_uuid(),'MA7','Matematiikka 7','Mathematics 7','#3B82F6'),
        (gen_random_uuid(),'MA8','Matematiikka 8','Mathematics 8','#3B82F6'),
        (gen_random_uuid(),'MA9','Matematiikka 9','Mathematics 9','#3B82F6'),
        (gen_random_uuid(),'MA10','Matematiikka 10','Mathematics 10','#3B82F6'),
        (gen_random_uuid(),'svMA1','Matematiikka 1 (sv)','Mathematics 1 (sv)','#3B82F6'),
        (gen_random_uuid(),'BI1','Biologia 1','Biology 1','#22C55E'),
        (gen_random_uuid(),'BI2','Biologia 2','Biology 2','#22C55E'),
        (gen_random_uuid(),'BI3','Biologia 3','Biology 3','#22C55E'),
        (gen_random_uuid(),'svBI1','Biologia 1 (sv)','Biology 1 (sv)','#22C55E'),
        (gen_random_uuid(),'GE1','Maantieto 1','Geography 1','#84CC16'),
        (gen_random_uuid(),'GE2','Maantieto 2','Geography 2','#84CC16'),
        (gen_random_uuid(),'GE3','Maantieto 3','Geography 3','#84CC16'),
        (gen_random_uuid(),'FY1','Fysiikka 1','Physics 1','#8B5CF6'),
        (gen_random_uuid(),'FY2','Fysiikka 2','Physics 2','#8B5CF6'),
        (gen_random_uuid(),'FY3','Fysiikka 3','Physics 3','#8B5CF6'),
        (gen_random_uuid(),'KE1','Kemia 1','Chemistry 1','#10B981'),
        (gen_random_uuid(),'KE2','Kemia 2','Chemistry 2','#10B981'),
        (gen_random_uuid(),'KE3','Kemia 3','Chemistry 3','#10B981'),
        (gen_random_uuid(),'svKE1','Kemia 1 (sv)','Chemistry 1 (sv)','#10B981'),
        (gen_random_uuid(),'svKE2','Kemia 2 (sv)','Chemistry 2 (sv)','#10B981'),
        (gen_random_uuid(),'SC1','Tiede 1','Science 1','#84CC16'),
        (gen_random_uuid(),'SC2','Tiede 2','Science 2','#84CC16'),
        (gen_random_uuid(),'SC3','Tiede 3','Science 3','#84CC16'),
        (gen_random_uuid(),'SC4','Tiede 4','Science 4','#84CC16'),
        (gen_random_uuid(),'svSC1','Tiede 1 (sv)','Science 1 (sv)','#84CC16'),
        (gen_random_uuid(),'HI1','Historia 1','History 1','#F59E0B'),
        (gen_random_uuid(),'HI2','Historia 2','History 2','#F59E0B'),
        (gen_random_uuid(),'HI3','Historia 3','History 3','#F59E0B'),
        (gen_random_uuid(),'HI4','Historia 4','History 4','#F59E0B'),
        (gen_random_uuid(),'YH1','Yhteiskuntaoppi 1','Social Studies 1','#EF4444'),
        (gen_random_uuid(),'YH2','Yhteiskuntaoppi 2','Social Studies 2','#EF4444'),
        (gen_random_uuid(),'YH3','Yhteiskuntaoppi 3','Social Studies 3','#EF4444'),
        (gen_random_uuid(),'YH4','Yhteiskuntaoppi 4','Social Studies 4','#EF4444'),
        (gen_random_uuid(),'UE1','Uskonto (ev.lut.) 1','Religion (Lutheran) 1','#EC4899'),
        (gen_random_uuid(),'UE2','Uskonto (ev.lut.) 2','Religion (Lutheran) 2','#EC4899'),
        (gen_random_uuid(),'UE3','Uskonto (ev.lut.) 3','Religion (Lutheran) 3','#EC4899'),
        (gen_random_uuid(),'UO1','Uskonto (ortodoksinen) 1','Religion (Orthodox) 1','#EC4899'),
        (gen_random_uuid(),'UO2','Uskonto (ortodoksinen) 2','Religion (Orthodox) 2','#EC4899'),
        (gen_random_uuid(),'UO3','Uskonto (ortodoksinen) 3','Religion (Orthodox) 3','#EC4899'),
        (gen_random_uuid(),'UK1','Uskonto (katolinen) 1','Religion (Catholic) 1','#EC4899'),
        (gen_random_uuid(),'UK2','Uskonto (katolinen) 2','Religion (Catholic) 2','#EC4899'),
        (gen_random_uuid(),'UK3','Uskonto (katolinen) 3','Religion (Catholic) 3','#EC4899'),
        (gen_random_uuid(),'ET1','Elämänkatsomustieto 1','Ethics 1','#EC4899'),
        (gen_random_uuid(),'ET2','Elämänkatsomustieto 2','Ethics 2','#EC4899'),
        (gen_random_uuid(),'ET3','Elämänkatsomustieto 3','Ethics 3','#EC4899'),
        (gen_random_uuid(),'MU1','Musiikki 1','Music 1','#6366F1'),
        (gen_random_uuid(),'MU2','Musiikki 2','Music 2','#6366F1'),
        (gen_random_uuid(),'vMU1','Musiikki 1 (valinnainen)','Music 1 (elective)','#6366F1'),
        (gen_random_uuid(),'vMU2','Musiikki 2 (valinnainen)','Music 2 (elective)','#6366F1'),
        (gen_random_uuid(),'vMU3','Musiikki 3 (valinnainen)','Music 3 (elective)','#6366F1'),
        (gen_random_uuid(),'vMU4','Musiikki 4 (valinnainen)','Music 4 (elective)','#6366F1'),
        (gen_random_uuid(),'svMU1','Musiikki 1 (sv)','Music 1 (sv)','#6366F1'),
        (gen_random_uuid(),'svMU5','Musiikki 5 (sv)','Music 5 (sv)','#6366F1'),
        (gen_random_uuid(),'svMU6','Musiikki 6 (sv)','Music 6 (sv)','#6366F1'),
        (gen_random_uuid(),'svMU7','Musiikki 7 (sv)','Music 7 (sv)','#6366F1'),
        (gen_random_uuid(),'KU1','Kuvataide 1','Visual Arts 1','#F97316'),
        (gen_random_uuid(),'KU2','Kuvataide 2','Visual Arts 2','#F97316'),
        (gen_random_uuid(),'vKU1','Kuvataide 1 (valinnainen)','Visual Arts 1 (elective)','#F97316'),
        (gen_random_uuid(),'vKU2','Kuvataide 2 (valinnainen)','Visual Arts 2 (elective)','#F97316'),
        (gen_random_uuid(),'vKU3','Kuvataide 3 (valinnainen)','Visual Arts 3 (elective)','#F97316'),
        (gen_random_uuid(),'vKU4','Kuvataide 4 (valinnainen)','Visual Arts 4 (elective)','#F97316'),
        (gen_random_uuid(),'svKU5','Kuvataide 5 (sv)','Visual Arts 5 (sv)','#F97316'),
        (gen_random_uuid(),'svKU6','Kuvataide 6 (sv)','Visual Arts 6 (sv)','#F97316'),
        (gen_random_uuid(),'svKU7','Kuvataide 7 (sv)','Visual Arts 7 (sv)','#F97316'),
        (gen_random_uuid(),'KO1','Kotitalous 1','Home Economics 1','#14B8A6'),
        (gen_random_uuid(),'KO2','Kotitalous 2','Home Economics 2','#14B8A6'),
        (gen_random_uuid(),'KO3','Kotitalous 3','Home Economics 3','#14B8A6'),
        (gen_random_uuid(),'vKO1','Kotitalous 1 (valinnainen)','Home Economics 1 (elective)','#14B8A6'),
        (gen_random_uuid(),'vKO2','Kotitalous 2 (valinnainen)','Home Economics 2 (elective)','#14B8A6'),
        (gen_random_uuid(),'vKO7','Kotitalous 7 (valinnainen)','Home Economics 7 (elective)','#14B8A6'),
        (gen_random_uuid(),'vKO8','Kotitalous 8 (valinnainen)','Home Economics 8 (elective)','#14B8A6'),
        (gen_random_uuid(),'svKO1','Kotitalous 1 (sv)','Home Economics 1 (sv)','#14B8A6'),
        (gen_random_uuid(),'svKO3','Kotitalous 3 (sv)','Home Economics 3 (sv)','#14B8A6'),
        (gen_random_uuid(),'svKO4','Kotitalous 4 (sv)','Home Economics 4 (sv)','#14B8A6'),
        (gen_random_uuid(),'svKO9','Kotitalous 9 (sv)','Home Economics 9 (sv)','#14B8A6'),
        (gen_random_uuid(),'svKO10','Kotitalous 10 (sv)','Home Economics 10 (sv)','#14B8A6'),
        (gen_random_uuid(),'svKO13','Kotitalous 13 (sv)','Home Economics 13 (sv)','#14B8A6'),
        (gen_random_uuid(),'svKO14','Kotitalous 14 (sv)','Home Economics 14 (sv)','#14B8A6'),
        (gen_random_uuid(),'KS1','Käsityö 1','Craft 1','#A855F7'),
        (gen_random_uuid(),'KS2','Käsityö 2','Craft 2','#A855F7'),
        (gen_random_uuid(),'vKS7','Käsityö 7 (valinnainen)','Craft 7 (elective)','#A855F7'),
        (gen_random_uuid(),'vKS8','Käsityö 8 (valinnainen)','Craft 8 (elective)','#A855F7'),
        (gen_random_uuid(),'vKS9','Käsityö 9 (valinnainen)','Craft 9 (elective)','#A855F7'),
        (gen_random_uuid(),'vKS10','Käsityö 10 (valinnainen)','Craft 10 (elective)','#A855F7'),
        (gen_random_uuid(),'svKS1','Käsityö 1 (sv)','Craft 1 (sv)','#A855F7'),
        (gen_random_uuid(),'svKS2','Käsityö 2 (sv)','Craft 2 (sv)','#A855F7'),
        (gen_random_uuid(),'svKS5','Käsityö 5 (sv)','Craft 5 (sv)','#A855F7'),
        (gen_random_uuid(),'svKS11','Käsityö 11 (sv)','Craft 11 (sv)','#A855F7'),
        (gen_random_uuid(),'svKS12','Käsityö 12 (sv)','Craft 12 (sv)','#A855F7'),
        (gen_random_uuid(),'svKS13','Käsityö 13 (sv)','Craft 13 (sv)','#A855F7'),
        (gen_random_uuid(),'LI1','Liikunta 1','Physical Education 1','#EF4444'),
        (gen_random_uuid(),'LI2','Liikunta 2','Physical Education 2','#EF4444'),
        (gen_random_uuid(),'LI3','Liikunta 3','Physical Education 3','#EF4444'),
        (gen_random_uuid(),'LI4','Liikunta 4','Physical Education 4','#EF4444'),
        (gen_random_uuid(),'LI5','Liikunta 5','Physical Education 5','#EF4444'),
        (gen_random_uuid(),'LI6','Liikunta 6','Physical Education 6','#EF4444'),
        (gen_random_uuid(),'LI7','Liikunta 7','Physical Education 7','#EF4444'),
        (gen_random_uuid(),'vLI3','Liikunta 3 (valinnainen)','Physical Education 3 (elective)','#EF4444'),
        (gen_random_uuid(),'vLI5','Liikunta 5 (valinnainen)','Physical Education 5 (elective)','#EF4444'),
        (gen_random_uuid(),'vLI8','Liikunta 8 (valinnainen)','Physical Education 8 (elective)','#EF4444'),
        (gen_random_uuid(),'vLI9','Liikunta 9 (valinnainen)','Physical Education 9 (elective)','#EF4444'),
        (gen_random_uuid(),'svLI1','Liikunta 1 (sv)','Physical Education 1 (sv)','#EF4444'),
        (gen_random_uuid(),'svLI2','Liikunta 2 (sv)','Physical Education 2 (sv)','#EF4444'),
        (gen_random_uuid(),'svLI4','Liikunta 4 (sv)','Physical Education 4 (sv)','#EF4444'),
        (gen_random_uuid(),'svLI6','Liikunta 6 (sv)','Physical Education 6 (sv)','#EF4444'),
        (gen_random_uuid(),'svLI7','Liikunta 7 (sv)','Physical Education 7 (sv)','#EF4444'),
        (gen_random_uuid(),'TE1','Terveystieto 1','Health Education 1','#06B6D4'),
        (gen_random_uuid(),'TE2','Terveystieto 2','Health Education 2','#06B6D4'),
        (gen_random_uuid(),'TE3','Terveystieto 3','Health Education 3','#06B6D4'),
        (gen_random_uuid(),'VAP1','Vapaaehtoistyö 1','Volunteering 1','#6B7280')
      ON CONFLICT (code) DO NOTHING;

      -- v1.1.4 — retroactively color courses that were added without a color.
      UPDATE subjects SET color = CASE
        WHEN code ~ '^(a1|a2|v|AI|sv)?EN' THEN '#2563EB'
        WHEN code ~ '^(a1|a2|b|sv)?RA'    THEN '#C026D3'
        WHEN code ~ '^(a1|a2|b|sv)?SA'    THEN '#B45309'
        WHEN code ~ '^(a1|a2|b|sv)?EA'    THEN '#DC2626'
        WHEN code ~ '^(a|b|sv)?RU'        THEN '#0284C7'
        WHEN code ~ '^v?KOR'              THEN '#7C3AED'
        WHEN code ~ '^OPO'                THEN '#6B7280'
        WHEN code ~ '^(sv|v[a-z])?MA'    THEN '#3B82F6'
        WHEN code ~ '^(sv|v[a-z])?FY'    THEN '#8B5CF6'
        WHEN code ~ '^(sv|v[a-z])?KE'    THEN '#10B981'
        WHEN code ~ '^(sv|v[a-z])?BI'    THEN '#22C55E'
        WHEN code ~ '^(sv|v[a-z])?GE'    THEN '#84CC16'
        WHEN code ~ '^(sv|v[a-z])?HI'    THEN '#F59E0B'
        WHEN code ~ '^(sv|v[a-z])?YH'    THEN '#EF4444'
        WHEN code ~ '^(sv|v[a-z])?(UE|UO|UK|ET)' THEN '#EC4899'
        WHEN code ~ '^(sv|v[a-z])?MU'    THEN '#6366F1'
        WHEN code ~ '^(sv|v[a-z])?KU'    THEN '#F97316'
        WHEN code ~ '^(sv|v[a-z])?KO'    THEN '#14B8A6'
        WHEN code ~ '^(sv|v[a-z])?KS'    THEN '#A855F7'
        WHEN code ~ '^(sv|v[a-z])?LI'    THEN '#EF4444'
        WHEN code ~ '^(sv|v[a-z])?TE'    THEN '#06B6D4'
        WHEN code ~ '^(sv|v[a-z])?SC'    THEN '#84CC16'
        WHEN code ~ '^VAP'               THEN '#6B7280'
        ELSE '#6B7280'
      END
      WHERE color IS NULL;

      -- v1.1.5 — language courses seed.
      INSERT INTO subjects (id, code, name, name_en, color) VALUES
        (gen_random_uuid(),'a1EN1','A1-Englanti 1','English A1 1','#2563EB'),
        (gen_random_uuid(),'a1EN2','A1-Englanti 2','English A1 2','#2563EB'),
        (gen_random_uuid(),'a1EN3','A1-Englanti 3','English A1 3','#2563EB'),
        (gen_random_uuid(),'a1EN4','A1-Englanti 4','English A1 4','#2563EB'),
        (gen_random_uuid(),'a1EN5','A1-Englanti 5','English A1 5','#2563EB'),
        (gen_random_uuid(),'a1EN6','A1-Englanti 6','English A1 6','#2563EB'),
        (gen_random_uuid(),'a1EN7','A1-Englanti 7','English A1 7','#2563EB'),
        (gen_random_uuid(),'aRU','A-Ruotsi','Swedish A','#0284C7'),
        (gen_random_uuid(),'bRU','B-Ruotsi','Swedish B1','#0284C7'),
        (gen_random_uuid(),'svRU','Ruotsi lyhyt','Swedish short','#0284C7'),
        (gen_random_uuid(),'a1RA1','A1-Ranska 1','French A1 1','#C026D3'),
        (gen_random_uuid(),'a1RA2','A1-Ranska 2','French A1 2','#C026D3'),
        (gen_random_uuid(),'a1RA3','A1-Ranska 3','French A1 3','#C026D3'),
        (gen_random_uuid(),'a1RA4','A1-Ranska 4','French A1 4','#C026D3'),
        (gen_random_uuid(),'a1RA5','A1-Ranska 5','French A1 5','#C026D3'),
        (gen_random_uuid(),'a1RA6','A1-Ranska 6','French A1 6','#C026D3'),
        (gen_random_uuid(),'a1RA7','A1-Ranska 7','French A1 7','#C026D3'),
        (gen_random_uuid(),'a1SA1','A1-Saksa 1','German A1 1','#B45309'),
        (gen_random_uuid(),'a1SA2','A1-Saksa 2','German A1 2','#B45309'),
        (gen_random_uuid(),'a1SA3','A1-Saksa 3','German A1 3','#B45309'),
        (gen_random_uuid(),'a1SA4','A1-Saksa 4','German A1 4','#B45309'),
        (gen_random_uuid(),'a1SA5','A1-Saksa 5','German A1 5','#B45309'),
        (gen_random_uuid(),'a1SA6','A1-Saksa 6','German A1 6','#B45309'),
        (gen_random_uuid(),'a1SA7','A1-Saksa 7','German A1 7','#B45309'),
        (gen_random_uuid(),'a1EA1','A-Espanja 1','Spanish A1 1','#DC2626'),
        (gen_random_uuid(),'a1EA2','A-Espanja 2','Spanish A1 2','#DC2626'),
        (gen_random_uuid(),'a1EA3','A-Espanja 3','Spanish A1 3','#DC2626'),
        (gen_random_uuid(),'a1EA4','A-Espanja 4','Spanish A1 4','#DC2626'),
        (gen_random_uuid(),'a1EA5','A-Espanja 5','Spanish A1 5','#DC2626'),
        (gen_random_uuid(),'a1EA6','A-Espanja 6','Spanish A1 6','#DC2626'),
        (gen_random_uuid(),'a1EA7','A-Espanja 7','Spanish A1 7','#DC2626'),
        (gen_random_uuid(),'a2EN1','A2-kieli Englanti 1','English A2 1','#2563EB'),
        (gen_random_uuid(),'a2EN2','A2-kieli Englanti 2','English A2 2','#2563EB'),
        (gen_random_uuid(),'a2EN3','A2-kieli Englanti 3','English A2 3','#2563EB'),
        (gen_random_uuid(),'a2EN4','A2-kieli Englanti 4','English A2 4','#2563EB'),
        (gen_random_uuid(),'a2EN5','A2-kieli Englanti 5','English A2 5','#2563EB'),
        (gen_random_uuid(),'a2EN6','A2-kieli Englanti 6','English A2 6','#2563EB'),
        (gen_random_uuid(),'a2EN7','A2-kieli Englanti 7','English A2 7','#2563EB'),
        (gen_random_uuid(),'vEN1','Fish & chips or Coke and burger','Fish & Chips or Coke and Burger','#2563EB'),
        (gen_random_uuid(),'vEN2','Aspects of Britain','Aspects of Britain','#2563EB'),
        (gen_random_uuid(),'a2RA1','A2-kieli Ranska 1','French A2 1','#C026D3'),
        (gen_random_uuid(),'a2RA2','A2-kieli Ranska 2','French A2 2','#C026D3'),
        (gen_random_uuid(),'a2RA3','A2-kieli Ranska 3','French A2 3','#C026D3'),
        (gen_random_uuid(),'a2RA4','A2-kieli Ranska 4','French A2 4','#C026D3'),
        (gen_random_uuid(),'a2RA5','A2-kieli Ranska 5','French A2 5','#C026D3'),
        (gen_random_uuid(),'a2RA6','A2-kieli Ranska 6','French A2 6','#C026D3'),
        (gen_random_uuid(),'a2RA7','A2-kieli Ranska 7','French A2 7','#C026D3'),
        (gen_random_uuid(),'a2SA1','A2-kieli Saksa 1','German A2 1','#B45309'),
        (gen_random_uuid(),'a2SA2','A2-kieli Saksa 2','German A2 2','#B45309'),
        (gen_random_uuid(),'a2SA3','A2-kieli Saksa 3','German A2 3','#B45309'),
        (gen_random_uuid(),'a2SA4','A2-kieli Saksa 4','German A2 4','#B45309'),
        (gen_random_uuid(),'a2SA5','A2-kieli Saksa 5','German A2 5','#B45309'),
        (gen_random_uuid(),'a2SA6','A2-kieli Saksa 6','German A2 6','#B45309'),
        (gen_random_uuid(),'a2SA7','A2-kieli Saksa 7','German A2 7','#B45309'),
        (gen_random_uuid(),'a2EA1','A2-kieli Espanja 1','Spanish A2 1','#DC2626'),
        (gen_random_uuid(),'a2EA2','A2-kieli Espanja 2','Spanish A2 2','#DC2626'),
        (gen_random_uuid(),'a2EA3','A2-kieli Espanja 3','Spanish A2 3','#DC2626'),
        (gen_random_uuid(),'a2EA4','A2-kieli Espanja 4','Spanish A2 4','#DC2626'),
        (gen_random_uuid(),'a2EA5','A2-kieli Espanja 5','Spanish A2 5','#DC2626'),
        (gen_random_uuid(),'a2EA6','A2-kieli Espanja 6','Spanish A2 6','#DC2626'),
        (gen_random_uuid(),'a2EA7','A2-kieli Espanja 7','Spanish A2 7','#DC2626'),
        (gen_random_uuid(),'bRA1','Ranska B2-kieli 1','French B2 1','#C026D3'),
        (gen_random_uuid(),'bRA2','Ranska B2-kieli 2','French B2 2','#C026D3'),
        (gen_random_uuid(),'bRA3','Ranska B2-kieli 3','French B2 3','#C026D3'),
        (gen_random_uuid(),'bRA4','Ranska B2-kieli 4','French B2 4','#C026D3'),
        (gen_random_uuid(),'bRA5','Ranska B2-kieli 5','French B2 5','#C026D3'),
        (gen_random_uuid(),'bSA1','B-Saksa 1','German B2 1','#B45309'),
        (gen_random_uuid(),'bSA2','B-Saksa 2','German B2 2','#B45309'),
        (gen_random_uuid(),'bSA3','B-Saksa 3','German B2 3','#B45309'),
        (gen_random_uuid(),'bSA4','B-Saksa 4','German B2 4','#B45309'),
        (gen_random_uuid(),'bSA5','B-Saksa 5','German B2 5','#B45309'),
        (gen_random_uuid(),'bEA1','B-Espanja 1','Spanish B2 1','#DC2626'),
        (gen_random_uuid(),'bEA2','B-Espanja 2','Spanish B2 2','#DC2626'),
        (gen_random_uuid(),'bEA3','B-Espanja 3','Spanish B2 3','#DC2626'),
        (gen_random_uuid(),'bEA4','B-Espanja 4','Spanish B2 4','#DC2626'),
        (gen_random_uuid(),'bEA5','B-Espanja 5','Spanish B2 5','#DC2626'),
        (gen_random_uuid(),'AIEN1','Äidinkieli Englanti 1','Mother Tongue English 1','#2563EB'),
        (gen_random_uuid(),'AIEN2','Äidinkieli Englanti 2','Mother Tongue English 2','#2563EB'),
        (gen_random_uuid(),'AIEN3','Äidinkieli Englanti 3','Mother Tongue English 3','#2563EB'),
        (gen_random_uuid(),'AIEN4','Äidinkieli Englanti 4','Mother Tongue English 4','#2563EB'),
        (gen_random_uuid(),'AIEN5','Äidinkieli Englanti 5','Mother Tongue English 5','#2563EB'),
        (gen_random_uuid(),'AIEN6','Äidinkieli Englanti 6','Mother Tongue English 6','#2563EB'),
        (gen_random_uuid(),'vKOR1','Korean kurssi','Korean','#7C3AED'),
        (gen_random_uuid(),'OPO','Opinto-ohjaus','Guidance Counselling','#6B7280')
      ON CONFLICT (code) DO NOTHING;

      -- v1.1.5 — unique index for teacher abbrev seeding (idempotent).
      CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_abbrev
        ON staff (abbrev) WHERE abbrev IS NOT NULL;

      -- v1.1.6 — re-seed teacher roster: position=Opettaja/Teacher, department=subjects.
      -- DO UPDATE fixes rows already inserted by v1.1.5 that had subjects in position.
      INSERT INTO staff (id, first_name, last_name, abbrev, position, position_en, position_fi, department, department_en, department_fi, is_active)
      VALUES
        (gen_random_uuid(),'Veera','Aalto','VeA','Opettaja','Teacher','Opettaja','Katsomusaineet','Religious Education','Katsomusaineet',true),
        (gen_random_uuid(),'Joona','Aaltonen','JAa','Opettaja','Teacher','Opettaja','Matematiikka','Mathematics','Matematiikka',true),
        (gen_random_uuid(),'Vuokko','Aarnio','VAa','Opettaja','Teacher','Opettaja','Kemia, Matematiikka','Chemistry, Mathematics','Kemia, Matematiikka',true),
        (gen_random_uuid(),'Merja','Alatalo','MAl','Opettaja','Teacher','Opettaja','Äidinkieli ja kirjallisuus, S2','Finnish, Finnish as a second language','Äidinkieli ja kirjallisuus, S2',true),
        (gen_random_uuid(),'Taru','Alkio','TAl','Opettaja','Teacher','Opettaja','Erityisopetus','Special Education','Erityisopetus',true),
        (gen_random_uuid(),'Svetlana','Andersson','SAn','Opettaja','Teacher','Opettaja','Oman äidinkielen opettaja - venäjä','Native Language - Russian','Oman äidinkielen opettaja - venäjä',true),
        (gen_random_uuid(),'Päivi','Autio','PAu','Opettaja','Teacher','Opettaja','Ruotsi, Englanti, Espanja','Swedish, English, Spanish','Ruotsi, Englanti, Espanja',true),
        (gen_random_uuid(),'Paul','Boisdron','PBo','Opettaja','Teacher','Opettaja','Liikunta','Physical Education','Liikunta',true),
        (gen_random_uuid(),'Tomy','Cherian','TCh','Opettaja','Teacher','Opettaja','Fysiikka, Kemia','Physics, Chemistry','Fysiikka, Kemia',true),
        (gen_random_uuid(),'Richard','Cousins','RCo','Opettaja','Teacher','Opettaja','Peruskoulun rehtori','Middle School Principal','Peruskoulun rehtori',true),
        (gen_random_uuid(),'Arunima','Deb','ADe','Opettaja','Teacher','Opettaja','Englanti','English','Englanti',true),
        (gen_random_uuid(),'Akseli','Elovainio','AEl','Opettaja','Teacher','Opettaja','Japani','Japanese','Japani',true),
        (gen_random_uuid(),'Kirsten','Eskelinen','KEs','Opettaja','Teacher','Opettaja','Englanti, Kuvataide','English, Art','Englanti, Kuvataide',true),
        (gen_random_uuid(),'Christian','Franklin','CFr','Opettaja','Teacher','Opettaja','Biologia, Kemia','Biology, Chemistry','Biologia, Kemia',true),
        (gen_random_uuid(),'Shenelle','Ghulam','SGh','Opettaja','Teacher','Opettaja','Matematiikka, Kemia','Mathematics, Chemistry','Matematiikka, Kemia',true),
        (gen_random_uuid(),'Lauri','Halla','LHa','Opettaja','Teacher','Opettaja','Johtava rehtori','Head of School','Johtava rehtori',true),
        (gen_random_uuid(),'Meri','Heikkilä','MHe','Opettaja','Teacher','Opettaja','Äidinkieli ja kirjallisuus','Finnish','Äidinkieli ja kirjallisuus',true),
        (gen_random_uuid(),'Nelli','Helin','NHe','Opettaja','Teacher','Opettaja','Englanti, Espanja','English, Spanish','Englanti, Espanja',true),
        (gen_random_uuid(),'Sirpa','Hildén','SHi','Opettaja','Teacher','Opettaja','Historia ja yhteiskuntaoppi','History and Civics','Historia ja yhteiskuntaoppi',true),
        (gen_random_uuid(),'Annika','Huhta','AHu','Opettaja','Teacher','Opettaja','Äidinkieli ja kirjallisuus','Finnish','Äidinkieli ja kirjallisuus',true),
        (gen_random_uuid(),'Hanna','Huhtakallio','HHu','Opettaja','Teacher','Opettaja','Kemia','Chemistry','Kemia',true),
        (gen_random_uuid(),'Heidi','Hult','HeH','Opettaja','Teacher','Opettaja','Erityisopetus','Special Education','Erityisopetus',true),
        (gen_random_uuid(),'Mirka','Hussi','MHu','Opettaja','Teacher','Opettaja','Espanja','Spanish','Espanja',true),
        (gen_random_uuid(),'Eero','Hytönen','EHy','Opettaja','Teacher','Opettaja','Matematiikka, Fysiikka','Mathematics, Physics','Matematiikka, Fysiikka',true),
        (gen_random_uuid(),'Katariina','Hämäläinen','KaH','Opettaja','Teacher','Opettaja','Kemia, Biologia','Chemistry, Biology','Kemia, Biologia',true),
        (gen_random_uuid(),'Esko','Häyrynen','EHä','Opettaja','Teacher','Opettaja','Matematiikka','Mathematics','Matematiikka',true),
        (gen_random_uuid(),'Jaana','Junnonen','JJu','Opettaja','Teacher','Opettaja','Äidinkieli ja kirjallisuus, S2','Finnish, Finnish as a second language','Äidinkieli ja kirjallisuus, S2',true),
        (gen_random_uuid(),'Riitta','Kaisto','RKa','Opettaja','Teacher','Opettaja','Lukion apulaisrehtori','Upper School Vice Principal','Lukion apulaisrehtori',true),
        (gen_random_uuid(),'Pilvi','Kantola','PKa','Opettaja','Teacher','Opettaja','Opinto-ohjaaja','Guidance Counsellor','Opinto-ohjaaja',true),
        (gen_random_uuid(),'Roosa','Kinnunen','RKi','Opettaja','Teacher','Opettaja','Liikunta, Terveystieto','Physical Education, Health Education','Liikunta, Terveystieto',true),
        (gen_random_uuid(),'Ville','Kohvakka','VKo','Opettaja','Teacher','Opettaja','Yhteiskuntaoppi','Civics','Yhteiskuntaoppi',true),
        (gen_random_uuid(),'Ritva','Korhonen','RKo','Opettaja','Teacher','Opettaja','Englanti','English','Englanti',true),
        (gen_random_uuid(),'Kalevi','Kurronen','KKu','Opettaja','Teacher','Opettaja','Kaupalliset aineet','Business Studies','Kaupalliset aineet',true),
        (gen_random_uuid(),'Saara','Kylmänen','SKy','Opettaja','Teacher','Opettaja','Äidinkieli ja kirjallisuus, S2','Finnish, Finnish as a second language','Äidinkieli ja kirjallisuus, S2',true),
        (gen_random_uuid(),'Simo','Lampinen','SLa','Opettaja','Teacher','Opettaja','Peruskoulun apulaisrehtori','Middle School Vice Principal','Peruskoulun apulaisrehtori',true),
        (gen_random_uuid(),'Anu','Lankila','ALa','Opettaja','Teacher','Opettaja','Liikunta, Terveystieto','Physical Education, Health Education','Liikunta, Terveystieto',true),
        (gen_random_uuid(),'Lassi','Larjo','LLa','Opettaja','Teacher','Opettaja','Filosofia, Psykologia','Philosophy, Psychology','Filosofia, Psykologia',true),
        (gen_random_uuid(),'Marianne','Lehtola','MLe','Opettaja','Teacher','Opettaja','Erityisopetus','Special Education','Erityisopetus',true),
        (gen_random_uuid(),'Tiina','Lyyra','TLy','Opettaja','Teacher','Opettaja','Äidinkieli ja kirjallisuus, S2','Finnish, Finnish as a second language','Äidinkieli ja kirjallisuus, S2',true),
        (gen_random_uuid(),'Jukka','Lämsä','JLä','Opettaja','Teacher','Opettaja','Matematiikka, Fysiikka, STEAM','Mathematics, Physics, STEAM','Matematiikka, Fysiikka, STEAM',true),
        (gen_random_uuid(),'Juuso','Maasara','JuM','Opettaja','Teacher','Opettaja','Matematiikka, Fysiikka, Science','Mathematics, Physics, Science','Matematiikka, Fysiikka, Science',true),
        (gen_random_uuid(),'Kaisa','Macdonald','KMa','Opettaja','Teacher','Opettaja','Opinto-ohjaaja','Guidance Counsellor','Opinto-ohjaaja',true),
        (gen_random_uuid(),'Elli','Marjanen','EMa','Opettaja','Teacher','Opettaja','Matematiikka, Kemia','Mathematics, Chemistry','Matematiikka, Kemia',true),
        (gen_random_uuid(),'Juhana','Marjomäki','JMa','Opettaja','Teacher','Opettaja','Matematiikka, Fysiikka','Mathematics, Physics','Matematiikka, Fysiikka',true),
        (gen_random_uuid(),'Aleksi','Markkanen','AMa','Opettaja','Teacher','Opettaja','Tietotekniikka, Matematiikka, STEAM','IT, Mathematics, STEAM','Tietotekniikka, Matematiikka, STEAM',true),
        (gen_random_uuid(),'Michael','McDonald','MMc','Opettaja','Teacher','Opettaja','Musiikki','Music','Musiikki',true),
        (gen_random_uuid(),'Mikko','Metsäkylä','MMe','Opettaja','Teacher','Opettaja','Biologia, Maantieto','Biology, Geography','Biologia, Maantieto',true),
        (gen_random_uuid(),'Elmi Ahmed','Mohamed','MOH','Opettaja','Teacher','Opettaja','Islam','Islamic Studies','Islam',true),
        (gen_random_uuid(),'Niilo','Mähönen','NMä','Opettaja','Teacher','Opettaja','Uskonto (ev.lut.)','Religion - Evangelical Lutheran','Uskonto (ev.lut.)',true),
        (gen_random_uuid(),'Antti','Mäkelä','AMä','Opettaja','Teacher','Opettaja','Matematiikka','Mathematics','Matematiikka',true),
        (gen_random_uuid(),'Zsófia','Nagy','ZNa','Opettaja','Teacher','Opettaja','Englanti, Matematiikka','English, Mathematics','Englanti, Matematiikka',true),
        (gen_random_uuid(),'Satu','Nevalainen','SNe','Opettaja','Teacher','Opettaja','Opinto-ohjaaja yläaste','Lower Secondary Guidance Counsellor','Opinto-ohjaaja yläaste',true),
        (gen_random_uuid(),'Hanna','Nordenswan','HNo','Opettaja','Teacher','Opettaja','Matematiikka','Mathematics','Matematiikka',true),
        (gen_random_uuid(),'Noora','Nuutinen','NNu','Opettaja','Teacher','Opettaja','Matematiikka','Mathematics','Matematiikka',true),
        (gen_random_uuid(),'Tuuli','Nuutinen','TNu','Opettaja','Teacher','Opettaja','Englanti, Ruotsi, Saksa','English, Swedish, German','Englanti, Ruotsi, Saksa',true),
        (gen_random_uuid(),'Päivi','Ojala','POj','Opettaja','Teacher','Opettaja','Biologia, Maantieto','Biology, Geography','Biologia, Maantieto',true),
        (gen_random_uuid(),'Marko','Paasonen','MPa','Opettaja','Teacher','Opettaja','Ruotsi','Swedish','Ruotsi',true),
        (gen_random_uuid(),'Anni','Paavola','APa','Opettaja','Teacher','Opettaja','Ruotsi','Swedish','Ruotsi',true),
        (gen_random_uuid(),'Tilda','Palola','TPa','Opettaja','Teacher','Opettaja','Kotitalous','Home Economics','Kotitalous',true),
        (gen_random_uuid(),'Petri','Partanen','PPa','Opettaja','Teacher','Opettaja','Liikunta','Physical Education','Liikunta',true),
        (gen_random_uuid(),'Mira','Pelkonen','MPe','Opettaja','Teacher','Opettaja','Äidinkieli ja kirjallisuus','Finnish','Äidinkieli ja kirjallisuus',true),
        (gen_random_uuid(),'Santtu','Perkiö','SPe','Opettaja','Teacher','Opettaja','Yhteisökoordinaattori','Community Coordinator','Yhteisökoordinaattori',true),
        (gen_random_uuid(),'Erika','Perttuli-Borobio','EPe','Opettaja','Teacher','Opettaja','Kuvataide, STEAM','Art, STEAM','Kuvataide, STEAM',true),
        (gen_random_uuid(),'Rauni','Piiponniemi','RPi','Opettaja','Teacher','Opettaja','Kotitalous, Terveystieto','Home Economics, Health Education','Kotitalous, Terveystieto',true),
        (gen_random_uuid(),'Tiina','Pulkkinen','TPu','Opettaja','Teacher','Opettaja','Maantieto, Historia','Geography, History','Maantieto, Historia',true),
        (gen_random_uuid(),'Anne','Raatikainen-Ahokas','ARa','Opettaja','Teacher','Opettaja','Biologia, Maantieto','Biology, Geography','Biologia, Maantieto',true),
        (gen_random_uuid(),'Minnariitta','Raitio','MRa','Opettaja','Teacher','Opettaja','Lukion rehtori','Upper School Principal','Lukion rehtori',true),
        (gen_random_uuid(),'Tuomas','Rajala','TuR','Opettaja','Teacher','Opettaja','Liikunta','Physical Education','Liikunta',true),
        (gen_random_uuid(),'Tiina','Ranne','TRa','Opettaja','Teacher','Opettaja','Kotitalous, Terveystieto','Home Economics, Health Education','Kotitalous, Terveystieto',true),
        (gen_random_uuid(),'Salli','Rantanen','SRa','Opettaja','Teacher','Opettaja','Opinto-ohjaaja','Guidance Counsellor','Opinto-ohjaaja',true),
        (gen_random_uuid(),'Pekka','Rutanen','PRu','Opettaja','Teacher','Opettaja','Fysiikka, Science','Physics, Science','Fysiikka, Science',true),
        (gen_random_uuid(),'Anni','Saarela','ASa','Opettaja','Teacher','Opettaja','Erityisopetus','Special Education','Erityisopetus',true),
        (gen_random_uuid(),'Christa','Skogster','CSk','Opettaja','Teacher','Opettaja','Ruotsi','Swedish','Ruotsi',true),
        (gen_random_uuid(),'Pia','Skyttä','PSk','Opettaja','Teacher','Opettaja','Englanti','English','Englanti',true),
        (gen_random_uuid(),'Martti','Sloan','MSl','Opettaja','Teacher','Opettaja','Fysiikka, Tietotekniikka, STEAM','Physics, IT, STEAM','Fysiikka, Tietotekniikka, STEAM',true),
        (gen_random_uuid(),'Johanna','Snellman','JSn','Opettaja','Teacher','Opettaja','Saksa, Ruotsi','German, Swedish','Saksa, Ruotsi',true),
        (gen_random_uuid(),'Kaisa','Stenbäck','KSt','Opettaja','Teacher','Opettaja','Opinto-ohjaaja yläaste','Lower Secondary Guidance Counsellor','Opinto-ohjaaja yläaste',true),
        (gen_random_uuid(),'Reetta','Sutinen','RSu','Opettaja','Teacher','Opettaja','Kuvataide','Art','Kuvataide',true),
        (gen_random_uuid(),'Sari','Taipale','STa','Opettaja','Teacher','Opettaja','Äidinkieli ja kirjallisuus','Finnish','Äidinkieli ja kirjallisuus',true),
        (gen_random_uuid(),'Antero','Tarkki','ATa','Opettaja','Teacher','Opettaja','Historia ja yhteiskuntaoppi','History and Civics','Historia ja yhteiskuntaoppi',true),
        (gen_random_uuid(),'Sanni','Taskinen','SaT','Opettaja','Teacher','Opettaja','Englanti, Espanja','English, Spanish','Englanti, Espanja',true),
        (gen_random_uuid(),'Heidi','Temmes','HTe','Opettaja','Teacher','Opettaja','Äidinkieli ja kirjallisuus','Finnish','Äidinkieli ja kirjallisuus',true),
        (gen_random_uuid(),'Milla','Toukola','MTo','Opettaja','Teacher','Opettaja','Katsomusaineet','Religious Studies','Katsomusaineet',true),
        (gen_random_uuid(),'Tiina','Tuuri','TTu','Opettaja','Teacher','Opettaja','Musiikki','Music','Musiikki',true),
        (gen_random_uuid(),'Mirjam','Vaari','MiV','Opettaja','Teacher','Opettaja','Englanti, Ruotsi, Psykologia','English, Swedish, Psychology','Englanti, Ruotsi, Psykologia',true),
        (gen_random_uuid(),'Sirpa','Vartia','SVa','Opettaja','Teacher','Opettaja','Tekstiilityö, Kotitalous, STEAM','Textiles, Home Economics, STEAM','Tekstiilityö, Kotitalous, STEAM',true),
        (gen_random_uuid(),'Outi','Vilkuna','OVi','Opettaja','Teacher','Opettaja','Ranska, Terveystieto','French, Health Education','Ranska, Terveystieto',true),
        (gen_random_uuid(),'Riikka','Virkajärvi-Johnson','RVi','Opettaja','Teacher','Opettaja','Erityisopetus','Lower Secondary Special Education','Erityisopetus',true),
        (gen_random_uuid(),'Anna-Katariina','Väisänen','AVä','Opettaja','Teacher','Opettaja','Historia ja yhteiskuntaoppi','History and Civics','Historia ja yhteiskuntaoppi',true),
        (gen_random_uuid(),'Laura','Väisänen','LVä','Opettaja','Teacher','Opettaja','Katsomusaineet, Väittely','Religious Studies, Debate','Katsomusaineet, Väittely',true),
        (gen_random_uuid(),'Teppo','Väisänen','TVä','Opettaja','Teacher','Opettaja','Ortodoksinen uskonto','Orthodox Religion','Ortodoksinen uskonto',true),
        (gen_random_uuid(),'Rosa','Weckström','RWe','Opettaja','Teacher','Opettaja','Espanja, Englanti','Spanish, English','Espanja, Englanti',true),
        (gen_random_uuid(),'Joshua','Williams','JWi','Opettaja','Teacher','Opettaja','Liikunta, Terveystieto','Physical Education, Health Education','Liikunta, Terveystieto',true),
        (gen_random_uuid(),'Inka','Witick','IWi','Opettaja','Teacher','Opettaja','Äidinkieli ja kirjallisuus, Ranska','Finnish, French','Äidinkieli ja kirjallisuus, Ranska',true)
      ON CONFLICT (abbrev) WHERE abbrev IS NOT NULL DO UPDATE SET
        position    = EXCLUDED.position,
        position_en = EXCLUDED.position_en,
        position_fi = EXCLUDED.position_fi,
        department    = EXCLUDED.department,
        department_en = EXCLUDED.department_en,
        department_fi = EXCLUDED.department_fi;

      -- v1.1.7 — set @ksyk.fi emails (only when null, so admin overrides are preserved).
      UPDATE staff AS s SET email = v.e
      FROM (VALUES
        ('VeA','veera.aalto@ksyk.fi'),
        ('JAa','joona.aaltonen@ksyk.fi'),
        ('VAa','vuokko.aarnio@ksyk.fi'),
        ('MAl','merja.alatalo@ksyk.fi'),
        ('TAl','taru.alkio@ksyk.fi'),
        ('SAn','svetlana.andersson@ksyk.fi'),
        ('PAu','paivi.autio@ksyk.fi'),
        ('PBo','paul.boisdron@ksyk.fi'),
        ('TCh','tomy.cherian@ksyk.fi'),
        ('RCo','richard.cousins@ksyk.fi'),
        ('ADe','arunima.deb@ksyk.fi'),
        ('AEl','akseli.elovainio@ksyk.fi'),
        ('KEs','kirsten.eskelinen@ksyk.fi'),
        ('CFr','christian.franklin@ksyk.fi'),
        ('SGh','shenelle.ghulam@ksyk.fi'),
        ('LHa','lauri.halla@ksyk.fi'),
        ('MHe','meri.heikkila@ksyk.fi'),
        ('NHe','nelli.helin@ksyk.fi'),
        ('SHi','sirpa.hilden@ksyk.fi'),
        ('AHu','annika.huhta@ksyk.fi'),
        ('HHu','hanna.huhtakallio@ksyk.fi'),
        ('HeH','heidi.hult@ksyk.fi'),
        ('MHu','mirka.hussi@ksyk.fi'),
        ('EHy','eero.hytonen@ksyk.fi'),
        ('KaH','katariina.hamalainen@ksyk.fi'),
        ('EHä','esko.hayrynen@ksyk.fi'),
        ('JJu','jaana.junnonen@ksyk.fi'),
        ('RKa','riitta.kaisto@ksyk.fi'),
        ('PKa','pilvi.kantola@ksyk.fi'),
        ('RKi','roosa.kinnunen@ksyk.fi'),
        ('VKo','ville.kohvakka@ksyk.fi'),
        ('RKo','ritva.korhonen@ksyk.fi'),
        ('KKu','kalevi.kurronen@ksyk.fi'),
        ('SKy','saara.kylmanen@ksyk.fi'),
        ('SLa','simo.lampinen@ksyk.fi'),
        ('ALa','anu.lankila@ksyk.fi'),
        ('LLa','lassi.larjo@ksyk.fi'),
        ('MLe','marianne.lehtola@ksyk.fi'),
        ('TLy','tiina.lyyra@ksyk.fi'),
        ('JLä','jukka.lamsa@ksyk.fi'),
        ('JuM','juuso.maasara@ksyk.fi'),
        ('KMa','kaisa.macdonald@ksyk.fi'),
        ('EMa','elli.marjanen@ksyk.fi'),
        ('JMa','juhana.marjomaki@ksyk.fi'),
        ('AMa','aleksi.markkanen@ksyk.fi'),
        ('MMc','michael.mcdonald@ksyk.fi'),
        ('MMe','mikko.metsakyla@ksyk.fi'),
        ('MOH','elmi.mohamed@ksyk.fi'),
        ('NMä','niilo.mahonen@ksyk.fi'),
        ('AMä','antti.makela@ksyk.fi'),
        ('ZNa','zsofia.nagy@ksyk.fi'),
        ('SNe','satu.nevalainen@ksyk.fi'),
        ('HNo','hanna.nordenswan@ksyk.fi'),
        ('NNu','noora.nuutinen@ksyk.fi'),
        ('TNu','tuuli.nuutinen@ksyk.fi'),
        ('POj','paivi.ojala@ksyk.fi'),
        ('MPa','marko.paasonen@ksyk.fi'),
        ('APa','anni.paavola@ksyk.fi'),
        ('TPa','tilda.palola@ksyk.fi'),
        ('PPa','petri.partanen@ksyk.fi'),
        ('MPe','mira.pelkonen@ksyk.fi'),
        ('SPe','santtu.perkio@ksyk.fi'),
        ('EPe','erika.perttuli-borobio@ksyk.fi'),
        ('RPi','rauni.piiponniemi@ksyk.fi'),
        ('TPu','tiina.pulkkinen@ksyk.fi'),
        ('ARa','anne.raatikainen-ahokas@ksyk.fi'),
        ('MRa','minnariitta.raitio@ksyk.fi'),
        ('TuR','tuomas.rajala@ksyk.fi'),
        ('TRa','tiina.ranne@ksyk.fi'),
        ('SRa','salli.rantanen@ksyk.fi'),
        ('PRu','pekka.rutanen@ksyk.fi'),
        ('ASa','anni.saarela@ksyk.fi'),
        ('CSk','christa.skogster@ksyk.fi'),
        ('PSk','pia.skytta@ksyk.fi'),
        ('MSl','martti.sloan@ksyk.fi'),
        ('JSn','johanna.snellman@ksyk.fi'),
        ('KSt','kaisa.stenback@ksyk.fi'),
        ('RSu','reetta.sutinen@ksyk.fi'),
        ('STa','sari.taipale@ksyk.fi'),
        ('ATa','antero.tarkki@ksyk.fi'),
        ('SaT','sanni.taskinen@ksyk.fi'),
        ('HTe','heidi.temmes@ksyk.fi'),
        ('MTo','milla.toukola@ksyk.fi'),
        ('TTu','tiina.tuuri@ksyk.fi'),
        ('MiV','mirjam.vaari@ksyk.fi'),
        ('SVa','sirpa.vartia@ksyk.fi'),
        ('OVi','outi.vilkuna@ksyk.fi'),
        ('RVi','riikka.virkajarvi-johnson@ksyk.fi'),
        ('AVä','anna-katariina.vaisanen@ksyk.fi'),
        ('LVä','laura.vaisanen@ksyk.fi'),
        ('TVä','teppo.vaisanen@ksyk.fi'),
        ('RWe','rosa.weckstrom@ksyk.fi'),
        ('JWi','joshua.williams@ksyk.fi'),
        ('IWi','inka.witick@ksyk.fi')
      ) AS v(a, e)
      WHERE s.abbrev = v.a AND s.email IS NULL;
    `);
  } catch (e: any) {
    // Non-fatal: tables might already exist or DB might be unreachable.
    // Log a warning but don't block the request.
    console.warn("[initDb] Schema init warning:", e?.message?.slice(0, 120));
    // Reset flag so we retry on the next cold start if something was wrong.
    initialised = false;
  }
}
