import { mergeVitalsForDisplay } from '@/lib/physiology/pk-engine';
import type { VitalDeltas } from '@/lib/physiology/pk-types';
import { VITAL_AXES, zeroDeltas } from '@/lib/physiology/pk-types';
import type { PathophysiologyAxes } from '@/lib/physiology/types';
import type { PhysiologyFeedbackSnapshot } from '@/lib/physiology/feedback';
import type {
  AutonomicEvent,
  AutonomicProfile,
  AutonomicState,
  DecompensationPhase,
  TickAutonomicResult,
} from '@/lib/physiology/autonomic-types';

const NUMERIC_RE = /(-?\d+(?:\.\d+)?)/;
const BP_RE = /(\d{2,3})\s*\/\s*(\d{2,3})/;

function parseLeadingNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = String(s).match(NUMERIC_RE);
  if (!m) return null;
  const n = Number.parseFloat(m[1]!);
  return Number.isFinite(n) ? n : null;
}

function parseMapFromBp(bp: string): number | null {
  const m = bp.match(BP_RE);
  if (!m) return null;
  const sys = Number.parseInt(m[1]!, 10);
  const dia = Number.parseInt(m[2]!, 10);
  if (!Number.isFinite(sys) || !Number.isFinite(dia)) return null;
  return dia + (sys - dia) / 3;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function mergeAutonomicWithPkDeltas(
  a: VitalDeltas,
  b: VitalDeltas,
): VitalDeltas {
  const out = zeroDeltas();
  for (const k of VITAL_AXES) {
    out[k] = (a[k] ?? 0) + (b[k] ?? 0);
  }
  return out;
}

export function defaultAutonomicState(
  profile: AutonomicProfile | undefined,
  weightKg: number,
): AutonomicState {
  const w = weightKg > 0 ? weightKg : 75;
  const volumeBaseline = profile?.initialVolumeMl ?? 70 * w;
  const vb = volumeBaseline > 0 ? volumeBaseline : 70 * w;
  const initialTone = clamp01(profile?.baselineDistributiveToneFactor ?? 1);
  const mapBaseline = profile?.baselineMapMmHg ?? 90;
  // Intrinsic MAP at t=0 (volRatio = 1): mapBaseline · tonePart(initialTone).
  // Used as the disturbance reference so displayed BP is unperturbed at start.
  const intrinsicMapBaseline = mapBaseline * (0.25 + 0.75 * initialTone);

  return {
    intravascularVolumeMl: vb,
    volumeBaselineMl: vb,
    currentBleedRateMlPerMin: profile?.baselineBleedRateMlPerMin ?? 0,
    distributiveToneFactor: initialTone,
    sympatheticDrive: 0,
    baroreflexErrorIntegral: 0,
    workOfBreathing: 0,
    oxygenationDriveDeficit: 0,
    supplementalO2Boost: 0,
    pulmonaryEdemaSeverity: clamp01(
      profile?.initialPulmonaryEdemaSeverity ?? 0,
    ),
    tensionPneumoSeverity: clamp01(
      profile?.initialTensionPneumoSeverity ?? 0,
    ),
    decompensationPhase:
      profile?.initialDecompensationPhase ?? 'baseline',
    lastIntegratedSimSec: -1,
    crashingSecondsAccumulated: 0,
    fluidBolusActiveUntilSimSec: -1,
    mapBaselineMmHg: mapBaseline,
    cpapActive: false,
    airwaySecured: false,
    intrinsicMapBaselineMmHg: intrinsicMapBaseline,
    baroBpActuatorSysMmHg: 0,
    bpDisturbancePrevSysMmHg: 0,
    bpDisturbancePrevDiaMmHg: 0,
  };
}

function copyState(st: AutonomicState): AutonomicState {
  return { ...st };
}

export function applyAutonomicEventsToState(
  state: AutonomicState,
  events: readonly AutonomicEvent[],
  simSec: number,
): AutonomicState {
  const st = copyState(state);
  for (const ev of events) {
    if (ev.simSeconds !== simSec) continue;
    const p = ev.payload ?? {};
    switch (ev.kind) {
      case 'fluid_bolus': {
        const ml = Number(p.volumeMl);
        if (Number.isFinite(ml) && ml > 0) {
          st.intravascularVolumeMl += ml;
          st.fluidBolusActiveUntilSimSec = simSec + 120;
        }
        break;
      }
      case 'bleed_rate_set': {
        const r = Number(p.rateMlPerMin);
        if (Number.isFinite(r) && r >= 0) {
          st.currentBleedRateMlPerMin = r;
        }
        break;
      }
      case 'bleed_rate_change': {
        const d = Number(p.deltaMlPerMin);
        if (Number.isFinite(d)) {
          st.currentBleedRateMlPerMin = Math.max(
            0,
            st.currentBleedRateMlPerMin + d,
          );
        }
        break;
      }
      case 'distributive_tone_set': {
        const f = Number(p.factor);
        if (Number.isFinite(f)) {
          st.distributiveToneFactor = Math.max(0.1, Math.min(1, f));
        }
        break;
      }
      case 'oxygen_change': {
        const lpm = Number(p.lpm);
        if (Number.isFinite(lpm) && lpm >= 0) {
          st.supplementalO2Boost = Math.min(1, lpm / 15);
        }
        break;
      }
      case 'tension_pneumo_resolve':
        st.tensionPneumoSeverity = 0;
        break;
      case 'tension_pneumo_start': {
        const s = Number(p.severity);
        if (Number.isFinite(s)) {
          st.tensionPneumoSeverity = clamp01(s);
        } else {
          st.tensionPneumoSeverity = Math.min(1, st.tensionPneumoSeverity + 0.35);
        }
        break;
      }
      case 'cpap_started':
        st.cpapActive = true;
        st.workOfBreathing = Math.max(0, st.workOfBreathing - 0.15);
        break;
      case 'airway_secured':
        st.airwaySecured = true;
        st.supplementalO2Boost = Math.min(1, st.supplementalO2Boost + 0.25);
        st.workOfBreathing = Math.max(0, st.workOfBreathing - 0.1);
        break;
      case 'ai_stressor': {
        const subtype = String(p.subtype ?? p.aiKind ?? '');
        if (subtype === 'rebleed' || subtype === 'hemorrhage_worsening') {
          st.currentBleedRateMlPerMin = Math.min(
            250,
            st.currentBleedRateMlPerMin + Number(p.addMlPerMin ?? 20),
          );
        } else if (subtype === 'sepsis_worsening') {
          st.distributiveToneFactor = Math.max(
            0.15,
            st.distributiveToneFactor - Number(p.toneDrop ?? 0.15),
          );
        } else if (subtype === 'bronchospasm') {
          st.workOfBreathing = Math.min(1, st.workOfBreathing + 0.2);
        }
        break;
      }
      default:
        break;
    }
  }
  return st;
}

function updateDecompPhase(
  phase: DecompensationPhase,
  mapObs: number | null,
  spo2Obs: number | null,
  sympatheticDrive: number,
  axes: PathophysiologyAxes,
): DecompensationPhase {
  const inflammatory = clamp01(axes.inflammatoryDrive ?? 0);
  let next: DecompensationPhase = phase;
  if (phase === 'arrested') return 'arrested';

  const hypo =
    mapObs != null &&
    mapObs < 65 + 10 * clamp01(axes.hemodynamicReserve);
  const hypox = spo2Obs != null && spo2Obs < 88;

  if (hypo || hypox) {
    if (phase === 'baseline') next = 'compensated';
    else if (phase === 'compensated') next = 'decompensating';
    else if (phase === 'decompensating') next = 'crashing';
  } else if (!hypo && !hypox && sympatheticDrive < 0.25) {
    if (phase === 'compensated' && !inflammatory) next = 'baseline';
    else if (phase === 'decompensating' && inflammatory < 0.35) {
      next = 'compensated';
    }
  }
  if (inflammatory > 0.55) {
    if (next === 'baseline' || next === 'compensated') {
      next = 'decompensating';
    }
  }
  return next;
}

/**
 * One 1 Hz integration step. `observedMergedPrev` is the displayed vitals after
 * PK + autonomic layers **before** this tick (baroreflex input).
 */
export function tickAutonomic(
  state: AutonomicState,
  dtSec: number,
  axes: PathophysiologyAxes,
  observedMergedPrev: {
    hr: string;
    bp: string;
    rr: string;
    spo2: string;
    gcs: string;
  },
  eventsAtSecond: readonly AutonomicEvent[],
  simSec: number,
  cumulativeBefore: VitalDeltas,
  feedback?: PhysiologyFeedbackSnapshot | null,
): TickAutonomicResult {
  let st: AutonomicState = applyAutonomicEventsToState(
    state,
    eventsAtSecond,
    simSec,
  );

  const lossPerSec = st.currentBleedRateMlPerMin / 60;
  st.intravascularVolumeMl = Math.max(0, st.intravascularVolumeMl - lossPerSec * dtSec);

  const volRatio =
    st.volumeBaselineMl > 0
      ? st.intravascularVolumeMl / st.volumeBaselineMl
      : 1;
  const tonePart = 0.25 + 0.75 * st.distributiveToneFactor;
  const mapEst = st.mapBaselineMmHg * volRatio * tonePart;

  const MAP_obs = parseMapFromBp(observedMergedPrev.bp);
  const SpO2_obs = parseLeadingNumber(observedMergedPrev.spo2);

  const MAP_forReflex = Number.isFinite(MAP_obs as number) ? MAP_obs! : mapEst;

  const mapTarget = 85;
  const err =
    MAP_forReflex > 0 ? (mapTarget - MAP_forReflex) / Math.max(40, mapTarget) : 0;
  st.baroreflexErrorIntegral += err * dtSec * 0.08;
  const integralGain =
    0.06 * Math.max(0.15, axes.baroreceptorSensitivity);
  const feedbackSympathetic =
    feedback && axes.adrenergicReserve > 0.15
      ? feedback.hypoxicDrive * 0.16 +
        feedback.hypercarbicDrive * 0.1 +
        feedback.acidemiaDrive * 0.08
      : 0;
  const symTargetRaw =
    (err * 1.25 + st.baroreflexErrorIntegral * integralGain + feedbackSympathetic) *
    (feedback?.sympatheticAmplifier ?? 1);
  const symTarget = Math.max(
    -0.35,
    Math.min(1.15, symTargetRaw * axes.baroreceptorSensitivity),
  );

  const tau = 0.22 / Math.max(0.15, axes.adrenergicReserve);
  st.sympatheticDrive +=
    (symTarget - st.sympatheticDrive) * Math.min(1, dtSec / tau);

  // Shock demand: how hard the autonomic system is working to defend MAP. It
  // persists through compensated shock (unlike the residual baroreflex error,
  // which the integral actuator drives toward ~0), so HR and RR stay elevated
  // while the patient is bleeding. Two contributions, both in MAP mmHg:
  //   • mapDeficit — the volume/tone MAP the body is actively offsetting
  //     (mapEst below its t=0 intrinsic baseline; grows as the patient bleeds).
  //   • residualHypotension — uncompensated shortfall still at the bezel (an
  //     AI-set low baseline, or a saturated/blunted reflex).
  // Small deadband so trivial losses (ATLS Class I) don't bump the rate.
  const mapDeficit = Math.max(0, st.intrinsicMapBaselineMmHg - mapEst);
  const residualHypotension = Math.max(0, mapTarget - MAP_forReflex);
  const shockDemand = clamp01((mapDeficit + residualHypotension * 1.3 - 4) / 45);

  // A blunted/withdrawn reflex (chronic HTN, β-blockade, low adrenergic
  // reserve) mounts less tachycardia for the same shock.
  const reflexGain =
    clamp01(axes.adrenergicReserve) *
    Math.max(0.3, clamp01(axes.baroreceptorSensitivity));

  // HR tracks sympathetic *engagement* (shock demand) so sustained
  // vasoconstriction = sustained tachycardia, plus a small instantaneous-drive
  // term so drug/feedback effects still register.
  const MAX_HR_RISE_BPM = 62;
  const emaxHr = 38;
  const dHr =
    (shockDemand * MAX_HR_RISE_BPM + st.sympatheticDrive * emaxHr * 0.15) *
    reflexGain;

  const emaxBp = 28;
  const effectiveVascularTone = clamp01(axes.vascularTone) * (1 - (feedback?.vasoplegiaPenalty ?? 0));
  const dBpSys =
    st.sympatheticDrive * emaxBp * Math.max(0.1, effectiveVascularTone);

  let spo2ForChem = SpO2_obs ?? 94;
  const hypoxicErr = (92 - spo2ForChem) / 14;
  st.oxygenationDriveDeficit = Math.max(
    -0.4,
    Math.min(1, hypoxicErr * clamp01(axes.oxygenAffinity)),
  );
  st.oxygenationDriveDeficit *=
    1 - clamp01(st.supplementalO2Boost) * 0.55;
  if (st.airwaySecured) {
    st.oxygenationDriveDeficit *= 0.65;
  }

  // Tachypnea of shock (sympathetic / hypoperfusion driven — precedes the
  // metabolic acidosis the chemoreflex would catch) plus the existing
  // chemoreflex (hypoxia / CO₂ / acidemia).
  const MAX_RR_RISE_SHOCK = 16;
  // Only a hypoxic deficit drives RR up; a well-oxygenated patient (SpO₂ > 92,
  // where oxygenationDriveDeficit goes negative) must not get a hyperoxic
  // *bradypnea* that cancels the shock/chemoreflex tachypnea. (The signed
  // deficit is still used by workOfBreathing.)
  let dRr =
    shockDemand * MAX_RR_RISE_SHOCK +
    Math.max(0, st.oxygenationDriveDeficit) * 7 +
    (feedback?.hypercarbicDrive ?? 0) * 5 +
    (feedback?.acidemiaDrive ?? 0) * 6;
  // Only a *hypoxic* deficit (positive) builds work of breathing; a
  // well-oxygenated patient (negative deficit) must not accumulate fatigue via
  // Math.abs and silently trip the RR-damping fatigue threshold below.
  st.workOfBreathing +=
    (Math.max(0, st.oxygenationDriveDeficit) +
      (feedback?.hypercarbicDrive ?? 0) * 0.6 +
      (feedback?.acidemiaDrive ?? 0) * 0.4) *
    0.018 *
    dtSec;
  if (st.cpapActive) {
    st.workOfBreathing = Math.max(0, st.workOfBreathing - 0.012 * dtSec);
    dRr -= 1.5;
  }
  if (st.workOfBreathing > 0.85) {
    dRr *= 0.45;
  }

  if (
    simSec <= st.fluidBolusActiveUntilSimSec &&
    st.intravascularVolumeMl >
      st.volumeBaselineMl * (0.72 + 0.28 * clamp01(axes.hemodynamicReserve))
  ) {
    const excess =
      (st.intravascularVolumeMl - st.volumeBaselineMl) /
      Math.max(1, st.volumeBaselineMl);
    const rate =
      0.014 *
      (excess / Math.max(0.12, clamp01(axes.hemodynamicReserve))) *
      (0.4 + st.pulmonaryEdemaSeverity);
    st.pulmonaryEdemaSeverity = clamp01(st.pulmonaryEdemaSeverity + rate * dtSec);
  }

  let dSpo2 = 0;
  if (st.pulmonaryEdemaSeverity >= 0.22) {
    dSpo2 -= 18 * st.pulmonaryEdemaSeverity;
  }
  if (st.pulmonaryEdemaSeverity >= 0.55) {
    dRr += 5;
  }

  const pneu = st.tensionPneumoSeverity;
  const dBpPneu = pneu > 0 ? -22 * pneu : 0;
  dSpo2 -= 12 * pneu;

  st.decompensationPhase = updateDecompPhase(
    st.decompensationPhase,
    MAP_obs,
    spo2ForChem,
    st.sympatheticDrive,
    axes,
  );

  const crashingThresh = 38 + 5 * clamp01(axes.hemodynamicReserve);
  if (
    st.decompensationPhase === 'crashing' &&
    MAP_obs != null &&
    MAP_obs < crashingThresh
  ) {
    st.crashingSecondsAccumulated += dtSec;
  } else {
    st.crashingSecondsAccumulated = Math.max(
      0,
      st.crashingSecondsAccumulated - dtSec * 0.5,
    );
  }
  if (st.crashingSecondsAccumulated >= 28) {
    st.decompensationPhase = 'arrested';
  }

  /**
   * `dHr` and `dRr` are steady-state *offset levels* — where HR / RR should sit
   * given the current sympathetic / chemoreflex state — not per-second
   * increments. Summing a level integrates it without bound whenever the axis
   * has no restoring loop of its own, which is precisely the failure mode that
   * produced RR 800 and HR 800+ in vasoplegic shock. Instead we relax the
   * accumulated offset toward the target with a first-order lag. The time
   * constants come from the BioGears baroreflex model: HR responds fast
   * (sympathetic τ≈2 s) while the chemoreflex RR arm is slower (~8 s).
   *
   * BP is the *controlled* variable, so it's modeled as a capped integral
   * actuator plus a disturbance level:
   *   • The baroreflex actuator (summed dBpSys) is clamped to a physiologic
   *     compensation ceiling — vasoconstriction/inotropy can only support so
   *     much pressure, so the reflex can no longer restore an arbitrarily low
   *     pressure to target (which is why blood loss never used to reach the
   *     monitor).
   *   • The volume/tone/pneumo *disturbance* is applied as a level (referenced
   *     to its t=0 value, via a telescoping increment so cumulative.sBp =
   *     clamped-actuator + current-disturbance). `mapEst` falls as the patient
   *     bleeds (volRatio↓) or vasodilates (tonePart↓); because the reflex reads
   *     the resulting observed BP, it keeps firing while the patient bleeds, so
   *     tachycardia is sustained and BP genuinely drops once compensation maxes
   *     out. The tension-pneumo term joins this level (it was previously summed
   *     — the same unbounded-integral bug).
   * SpO₂ is likewise a disturbance level (edema/pneumo shunt) and relaxes toward
   * its target rather than summing, so it can't integrate to the 0 floor and
   * recovers when the cause resolves.
   */
  // Time constants are sourced from the BioGears baroreflex model
  // (libBiogears Nervous.cpp): the lags are physiologic and transfer across
  // model architectures. (The engine's effector *gains* are normalized to its
  // multi-compartment circuit and do NOT map onto this lumped-MAP model, so the
  // offset magnitudes below — MAX_HR_RISE_BPM, MAX_RR_RISE_SHOCK, the actuator
  // ceiling — are calibrated to the ATLS hemorrhage-class endpoints instead.)
  const HR_RELAX_TAU_SEC = 2; // BioGears tauHRSympathetic = 2.0 s
  const RR_RELAX_TAU_SEC = 8; // peripheral chemoreflex ventilation lag (no baroreflex analog)
  const SPO2_RELAX_TAU_SEC = 20; // matches BioGears tauVolume = 20.0 s
  const hrAlpha = Math.min(1, dtSec / HR_RELAX_TAU_SEC);
  const rrAlpha = Math.min(1, dtSec / RR_RELAX_TAU_SEC);
  const spo2Alpha = Math.min(1, dtSec / SPO2_RELAX_TAU_SEC);

  // Baroreflex BP actuator, carried in MAP mmHg of pressure support. Capped at
  // the physiologic compensation ceiling — vasoconstriction/inotropy can only
  // defend so much pressure (~18 MAP, the reflex-saturation analog of Pulse's
  // hemorrhage benchmark); once saturated, further disturbance drops BP for
  // real, which is the ATLS compensated→decompensated transition.
  const BARO_ACTUATOR_MAP_MAX = 18;
  const BARO_ACTUATOR_MAP_MIN = -10;
  // Vasoplegia / poor adrenergic reserve lowers the *achievable* compensation
  // ceiling — a septic patient who can't vasoconstrict can't integrate his way
  // back to a normal pressure no matter how long the reflex fires. Scaling the
  // cap by effective vascular tone keeps that BP penalty (otherwise the integral
  // reaches the same ceiling for everyone, just slower).
  const actuatorCeiling =
    BARO_ACTUATOR_MAP_MAX * Math.max(0.2, effectiveVascularTone);
  const actuatorBefore = st.baroBpActuatorSysMmHg;
  st.baroBpActuatorSysMmHg = Math.max(
    BARO_ACTUATOR_MAP_MIN,
    Math.min(actuatorCeiling, actuatorBefore + dBpSys),
  );
  const actuatorDelta = st.baroBpActuatorSysMmHg - actuatorBefore;

  // Pulse-pressure physiology, both MAP-preserving ((sys + 2·dia)/3 = ΔMAP):
  //   • Volume loss drops stroke volume → systolic falls more than diastolic
  //     (disturbance sys 1.3×, dia 0.85×).
  //   • Vasoconstriction raises diastolic more than systolic (actuator sys
  //     0.7×, dia 1.15×).
  // Both narrow pulse pressure — the ATLS Class II hallmark — without distorting
  // the MAP the reflex regulates. Tension pneumo adds an obstructive level.
  const mapDisturbance = mapEst - st.intrinsicMapBaselineMmHg; // ≤0 when hypovolemic/vasodilated
  const sysDisturbance = mapDisturbance * 1.3 + dBpPneu;
  const diaDisturbance = mapDisturbance * 0.85 + dBpPneu * 0.6;

  const step: VitalDeltas = zeroDeltas();
  step.hr = (dHr - cumulativeBefore.hr) * hrAlpha;
  step.rr = (dRr - cumulativeBefore.rr) * rrAlpha;
  // Telescoping: actuator increment + disturbance increment → cumulative.sBp
  // converges to (clamped actuator + current disturbance).
  step.sBp =
    actuatorDelta * 0.7 + (sysDisturbance - st.bpDisturbancePrevSysMmHg);
  step.dBp =
    actuatorDelta * 1.15 + (diaDisturbance - st.bpDisturbancePrevDiaMmHg);
  // SpO₂ is a disturbance *level* too (dSpo2 = current edema/pneumo offset, not
  // a per-tick increment). Relax toward it rather than summing, so it can't
  // integrate to the 0 floor and — crucially — recovers when the cause resolves
  // (e.g. a decompressed pneumothorax). The 20 s lag models how desaturation
  // and re-saturation track changing shunt rather than snapping instantly.
  step.spo2 = (dSpo2 - cumulativeBefore.spo2) * spo2Alpha;
  st.bpDisturbancePrevSysMmHg = sysDisturbance;
  st.bpDisturbancePrevDiaMmHg = diaDisturbance;

  st.lastIntegratedSimSec = simSec;

  const cumulative = mergeAutonomicWithPkDeltas(cumulativeBefore, step);

  // Backstop only: the relaxation above already bounds the HR/RR offsets to
  // their (clamped) target levels. These guard against pathological inputs and
  // keep an impossible value off the bezel even if a future change reintroduces
  // an unbounded term. They should never bind in normal operation.
  cumulative.rr = Math.max(-10, Math.min(45, cumulative.rr));
  cumulative.hr = Math.max(-50, Math.min(150, cumulative.hr));

  return {
    state: st,
    deltasForStep: step,
    cumulativeDeltas: cumulative,
  };
}

export type ReplayAutonomicAtResult = {
  state: AutonomicState;
  cumulativeDeltas: VitalDeltas;
  decompensationPhase: DecompensationPhase;
};

/**
 * Deterministic replay through simulation second `throughSimSec` **inclusive**,
 * matching the same sim timeline as `effectDeltasAt(..., simSeconds, ...)` for PK.
 * Events must be sorted by `simSeconds`.
 */
export function replayAutonomicAt(
  events: readonly AutonomicEvent[],
  throughSimSec: number,
  axes: PathophysiologyAxes,
  weightKg: number,
  profile: AutonomicProfile | undefined,
  baselineVitals: {
    hr: string;
    bp: string;
    rr: string;
    spo2: string;
    gcs: string;
  },
  getPkDeltasAt: (simSec: number) => VitalDeltas,
  feedback?: PhysiologyFeedbackSnapshot | null,
): ReplayAutonomicAtResult {
  let state = defaultAutonomicState(profile, weightKg);
  let cumulative = zeroDeltas();

  if (throughSimSec < 0) {
    return {
      state,
      cumulativeDeltas: cumulative,
      decompensationPhase: state.decompensationPhase,
    };
  }

  for (let sec = 0; sec <= throughSimSec; sec++) {
    const pkD = getPkDeltasAt(sec);
    const pkMerged = mergeVitalsForDisplay(baselineVitals, pkD);
    const observed = mergeVitalsForDisplay(pkMerged, cumulative);
    const evs = events.filter((e) => e.simSeconds === sec);
    const res = tickAutonomic(
      state,
      1,
      axes,
      observed,
      evs,
      sec,
      cumulative,
      feedback,
    );
    state = res.state;
    cumulative = res.cumulativeDeltas;
  }

  return {
    state,
    cumulativeDeltas: cumulative,
    decompensationPhase: state.decompensationPhase,
  };
}