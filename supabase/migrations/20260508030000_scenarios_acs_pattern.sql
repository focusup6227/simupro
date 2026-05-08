-- Optional structured ACS injury pattern for scenarios. When NULL the
-- waveform pipeline falls back to free-text classification of the scenario
-- corpus (title / description / details / tags / patient presentation).

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS acs_pattern text NULL;
