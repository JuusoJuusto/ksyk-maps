# Database Migrations

KSYK-Map uses [Drizzle ORM](https://orm.drizzle.team/) with schema defined in `shared/schema.ts`.

## Apply schema to PostgreSQL

Ensure `DATABASE_URL` is set in `.env`, then run:

```bash
npm run db:push
```

This syncs all tables (buildings, rooms, tickets, app_settings, app_logs, admin_login_logs, Wilma tables, Aalto Space booking fields, etc.) with the current schema.

## Optional: generate SQL migration files

```bash
npx drizzle-kit generate
```

Generated SQL appears in `./migrations/`.

## One-off scripts

- `server/migrations/remove-plain-passwords.ts` — legacy password cleanup (run with `tsx` if needed)
