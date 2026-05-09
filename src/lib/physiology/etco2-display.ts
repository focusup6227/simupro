/**
 * Pure functions for the layered EtCO₂ + obstruction display model used by
 * `useMergedPkDisplay`. Kept as plain helpers so they can be unit-tested
 * without React, the physiology store, or the autonomic engine in scope.
 *
 * Layer order (highest "wins last"):
 *   AI baseline → assisted-ventilation pull toward normal → perfusion clamp
 */
import type { DecompensationPhase } from '@/lib/physiology/autonomic-types';
import type { VentilationMode } from '@/stores/physiology-store';

/** Target EtCO₂ for assisted ventilation. ~38 = mid-range "appropriate" alveolar PCO₂. */
export const VENTILATION_NORMAL_TARGET_MMHG = 38;

/**
 * Deterministic perfusion-driven EtCO₂ ceiling. The autonomic engine doesn't
 * emit an EtCO₂ delta directly; instead it defines a phase-conditional
 * **upper bound** we apply on top of whatever baseline value the AI (or
 * scenario seed) has set. Returning `min(baseline, target)` means a patient
 * already showing low EtCO₂ (e.g. AI sets 18 mmHg during CPR) keeps that
 * value, while a patient with a stale 35 mmHg baseline gets clamped down to
 * a clinically realistic number.
 *
 * On ROSC (`pulseless === false` AND phase still latched at `arrested`) the
 * override drops away and the AI baseline takes over, producing the textbook
 * sudden EtCO₂ jump that signals successful resuscitation.
 */
export function forcedEtco2MmHg(
  baselineMmHg: number,
  phase: DecompensationPhase,
  pulseless: boolean,
): number {
  /**
   * ROSC release: the autonomic engine latches `phase === 'arrested'`
   * permanently once accumulated, but successful ROSC flips `isPulseless`
   * to false. Trust the AI baseline in that case so the textbook EtCO₂
   * spike (≥35 mmHg) shows on the monitor instead of staying clamped at
   * the CPR floor.
   */
  if (!pulseless && phase === 'arrested') return baselineMmHg;
  if (pulseless || phase === 'arrested') return Math.min(baselineMmHg, 14);
  if (phase === 'crashing') return Math.min(baselineMmHg, 22);
  if (phase === 'decompensating') return Math.min(baselineMmHg, 28);
  return baselineMmHg;
}

/**
 * Pull the AI baseline EtCO₂ partway toward a normal alveolar value when the
 * rescuer is assisting ventilation. BVM (bag-valve-mask) drives breathing
 * directly, so it gets a strong pull. CPAP only supports the patient's own
 * effort, so it gets a gentler pull. Effects only apply when the patient is
 * perfusing — during CPR the perfusion-driven clamp in {@link forcedEtco2MmHg}
 * wins.
 */
export function ventilationNormalizedEtco2(
  baselineMmHg: number,
  mode: VentilationMode,
): number {
  switch (mode) {
    case 'bvm':
      return baselineMmHg + (VENTILATION_NORMAL_TARGET_MMHG - baselineMmHg) * 0.5;
    case 'cpap':
      return baselineMmHg + (VENTILATION_NORMAL_TARGET_MMHG - baselineMmHg) * 0.25;
    default:
      return baselineMmHg;
  }
}

/**
 * CPAP overcomes a meaningful chunk of bronchospasm; BVM (especially with an
 * advanced airway) pushes around upper-airway resistance enough to soften the
 * shark-fin morphology too. Both effects are partial — true status asthmaticus
 * still shows obstructive shape until bronchodilators take effect.
 */
export function ventilationAdjustedObstruction(
  baselineObstruction: number,
  mode: VentilationMode,
): number {
  switch (mode) {
    case 'cpap':
      return baselineObstruction * 0.5;
    case 'bvm':
      return baselineObstruction * 0.7;
    default:
      return baselineObstruction;
  }
}

/**
 * Apply assisted-ventilation pull then perfusion-driven clamp to the AI
 * baseline EtCO₂, returning the final mmHg value rendered on the monitor.
 */
export function resolveDisplayEtco2MmHg(args: {
  baselineMmHg: number;
  ventilationMode: VentilationMode;
  decompensationPhase: DecompensationPhase;
  pulseless: boolean;
}): number {
  const ventilated = ventilationNormalizedEtco2(args.baselineMmHg, args.ventilationMode);
  return forcedEtco2MmHg(ventilated, args.decompensationPhase, args.pulseless);
}

/** Apply ventilation softening to the AI obstruction value, clamped to [0, 1]. */
export function resolveDisplayObstruction(
  baselineObstruction: number,
  ventilationMode: VentilationMode,
): number {
  return Math.max(
    0,
    Math.min(1, ventilationAdjustedObstruction(baselineObstruction, ventilationMode)),
  );
}
