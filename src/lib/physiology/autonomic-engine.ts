import { mergeVitalsForDisplay } from '@/lib/physiology/pk-engine';
import type { VitalDeltas } from '@/lib/physiology/pk-types';
import { VITAL_AXES, zeroDeltas } from '@/lib/physiology/pk-types';
import type { PathophysiologyAxes } from '@/lib/physiology/types';
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

  return {
    intravascularVolumeMl: vb,
    volumeBaselineMl: vb,
    currentBleedRateMlPerMin: profile?.baselineBleedRateMlPerMin ?? 0,
    distributiveToneFactor: clamp01(
      profile?.baselineDistributiveToneFactor ?? 1,
    ),
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
    mapBaselineMmHg: profile?.baselineMapMmHg ?? 90,
    cpapActive: false,
    airwaySecured: false,
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
  const symTargetRaw = err * 1.25 + st.baroreflexErrorIntegral * integralGain;
  const symTarget = Math.max(
    -0.35,
    Math.min(1.15, symTargetRaw * axes.baroreceptorSensitivity),
  );

  const tau = 0.22 / Math.max(0.15, axes.adrenergicReserve);
  st.sympatheticDrive +=
    (symTarget - st.sympatheticDrive) * Math.min(1, dtSec / tau);

  const emaxHr = 38;
  const dHr =
    st.sympatheticDrive * emaxHr * clamp01(axes.adrenergicReserve);

  const emaxBp = 28;
  const dBpSys =
    st.sympatheticDrive * emaxBp * clamp01(axes.vascularTone);
  const dBpDia = dBpSys * 0.55;

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

  let dRr = st.oxygenationDriveDeficit * 7;
  st.workOfBreathing +=
    Math.abs(st.oxygenationDriveDeficit) * 0.018 * dtSec;
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

  const step: VitalDeltas = zeroDeltas();
  step.hr = dHr;
  step.sBp = dBpSys + dBpPneu;
  step.dBp = dBpDia + dBpPneu * 0.6;
  step.rr = dRr;
  step.spo2 = dSpo2;

  st.lastIntegratedSimSec = simSec;

  const cumulative = mergeAutonomicWithPkDeltas(cumulativeBefore, step);

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