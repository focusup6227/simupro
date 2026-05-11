-- Allow admins to disable the scenario treatment / protocol intervention picker per scenario.
ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS interventions_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.scenarios.interventions_enabled IS
  'When false, learners cannot use the structured Treatment tab / intervention tiles for this scenario.';
