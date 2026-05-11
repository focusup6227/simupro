import type { PathophysiologyAxes } from '@/lib/physiology/types';
import type { DecompensationPhase } from '@/lib/physiology/autonomic-types';
import type { PhysiologyFeedbackSnapshot } from '@/lib/physiology/feedback';

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

export type MetabolicState = {
  lactateMmol: number;
  bicarbMeqL: number;
  ph: number;
};

export type MetabolicTickInput = {
  axes: PathophysiologyAxes;
  /** Mean arterial pressure (mmHg), if known */
  mapMmHg: number | null;
  /** Observed RR (/min) when parseable */
  rrPerMin: number | null;
  bleedRateMlPerMin: number;
  decompensationPhase: DecompensationPhase;
  /** Extra lactate rise this second from AI / events (mmol/L) */
  lactateBump: number;
  /** From scenario.ageBand — scales anaerobic drift */
  pediatricScale: number;
  feedback?: PhysiologyFeedbackSnapshot | null;
};

export function defaultMetabolicState(): MetabolicState {
  return {
    lactateMmol: 1.0,
    bicarbMeqL: 24,
    ph: 7.4,
  };
}

/**
 * Simplified 1 Hz acid–base / lactate integrator for teaching surfaces (not full Stewart).
 * Couples to perfusion proxies + bleed + inflammatory axes; RR nudges respiratory alkali.
 */
export function tickMetabolic(
  prev: MetabolicState,
  dtSec: number,
  input: MetabolicTickInput,
): MetabolicState {
  const hrReserve = clamp(input.axes.hemodynamicReserve ?? 1, 0.05, 1);
  const infl = clamp(input.axes.inflammatoryDrive ?? 0.5, 0, 1);
  const map = input.mapMmHg;
  const mapDeficit =
    map != null && Number.isFinite(map)
      ? clamp((75 - map) / 75, 0, 1)
      : 0;

  const decompBoost =
    input.decompensationPhase === 'crashing' ||
    input.decompensationPhase === 'arrested'
      ? 1.6
      : input.decompensationPhase === 'decompensating'
        ? 1.25
        : input.decompensationPhase === 'compensated'
          ? 1.05
          : 1;

  const bleedDrive = clamp(input.bleedRateMlPerMin / 120, 0, 1);

  const perfusionStress = clamp(
    (1 - hrReserve) * 0.55 + mapDeficit * 0.85 + bleedDrive * 0.9,
    0,
    2.2,
  );
  const feedbackPerfusionStress = input.feedback
    ? (1 - input.feedback.perfusionFactor) * 0.9 +
      input.feedback.hypoxicDrive * 0.65 +
      input.feedback.shockDrive * 0.75
    : 0;

  let dLactate =
    0.012 *
    clamp(perfusionStress + feedbackPerfusionStress, 0, 2.8) *
    (0.35 + infl * 0.65) *
    decompBoost *
    input.pediatricScale;
  dLactate += input.lactateBump;

  if (input.rrPerMin != null && input.rrPerMin > 28) {
    dLactate *= 0.92;
  }

  const lactateMmol = clamp(prev.lactateMmol + dLactate * dtSec, 0.4, 18);

  let bicarbMeqL = prev.bicarbMeqL - dLactate * 0.55 * dtSec;
  bicarbMeqL = clamp(bicarbMeqL, 5, 28);

  const rrAlk =
    input.rrPerMin != null && input.rrPerMin > 22
      ? Math.min(0.04, (input.rrPerMin - 22) * 0.0015)
      : 0;
  const feedbackVentilatoryCompensation = input.feedback
    ? Math.min(0.035, input.feedback.acidemiaDrive * 0.02 + input.feedback.hypercarbicDrive * 0.015)
    : 0;

  let ph =
    7.4 +
    (bicarbMeqL - 24) * 0.012 +
    rrAlk -
    feedbackVentilatoryCompensation -
    (lactateMmol - 1) * 0.018;
  ph = clamp(ph, 6.75, 7.55);

  return {
    lactateMmol,
    bicarbMeqL,
    ph,
  };
}

export type MetabolicSnapshotForAi = {
  lactateMmol: number;
  bicarbMeqL: number;
  ph: number;
};

export function formatMetabolicSnapshotLines(s: MetabolicSnapshotForAi): {
  lactateText: string;
  bicarbText: string;
  phText: string;
} {
  return {
    lactateText: `${s.lactateMmol.toFixed(1)} mmol/L`,
    bicarbText: `${s.bicarbMeqL.toFixed(0)} mEq/L`,
    phText: s.ph.toFixed(2),
  };
}
