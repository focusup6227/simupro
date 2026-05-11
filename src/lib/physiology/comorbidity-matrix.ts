import type { ComorbidityModifier } from '@/lib/physiology/types';

/**
 * Maps curated JSON axes → PathophysiologyAxes:
 * - cardiacReserve, fluidTolerance → hemodynamicReserve (product when both)
 * - vascularElasticity → vascularTone
 * - pulmonaryCompliance → respiratoryCompliance
 * - autonomicSensitivity → baroreceptorSensitivity + adrenergicReserve
 *   (values &gt; 1 cap to 1.0 for storage; strong stressors use both at 1.0)
 */

function kw(...parts: string[]): string {
  return parts.join('|');
}

/**
 * Authoritative pathophysiology modifiers keyed by condition id.
 * Includes Charlson-oriented entries plus legacy alias keys for extraction/tests.
 */
export const COMORBIDITY_MATRIX: Record<string, ComorbidityModifier> = {
  MI_CHRONIC: {
    id: 'MI_CHRONIC',
    name: 'Prior Myocardial Infarction',
    category: 'cardiovascular',
    nature: 'chronic',
    axes: { hemodynamicReserve: 0.7 * 0.8 },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 0,
    icd10Prefix: 'I25.2',
    narrative:
      'Patient has old scar tissue; reduced heart rate ceiling.',
    keywordPattern: kw(
      String.raw`history of heart attack`,
      String.raw`\bstent\b`,
      String.raw`coronary artery disease`,
      String.raw`prior\s+mi|old\s+mi|post[-\s]?mi`,
    ),
  },

  CHF_CHRONIC: {
    id: 'CHF_CHRONIC',
    name: 'Congestive Heart Failure',
    category: 'cardiovascular',
    nature: 'chronic',
    axes: {
      hemodynamicReserve: 0.4 * 0.3,
      baroreceptorSensitivity: 0.8,
      adrenergicReserve: 0.82,
      respiratoryCompliance: 0.72,
      oxygenAffinity: 0.85,
    },
    lungMechanics: {
      raMultiplier: 1.2,
      csMultiplier: 0.7,
      paCO2DeltaMmHg: 2,
      slopeVQMultiplier: 1.3,
      deadSpaceFractionDelta: 0.05,
    },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 7,
    icd10Prefix: 'I50',
    narrative:
      'Weakened pump; extremely sensitive to fluid volume and prone to flash edema.',
    keywordPattern: kw(
      String.raw`pitting edema|\bjvd\b|crackles|orthopnea`,
      String.raw`congestive heart failure|\bchf\b|heart failure`,
      String.raw`\bhf(?:r|p)?ef\b|cardiomyopathy`,
    ),
  },

  PVD_CHRONIC: {
    id: 'PVD_CHRONIC',
    name: 'Peripheral Vascular Disease',
    category: 'cardiovascular',
    nature: 'chronic',
    axes: { vascularTone: 0.6 },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 2,
    icd10Prefix: 'I73.9',
    narrative: 'Hardened peripheral arteries; circulation is brittle.',
    keywordPattern: kw(
      String.raw`claudication`,
      String.raw`cool extremities|poor pulses`,
      String.raw`peripheral (?:artery|vascular) disease|\bpvd\b`,
    ),
  },

  CVD_CHRONIC: {
    id: 'CVD_CHRONIC',
    name: 'Cerebrovascular Disease',
    category: 'neurologic',
    nature: 'chronic',
    axes: { baroreceptorSensitivity: 0.9 },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 6,
    icd10Prefix: 'I63',
    narrative:
      'History of stroke or TIA; baseline neurological deficits may exist.',
    keywordPattern: kw(
      String.raw`prior stroke|cva\b|tia\b|cerebrovascular`,
      String.raw`slurred speech`,
      String.raw`weakness|hemiparesis`,
    ),
  },

  DEMENTIA_CHRONIC: {
    id: 'DEMENTIA_CHRONIC',
    name: 'Dementia',
    category: 'neurologic',
    nature: 'chronic',
    axes: { baroreceptorSensitivity: 0.85 },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 0,
    icd10Prefix: 'F03',
    narrative: 'Impaired cognitive reserve; baseline GCS is lower.',
    keywordPattern: kw(
      String.raw`confusion|memory loss`,
      String.raw`alzheimer`,
      String.raw`dementia|cognitive decline`,
    ),
  },

  COPD_CHRONIC: {
    id: 'COPD_CHRONIC',
    name: 'Chronic Pulmonary Disease',
    category: 'pulmonary',
    nature: 'chronic',
    axes: {
      respiratoryCompliance: 0.5,
      baroreceptorSensitivity: 0.95,
      adrenergicReserve: 0.95,
      oxygenAffinity: 0.68,
      inflammatoryDrive: 0.88,
    },
    lungMechanics: {
      raMultiplier: 3,
      csMultiplier: 0.7,
      paCO2DeltaMmHg: 8,
      slopeVQMultiplier: 1.8,
      deadSpaceFractionDelta: 0.1,
    },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 3,
    icd10Prefix: 'J44',
    narrative:
      'Air trapping and dead space; patient is a chronic CO2 retainer.',
    keywordPattern: kw(
      String.raw`barrel chest|smoker|home O2|home oxygen`,
      String.raw`wheezing`,
      String.raw`\bcopd\b|chronic obstructive|emphysema|chronic bronchitis`,
    ),
  },

  CTD_CHRONIC: {
    id: 'CTD_CHRONIC',
    name: 'Connective Tissue Disease',
    category: 'other',
    nature: 'chronic',
    axes: {
      vascularTone: 0.85,
      hemodynamicReserve: 0.9,
      inflammatoryDrive: 0.82,
    },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 4,
    icd10Prefix: 'M32',
    narrative:
      'Systemic inflammation; often on steroids which masks infection.',
    keywordPattern: kw(
      String.raw`lupus|rheumatoid arthritis`,
      String.raw`steroid use|on prednisone`,
      String.raw`connective tissue|ctd\b`,
    ),
  },

  PUD_CHRONIC: {
    id: 'PUD_CHRONIC',
    name: 'Peptic Ulcer Disease',
    category: 'other',
    nature: 'chronic',
    axes: {
      metabolicClearance: 0.9,
      coagulationBalance: 0.42,
    },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 0,
    icd10Prefix: 'K27',
    narrative: 'Higher risk for internal GI bleeding if anticoagulated.',
    keywordPattern: kw(
      String.raw`heartburn|gerd\b`,
      String.raw`ulcer history|peptic ulcer|\bpud\b`,
      String.raw`nsaid use|on nsaids`,
    ),
  },

  LIVER_MILD: {
    id: 'LIVER_MILD',
    name: 'Mild Liver Disease',
    category: 'hepatic',
    nature: 'chronic',
    axes: {
      metabolicClearance: 0.7,
      vascularTone: 0.9,
    },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 11,
    icd10Prefix: 'K76.0',
    narrative: 'Impaired protein synthesis; slower drug metabolism.',
    keywordPattern: kw(
      String.raw`fatty liver|nash\b`,
      String.raw`hepatitis history`,
      String.raw`mild liver disease`,
    ),
  },

  DIABETES_MILD: {
    id: 'DIABETES_MILD',
    name: 'Diabetes without Complications',
    category: 'endocrine',
    nature: 'chronic',
    axes: {
      vascularTone: 0.85,
      metabolicClearance: 0.9,
    },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 0,
    icd10Prefix: 'E11.9',
    narrative: 'Elevated baseline glucose; early vascular stiffening.',
    keywordPattern: kw(
      String.raw`metformin|high sugar|hyperglycemia`,
      String.raw`type\s*2\s*diabetes|\bt2dm\b|diabetes mellitus type\s*2|non[-\s]?insulin dependent|\bniddm\b`,
    ),
  },

  HEMIPLEGIA_CHRONIC: {
    id: 'HEMIPLEGIA_CHRONIC',
    name: 'Hemiplegia or Paraplegia',
    category: 'neurologic',
    nature: 'chronic',
    axes: {
      hemodynamicReserve: 0.7 * 0.9,
      baroreceptorSensitivity: 0.75,
      adrenergicReserve: 0.78,
    },
    charlsonWeight: 2,
    elixhauserAhrqWeight: 6,
    icd10Prefix: 'G81',
    narrative:
      'Chronic paralysis; impaired sympathetic tone below level of injury.',
    keywordPattern: kw(
      String.raw`wheelchair|paraplegia|hemiplegia|\bsci\b`,
      String.raw`spinal cord injury`,
      String.raw`atrophy`,
    ),
  },

  RENAL_MODERATE: {
    id: 'RENAL_MODERATE',
    name: 'Moderate to Severe Renal Disease',
    category: 'renal',
    nature: 'chronic',
    axes: {
      renalClearance: 0.42,
      metabolicClearance: 0.4,
      hemodynamicReserve: 0.5,
      vascularTone: 0.72,
    },
    charlsonWeight: 2,
    elixhauserAhrqWeight: 0,
    icd10Prefix: 'N18.3',
    narrative: 'Filtration is failing; medications accumulate quickly.',
    keywordPattern: kw(
      String.raw`low urine|oliguria|anuria`,
      String.raw`high creatinine|elevated creatinine`,
      String.raw`\bckd\b|chronic kidney disease|stage\s*[34].{0,12}kidney`,
    ),
  },

  DIABETES_SEVERE: {
    id: 'DIABETES_SEVERE',
    name: 'Diabetes with Chronic Complications',
    category: 'endocrine',
    nature: 'chronic',
    axes: {
      vascularTone: 0.45,
      baroreceptorSensitivity: 0.55,
      adrenergicReserve: 0.58,
      metabolicClearance: 0.7,
      oxygenAffinity: 0.78,
    },
    charlsonWeight: 2,
    elixhauserAhrqWeight: -3,
    icd10Prefix: 'E11.6',
    narrative:
      'End-organ damage; patient may have silent MI due to neuropathy.',
    keywordPattern: kw(
      String.raw`\binsulin\b|neuropathy|amputation`,
      String.raw`diabetes.{0,40}complication`,
      String.raw`on dialysis.{0,40}diabetes|diabetic nephropathy`,
    ),
  },

  TUMOR_CHRONIC: {
    id: 'TUMOR_CHRONIC',
    name: 'Malignant Tumor (Any)',
    category: 'oncologic',
    nature: 'chronic',
    axes: {
      hemodynamicReserve: 0.8,
      metabolicClearance: 0.8,
      inflammatoryDrive: 0.72,
    },
    charlsonWeight: 2,
    elixhauserAhrqWeight: 10,
    icd10Prefix: 'C80',
    narrative: 'Systemic cachexia; often immunocompromised.',
    keywordPattern: kw(
      String.raw`cancer|malignancy|chemotherapy|oncolog`,
      String.raw`weight loss|cachexi`,
    ),
  },

  LIVER_SEVERE: {
    id: 'LIVER_SEVERE',
    name: 'Moderate to Severe Liver Disease',
    category: 'hepatic',
    nature: 'chronic',
    axes: {
      metabolicClearance: 0.2,
      vascularTone: 0.65,
      hemodynamicReserve: 0.35,
      coagulationBalance: 0.38,
    },
    charlsonWeight: 3,
    elixhauserAhrqWeight: 11,
    icd10Prefix: 'K72',
    narrative: 'Cirrhotic state; severe drug toxicity risk.',
    keywordPattern: kw(
      String.raw`jaundice|icterus`,
      String.raw`ascites`,
      String.raw`easy bruising|cirrhotic|cirrhosis`,
    ),
  },

  METASTASIS_CHRONIC: {
    id: 'METASTASIS_CHRONIC',
    name: 'Metastatic Solid Tumor',
    category: 'oncologic',
    nature: 'chronic',
    axes: {
      hemodynamicReserve: 0.5 * 0.7,
      metabolicClearance: 0.6,
      inflammatoryDrive: 0.68,
    },
    charlsonWeight: 6,
    elixhauserAhrqWeight: 14,
    icd10Prefix: 'C78',
    narrative: 'Advanced cancer; multi-organ involvement.',
    keywordPattern: kw(
      String.raw`metastas|mets\b`,
      String.raw`palliative|end-stage`,
    ),
  },

  AIDS_CHRONIC: {
    id: 'AIDS_CHRONIC',
    name: 'AIDS/HIV',
    category: 'infectious',
    nature: 'chronic',
    axes: {
      metabolicClearance: 0.7,
      hemodynamicReserve: 0.9,
      inflammatoryDrive: 0.38,
    },
    charlsonWeight: 6,
    elixhauserAhrqWeight: 0,
    icd10Prefix: 'B20',
    narrative:
      'Immunocompromised; drug-drug interactions with ART are likely.',
    keywordPattern: kw(
      String.raw`\bhiv\b|\baids\b`,
      String.raw`art meds|antiretroviral`,
    ),
  },

  ALCOHOL_CHRONIC: {
    id: 'ALCOHOL_CHRONIC',
    name: 'Alcohol Abuse',
    category: 'other',
    nature: 'chronic',
    axes: {
      metabolicClearance: 0.6,
      vascularTone: 0.82,
      coagulationBalance: 0.42,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: 0,
    icd10Prefix: 'F10.2',
    narrative:
      'Likely vitamin deficiencies; impaired clotting and metabolism.',
    keywordPattern: kw(
      String.raw`\betoh\b|alcohol abuse|alcoholic`,
      String.raw`withdrawal risk`,
      String.raw`liver.{0,20}alcohol`,
    ),
  },

  HYPERTENSION_CHRONIC: {
    id: 'HYPERTENSION_CHRONIC',
    name: 'Hypertension (Uncomplicated)',
    category: 'cardiovascular',
    nature: 'chronic',
    axes: {
      vascularTone: 0.88,
      baroreceptorSensitivity: 0.62,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: -1,
    icd10Prefix: 'I10',
    narrative: 'Chronic high pressure; stiffened vasculature.',
    keywordPattern: kw(
      String.raw`high\s+bp|blood pressure|hypertension|\bhtn\b`,
      String.raw`lisinopril|amlodipine|ace inhibitor`,
    ),
  },

  STEMI_ACUTE: {
    id: 'STEMI_ACUTE',
    name: 'ST-Elevation Myocardial Infarction',
    category: 'cardiovascular',
    nature: 'acute',
    axes: {
      hemodynamicReserve: 0.2 * 0.5,
      baroreceptorSensitivity: 1,
      adrenergicReserve: 1,
      inflammatoryDrive: 0.92,
    },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 7,
    icd10Prefix: 'I21.0',
    narrative:
      'Active myocardial death; pump failure is imminent without reperfusion.',
    keywordPattern: kw(
      String.raw`st-elevation|st elevation|stemi\b`,
      String.raw`tombstone|fireman hat`,
      String.raw`acute (?:mi|infarct)`,
    ),
  },

  SEPSIS_ACUTE: {
    id: 'SEPSIS_ACUTE',
    name: 'Septic Shock',
    category: 'infectious',
    nature: 'acute',
    axes: {
      vascularTone: 0.2,
      hemodynamicReserve: 0.65,
      metabolicClearance: 0.6,
      inflammatoryDrive: 0.98,
      baroreceptorSensitivity: 0.72,
    },
    lungMechanics: {
      csMultiplier: 0.9,
      paCO2DeltaMmHg: -4,
      slopeVQMultiplier: 1.4,
      deadSpaceFractionDelta: 0.1,
      cardiogenicOscAmpMmHg: 0.6,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: 12,
    icd10Prefix: 'A41.9',
    narrative:
      'Profound vasodilation; capillary leak requires aggressive fluids.',
    keywordPattern: kw(
      String.raw`sepsis|septic shock|severe infection`,
      String.raw`fever|mottled skin`,
      String.raw`hypotension|low bp|tachycardia`,
    ),
  },

  ASTHMA_ACUTE: {
    id: 'ASTHMA_ACUTE',
    name: 'Acute Status Asthmaticus',
    category: 'pulmonary',
    nature: 'acute',
    axes: {
      respiratoryCompliance: 0.2,
      baroreceptorSensitivity: 1,
      adrenergicReserve: 1,
      oxygenAffinity: 0.62,
    },
    lungMechanics: {
      raMultiplier: 4,
      csMultiplier: 0.85,
      paCO2DeltaMmHg: 6,
      slopeVQMultiplier: 1.6,
      deadSpaceFractionDelta: 0.05,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: 3,
    icd10Prefix: 'J45.901',
    narrative:
      'Severe bronchoconstriction; work of breathing is unsustainable.',
    keywordPattern: kw(
      String.raw`status asthmat|severe asthma`,
      String.raw`silent chest|accessory muscles`,
      String.raw`shark fin|wheezing`,
    ),
  },

  ANAPH_ACUTE: {
    id: 'ANAPH_ACUTE',
    name: 'Anaphylaxis',
    category: 'other',
    nature: 'acute',
    axes: {
      vascularTone: 0.3,
      respiratoryCompliance: 0.3,
      baroreceptorSensitivity: 1,
      adrenergicReserve: 1,
      hemodynamicReserve: 0.45,
    },
    lungMechanics: {
      raMultiplier: 3.5,
      csMultiplier: 0.85,
      paCO2DeltaMmHg: 4,
      slopeVQMultiplier: 1.5,
      deadSpaceFractionDelta: 0.05,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: 0,
    icd10Prefix: 'T78.2',
    narrative:
      'Systemic IgE reaction; rapid airway and vascular collapse.',
    keywordPattern: kw(
      String.raw`anaphylaxis|anaphylactic`,
      String.raw`stridor|hives|urticaria`,
      String.raw`bee sting|swollen tongue|angioedema`,
    ),
  },

  HYPOVOLEMIA_ACUTE: {
    id: 'HYPOVOLEMIA_ACUTE',
    name: 'Hypovolemic Shock (Hemorrhage)',
    category: 'other',
    nature: 'acute',
    axes: {
      vascularTone: 0.92,
      hemodynamicReserve: 0.55,
      baroreceptorSensitivity: 0.95,
      adrenergicReserve: 1,
    },
    lungMechanics: {
      paCO2DeltaMmHg: -8,
      slopeVQMultiplier: 1.2,
      deadSpaceFractionDelta: 0.1,
      cardiogenicOscAmpMmHg: 0.4,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: 0,
    icd10Prefix: 'R57.1',
    narrative:
      'Loss of volume; body is in maximum compensatory mode.',
    keywordPattern: kw(
      String.raw`hypovolem|hemorrhage|hemorrhagic shock`,
      String.raw`\bgi bleed\b|melena|hematemesis`,
      String.raw`bleeding|trauma|cool clammy|thirst`,
    ),
  },

  PE_ACUTE: {
    id: 'PE_ACUTE',
    name: 'Pulmonary Embolism',
    category: 'pulmonary',
    nature: 'acute',
    axes: {
      respiratoryCompliance: 0.7,
      hemodynamicReserve: 0.6,
      oxygenAffinity: 0.7,
    },
    lungMechanics: {
      raMultiplier: 1.1,
      csMultiplier: 0.9,
      paCO2DeltaMmHg: -10,
      slopeVQMultiplier: 2.5,
      deadSpaceFractionDelta: 0.2,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: 4,
    icd10Prefix: 'I26',
    narrative:
      'Massive dead space from clot-blocked perfusion; CO2 cannot diffuse out of the affected segment.',
    keywordPattern: kw(
      String.raw`pulmonary embol|\bpe\b(?!a)|saddle embolus`,
      String.raw`pleuritic chest pain|sudden dyspnea`,
      String.raw`d-dimer|\bdvt\b`,
    ),
  },

  ARDS_ACUTE: {
    id: 'ARDS_ACUTE',
    name: 'Acute Respiratory Distress Syndrome',
    category: 'pulmonary',
    nature: 'acute',
    axes: {
      respiratoryCompliance: 0.25,
      oxygenAffinity: 0.55,
      inflammatoryDrive: 0.85,
    },
    lungMechanics: {
      raMultiplier: 1.4,
      csMultiplier: 0.4,
      paCO2DeltaMmHg: 4,
      slopeVQMultiplier: 1.6,
      deadSpaceFractionDelta: 0.15,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: 5,
    icd10Prefix: 'J80',
    narrative:
      'Stiff non-compliant lungs from alveolar flooding; very small tidal volumes.',
    keywordPattern: kw(
      String.raw`\bards\b|acute respiratory distress`,
      String.raw`bilateral infiltrates|white-?out lungs`,
      String.raw`p[/]?f ratio`,
    ),
  },

  PULM_EDEMA_ACUTE: {
    id: 'PULM_EDEMA_ACUTE',
    name: 'Acute Pulmonary Edema',
    category: 'pulmonary',
    nature: 'acute',
    axes: {
      respiratoryCompliance: 0.4,
      oxygenAffinity: 0.6,
      hemodynamicReserve: 0.5,
    },
    lungMechanics: {
      raMultiplier: 1.5,
      csMultiplier: 0.5,
      paCO2DeltaMmHg: 3,
      slopeVQMultiplier: 1.4,
      deadSpaceFractionDelta: 0.1,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: 0,
    icd10Prefix: 'J81',
    narrative:
      'Alveoli flooding with fluid; gas exchange and compliance both impaired.',
    keywordPattern: kw(
      String.raw`pulmonary edema|\bcape\b|flash pulmonary edema`,
      String.raw`pink frothy sputum`,
      String.raw`acute decompensated heart failure`,
    ),
  },

  REBREATHING_ACUTE: {
    id: 'REBREATHING_ACUTE',
    name: 'Rebreathing (Equipment Fault)',
    category: 'other',
    nature: 'acute',
    axes: {},
    lungMechanics: {
      baselineCO2MmHg: 6,
      paCO2DeltaMmHg: 4,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: 0,
    narrative:
      'Stuck exhalation valve or exhausted CO2 absorbent; inspired CO2 never returns to zero on the capnogram.',
    keywordPattern: kw(
      String.raw`rebreath|stuck (?:exhalation )?valve`,
      String.raw`exhausted (?:soda ?lime|sodasorb|absorbent)`,
      String.raw`bag ?valve.{0,12}fault`,
    ),
  },

  HYPOVENTILATION_ACUTE: {
    id: 'HYPOVENTILATION_ACUTE',
    name: 'Hypoventilation',
    category: 'other',
    nature: 'acute',
    axes: {
      respiratoryCompliance: 0.85,
    },
    lungMechanics: {
      paCO2DeltaMmHg: 18,
      slopeVQMultiplier: 1.1,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: 0,
    icd10Prefix: 'R06.81',
    narrative:
      'Slow shallow breathing (opioid OD, fatigue, central depression); CO2 builds up between widely spaced wide breaths.',
    keywordPattern: kw(
      String.raw`hypoventil|respiratory depression|narcosis`,
      String.raw`opioid (?:od|overdose|toxicity)`,
      String.raw`shallow breathing|slow breathing|sedation depressed rr`,
    ),
  },

  BB_BLOCKADE: {
    id: 'BB_BLOCKADE',
    name: 'Beta-Blocker Effect',
    category: 'other',
    nature: 'chronic',
    axes: {
      baroreceptorSensitivity: 0.12,
      adrenergicReserve: 0.12,
      hemodynamicReserve: 0.6,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: 0,
    narrative:
      'Chemical blockade of the sympathetic nervous system; tachycardia is blunted.',
    keywordPattern: kw(
      String.raw`metoprolol|atenolol|propranolol|bisoprolol|carvedilol|labetalol`,
      String.raw`beta[-\s]?blocker`,
      String.raw`medication:.{0,20}lol\b`,
    ),
  },

  /** @deprecated prefer CHF_CHRONIC — kept for extraction & tests */
  chf: {
    id: 'chf',
    name: 'Congestive heart failure (alias)',
    category: 'cardiovascular',
    nature: 'chronic',
    axes: {
      hemodynamicReserve: 0.4 * 0.3,
      baroreceptorSensitivity: 0.8,
      adrenergicReserve: 0.82,
      respiratoryCompliance: 0.72,
      oxygenAffinity: 0.85,
    },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 7,
    icd10Prefix: 'I50',
    narrative: 'Alias of CHF_CHRONIC.',
    keywordPattern: String.raw`^(?!)$`,
  },

  /** @deprecated prefer SEPSIS_ACUTE */
  sepsis: {
    id: 'sepsis',
    name: 'Sepsis (alias)',
    category: 'infectious',
    nature: 'acute',
    axes: {
      vascularTone: 0.2,
      hemodynamicReserve: 0.65,
      metabolicClearance: 0.6,
      inflammatoryDrive: 0.98,
      baroreceptorSensitivity: 0.72,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: 12,
    icd10Prefix: 'A41.9',
    narrative: 'Alias of SEPSIS_ACUTE.',
    keywordPattern: String.raw`^(?!)$`,
  },

  /** @deprecated prefer HYPERTENSION_CHRONIC — duplicate patterns removed; still resolvable by explicit id */
  'chronic-htn': {
    id: 'chronic-htn',
    name: 'Chronic hypertension (alias)',
    category: 'cardiovascular',
    nature: 'chronic',
    axes: {
      vascularTone: 0.88,
      baroreceptorSensitivity: 0.62,
    },
    charlsonWeight: 0,
    elixhauserAhrqWeight: -1,
    icd10Prefix: 'I10',
    narrative: 'Alias of HYPERTENSION_CHRONIC.',
    keywordPattern: String.raw`^(?!)$`,
  },

  /** @deprecated prefer DIABETES_MILD */
  'type-2-diabetes': {
    id: 'type-2-diabetes',
    name: 'Type 2 diabetes (alias)',
    category: 'endocrine',
    nature: 'chronic',
    axes: {
      vascularTone: 0.85,
      metabolicClearance: 0.9,
    },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 0,
    icd10Prefix: 'E11',
    narrative: 'Alias of DIABETES_MILD.',
    keywordPattern: String.raw`^(?!)$`,
  },

  /** @deprecated prefer COPD_CHRONIC */
  copd: {
    id: 'copd',
    name: 'COPD (alias)',
    category: 'pulmonary',
    nature: 'chronic',
    axes: {
      respiratoryCompliance: 0.5,
      baroreceptorSensitivity: 0.95,
      adrenergicReserve: 0.95,
      oxygenAffinity: 0.68,
      inflammatoryDrive: 0.88,
    },
    charlsonWeight: 1,
    elixhauserAhrqWeight: 3,
    icd10Prefix: 'J44',
    narrative: 'Alias of COPD_CHRONIC.',
    keywordPattern: String.raw`^(?!)$`,
  },
};
