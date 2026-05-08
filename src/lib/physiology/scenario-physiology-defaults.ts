import type { Scenario } from '@/lib/types';

const WEIGHT_FROM_BAND: Record<
  NonNullable<Scenario['ageBand']>,
  number
> = {
  neonate: 3.2,
  infant: 9,
  toddler: 14,
  child: 32,
  adolescent: 52,
  adult: 75,
  /** Legacy LMS tag — midpoint pediatric mass when explicit kg unset. */
  pediatric: 22,
};

/** Resolves mass (kg) for PK / volume scaling from authoring fields / DB (`patient_weight_kg`). */
export function resolveScenarioWeightKg(
  scenario: Pick<Scenario, 'defaultWeightKg' | 'ageBand'>,
): number {
  const w = scenario.defaultWeightKg;
  if (w != null && Number.isFinite(w) && w > 0 && w <= 300) return w;
  const band = scenario.ageBand;
  if (band && band in WEIGHT_FROM_BAND) return WEIGHT_FROM_BAND[band];
  return 75;
}

/** Slight acceleration of anaerobic drift for smaller patients (emphasis/teaching knob). */
export function metabolicPediatricScale(
  scenario: Pick<Scenario, 'ageBand'>,
): number {
  switch (scenario.ageBand) {
    case 'neonate':
      return 1.45;
    case 'infant':
    case 'toddler':
      return 1.28;
    case 'child':
    case 'adolescent':
    case 'pediatric':
      return 1.18;
    default:
      return 1;
  }
}
