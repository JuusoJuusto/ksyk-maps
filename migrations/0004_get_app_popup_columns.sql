-- v4.7.56 — add the two columns that back the admin "Get the app" popup
-- toggle.  Prior versions had the UI toggle + API whitelist + client-side
-- fetch all wired, but the columns themselves were missing from the
-- app_settings table, so every PUT silently dropped the values on insert.
-- Idempotent — safe to re-run on databases that already have the columns.

ALTER TABLE "app_settings"
  ADD COLUMN IF NOT EXISTS "show_get_app_popup" boolean DEFAULT false;

ALTER TABLE "app_settings"
  ADD COLUMN IF NOT EXISTS "get_app_url" varchar DEFAULT '/download';
