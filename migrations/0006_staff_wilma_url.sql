-- v1.0.10: add Wilma profile URL to staff table
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "wilma_profile_url" varchar;
