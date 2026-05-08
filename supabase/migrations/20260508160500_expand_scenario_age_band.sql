-- Allow finer pediatric bands while keeping legacy `pediatric` / `adult` rows valid.
ALTER TABLE public.scenarios
  DROP CONSTRAINT IF EXISTS scenarios_age_band_check;

ALTER TABLE public.scenarios
  ADD CONSTRAINT scenarios_age_band_check CHECK (
    age_band IS NULL
    OR age_band IN (
      'adult',
      'pediatric',
      'neonate',
      'infant',
      'toddler',
      'child',
      'adolescent'
    )
  );
