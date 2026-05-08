-- Optional structured initial rhythm for scenarios. When NULL the patient AI
-- picks a rhythm consistent with the chief complaint at runtime.

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS initial_rhythm text NULL;
