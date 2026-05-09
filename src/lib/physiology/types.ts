/**
 * Pathophysiology axes for the digital-twin / state-space model (Phase I matrix).
 * Values are nominally in [0, 1]; composition and clamping live in comorbidity-resolve.
 */

export type ConditionCategory =
  | 'cardiovascular'
  | 'pulmonary'
  | 'renal'
  | 'hepatic'
  | 'endocrine'
  | 'oncologic'
  | 'neurologic'
  | 'hematologic'
  | 'infectious'
  | 'other';

export type ConditionNature = 'chronic' | 'acute';

/** Canonical axis keys — use with keyof for iteration */
export const PATHOPHYSIOLOGY_AXIS_KEYS = [
  'hemodynamicReserve',
  'vascularTone',
  'metabolicClearance',
  'respiratoryCompliance',
  'baroreceptorSensitivity',
  'adrenergicReserve',
  'oxygenAffinity',
  'renalClearance',
  'coagulationBalance',
  'inflammatoryDrive',
] as const;

export type PathophysiologyAxisKey = (typeof PATHOPHYSIOLOGY_AXIS_KEYS)[number];

export type PathophysiologyAxes = {
  /** Cardiac output ceiling under stress (1 = healthy). */
  hemodynamicReserve: number;
  /** Ability to maintain / raise SVR (1 = healthy). */
  vascularTone: number;
  /** Hepatic / CYP-mediated clearance (1 = healthy). */
  metabolicClearance: number;
  /** Ease of moving air (1 = healthy). */
  respiratoryCompliance: number;
  /** Baroreflex gain (1 = healthy). */
  baroreceptorSensitivity: number;
  /** Response to catecholamines (1 = healthy). */
  adrenergicReserve: number;
  /** Hb-O₂ loading / hypoxic ventilatory drive integrity (1 = healthy). */
  oxygenAffinity: number;
  /** Renal / GFR-mediated clearance (1 = healthy). */
  renalClearance: number;
  /**
   * Hemostasis position: 0.5 = balanced, &lt;0.5 bleed-prone, &gt;0.5 thrombosis-prone.
   * Resolver composes this axis with a 0.5 baseline (see comorbidity-resolve).
   */
  coagulationBalance: number;
  /** Cytokine / septic response capacity (1 = healthy). */
  inflammatoryDrive: number;
};

declare const conditionIdBrand: unique symbol;
/** Scenario / matrix condition identifier (string at runtime). */
export type ConditionId = string & { readonly [conditionIdBrand]: typeof conditionIdBrand };

export function asConditionId(id: string): ConditionId {
  return id as ConditionId;
}

export type ComorbidityModifier = {
  id: string;
  name: string;
  category: ConditionCategory;
  nature: ConditionNature;
  /** Per-axis multipliers; omit axes that this condition does not perturb. */
  axes: Partial<PathophysiologyAxes>;
  charlsonWeight: number | null;
  elixhauserAhrqWeight: number | null;
  icd10Prefix?: string;
  /** Tooltip / debug / author notes. */
  narrative: string;
  /** Case-insensitive regex source used by extractComorbidityIdsFromText. */
  keywordPattern: string;
};
