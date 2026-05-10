# Simu-Pro

**Simu-Pro** is an **EMS simulation training** web application: learners rehearse assessments and treatment decisions through interactive scenarios, simulated patient encounters, and performance feedback—with **Google Genkit–powered AI** driving dynamic conversations and pacing. Training only—not clinical decision support for real patients; see **`src/app/about/page.tsx`** (site “About”).

## Who it is for

- EMTs, paramedics, and EMS students sharpening assessment and protocols  
- Agencies or programs wanting repeatable scenarios, reporting, and optional **Premium** subscriptions (**Stripe**)

## What’s in the app

| Area | What you’ll find |
|------|-------------------|
| **Scenarios** | Structured simulation runs with branching flow, session narratives, vitals on a unified cardiac monitor, optional cardiac-arrest workflows, and post-run **reports** |
| **Physiology simulation** | Layered model: **AI baseline vitals** plus optional deterministic engines—**pharmacokinetics / PD** (drug-induced deltas), **autonomic / volume** (fluids, hemorrhage, oxygenation reflexes, decompensation phase), and optional **metabolic / labs** (feature-flagged). Event logs in Postgres enable grading replay. |
| **Scenario authoring** | Admins edit scenarios (including **comorbidities**, **autonomic seed**, pediatrics/weight/ICP-style fields) via **`/dashboard/admin/scenarios`**. |
| **Demo** | Try the experience **without signing up** (`/demo`) |
| **Dashboard** | Overview, scenarios list, performance, guide, abbreviations, account **settings** |
| **ECG trainer** | Dedicated rhythm / waveform practice (`/dashboard/ecg-trainer`) |
| **Tools** | In-app utilities such as the **drug calculator** |
| **Tester / admin** | Role-gated tester flows and admin consoles for users, scenarios, interventions, billing, and support (see routes under `/dashboard/admin` and `/dashboard/tester`) |
| **Monetization** | **Stripe** checkout, portal, and webhooks for Premium access |

Landing copy summarizes the product (**AI-powered EMS training**, demo, Premium); see **`src/app/page.tsx`** (route `/`).

### Developer note: simulation layers

Runtime behavior is controlled by compile-time flags in **`src/lib/feature-flags.ts`** (e.g. PK/autonomic on by default; metabolic MVP off until you enable it). Vitals on the monitor merge **physiology-store baseline → PK deltas → autonomic deltas** (and metabolic when enabled). The **grade-session** Supabase Edge function can replay **PK** and **autonomic** (and **metabolic** when wired) for attribution at user-action timestamps.

## Technical stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript  
- **Data & auth:** Supabase (**Postgres**, **Auth**, **RLS**) via `@supabase/ssr` and `@supabase/supabase-js`  
- **AI:** **Genkit** + Google Gemini (`GEMINI_API_KEY` / Genkit conventions)  
- **State:** Zustand for in-simulation stores (physiology, PK, autonomic, metabolic)  
- **Tests:** Vitest (`npm test`) and TypeScript typecheck (`npm run typecheck`)  
- **Payments:** Stripe (secret key, price, webhook)  
- **Observability & quality:** Sentry (`@sentry/nextjs`), optional **PWA** via `@ducanh2912/next-pwa`  
- **Infra accents:** Optional **Upstash** rate limiting (**Redis**) where configured  

## Quick start (local development)

1. Copy **`.env.example`** to **`.env.local`** and fill in required keys (Supabase URLs/keys, `GEMINI_API_KEY`, and Stripe if you test billing).  
2. Install dependencies: `npm install`  
3. Start the dev server: `npm run dev`  

## Database migrations

Schema and RLS live under **`supabase/migrations/`**. Apply with your Supabase workflow (`supabase db push`, linked project, or CI).

Noteworthy additions beyond the initial schema:

| Migration area | Examples |
|----------------|----------|
| Profiles / premium | `20260507010000_profiles_autocreate_on_signup.sql`, premium fields |
| Scenarios | Comorbidities, **autonomic_profile**, physiology extensions (weight, age band, ICP), age-band checks |
| Simulation logs | **`simulation_pk_doses`**, **`simulation_autonomic_events`** — `session_id` is **`text`** to match **`simulation_sessions.id`** |

Regenerate **`src/lib/supabase/database.types.ts`** when your remote schema changes (`supabase gen types` or your team’s process).

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
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest watch mode |