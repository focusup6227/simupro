-- Legacy Simu-Pro catalog scenarios: always free tier (not paywalled).
UPDATE public.scenarios
SET
  is_premium = false,
  updated_at = now()
WHERE
  id IN (
    'welcome-tutorial',
    'diabetic-emergency',
    'anaphylactic-reaction',
    'motor-vehicle-collision',
    'pediatric-seizure',
    'acute-stroke',
    'construction-site-fall',
    'sepsis-elderly',
    'pediatric-asthma-attack',
    'acute-stemi',
    'motorcycle-trauma',
    'opioid-overdose',
    'psychiatric-crisis',
    'burn-victim-inhalation',
    'childbirth-dystocia',
    'pediatric-dka',
    'tension-pneumothorax',
    'heat-stroke',
    'co-poisoning',
    'ectopic-pregnancy-rupture',
    'pulmonary-embolism',
    'tca-overdose',
    'meningitis',
    'gi-bleed',
    'hyperkalemia',
    'svt-stable',
    'placental-abruption',
    'foreign-body-airway-obstruction',
    'aortic-dissection',
    'cold-and-unresponsive',
    'prolapsed-cord',
    'chf-exacerbation',
    'cardiac-arrest-vfib'
  );
