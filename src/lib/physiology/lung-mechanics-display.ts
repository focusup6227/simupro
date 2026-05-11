/**
 * Display-time composition for the tau-based capnography engine.
 *
 * Layered like the EtCO₂ display pipeline:
 *
 *   defaultLungMechanics()
 *     → resolveLungMechanics(comorbidityIds)    [scenario baseline]
 *     → applyAxesToLungMechanics(axes)          [pathophysiology axes drift]
 *     → overrideFromAiEtco2(finalEtco2MmHg)     [AI / clamp truth]
 *     → applyAiObstructionToLungMechanics(...)  [AI coarse 0..1 lever]
 *     → applyDrugLungMechanicsEffects(concs)    [PK drug deltas]
 *     → applyAutoPeepCoupling(rrBpm)            [air trapping when E < 3·τ]
 *
 * Kept as pure helpers (no React, no store) so the same composition runs in
 * the browser, in vitest, and in any future server-side replay.
 */

import { DEFAULT_EXP_TO_INSP_RATIO } from '@/lib/capno-engine';
import {
  applyAiObstructionToLungMechanics,
  lungTimeConstantSec,
  resolveLungMechanics,
} from '@/lib/physiology/comorbidity-resolve';
import type { DrugId } from '@/lib/physiology/pk-types';
import type { PhysiologyFeedbackSnapshot } from '@/lib/physiology/feedback';
import type {
  LungMechanicsState,
  PathophysiologyAxes,
} from '@/lib/physiology/types';
import { defaultLungMechanics } from '@/lib/physiology/types';

/**
 * Snapshot of the metabolic state used to nudge the displayed respiratory
 * rate upward when the patient is acidotic. Acts as a chemoreflex coupling
 * the metabolic engine to ventilation when `ENABLE_METABOLIC_ENGINE` is on.
 */
export type MetabolicCouplingSnapshot = {
  lactateMmol: number;
  ph: number;
};

/**
 * PK-driven modulation of airway resistance and bronchodilation. Currently
 * only albuterol is wired (β2-agonist); add new drugs by extending this map
 * and the per-drug `EC50` / `maxEffect` rows below.
 *
 * Effects use saturable Emax/EC50 against per-drug plasma concentration
 * (mg/L), exactly like the cardiovascular PD effects in the PK engine, so
 * "20 mcg of albuterol does almost nothing; a 2.5 mg neb produces obvious
 * shark-fin softening" comes out automatically from PK kinetics.
 */
type LungEffect = {
  /** Multiplicative on Ra at full effect (e.g. 0.5 = halve Ra). 1 = no-op. */
  raMultiplierAtMax: number;
  /** Multiplicative on Cs at full effect. 1 = no-op. */
  csMultiplierAtMax: number;
  /** Multiplicative on V/Q slope at full effect. 1 = no-op. */
  slopeVqMultiplierAtMax: number;
  /** Concentration (mg/L) at half-maximum effect. */
  ec50: number;
};

