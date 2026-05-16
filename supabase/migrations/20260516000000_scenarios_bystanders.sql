-- Bystanders: role-scoped NPCs the medic can interrogate during a scenario.
-- Stored as a jsonb array on the scenario row. Each entry follows BystanderSchema in src/lib/types.ts:
--   { id, role, name, relationship?, demeanor, availability, knowledge, guardrails? }
-- RLS already restricts scenarios writes to admins (see initial_schema.sql); no new policy needed.

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS bystanders jsonb NOT NULL DEFAULT '[]'::jsonb;
