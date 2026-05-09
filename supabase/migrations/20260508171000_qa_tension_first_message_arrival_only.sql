-- First assistant message uses `details` — keep arrival narrative only; teaching intent stays in description / patient_presentation.
UPDATE public.scenarios
SET
  details =
    'You are dispatched for a trauma patient: a 29-year-old male with a penetrating wound to the right anterior chest. Law enforcement has secured the scene. On arrival he is diaphoretic, leaning forward, and speaking in short phrases. A pressure dressing covers the chest wound; first responders already have high-flow oxygen on. Bystanders report he was walking and talking earlier but has become progressively more short of breath over the last several minutes.',
  updated_at = now()
WHERE id = 'qa-engine-tension-pneumothorax';
