-- KSYK Maps v4.5.52 first-party telemetry schema.
--
-- Idempotent: every CREATE uses IF NOT EXISTS. Safe to run on a database
-- that already has these tables. Adds telemetry_sessions,
-- telemetry_events, feature_usage, easter_egg_events, performance_events,
-- audit_logs plus indexes tuned for the admin analytics dashboard.

CREATE TABLE IF NOT EXISTS telemetry_sessions (
  id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id       VARCHAR NOT NULL UNIQUE,
  anonymous_id     VARCHAR,
  user_id          VARCHAR,
  platform         VARCHAR NOT NULL,
  app_version      VARCHAR,
  os_version       VARCHAR,
  device_type      VARCHAR,
  browser          VARCHAR,
  browser_version  VARCHAR,
  language         VARCHAR,
  timezone         VARCHAR,
  country          VARCHAR,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  duration_ms      INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tsessions_platform    ON telemetry_sessions (platform);
CREATE INDEX IF NOT EXISTS idx_tsessions_started_at  ON telemetry_sessions (started_at);
CREATE INDEX IF NOT EXISTS idx_tsessions_last_seen   ON telemetry_sessions (last_seen_at);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id      VARCHAR NOT NULL,
  user_id         VARCHAR,
  platform        VARCHAR NOT NULL,
  app_version     VARCHAR,
  event_name      VARCHAR NOT NULL,
  event_category  VARCHAR,
  route           VARCHAR,
  screen          VARCHAR,
  duration_ms     INTEGER,
  success         BOOLEAN,
  error_code      VARCHAR,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tevents_created_at   ON telemetry_events (created_at);
CREATE INDEX IF NOT EXISTS idx_tevents_event_name   ON telemetry_events (event_name);
CREATE INDEX IF NOT EXISTS idx_tevents_session_id   ON telemetry_events (session_id);
CREATE INDEX IF NOT EXISTS idx_tevents_platform     ON telemetry_events (platform);

CREATE TABLE IF NOT EXISTS feature_usage (
  id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id   VARCHAR NOT NULL,
  user_id      VARCHAR,
  platform     VARCHAR NOT NULL,
  app_version  VARCHAR,
  feature      VARCHAR NOT NULL,
  action       VARCHAR NOT NULL DEFAULT 'used',
  duration_ms  INTEGER,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feature_created_at  ON feature_usage (created_at);
CREATE INDEX IF NOT EXISTS idx_feature_feature     ON feature_usage (feature);
CREATE INDEX IF NOT EXISTS idx_feature_action      ON feature_usage (action);

CREATE TABLE IF NOT EXISTS easter_egg_events (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id  VARCHAR NOT NULL,
  user_id     VARCHAR,
  platform    VARCHAR NOT NULL,
  egg_id      VARCHAR NOT NULL,
  action      VARCHAR NOT NULL DEFAULT 'discovered',
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_egg_created_at  ON easter_egg_events (created_at);
CREATE INDEX IF NOT EXISTS idx_egg_egg_id      ON easter_egg_events (egg_id);

CREATE TABLE IF NOT EXISTS performance_events (
  id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id   VARCHAR NOT NULL,
  user_id      VARCHAR,
  platform     VARCHAR NOT NULL,
  app_version  VARCHAR,
  metric_name  VARCHAR NOT NULL,
  value_ms     REAL,
  endpoint     VARCHAR,
  status_code  INTEGER,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_perf_created_at  ON performance_events (created_at);
CREATE INDEX IF NOT EXISTS idx_perf_metric      ON performance_events (metric_name);

CREATE TABLE IF NOT EXISTS audit_logs (
  id             VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_user_id  VARCHAR,
  admin_email    VARCHAR,
  action         VARCHAR NOT NULL,
  resource       VARCHAR,
  ip_address     VARCHAR,
  user_agent     TEXT,
  metadata       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created_at  ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action      ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_admin       ON audit_logs (admin_user_id);
