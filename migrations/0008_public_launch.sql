-- v1.1.0 public launch: flip beta banner default to off
-- Also adds enableFloorLabels + enableGPS app-settings columns
-- and enforceAccessibleRoutingOnly as a security-settings JSON field
-- (stored in the JSON blob; no column migration needed for security_settings).
--
-- Safe to roll back: removing the columns leaves existing rows intact.
ALTER TABLE "app_settings"
  ALTER COLUMN "show_beta_banner" SET DEFAULT false,
  ADD COLUMN IF NOT EXISTS "enable_floor_labels" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "enable_gps" boolean NOT NULL DEFAULT true;
