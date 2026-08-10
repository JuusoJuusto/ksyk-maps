import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../shared/schema.js";

// Accept DATABASE_URL (custom) or POSTGRES_URL (Vercel ↔ Supabase integration).
// POSTGRES_PRISMA_URL adds pgbouncer params that don't cause issues but prefer
// the cleaner POSTGRES_URL when available.
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  throw new Error(
    "No database URL found. Set DATABASE_URL or connect a Supabase integration in Vercel.",
  );
}

// { prepare: false } required for Supabase's Transaction-mode pooler (port 6543).
// Safe to use with any connection; Neon direct connections also work.
const client = postgres(url, { prepare: false, max: 3 });
export const db = drizzle(client, { schema });
