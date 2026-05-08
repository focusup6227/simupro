-- Phase IV: scenario-level pediatrics / ICP teaching hooks
ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS patient_weight_kg double precision NULL,
  ADD COLUMN IF NOT EXISTS age_band text NULL CHECK (age_band IS NULL OR age_band IN ('adult', 'pediatric')),
  ADD COLUMN IF NOT EXISTS icp_mm_hg double precision NULL;

COMMENT ON COLUMN public.scenarios.patient_weight_kg IS 'Optional patient mass (kg) for PK / volume scaling; pediatric scenarios should set explicitly or rely on age_band default.';

COMMENT ON COLUMN public.scenarios.age_band IS 'Optional cohort: pediatric adjusts teaching defaults (e.g. weight) when patient_weight_kg is unset.';

COMMENT ON COLUMN public.scenarios.icp_mm_hg IS 'Optional intracranial pressure (mmHg) for derived CPP teaching readouts when MAP is available.';
