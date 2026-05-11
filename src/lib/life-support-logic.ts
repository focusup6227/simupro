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

/** VF / pulseless rhythms — unsynchronized shock is appropriate; no R-on-T penalty. */
export function isShockableArrestRhythm(kind: EcgRhythmKind): boolean {
  return (
    kind === 'vfib' ||
    kind === 'pulseless_vt' ||
    kind === 'asystole' ||
    kind === 'pea'
  );
}

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

export function tcpCaptureBand(
  outputMa: number,
  thresholdMa: number,
): 'none' | 'intermittent' | 'full' {
  const d = outputMa - thresholdMa;
  if (d > 2) return 'full';
  if (Math.abs(d) <= 2) return 'intermittent';
  return 'none';
}
