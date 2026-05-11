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

/**
 * Lung mechanics state in real units, used by the tau-based ("CapnoSyn")
 * capnography engine. Populated by the comorbidity resolver at scenario load,
 * mutated by AI/`obstruction` updates and pathology events (ROSC step), and
 * further modulated by PK drug deltas at display time.
 *
 * Time constant tau = airwayResistance * lungCompliance (seconds).
 * Healthy adult ~ 2.0 cmH2O/L/s * 0.1 L/cmH2O = 0.20 s (steep upstroke,
 * flat plateau). Severe bronchospasm pushes tau toward 1.0–2.5 s, producing
 * the textbook "shark fin" morphology.
 */
export type LungMechanicsState = {
  /** Airway resistance in cmH2O / (L/s). Healthy ~2; status asthmaticus 8–20. */
  airwayResistanceCmH2OPerLPerSec: number;
  /** Static lung compliance in L / cmH2O. Healthy ~0.1; ARDS ~0.03. */
  lungComplianceLPerCmH2O: number;
  /** Theoretical alveolar CO2 tension (the exponential ceiling), mmHg. */
  paCO2MmHg: number;
  /** Phase III V/Q-mismatch slope, mmHg per second of expiration. */
  vqMismatchSlopeMmHgPerSec: number;
  /** Physiologic dead space fraction (Vd/Vt). 0.3 normal; ≥0.5 in PE. */
  deadSpaceFraction: number;
  /** Inspired/baseline CO2, mmHg. >0 indicates rebreathing (stuck valve, etc.). */
  baselineCO2MmHg: number;
  /** Cardiogenic oscillation ripple amplitude on the plateau, mmHg. */
  cardiogenicOscAmplitudeMmHg: number;
};

/** Healthy-adult defaults (roughly textbook values). */
export function defaultLungMechanics(): LungMechanicsState {
  return {
    airwayResistanceCmH2OPerLPerSec: 2,
    lungComplianceLPerCmH2O: 0.1,
    paCO2MmHg: 40,
    vqMismatchSlopeMmHgPerSec: 0.5,
    deadSpaceFraction: 0.3,
    baselineCO2MmHg: 0,
    cardiogenicOscAmplitudeMmHg: 0,
  };
}

/**
 * Per-condition modifiers that compose into a `LungMechanicsState`.
 *
 * Composition rules (see `resolveLungMechanics`):
 * - `raMultiplier`, `csMultiplier`, `slopeVQMultiplier`: multiplicative (1 = no-op).
 * - `paCO2DeltaMmHg`, `deadSpaceFractionDelta`, `baselineCO2MmHg`,
 *   `cardiogenicOscAmpMmHg`: additive (0 = no-op).
 *
 * All values are clamped post-composition to physiologically plausible ranges.
 */
export type LungMechanicsModifier = {
  raMultiplier?: number;
  csMultiplier?: number;
  paCO2DeltaMmHg?: number;
  slopeVQMultiplier?: number;
  deadSpaceFractionDelta?: number;
  baselineCO2MmHg?: number;
  cardiogenicOscAmpMmHg?: number;
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
  /**
   * Optional lung-mechanics deltas consumed by the tau-based capnography
   * engine. Conditions that don't directly perturb the airway/alveolus
   * (e.g. diabetes) leave this undefined.
   */
  lungMechanics?: LungMechanicsModifier;
  charlsonWeight: number | null;
  elixhauserAhrqWeight: number | null;
  icd10Prefix?: string;
  /** Tooltip / debug / author notes. */
  narrative: string;
  /** Case-insensitive regex source used by extractComorbidityIdsFromText. */
  keywordPattern: string;
};
