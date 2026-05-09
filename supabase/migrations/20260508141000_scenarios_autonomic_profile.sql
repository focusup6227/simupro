-- Phase III: scenario-level author tuning for deterministic autonomic replay.
ALTER TABLE public.scenarios
ADD COLUMN IF NOT EXISTS autonomic_profile jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.scenarios.autonomic_profile IS
'Optional JSON profile for Phase III autonomic engine (volume/bleed baselines, initial decomp phase).';
