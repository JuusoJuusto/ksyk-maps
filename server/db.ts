import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// postgres-js works with any PostgreSQL backend (Supabase, Neon direct,
// Railway, etc.).  Use { prepare: false } when connecting via Supabase's
// Transaction-mode pooler (port 6543) — it doesn't support prepared
// statements.  For direct connections it's fine either way.
const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 3 });
export const db = drizzle(client, { schema });
