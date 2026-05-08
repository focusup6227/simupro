# Simu-Pro

EMS simulation training app built with Next.js, Supabase Auth/Postgres/RLS, and Genkit.

## Quick start

1. Copy `.env.example` to `.env.local` and fill in required keys.
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`

## Migrations

- Initial schema + RLS: `supabase/migrations/20260506000000_initial_schema.sql`
- Auth user -> profile auto-create trigger: `supabase/migrations/20260507010000_profiles_autocreate_on_signup.sql`

## Optional data import

To migrate legacy Firebase Auth + Firestore data into Supabase:

- Set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env.local`
- Dry run: `MIGRATE_DRY_RUN=1 npm run migrate:firebase`
- Real run: `npm run migrate:firebase`
