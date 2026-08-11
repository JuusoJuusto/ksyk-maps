import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../shared/schema.js";

// Accept DATABASE_URL (custom) or Vercel ↔ Supabase integration variables.
// In Vercel, POSTGRES_PRISMA_URL is the Transaction Mode Pooler (port 6543) —
// the correct choice for serverless. POSTGRES_URL is Session Mode (port 5432)
// which opens persistent connections that serverless functions can't reuse.
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||  // Transaction Mode Pooler — best for serverless
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!url) {
  throw new Error(
    "No database URL found. Set DATABASE_URL or connect a Supabase integration in Vercel.",
  );
}

// { prepare: false } required for Supabase's Transaction-mode pooler (port 6543).
// Safe to use with any connection; Neon direct connections also work.
const client = postgres(url, { prepare: false, max: 3 });
export const db = drizzle(client, { schema });
