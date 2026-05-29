# Uploaded-Protocol Trust Pipeline

> **Status:** Phase 1 **code complete** (2026-05-29) — tests + typecheck + lint green. Remaining: apply the backfill migration to the DB and do a live re-scrub spot-check (see §3 verification). Then start Phase 2.
>
> **Naming note:** the stable per-row key is stored as **`rowId`** (camelCase) inside each `extracted_interventions` element, to match the existing stored Intervention shape (`minLevel`, `medicationData`). Phase 2 side-table columns may be `row_id` but reference this `rowId` value.
>
> **Note:** This document was reconstructed on 2026-05-29 after the original was lost (never committed to git). The Phase 0 audit below reflects the codebase as it actually exists today. Design decisions that were previously "locked" in the lost version are now re-opened in §4 and must be re-confirmed before writing migrations.

## 1. Goal

Build a trust pipeline on top of the existing v1 uploaded-protocol system so that:

1. **Per-row flagging** — individual extracted interventions (not just whole imports) can be flagged, with a reason, by users or the system, and triaged by admins.
2. **Admin viewer with PDF provenance** — admins can see each extracted intervention next to the source PDF passage it came from (page / text span), so review is grounded in the document rather than the model's claim.
3. **Canonical document model with cross-user propagation** — a vetted protocol document can be promoted to canonical so its extracted interventions propagate to other users/workplaces instead of each upload living in isolation.
4. **Threaded admin↔user discussion** — a per-import (and ideally per-row) comment thread so admins and uploaders can resolve ambiguity without leaving the app.

These are layered on the v1 admin-review system; v1 stays working throughout.

## 2. What exists today (Phase 0 audit)

### 2.1 Schema

Migrations (all under `supabase/migrations/`):

| Migration | Adds |
|---|---|
| `20260509120000_session_insights_protocol_audit.sql` | session-insights protocol audit |
| `20260509140000_user_protocol_imports.sql` | **`user_protocol_imports`** table + `protocol-pdfs` private bucket + `profiles.active_protocol_import_id` |
| `20260510120000_protocol_workplaces.sql` | `protocol_workplaces`, `protocol_workplace_members`, **`workplace_protocol_imports`** |
| `20260510140000_protocol_import_admin_review.sql` | **v1 admin review** fields + `protocol_import_resolution_acks` + admin RLS |
| `20260510160000_protocol_import_display_name.sql` | `display_name` |
| `20260510180000_grant_is_admin_execute_authenticated.sql` | grant `is_admin()` |
| `20260510190000_fix_protocol_workplace_members_rls_recursion.sql` | RLS recursion fix |
| `20260510200500_security_profiles_guard_and_reviews_policy.sql` | profiles guard + reviews policy |

**`user_protocol_imports`** (and parallel **`workplace_protocol_imports`**) key columns:
- `id`, `user_id` / (`workplace_id`, `uploaded_by_user_id`)
- `storage_path` (`{user_id}/{import_id}.pdf` or `workplace/{workplace_id}/{import_id}.pdf`)
- `original_filename`, `display_name`
- `status` ∈ `uploaded | processing | ready | failed`
- `extracted_interventions jsonb` — **array of Intervention objects; the unit we want to flag is a row inside this blob, which has no stable per-row identity today**
- `extraction_error`
- v1 review: `admin_review_status` ∈ `open | resolved | NULL`, `admin_review_notes`, `resolved_by_admin_id`, `admin_resolved_at`, `resolution_message_for_user`

**`protocol_import_resolution_acks`** — `(user_id, import_scope, import_id)` PK; per-user dismissal of "we fixed your import" banners.

RLS: owners manage own rows; `is_admin()` can SELECT/UPDATE all import rows and SELECT all PDFs.

### 2.2 Upload + extraction flow

- Entry points: `src/app/protocol-actions.ts` — `uploadProtocolPdf()` (personal), `uploadWorkplaceProtocolPdf()` (workplace admin). Both require premium.
- Flow: validate → insert row (`status='uploaded'`) → upload PDF to `protocol-pdfs` → `runExtraction()` **synchronously in-request**.
- Pipeline: `src/lib/protocol-import-extraction-pipeline.ts` — chunk text (~48KB) → `extractProtocolFromPdfText()` per chunk → `mergeCatalog()` → deterministic scrub (`scrubExtractedProtocolList`) → LLM scrub (`scrubProtocolExtractionList`) → Zod validate against `BaselineInterventionSchema[]`.
- AI flows: `src/ai/flows/extract-protocol-from-pdf-text.ts` (first pass, Claude via Genkit, prefers stable NASEMSO ids), `src/ai/flows/scrub-protocol-extraction.ts` (hallucination removal).
- Result: success → `status='ready'`, `extracted_interventions` set; failure → `status='failed'`, `extraction_error` set, `admin_review_status='open'`.

