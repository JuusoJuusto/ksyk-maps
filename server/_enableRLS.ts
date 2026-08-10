import postgres from "postgres";

const url = "postgresql://postgres.vjdcyfpafnhshuefshwo:C4HITznWwSUvDpZg@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";
const sql = postgres(url, { prepare: false, max: 1 });

const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
console.log(`Enabling RLS on ${tables.length} tables...`);
for (const { tablename } of tables) {
  await sql`ALTER TABLE public.${sql(tablename)} ENABLE ROW LEVEL SECURITY`;
  process.stdout.write(".");
}
console.log("\nDone.");
await sql.end();
process.exit(0);
