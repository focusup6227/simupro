-- Remove internal "QA" catalog tag from physiology engine scenarios (titles may still use [QA] prefix).
UPDATE public.scenarios
SET
  tags = array_remove(tags, 'QA'),
  updated_at = now()
WHERE
  id IN (
    'qa-engine-hemorrhagic-shock',
    'qa-engine-chf-pulmonary-edema',
    'qa-engine-septic-shock',
    'qa-engine-seizure-postictal',
    'qa-engine-tension-pneumothorax'
  );
