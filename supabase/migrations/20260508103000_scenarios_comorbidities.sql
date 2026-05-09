-- Optional explicit condition ids for Pathophysiology Matrix (hybrid binding).
ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS comorbidities text[] NULL;

COMMENT ON COLUMN scenarios.comorbidities IS
  'Pathophysiology matrix condition ids (e.g. chf, copd). When NULL, comorbidities are inferred from patient_profile text.';
