/**
 * Shared types for the Phase II PK/PD engine. Kept free of any framework or
 * Supabase imports so the same definitions can be consumed by:
 *   - the browser-side store / hooks
 *   - the server-side replay used by the Deno grading edge function
 *   - vitest specs
 */

/** Drug identifier; superset of intervention ids the dose parser maps from. */
export type DrugId =
  | 'epinephrine-cardiac'
  | 'epinephrine-brady'
  | 'atropine'
  | 'adenosine'
  | 'amiodarone'
  | 'lidocaine'
  | 'dopamine'
  | 'nitroglycerin'
  | 'fentanyl'
  | 'midazolam'
  | 'ketamine'
  | 'naloxone'
  | 'albuterol'
  | 'dextrose-iv'
  | 'glucagon-im';

export const DRUG_IDS = [
  'epinephrine-cardiac',
  'epinephrine-brady',
  'atropine',
  'adenosine',
  'amiodarone',
  'lidocaine',
  'dopamine',
  'nitroglycerin',
  'fentanyl',
  'midazolam',
  'ketamine',
  'naloxone',
  'albuterol',
  'dextrose-iv',
  'glucagon-im',
] as const satisfies readonly DrugId[];

export type Route = 'iv' | 'io' | 'im' | 'in' | 'po' | 'sl' | 'neb' | 'inh';

export const ROUTES = [
  'iv',
  'io',
  'im',
  'in',
  'po',
  'sl',
  'neb',
  'inh',
] as const satisfies readonly Route[];

export type DoseKind =
  | 'bolus'
  | 'infusion_start'
  | 'infusion_change'
  | 'infusion_stop';

export const DOSE_KINDS = [
  'bolus',
  'infusion_start',
  'infusion_change',
  'infusion_stop',
] as const satisfies readonly DoseKind[];

/**
 * Units that an `infusion_rate` value can be expressed in. The engine always
 * computes mg/min internally; values are normalised to `mcg_per_kg_per_min`
 * before being stored.
 */
export type InfusionRateKind = 'mcg_per_kg_per_min' | 'mcg_per_min';

/**
 * One immutable dose log row. Persisted in `simulation_pk_doses`. The engine
 * never mutates these — concentrations and deltas are derived per tick.
 */
export type DoseRecord = {
  id: string;
  sessionId: string;
  userId: string;
  drugId: DrugId;
  /** Originating intervention id; null for synthetic / scripted doses. */
  interventionId: string | null;
  /** Bolus dose in mg-equivalent; null for infusion start/stop/change rows. */
  doseMg: number | null;
  route: Route;
  kind: DoseKind;
  /** Rate in `infusionRateKind` units for infusion rows; null otherwise. */
  infusionRate: number | null;
  /** Unit interpretation of `infusionRate`. */
  infusionRateKind: InfusionRateKind | null;
  /** Patient weight at moment of administration (kg). */
  patientWeightKg: number;
  /** Monotonic seconds from session start. */
  simSeconds: number;
  administeredAt: string;
};

/** Input form (no id / administeredAt yet) used by the parser before persistence. */
export type DoseInput = Omit<DoseRecord, 'id' | 'administeredAt'>;

export type VitalAxis = 'hr' | 'sBp' | 'dBp' | 'rr' | 'spo2' | 'gcs';

export const VITAL_AXES = [
  'hr',
  'sBp',
  'dBp',
  'rr',
  'spo2',
  'gcs',
] as const satisfies readonly VitalAxis[];

export type VitalDeltas = Record<Exclude<VitalAxis, 'gcs'>, number> & {
  gcs?: number;
};

export function zeroDeltas(): VitalDeltas {
  return { hr: 0, sBp: 0, dBp: 0, rr: 0, spo2: 0, gcs: 0 };
}

/** Modulator names that an `Effect` can scale by from `PathophysiologyAxes`. */
export type EffectModulator = 'adrenergicReserve' | 'baroreceptorSensitivity';

export type Effect = {
  axis: VitalAxis;
  /** Maximum signed change applied to the axis (full receptor saturation). */
  emax: number;
  /** Concentration (mg/L ≈ µg/mL) producing half-maximum effect. */
  ec50: number;
  /**
   * Optional axis modulation from comorbidity state. The PD output is scaled
   * by the modulator value clamped to [0, 1].
   */
  modulatedBy?: EffectModulator;
};

/**
 * Per-drug pharmacokinetic and pharmacodynamic parameters. All rate constants
 * are per-minute; all volumes are L/kg so the engine can scale by patient
 * weight at integration time.
 */
export type DrugPkParams = {
  drugId: DrugId;
  /** Apparent volume of distribution per kg. */
  Vd_L_per_kg: number;
  /** Baseline first-order elimination rate constant (per minute) in healthy adults. */
  kel_per_min: number;
  /** First-order absorption rate constant for non-IV routes (null = pure IV). */
  ka_per_min: number | null;
  /**
   * Bioavailability fraction for non-IV doses. IV/IO bypass this and use 1.0
   * regardless. Required for IM / IN / SL / PO / NEB.
   */
  bioavailability: number;
  /** Fraction of clearance proportional to hepatic / metabolic axis. */
  hepaticWeight: number;
  /** Fraction of clearance proportional to renal axis. */
  renalWeight: number;
  /** Clinical effects keyed by vital axis. */
  effects: Effect[];
  /** When non-empty, this drug antagonises listed drugs (sigmoid scaling). */
  antagonistOf?: DrugId[];
};

/** Row shape from `simulation_pk_doses` (snake_case) for replay hydration. */
export type SimulationPkDoseRowSnake = {
  id: string;
  session_id: string;
  user_id: string;
  drug_id: string;
  intervention_id?: string | null;
  dose_mg?: number | null;
  route: string;
  kind: string;
  infusion_rate?: number | null;
  infusion_rate_kind?: string | null;
  patient_weight_kg: number | string | null;
  sim_seconds: number | string | null;
  administered_at?: string;
};
