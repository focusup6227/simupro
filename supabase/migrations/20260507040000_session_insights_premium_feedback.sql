-- Simu-Pro: Persist Premium structured feedback alongside the standard paragraph

ALTER TABLE public.session_insights
  ADD COLUMN IF NOT EXISTS premium_feedback jsonb;
