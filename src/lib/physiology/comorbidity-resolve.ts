import { COMORBIDITY_MATRIX } from '@/lib/physiology/comorbidity-matrix';
import { extractComorbidityIdsFromText } from '@/lib/physiology/comorbidity-extract';
import type {
  ComorbidityModifier,
  ConditionId,
  LungMechanicsState,
  PathophysiologyAxes,
} from '@/lib/physiology/types';
import {
  defaultLungMechanics,
  PATHOPHYSIOLOGY_AXIS_KEYS,
  asConditionId,
} from '@/lib/physiology/types';

/** Baseline for coagulationBalance (0.5 = balanced hemostasis, see types.ts). */
const COAGULATION_NEUTRAL = 0.5;

export function defaultPathophysiologyAxes(): PathophysiologyAxes {
  return {
    hemodynamicReserve: 1,
    vascularTone: 1,
    metabolicClearance: 1,
    respiratoryCompliance: 1,
    baroreceptorSensitivity: 1,
    adrenergicReserve: 1,
    oxygenAffinity: 1,
    renalClearance: 1,
    coagulationBalance: COAGULATION_NEUTRAL,
    inflammatoryDrive: 1,
  };
}

function clampAxes(a: PathophysiologyAxes): PathophysiologyAxes {
  const out = { ...a };
  for (const key of PATHOPHYSIOLOGY_AXIS_KEYS) {
    out[key] = Math.min(1, Math.max(0, out[key]));
  }
  return out;
}

/**
 * Multiplicative composition: each axis starts at neutral (1.0), except
 * coagulationBalance which starts at 0.5 and scales by (m / 0.5) per modifier.
 */
export function resolveComorbidityAxes(
  ids: readonly string[],
  matrix: Record<string, ComorbidityModifier> = COMORBIDITY_MATRIX,
): PathophysiologyAxes {
  const out = defaultPathophysiologyAxes();
  for (const id of ids) {
    const mod = matrix[id];
    if (!mod) continue;
    for (const key of PATHOPHYSIOLOGY_AXIS_KEYS) {
      const v = mod.axes[key];
      if (v === undefined) continue;
      if (key === 'coagulationBalance') {
        out[key] *= v / COAGULATION_NEUTRAL;
      } else {
        out[key] *= v;
      }
    }
  }
  return clampAxes(out);
}

export type ResolvedComorbidityResult = {
  axes: PathophysiologyAxes;
  unknownIds: string[];
};

export function resolveComorbidityAxesWithMeta(
  ids: readonly string[],
  matrix: Record<string, ComorbidityModifier> = COMORBIDITY_MATRIX,
): ResolvedComorbidityResult {
  const unknownIds: string[] = [];
  const known: string[] = [];
  for (const id of ids) {
    if (matrix[id]) known.push(id);
    else unknownIds.push(id);
  }
  return {
    axes: resolveComorbidityAxes(known, matrix),
    unknownIds,
  };
}

/**
 * Hybrid binding: explicit scenario.comorbidities wins; otherwise parse patientProfile.
 */
export function conditionIdsForScenario(
  patientProfile: string,
  explicitComorbidities?: string[] | null,
): ConditionId[] {
  if (explicitComorbidities?.length) {
    return explicitComorbidities.map((id) => asConditionId(id));
  }
  return extractComorbidityIdsFromText(patientProfile);
}

/** Plausible bounds for lung-mechanics state after composition. */
const LUNG_MECHANICS_BOUNDS = {
  airwayResistance: { min: 1, max: 60 },
  lungCompliance: { min: 0.01, max: 0.2 },
  paCO2: { min: 8, max: 80 },
  vqMismatchSlope: { min: 0, max: 6 },
  deadSpaceFraction: { min: 0.2, max: 0.85 },
  baselineCO2: { min: 0, max: 20 },
  cardiogenicOscAmp: { min: 0, max: 3 },
} as const;