const DRUG_LUNG_EFFECTS: Partial<Record<DrugId, LungEffect>> = {
  albuterol: {
    raMultiplierAtMax: 0.4,
    csMultiplierAtMax: 1.05,
    slopeVqMultiplierAtMax: 0.85,
    ec50: 0.001,
  },
  /**
   * Ketamine has clinically meaningful bronchodilation; modeled as a smaller
   * effect than albuterol since the airway action is secondary to anesthesia.
   */
  ketamine: {
    raMultiplierAtMax: 0.7,
    csMultiplierAtMax: 1.0,
    slopeVqMultiplierAtMax: 1.0,
    ec50: 0.4,
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Apply the active per-drug PK concentrations to a lung-mechanics state.
 * Uses saturable Emax (sat = C / (EC50 + C)) so a partial dose produces a
 * partial effect; a saturating infusion converges to the full multiplier.
 */
export function applyDrugLungMechanicsEffects(
  state: LungMechanicsState,
  concentrations: Partial<Record<DrugId, number>>,
): LungMechanicsState {
  let raMul = 1;
  let csMul = 1;
  let slopeMul = 1;
  for (const [drugIdKey, eff] of Object.entries(DRUG_LUNG_EFFECTS)) {
    if (!eff) continue;
    const C = concentrations[drugIdKey as DrugId] ?? 0;
    if (C <= 0) continue;
    const sat = C / (eff.ec50 + C);
    raMul *= lerp(1, eff.raMultiplierAtMax, sat);
    csMul *= lerp(1, eff.csMultiplierAtMax, sat);
    slopeMul *= lerp(1, eff.slopeVqMultiplierAtMax, sat);
  }
  if (raMul === 1 && csMul === 1 && slopeMul === 1) return state;
  return {
    ...state,
    airwayResistanceCmH2OPerLPerSec:
      state.airwayResistanceCmH2OPerLPerSec * raMul,
    lungComplianceLPerCmH2O: state.lungComplianceLPerCmH2O * csMul,
    vqMismatchSlopeMmHgPerSec: state.vqMismatchSlopeMmHgPerSec * slopeMul,
  };
}

/**
 * Replace `paCO2MmHg` with the post-clamp display EtCO₂ (which already
 * accounts for the autonomic perfusion clamp + assisted-ventilation pull).
 * EtCO₂ tracks PaCO₂ closely in healthy lungs; using the clamped display
 * value here keeps the waveform amplitude and the numeric reading in sync.
 */
function overrideFromAiEtco2(
  state: LungMechanicsState,
  paCO2MmHg: number,
): LungMechanicsState {
  if (!Number.isFinite(paCO2MmHg)) return state;
  return { ...state, paCO2MmHg };
}

/** Gain on `(1 - inflammatoryDrive)` when boosting V/Q slope (mmHg/s). */
const INFLAMMATION_SLOPE_GAIN_MMHG_PER_SEC = 1.0;
/** Gain on `coagulationBalance` deviation from neutral (0.5) when boosting V/Q slope. */
const COAGULATION_SLOPE_GAIN_MMHG_PER_SEC = 0.8;
/** Floor on compliance scaling so a near-zero axis doesn't collapse Cs to clamp. */
const RESPIRATORY_COMPLIANCE_FLOOR = 0.2;

/**
 * Map the abstract pathophysiology axes onto the lung-mechanics state.
 *
 * - `respiratoryCompliance` (0..1) directly scales static compliance, so the
 *   exponential time constant τ = R · C shortens as compliance drops. ARDS
 *   (axis ≈ 0.25) flattens to a sharp-fin morphology even if the comorbidity
 *   matrix entry didn't already include a `csMultiplier`.
 * - `inflammatoryDrive` (0..1, 1 = healthy reserve) inverts to a V/Q-slope
 *   boost: a depleted reserve (sepsis, ARDS) tilts the Phase III plateau up.
 * - `coagulationBalance` (0..1, 0.5 = neutral, &gt;0.5 thrombosis-prone)
 *   contributes to V/Q slope when far from neutral; PE-like dead-space steepens
 *   the plateau even without an explicit lung-mechanics modifier on the
 *   condition.
 *
 * Layered AFTER `resolveLungMechanics` so the comorbidity matrix's explicit
 * `lungMechanics` entries (which already encode the dominant effect) remain
 * the primary driver; axes-driven scaling captures the residual physiology
 * for conditions / runtime drift that don't carry an explicit override.
 */
export function applyAxesToLungMechanics(
  state: LungMechanicsState,
  axes: PathophysiologyAxes,
): LungMechanicsState {
  const respComp = Math.max(
    RESPIRATORY_COMPLIANCE_FLOOR,
    Math.min(1, Number.isFinite(axes.respiratoryCompliance) ? axes.respiratoryCompliance : 1),
  );

  const inflammationActive = Math.max(
    0,
    1 - (Number.isFinite(axes.inflammatoryDrive) ? axes.inflammatoryDrive : 1),
  );

  /**
   * Either direction of coagulation imbalance can disturb perfusion (clot
   * shower → dead space; profound bleed-prone → microvascular thrombi from DIC);
   * we treat both extremes as a slope perturbation, weighted by distance from
   * the 0.5 neutral mid-line.
   */
  const coagBalance = Number.isFinite(axes.coagulationBalance)
    ? axes.coagulationBalance
    : 0.5;
  const coagDisruption = Math.min(1, Math.abs(coagBalance - 0.5) * 2);

  const slopeBoost =
    inflammationActive * INFLAMMATION_SLOPE_GAIN_MMHG_PER_SEC +
    coagDisruption * COAGULATION_SLOPE_GAIN_MMHG_PER_SEC;

  if (respComp === 1 && slopeBoost === 0) return state;

  return clampLungMechanicsLocal({
    ...state,
    lungComplianceLPerCmH2O: state.lungComplianceLPerCmH2O * respComp,
    vqMismatchSlopeMmHgPerSec: state.vqMismatchSlopeMmHgPerSec + slopeBoost,
  });
}

/** Local re-clamp using the same bounds as `clampLungMechanics` (kept inline to avoid a circular import). */
function clampLungMechanicsLocal(s: LungMechanicsState): LungMechanicsState {
  const c = (v: number, lo: number, hi: number) => {
    if (!Number.isFinite(v)) return lo;
    return Math.min(hi, Math.max(lo, v));
  };
  return {
    airwayResistanceCmH2OPerLPerSec: c(s.airwayResistanceCmH2OPerLPerSec, 1, 60),
    lungComplianceLPerCmH2O: c(s.lungComplianceLPerCmH2O, 0.01, 0.2),
    paCO2MmHg: c(s.paCO2MmHg, 8, 80),
    vqMismatchSlopeMmHgPerSec: c(s.vqMismatchSlopeMmHgPerSec, 0, 6),
    deadSpaceFraction: c(s.deadSpaceFraction, 0.2, 0.85),
    baselineCO2MmHg: c(s.baselineCO2MmHg, 0, 20),
    cardiogenicOscAmplitudeMmHg: c(s.cardiogenicOscAmplitudeMmHg, 0, 3),
  };
}

/**
 * Air-trapping ("auto-PEEP") coupling: when the expiratory window is shorter
 * than ~3 time constants, the wave never returns to baseline before the next
 * breath. We translate that into a residual inspired CO₂ so the engine — which
 * already supports a non-zero baseline for rebreathing morphology — renders
 * the textbook tachypneic-asthmatic / Kussmaul-with-bronchospasm shape:
 *
 *   expWindow = (60 / rr) · E / (E + I)
 *   if expWindow &lt; 3 · τ
 *     trappedFrac = clamp01((3·τ − expWindow) / (3·τ))
 *     baselineCO2 ← paCO2 · trappedFrac · 0.35   (saturates around 35% of paCO2)
 *
 * Returns the input unchanged when RR is unknown or there's plenty of time
 * to exhale, so the helper is safe to call unconditionally.
 */
export function applyAutoPeepCoupling(
  state: LungMechanicsState,
  rrBpm: number,
  expToInspRatio: number = DEFAULT_EXP_TO_INSP_RATIO,
): LungMechanicsState {
  if (!Number.isFinite(rrBpm) || rrBpm <= 0) return state;
  const ie = expToInspRatio > 0 ? expToInspRatio : DEFAULT_EXP_TO_INSP_RATIO;
  const period = 60 / Math.max(4, Math.min(60, rrBpm));
  const expWindow = period * (ie / (1 + ie));
  const tau = lungTimeConstantSec(state);
  const threshold = 3 * tau;
  if (expWindow >= threshold) return state;

  const trappedFrac = Math.min(1, Math.max(0, (threshold - expWindow) / threshold));
  const trappedCO2 = state.paCO2MmHg * trappedFrac * 0.35;
  /**
   * Don't downshift an already-elevated baseline (e.g. rebreathing fault); take
   * the larger of the two so a co-incident equipment fault stacks.
   */
  const nextBaseline = Math.max(state.baselineCO2MmHg, trappedCO2);
  if (nextBaseline <= state.baselineCO2MmHg) return state;
  return clampLungMechanicsLocal({
    ...state,
    baselineCO2MmHg: nextBaseline,
  });
}

export function applyFeedbackToLungMechanics(
  state: LungMechanicsState,
  feedback: PhysiologyFeedbackSnapshot | null | undefined,
): LungMechanicsState {
  if (!feedback) return state;
  if (feedback.inflammatoryCoagDrive <= 0 && feedback.hypercarbicDrive <= 0) return state;
  return clampLungMechanicsLocal({
    ...state,
    deadSpaceFraction:
      state.deadSpaceFraction + feedback.inflammatoryCoagDrive * 0.08,
    vqMismatchSlopeMmHgPerSec:
      state.vqMismatchSlopeMmHgPerSec +
      feedback.inflammatoryCoagDrive * 0.55 +
      feedback.hypercarbicDrive * 0.2,
  });
}

/**
 * Metabolic-acidosis chemoreflex coupling: a falling pH or rising lactate
 * drives the central / peripheral chemoreceptors and bumps minute ventilation
 * up. We expose only an additive RR boost (bpm) rather than a fully-fledged
 * acid–base loop, since the metabolic engine is teaching-grade and the
 * autonomic engine already handles oxygenation-driven RR.
 *
 * Soft thresholds:
 *   lactate &gt; 2 mmol/L → 0..6 bpm (linear up to 8 mmol/L)
 *   pH &lt; 7.30 → 0..6 bpm (linear down to 7.10)
 *
 * Returns 0 when the snapshot is undefined or the flag is off; safe to call
 * from any display layer.
 */
export function metabolicRrBoostBpm(
  snapshot: MetabolicCouplingSnapshot | null | undefined,
): number {
  if (!snapshot) return 0;
  const lactate = Number.isFinite(snapshot.lactateMmol) ? snapshot.lactateMmol : 0;
  const ph = Number.isFinite(snapshot.ph) ? snapshot.ph : 7.4;

  const lactateBoost =
    lactate > 2
      ? Math.min(6, ((lactate - 2) / 6) * 6)
      : 0;
  const phBoost = ph < 7.3 ? Math.min(6, ((7.3 - ph) / 0.2) * 6) : 0;

  return lactateBoost + phBoost;
}

/**
 * Compose every layer into the final state the capno engine consumes.
 * `comorbidityIds` may be empty (healthy patient → defaults).
 */
export function composeLungMechanicsForDisplay(args: {
  comorbidityIds: readonly string[];
  finalEtco2MmHg: number;
  aiObstruction: number;
  drugConcentrations: Partial<Record<DrugId, number>>;
  /**
   * Pathophysiology axes resolved from the same comorbidity list. When
   * provided we apply `respiratoryCompliance → Cs` and
   * `(inflammatoryDrive, coagulationBalance) → V/Q slope` on top of the
   * comorbidity matrix's explicit `lungMechanics` entries.
   */
  axes?: PathophysiologyAxes;
  /**
   * Final displayed respiratory rate (bpm). Used by the auto-PEEP coupling to
   * detect air trapping when the expiratory window is shorter than ~3 τ. Pass
   * the assisted-ventilation rate when bagging.
   */
  rrBpm?: number;
  feedback?: PhysiologyFeedbackSnapshot | null;
  /** Optional manual overrides (e.g. scenario scripting / store mutations). */
  overrides?: Partial<LungMechanicsState>;
}): LungMechanicsState {
  const baseline = args.comorbidityIds.length
    ? resolveLungMechanics(args.comorbidityIds)
    : defaultLungMechanics();
  const withAxes = args.axes
    ? applyAxesToLungMechanics(baseline, args.axes)
    : baseline;
  const withEtco2 = overrideFromAiEtco2(withAxes, args.finalEtco2MmHg);
  const withObstruction = applyAiObstructionToLungMechanics(
    withEtco2,
    args.aiObstruction,
  );
  const withDrugs = applyDrugLungMechanicsEffects(
    withObstruction,
    args.drugConcentrations,
  );
  const withFeedback = applyFeedbackToLungMechanics(withDrugs, args.feedback);
  const withAutoPeep =
    args.rrBpm != null
      ? applyAutoPeepCoupling(withFeedback, args.rrBpm)
      : withFeedback;
  return args.overrides ? { ...withAutoPeep, ...args.overrides } : withAutoPeep;
}
