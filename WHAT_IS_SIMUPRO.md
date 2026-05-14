# What is SimuPro?

**SimuPro** (also styled **Simu-Pro**) is a web application for **EMS simulation training**. Learners rehearse patient assessments and treatment decisions in interactive scenarios, with **AI-driven patient dialogue and pacing** (powered by **Google Genkit** and Gemini) and structured feedback—not as a substitute for real-world protocols or medical direction.

## Mission

SimuPro gives EMS professionals and students a **safe place to practice**: realistic cases, dynamic responses, and quick performance insight, so clinicians can stress-test judgment before the call. The product pairs **structured scenario design** with **AI-assisted realism** for repeatable, high-quality simulation.

## Who it is for

- **EMTs, AEMTs, paramedics, and students** building assessment and protocol skills  
- **Agencies and training programs** that want a **scenario library**, reporting, and optional **Premium** access (billing via **Stripe**)

## What you can do in the app

| Area | What it offers |
|------|----------------|
| **Scenarios** | Guided simulation runs with branching flow, session narrative, vitals on a unified monitor, optional cardiac-arrest workflows, and **post-run reports** |
| **Physiology** | A layered model: **AI baseline vitals** plus deterministic engines where enabled—**pharmacokinetics / pharmacodynamics**, **autonomic and volume** (fluids, hemorrhage, oxygenation, decompensation trends), and optional **metabolic / lab** behavior behind feature flags. Simulation events are logged so outcomes can be **replayed** for review and grading |
| **Authoring** | Admins configure scenarios (including comorbidities, autonomic seeds, pediatrics, weight, and related fields) from the **admin scenarios** tools |
| **Demo** | Try the experience **without signing up** at `/demo` |
| **Dashboard** | Home overview, scenario library, performance history, guides, abbreviations, and account settings |
| **ECG trainer** | Rhythm and waveform practice at `/dashboard/ecg-trainer` |
| **Tools** | Utilities such as a **drug calculator** |
| **Roles** | **Tester** and **admin** areas for users, scenarios, interventions, billing, and support (see `/dashboard/tester` and `/dashboard/admin`) |

## Important limitation: training only

SimuPro is **not** medical advice or **clinical decision support** for real patients. Always follow your agency’s protocols, medical direction, and applicable regulations.

## Technical snapshot (for integrators and contributors)

- **App:** Next.js 14 (App Router), React, TypeScript  
- **Data & auth:** Supabase (Postgres, Auth, Row Level Security)  
- **AI:** Genkit + Google Gemini  
- **Payments:** Stripe (checkout, customer portal, webhooks)  
- **Quality:** Sentry, Vitest, Playwright (e2e), optional PWA  

For setup, migrations, and developer details, see **`README.md`**. For end-user flow and the simulation UI, see **`docs/how-it-works.md`**.

## Contact

- **Support:** [support@simupro.io](mailto:support@simupro.io)  
- **In-app:** `/about` (mission and policies), `/faq` (billing, Premium, privacy)