### 2.3 Admin review (v1)

- Queue: `src/app/dashboard/admin/qa/page.tsx` — lists user + workplace imports where `admin_review_status='open'`, live Supabase subscriptions.
- Dialog: `src/components/admin-protocol-import-review-dialog.tsx` — three actions:
  - **Re-scrub from PDF** → `adminRescrubProtocolImport()`
  - **Save manual JSON & return** → `adminSaveProtocolImportManual()`
  - **Close ticket (no auto-fix)** → `adminDismissProtocolImportReview()`
  - all take an optional `resolutionMessageForUser`; all stamp `resolved_by_admin_id` + `admin_resolved_at`.
- User notice: `src/components/protocol-import-settings.tsx` renders resolution banners; dismissals recorded in `protocol_import_resolution_acks`.

### 2.4 Store / merge / activation

- `src/stores/protocol-store.ts`, `src/lib/protocol-merge.ts` (`mergeCatalog`), `src/components/protocol-import-hydrator.tsx` loads the active import into the store. Available catalog = baseline ⊕ custom overrides keyed by intervention id.

### 2.5 Admin-managed interventions (adjacent, separate system)

- `src/app/dashboard/admin/interventions/page.tsx` CRUD on the `interventions` table; seed in `src/lib/interventions-data.ts`.
- Recent commits (`f55fccb`, `6fa4994`) made simulation treatment tiles + the cardiac-arrest tab source from this admin catalog.
- **Key tension:** admin catalog ids (`cpr`, `epinephrine-cardiac`, …) vs uploaded-protocol ids (`agency_*`, NASEMSO `MED_*`/`PROC_*`). No reconciliation exists between the two.

### 2.6 Gaps relative to the goal

- ❌ No stable per-row identity inside `extracted_interventions` → can't flag/thread/provenance a single row yet.
- ❌ No provenance (no page/char span linking a row back to PDF text).
- ❌ No canonical-document concept; every import is isolated, no cross-user propagation.
- ❌ No discussion thread (only one-way `resolution_message_for_user` + ack).
- ❌ No reconciliation between uploaded interventions and the admin catalog.

## 3. Proposed phases

> Do **not** start Phase 1 migrations until §4 decisions are confirmed.

- **Phase 0 — Foundation audit.** ✅ Done (this document).
- **Phase 1 — Stable row identity + provenance capture.** ✅ Code complete (see task checklist below). Give each extracted intervention a stable `rowId` and best-effort PDF provenance; backfill existing imports.
- **Phase 2 — Per-row flag system.** Side table for flags (who, reason, state), keyed by `(import_scope, import_id, row_id)`. System auto-flags low-confidence rows; users flag rows they dispute. Admin queue surfaces row-level flags alongside the existing import-level queue.
- **Phase 3 — Admin viewer with PDF provenance.** Side-by-side: extracted row ↔ source passage in the rendered PDF. Built on Phase 1 provenance.
- **Phase 4 — Canonical document model + cross-user propagation.** Promote a vetted import to **per-workplace** canonical; define propagation rules and RLS for who receives it. (Global-library promotion is a later, admin-gated Phase 4.5 — schema leaves room for it but we do not build it yet.)
- **Phase 5 — Threaded admin↔user discussion.** Per-import (and per-row) comment thread, replacing/augmenting the one-way resolution message.

### Phase 1 task list

Goal: every extracted intervention has a stable `rowId` and best-effort provenance pointing back into the source PDF, with zero change to the runtime read path (store/merge/hydrator keep reading `extracted_interventions` as-is).

Design choices made during implementation:
- **AI flows stay pure.** `BaselineInterventionSchema` (used by `extract-protocol-from-pdf-text` / `scrub-protocol-extraction` and national-baseline validation) is unchanged — the model never sees/mints trust fields. A new `StoredInterventionSchema` / `StoredInterventionArraySchema` (clinical union + optional `rowId` + `provenance`) is used only where stored rows are parsed (pipeline final validate, admin manual save), so Zod's key-stripping doesn't drop the fields.
- **Provenance is deterministic, not model-emitted.** After the final validate, `attachProvenance()` locates each row's name token in the full `rawText` and captures `charStart`/`charEnd`/`snippet`. No prompt changes; works without burdening the model. `page` is reserved for Phase 3 (needs per-page text). Null when not found.
- **`rowId` stability via reconciliation.** Fresh uploads → `ensureRowIds()` mints uuids. Re-scrub → `reconcileRowIds(prior, new)` carries ids forward (match by clinical `id`, then by normalized name+type; each prior id consumed once), so flags/threads survive id renormalization. The re-scrub caller passes the prior `extracted_interventions`.

