-- Refresh welcome tutorial to current scenario authoring (presentation, autonomic baseline, age band, weight, expanded teaching copy).
UPDATE public.scenarios
SET
  title = 'Welcome to Simu-Pro — Orientation patient',
  description =
    'A short, low-stakes run: learn the layout (assessment, vitals, treatment, transport) while ruling out hypoglycemia in a stable adult with mild confusion.',
  patient_profile =
    '60 y/o Male, type 2 diabetes, found seated at home with confusion reported by family.',
  patient_presentation =
    'Awake, cooperative but slow to answer; no focal deficits voiced; skin warm and dry; no acute respiratory distress; family reports skipped lunch after morning insulin.',
  comorbidities = ARRAY['DIABETES_MILD']::text[],
  autonomic_profile = '{"baselineMapMmHg": 96, "initialDecompensationPhase": "baseline"}'::jsonb,
  age_band = 'adult',
  patient_weight_kg = 88,
  details = $tutorial$
This is your orientation scenario — not a trap case. You will use the same authoring-driven physiology layers as the rest of the catalog (comorbidities, optional autonomic baseline, and weight-aware PK when treatments apply), but the patient stays hemodynamically stable so you can focus on the UI.

What to try first: open the Assessment flow and obtain a blood glucose. Glance at the monitor / vitals strip if your layout shows it; repeat vitals after interventions when you are ready.

When you are comfortable, explore Treatment (even if you only document a plan), choose a receiving facility under Destination, and use Radio / report tabs as your course expects. End the simulation from the controls when you are done; your debrief report will mark the tutorial complete for your profile.

Learning objective: demonstrate a structured first pass (assessment + point-of-care glucose) before transport for an altered patient with diabetes risk.
$tutorial$,
  difficulty = 'Beginner',
  tags = ARRAY['Tutorial', 'Medical', 'AMS']::text[],
  destination = 'Mercy General Hospital',
  destination_rationale =
    'Stable altered mental status with suspected metabolic contribution; nearest appropriate ED after assessment and bedside glucose check.',
  initial_vitals =
    '{"hr": "100 bpm, regular", "bp": "142/88 mmHg", "rr": "18/min, unlabored", "spo2": "97% on Room Air", "gcs": "14 (E4, V4, M6) — mild confusion"}'::jsonb,
  hospital_distances =
    '{"mercy_general": 10, "county_trauma_center": 22, "st_marys_community": 15, "university_medical": 30, "hope_psychiatric": 18}'::jsonb,
  mandatory_actions =
    '{
      "emt": ["Check a blood glucose level."],
      "aemt": ["Check a blood glucose level."],
      "paramedic": ["Check a blood glucose level."]
    }'::jsonb,
  suggested_actions =
    '{
      "emt": [
        "Perform a brief primary survey (mental status, airway, breathing, circulation) before or after your glucose check.",
        "Review the on-screen vitals / monitor layout.",
        "Obtain a focused SAMPLE history from family if offered in your flow."
      ],
      "aemt": [
        "Perform a brief primary survey (mental status, airway, breathing, circulation).",
        "Establish IV access only if your protocol and comfort level call for it in this stable presentation.",
        "Repeat vitals after any intervention."
      ],
      "paramedic": [
        "Perform a brief primary survey (mental status, airway, breathing, circulation).",
        "Consider a 12-lead ECG if your training path includes it for AMS workups.",
        "Document transport priority and handoff expectations in the radio report when ready."
      ]
    }'::jsonb,
  critical_failures = ARRAY['Failure to check a blood glucose level.']::text[],
  updated_at = now()
WHERE id = 'welcome-tutorial';
