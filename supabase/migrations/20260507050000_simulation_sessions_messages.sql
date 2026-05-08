-- Simu-Pro: Persist chat messages so users can resume in-progress sessions

ALTER TABLE public.simulation_sessions
  ADD COLUMN IF NOT EXISTS messages jsonb;
