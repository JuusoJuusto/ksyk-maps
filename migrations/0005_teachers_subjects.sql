-- v1.0.8 — teacher abbreviation (nimenlyhennys) on staff,
-- new subjects table for Wilma schedule enrichment.

ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "abbrev" varchar;

CREATE TABLE IF NOT EXISTS "subjects" (
  "id"         varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "code"       varchar NOT NULL,
  "name"       varchar NOT NULL,
  "name_en"    varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "subjects_code_unique" ON "subjects" ("code");
