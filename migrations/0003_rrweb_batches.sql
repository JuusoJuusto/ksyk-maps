-- v4.7.12 — rrweb DOM snapshot storage.
-- Each row is a batch of serialized rrweb events (~5s of activity).
-- session_id + seq lets the player reassemble batches in order.

CREATE TABLE IF NOT EXISTS "rrweb_batches" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "session_id" varchar NOT NULL,
    "seq" integer NOT NULL,
    "started_at" timestamp NOT NULL,
    "ended_at" timestamp NOT NULL,
    "event_count" integer NOT NULL,
    "events" jsonb NOT NULL,
    "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_rrweb_session" ON "rrweb_batches" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_rrweb_created_at" ON "rrweb_batches" ("created_at");
