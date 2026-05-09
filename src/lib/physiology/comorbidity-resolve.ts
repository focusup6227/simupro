import { COMORBIDITY_MATRIX } from '@/lib/physiology/comorbidity-matrix';
import { extractComorbidityIdsFromText } from '@/lib/physiology/comorbidity-extract';
import type {
  ComorbidityModifier,
  ConditionId,
  PathophysiologyAxes,
} from '@/lib/physiology/types';
import {
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
