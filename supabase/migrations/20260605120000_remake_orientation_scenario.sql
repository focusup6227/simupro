-- Remake the orientation (welcome-tutorial) scenario: a genuinely can't-fail
-- first run driven by a five-objective in-app checklist (light up the monitor,
-- check a glucose, take a blood pressure, pick a destination, end the run).
-- Mirrors the refreshed seed in src/lib/scenarios-data.ts.
UPDATE public.scenarios
SET
  title = 'Welcome to Simu-Pro — Orientation patient',
  description =
    'A short, can''t-fail run with a stable patient. Follow the live orientation checklist to learn the runner — monitor, equipment, assessment, and transport — while ruling out hypoglycemia in an adult with mild confusion.',
  patient_profile =
    '60 y/o Male, type 2 diabetes, found seated at home with confusion reported by family.',
  patient_presentation =
    'Awake, cooperative but slow to answer; no focal deficits voiced; skin warm and dry; no acute respiratory distress; family reports skipped lunch after morning insulin.',
  comorbidities = ARRAY['DIABETES_MILD']::text[],
  autonomic_profile = '{"baselineMapMmHg": 96, "initialDecompensationPhase": "baseline"}'::jsonb,
  age_band = 'adult',
  patient_weight_kg = 88,
  details = $tutorial$
This is your orientation — a stable patient you cannot fail. It runs on the same authoring-driven physiology as the rest of the catalog, but stays hemodynamically stable so you can focus on driving the runner. A live checklist on the right tracks five objectives; work them in any order.

1) Open the Equipment drawer and apply the 4-lead and pulse-ox to light up the monitor. 2) In the Assessment tab, check a blood glucose. 3) Take a blood pressure for a full set of vitals. 4) Pick a receiving facility under Destination. 5) End the run for your debrief.

Your AI partner will nudge you if you stall, and ending the run marks the tutorial complete on your profile — so we will not nag you again. Explore Treatment, Radio, and report tabs as your course expects; nothing here is graded against you.

Learning objective: drive the runner end-to-end — light up the monitor, complete a structured first pass with a point-of-care glucose, and choose a destination before transport.
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
        "Apply the 4-lead and pulse-ox from the Equipment drawer to light up the monitor.",
        "Take a blood pressure for a full set of vitals.",
        "Perform a brief primary survey (mental status, airway, breathing, circulation).",
        "Choose a receiving facility under Destination, then end the run."
      ],
      "aemt": [
        "Apply the 4-lead and pulse-ox to light up the monitor, then take a blood pressure.",
        "Perform a brief primary survey (mental status, airway, breathing, circulation).",
        "Establish IV access only if your protocol and comfort level call for it in this stable presentation.",
        "Choose a receiving facility under Destination, then end the run."
      ],
      "paramedic": [
        "Apply the 4-lead and pulse-ox to light up the monitor, then take a blood pressure.",
        "Perform a brief primary survey (mental status, airway, breathing, circulation).",
        "Consider a 12-lead ECG if your training path includes it for AMS workups.",
        "Choose a receiving facility under Destination, then end the run."
      ]
    }'::jsonb,
  critical_failures = ARRAY[]::text[],
  updated_at = now()
WHERE id = 'welcome-tutorial';
