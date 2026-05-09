-- Physiology-engine QA scenarios: premium tier (legacy catalog remains free in a sibling migration).
UPDATE public.scenarios
SET
  is_premium = true,
  updated_at = now()
WHERE
  id IN (
    'qa-engine-hemorrhagic-shock',
    'qa-engine-chf-pulmonary-edema',
    'qa-engine-septic-shock',
    'qa-engine-seizure-postictal',
    'qa-engine-tension-pneumothorax'
  );
