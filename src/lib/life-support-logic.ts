import type { EcgRhythmKind } from '@/lib/ecg-rhythm';
import { RHYTHM_FAMILY } from '@/lib/ecg-rhythm';

/** Rhythms where unsynchronized shock risks R-on-T deterioration (training heuristic). */
export function isOrganizedTachyForCardioversion(kind: EcgRhythmKind): boolean {
  const fam = RHYTHM_FAMILY[kind];
  if (fam === 'ventricular' && kind !== 'pulseless_vt') return true;
  if (fam === 'atrial') return true;
  if (kind === 'sinus_tach') return true;
  return false;
}

/**
 * Identifies rhythms that are shockable in cardiac arrest.
 *
 * @param kind - The ECG rhythm kind to evaluate.
 * @returns `true` if the rhythm is `vfib` or `pulseless_vt`, `false` otherwise.
 */
export function isShockableArrestRhythm(kind: EcgRhythmKind): boolean {
  return kind === 'vfib' || kind === 'pulseless_vt';
}

/**
 * Determines whether the rhythm represents a non-shockable pulseless arrest.
 *
 * @returns `true` if `kind` is 'asystole', 'pea', or 'agonal', `false` otherwise.
 */
export function isNonShockablePulselessArrest(kind: EcgRhythmKind): boolean {
  return kind === 'asystole' || kind === 'pea' || kind === 'agonal';
}

/**
 * Provides the baseline success rate used for cardioversion calculations for a given ECG rhythm.
 *
 * @param kind - The ECG rhythm kind to look up
 * @returns The base success rate for `kind`. Values: `svt` => 0.72, `sinus_tach` => 0.68, `vt` => 0.55, `afib` => 0.48, `aflutter` => 0.52, all other kinds => 0.5
 */
function cardioversionBaseRate(kind: EcgRhythmKind): number {
  switch (kind) {
    case 'svt':
      return 0.72;
    case 'sinus_tach':
      return 0.68;
    case 'vt':
      return 0.55;
    case 'afib':
      return 0.48;
    case 'aflutter':
      return 0.52;
    default:
      return 0.5;
  }
}

/**
 * Estimate the probability of successful electrical cardioversion for a given rhythm using energy delivered, prior attempts, and rhythm resistance.
 *
 * @param opts.kind - Rhythm kind being treated
 * @param opts.energyJoules - Energy delivered in joules
 * @param opts.attempts - Number of prior cardioversion attempts (used to apply fatigue penalty)
 * @param opts.rhythmResistance - Scaling factor representing rhythm resistance to cardioversion
 * @returns A probability between 0.06 and 0.94 indicating the estimated chance of successful cardioversion
 */
export function cardioversionSuccessProbability(opts: {
  kind: EcgRhythmKind;
  energyJoules: number;
  attempts: number;
  rhythmResistance: number;
}): number {
  const base = cardioversionBaseRate(opts.kind);
  const fatigueFactor = 0.07;
  /** Training-scale joule bonus (~0.15 at 200 J). */
  const jouleBonus = (opts.energyJoules / 200) * 0.15;
  const raw =
    base + jouleBonus - opts.attempts * fatigueFactor;
  const scaled = raw / opts.rhythmResistance;
  return Math.min(0.94, Math.max(0.06, scaled));
}

/**
 * Classifies transcutaneous pacing capture based on the difference between output and threshold.
 *
 * @param outputMa - Pacing output in milliamps (mA)
 * @param thresholdMa - Measured capture threshold in milliamps (mA)
 * @returns `'full'` when `outputMa` is more than 2 mA above `thresholdMa`, `'intermittent'` when the difference is within ±2 mA, `'none'` otherwise
 */
export function tcpCaptureBand(
  outputMa: number,
  thresholdMa: number,
): 'none' | 'intermittent' | 'full' {
  const d = outputMa - thresholdMa;
  if (d > 2) return 'full';
  if (Math.abs(d) <= 2) return 'intermittent';
  return 'none';
}