- [x] 1. **Schema + types.** `ProvenanceRef`, optional `rowId`/`provenance` on `InterventionBase` (`src/types/protocol.ts`); `ProvenanceRefSchema` + `StoredInterventionSchema` + `StoredInterventionArraySchema` (`src/lib/national-baseline.ts`).
- [x] 2. **Row-id + provenance helper.** `src/lib/protocol-row-provenance.ts` — `ensureRowIds`, `reconcileRowIds`, `locateInSource`, `attachProvenance` (injectable id factory for tests).
- [x] 3. **Pipeline wiring.** `extractInterventionsFromPlainText(rawText, { priorInterventions? })` parses with `StoredInterventionArraySchema`, attaches provenance, then stamps/reconciles ids (`src/lib/protocol-import-extraction-pipeline.ts`).
- [x] 4. **Re-scrub + manual save.** `adminRescrubProtocolImport` passes prior rows; `adminSaveProtocolImportManual` parses with the stored schema and `ensureRowIds` for hand-added rows (`src/app/admin-protocol-import-actions.ts`).
- [x] 5. **Backfill migration.** `supabase/migrations/20260529120000_protocol_import_row_ids.sql` — idempotent jsonb stamp of `rowId` on existing `ready` imports (both tables); provenance left absent. Helper fn dropped after use. (Fresh-upload path via `runExtraction` in `protocol-actions.ts` inherits the new pipeline automatically — no change needed.)
- [x] 6. **Tests.** `src/lib/__tests__/protocol-row-provenance.test.ts` (9 tests: mint/preserve, reconcile by id/name, no double-claim, snippet capture, null-when-absent). Existing protocol-merge / extract-scrub tests still green.

**Remaining before Phase 2:**
- [x] Apply the migration to the DB. **Applied to production `simupro` (ectvwzaudqazfymcmqcf) on 2026-05-29.** Backfill was a no-op — both import tables are empty in prod (no protocols uploaded yet), so there was no existing data to stamp. Future uploads/re-scrubs get `rowId` + provenance via the code path.
- [ ] Live spot-check once real data exists: upload (or re-scrub) a protocol in the admin QA dialog, confirm `rowId`s are present/preserved and provenance snippets look sane; confirm the user-facing settings flow + store hydrator are unaffected.

Exit criteria: a fresh upload produces rows each with a stable `rowId` and best-effort provenance; re-scrubbing an unchanged import preserves `rowId`s; existing imports are backfilled; v1 review flow unchanged. **(Code path satisfies all; pending the two live checks above.)**

## 4. Design decisions — LOCKED (2026-05-29)

1. **Row identity & storage shape — `row_id` on the JSONB (no table normalization).** Keep `extracted_interventions jsonb`; stamp a stable `row_id` on each element. Flags/threads/provenance side tables key off `(import_scope, import_id, row_id)`. Rationale: the entire read path (`mergeCatalog`, store, hydrator) and the synchronous extraction write are built around the jsonb blob; normalizing is a large, risky rewrite we shouldn't pay on speculation. Reversible — normalizing later is a clean follow-up if the jsonb fights us.
2. **Provenance granularity — page + char span + snippet, best-effort.** Enables true side-by-side highlight in Phase 3. If the model can't localize a row, store `null` provenance rather than dropping the row. Stored inside the jsonb element in Phase 1 (no separate table yet).
3. **Canonical scope — per-workplace now; tiered later.** Build and ship per-workplace canonical (simple RLS via `protocol_workplace_members`). Schema includes a `canonical_scope` column that *can* be `global`, but global promotion is an explicit admin-gated **Phase 4.5** we do not build until per-workplace is proven.
4. **Flag authorship — end users + workplace admins + system.** All three can create flags; admins triage. RLS: users flag rows on imports they can see; system flags via service role; admins see/resolve all. (Detailed in Phase 2.)
5. **Relationship to admin catalog — stay parallel.** Uploaded protocols remain a per-user/workplace runtime override layer (`mergeCatalog`); the admin `interventions` catalog stays the separate master list. The `agency_*`/NASEMSO vs `cpr`/`epinephrine-cardiac` id reconciliation is its own initiative, scoped only if there's demand — **out of scope** for the trust pipeline.

## 5. Working agreements

- Update the **Status** line at the top as phases progress; check off tasks.
- v1 admin review must keep working at every step.
- This file is the source of truth across sessions — design decisions, locked/open questions, and phase task lists live here, not in conversation memory.