function clampRange(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function clampLungMechanics(s: LungMechanicsState): LungMechanicsState {
  return {
    airwayResistanceCmH2OPerLPerSec: clampRange(
      s.airwayResistanceCmH2OPerLPerSec,
      LUNG_MECHANICS_BOUNDS.airwayResistance.min,
      LUNG_MECHANICS_BOUNDS.airwayResistance.max,
    ),
    lungComplianceLPerCmH2O: clampRange(
      s.lungComplianceLPerCmH2O,
      LUNG_MECHANICS_BOUNDS.lungCompliance.min,
      LUNG_MECHANICS_BOUNDS.lungCompliance.max,
    ),
    paCO2MmHg: clampRange(
      s.paCO2MmHg,
      LUNG_MECHANICS_BOUNDS.paCO2.min,
      LUNG_MECHANICS_BOUNDS.paCO2.max,
    ),
    vqMismatchSlopeMmHgPerSec: clampRange(
      s.vqMismatchSlopeMmHgPerSec,
      LUNG_MECHANICS_BOUNDS.vqMismatchSlope.min,
      LUNG_MECHANICS_BOUNDS.vqMismatchSlope.max,
    ),
    deadSpaceFraction: clampRange(
      s.deadSpaceFraction,
      LUNG_MECHANICS_BOUNDS.deadSpaceFraction.min,
      LUNG_MECHANICS_BOUNDS.deadSpaceFraction.max,
    ),
    baselineCO2MmHg: clampRange(
      s.baselineCO2MmHg,
      LUNG_MECHANICS_BOUNDS.baselineCO2.min,
      LUNG_MECHANICS_BOUNDS.baselineCO2.max,
    ),
    cardiogenicOscAmplitudeMmHg: clampRange(
      s.cardiogenicOscAmplitudeMmHg,
      LUNG_MECHANICS_BOUNDS.cardiogenicOscAmp.min,
      LUNG_MECHANICS_BOUNDS.cardiogenicOscAmp.max,
    ),
  };
}

/**
 * Compose lung-mechanics modifiers from the listed comorbidity ids on top of
 * a healthy-adult baseline.
 *
 * Multipliers (Ra, Cs, slopeVQ) compose by product across modifiers; absolute
 * deltas (PaCO2, dead-space, baseline CO2, cardiogenic amplitude) sum.
 */
export function resolveLungMechanics(
  ids: readonly string[],
  matrix: Record<string, ComorbidityModifier> = COMORBIDITY_MATRIX,
): LungMechanicsState {
  const out = defaultLungMechanics();
  let raMul = 1;
  let csMul = 1;
  let slopeMul = 1;

  for (const id of ids) {
    const mod = matrix[id]?.lungMechanics;
    if (!mod) continue;
    if (mod.raMultiplier && mod.raMultiplier > 0) raMul *= mod.raMultiplier;
    if (mod.csMultiplier && mod.csMultiplier > 0) csMul *= mod.csMultiplier;
    if (mod.slopeVQMultiplier && mod.slopeVQMultiplier > 0) {
      slopeMul *= mod.slopeVQMultiplier;
    }
    if (mod.paCO2DeltaMmHg) out.paCO2MmHg += mod.paCO2DeltaMmHg;
    if (mod.deadSpaceFractionDelta) {
      out.deadSpaceFraction += mod.deadSpaceFractionDelta;
    }
    if (mod.baselineCO2MmHg) out.baselineCO2MmHg += mod.baselineCO2MmHg;
    if (mod.cardiogenicOscAmpMmHg) {
      out.cardiogenicOscAmplitudeMmHg += mod.cardiogenicOscAmpMmHg;
    }
  }

  out.airwayResistanceCmH2OPerLPerSec *= raMul;
  out.lungComplianceLPerCmH2O *= csMul;
  out.vqMismatchSlopeMmHgPerSec *= slopeMul;

  return clampLungMechanics(out);
}

/**
 * Apply the AI's coarse `obstruction` 0..1 lever on top of a baseline by
 * scaling airway resistance up to ~5x at full obstruction. Lets the AI flow
 * keep using a single number while still feeding the tau-based engine.
 */
export function applyAiObstructionToLungMechanics(
  baseline: LungMechanicsState,
  obstruction: number,
): LungMechanicsState {
  if (!Number.isFinite(obstruction) || obstruction <= 0) return baseline;
  const o = Math.min(1, Math.max(0, obstruction));
  const raScale = 1 + o * 4;
  const csScale = 1 - o * 0.25;
  const slopeScale = 1 + o * 0.6;
  return clampLungMechanics({
    ...baseline,
    airwayResistanceCmH2OPerLPerSec:
      baseline.airwayResistanceCmH2OPerLPerSec * raScale,
    lungComplianceLPerCmH2O:
      baseline.lungComplianceLPerCmH2O * csScale,
    vqMismatchSlopeMmHgPerSec:
      baseline.vqMismatchSlopeMmHgPerSec * slopeScale,
  });
}

/** Tau (seconds) = R * C. Convenience for engine consumers. */
export function lungTimeConstantSec(s: LungMechanicsState): number {
  return s.airwayResistanceCmH2OPerLPerSec * s.lungComplianceLPerCmH2O;
}
