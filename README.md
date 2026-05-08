# Simu-Pro

**Simu-Pro** is an **EMS simulation training** web application: learners rehearse assessments and treatment decisions through interactive scenarios, simulated patient encounters, and performance feedback—with **Google Genkit–powered AI** driving dynamic conversations and pacing. Training only—not clinical decision support for real patients; see **`src/app/about/page.tsx`** (site “About”).

## Who it is for

- EMTs, paramedics, and EMS students sharpening assessment and protocols  
- Agencies or programs wanting repeatable scenarios, reporting, and optional **Premium** subscriptions (**Stripe**)

## What’s in the app

| Area | What you’ll find |
|------|-------------------|
| **Scenarios** | Structured simulation runs with branching flow, session narratives, and post-run **reports** |
| **Demo** | Try the experience **without signing up** (`/demo`) |
| **Dashboard** | Overview, scenarios list, performance, guide, abbreviations, account **settings** |
| **ECG trainer** | Dedicated rhythm / waveform practice (`/dashboard/ecg-trainer`) |
| **Tools** | In-app utilities such as the **drug calculator** |
| **Tester / admin** | Role-gated tester flows and admin consoles for users, scenarios, interventions, billing, and support (see routes under `/dashboard/admin` and `/dashboard/tester`) |
| **Monetization** | **Stripe** checkout, portal, and webhooks for Premium access |

Landing copy summarizes the product (**AI-powered EMS training**, demo, Premium); see **`src/app/page.tsx`** (route `/`).

## Technical stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript  
- **Data & auth:** Supabase (**Postgres**, **Auth**, **RLS**) via `@supabase/ssr` and `@supabase/supabase-js`  
- **AI:** **Genkit** + Google Gemini (`GEMINI_API_KEY` / Genkit conventions)  
- **Payments:** Stripe (secret key, price, webhook)  
- **Observability & quality:** Sentry (`@sentry/nextjs`), optional **PWA** via `@ducanh2912/next-pwa`  
- **Infra accents:** Optional **Upstash** rate limiting (**Redis**) where configured  

## Quick start (local development)

1. Copy `.env.example` to `.env.local` and fill in required keys (Supabase URLs/keys, `GEMINI_API_KEY`, and Stripe if you test billing).  
2. Install dependencies: `npm install`  
3. Start the dev server: `npm run dev`  

## Database migrations

Schema and RLS live under `supabase/migrations/`. Notable entry points:

- Initial schema + RLS: `supabase/migrations/20260506000000_initial_schema.sql`  
- Profile auto-create on signup: `supabase/migrations/20260507010000_profiles_autocreate_on_signup.sql`  

Apply with your Supabase workflow (`supabase db push`, linked project, or your team’s process).

## Optional: legacy data import (Firebase → Supabase)

To migrate historical Firebase Auth + Firestore data into Supabase:

- Set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env.local`  
- Dry run: `MIGRATE_DRY_RUN=1 npm run migrate:firebase`  
- Real run: `npm run migrate:firebase`  

## Contact & policies

- **About / mission:** `src/app/about/page.tsx` (route `/about`)  
- **Support:** support@simupro.io (from the About page copy)  
- Other legal / info routes: `/faq`, `/privacy`, `/terms`, `/refund-policy` (under `src/app/`)  

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run migrate:firebase` | One-off Firebase → Supabase migration |
