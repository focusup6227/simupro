/**
 * Stylised ECG voltage sampling, per rhythm kind.
 *
 * Each P / QRS / ST / T / specialty wave is modelled as one or more time
 * envelopes (Gaussians in normalised beat phase) carrying a fixed direction
 * in Frank XYZ. The renderer sums those into a single dipole vector V(u) and
 * projects onto each surface lead via a Dower-class linear map (see
 * `ecg-lead-projection.ts`). This keeps cross-lead morphology geometrically
 * consistent and lets ACS injury, U waves, J waves, etc. share the same
 * pipeline.
 *
 *   sampleLeadVoltageContext(xPx, tileW, ctx, leadIdx)
 *     └── RHYTHM_RENDERERS[ctx.kind].sample(xPx, tileW, ctx, leadIdx)
 *             └── beatWithLeadMorphology / wideQrsBeat / sawtoothFlutter / …
 *                 (build XYZ vector → projectXyzToLead)
 *     └── applyCtxOverlays  (ACS injury vector, T/Q multipliers, U, delta,
 *                           Osborn, paced spike — all projected through the
 *                           same matrix)
 *     └── overlays: CPR artifact, respiratory wander, motion noise, amplitude
 *
 * Voltage is unitless but tuned so that ~10 maps to 1 mm on the strip when
 * `vScale` in the renderer is 0.5–0.6. Output is centred on 0; callers project
 * onto an isoelectric baseline (positive = up).
 */

import {
  RHYTHM_FAMILY,
  type EcgRhythmFamily,
  type EcgRhythmKind,
} from '@/lib/ecg-rhythm';
import type { EcgScenarioContext } from '@/lib/ecg-scenario';
import {
  DISPLAY_LEADS,
  ECG_LARGE_SQ_MS,
  ECG_MS_PER_PIXEL,
  ECG_SMALL_SQ_MS,
  type DisplayLeadName,
} from '@/lib/ecg-waveform-constants';
import { projectXyzToLead, type Vec3 } from '@/lib/ecg-lead-projection';

export {
  DISPLAY_LEADS,
  ECG_LARGE_SQ_MS,
  ECG_MS_PER_PIXEL,
  ECG_SMALL_SQ_MS,
  type DisplayLeadName,
};

const PEA_PERIOD_MS = 920;
const CPR_COMPRESSION_PERIOD_MS = 545; // ~110/min

// ---------------------------------------------------------------------------
// Dipole vector morphology
// ---------------------------------------------------------------------------
//
// Every wave (P, QRS, ST, T, plus arrhythmic specials) is modelled as a small
// set of time-localised Gaussian envelopes, each with its own normalised
// direction in Frank XYZ. The renderer projects a single 3D dipole vector V(u)
// onto each lead via the matrix in `ecg-lead-projection.ts`. Magnitudes below
// were calibrated against the previous per-lead Gaussian sums so the visual
// scale is preserved.

const P_DIR: Vec3        = [ 0.40,  0.30,  0.00];
const QRS1_DIR: Vec3     = [-0.30,  0.05, -0.40]; // early septal: rightward, anterior
const QRS2_DIR: Vec3     = [ 0.70,  0.50,  0.30]; // peak: leftward, inferior, posterior
const QRS3_DIR: Vec3     = [ 0.15, -0.15,  0.20]; // terminal: small return
const T_DIR: Vec3        = [ 0.50,  0.40,  0.20]; // T concordant with main QRS
const ST_DIR: Vec3       = [ 0.50,  0.40,  0.20]; // tiny baseline ST gradient
const FLUTTER_DIR: Vec3  = [ 0.00, -0.60,  0.00]; // atrial flutter circuit (negative in inferior leads)

const QRS_NARROW_AMPS = { g1: 26, g2: 122, g3: 28 } as const;
const QRS_WIDE_AMPS   = { g1: 22, g2: 110, g3: 32 } as const;
const T_AMP_NARROW    = 40;
const T_AMP_WIDE      = 36;
const P_AMP           = 22;
const ST_BASELINE     = 6;

function vAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function vScale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}
function project(v: Vec3, leadIdx: number): number {
  return projectXyzToLead(v, leadIdx);
}

// ---------------------------------------------------------------------------
// Primitive waveform components (all centred around y=0)
// ---------------------------------------------------------------------------

function gauss(u: number, mean: number, sigma: number, amp: number): number {
  const z = (u - mean) / sigma;
  return amp * Math.exp(-z * z);
}

/** Time envelope for the P-wave bump (centred on `0.06 + prShift`). */
function pEnvelope(u: number, prShift = 0): number {
  return gauss(u, 0.06 + prShift, 0.022, 1);
}

/**
 * Three-component QRS envelope (early septal, peak, terminal). Returns the
 * scalar Gaussian weights; the caller multiplies by direction × amplitude.
 */
function qrsEnvelopes(u: number, wideQrs: boolean, qrsCenter = 0.195) {
  const w = wideQrs ? 0.022 : 0.009;
  return {
    g1: gauss(u, qrsCenter - w * 2.2, w * 0.85, 1),
    g2: gauss(u, qrsCenter, w * (wideQrs ? 1.35 : 1), 1),
    g3: gauss(u, qrsCenter + w * 2.4, w * 1.05, 1),
  };
}

/** ST segment Gaussian (small baseline trough between QRS and T). */
function stEnvelope(u: number, wideQrs: boolean): number {
  return gauss(u, 0.285, 0.025, wideQrs ? -1.5 : -1);
}

/** T-wave envelope (main lobe + tiny U-shoulder). */
function tEnvelope(u: number, _wideQrs: boolean): number {
  return gauss(u, 0.42, 0.055, 1) + gauss(u, 0.58, 0.04, 0.16);
}

/**
 * Builds the dipole vector V(u) for a normal P-QRS-ST-T beat in XYZ,
 * then projects onto the requested lead. Replaces the per-lead Gaussian
 * approach so all 12 leads stay geometrically consistent.
 */
function beatWithLeadMorphology(
  u: number,
  wideQrs: boolean,
  leadIdx: number,
  opts: { withP?: boolean; pInverted?: boolean; prShift?: number; pGainMult?: number } = {},
): number {
  const { withP = true, pInverted = false, prShift = 0, pGainMult = 1 } = opts;
  const amps = wideQrs ? QRS_WIDE_AMPS : QRS_NARROW_AMPS;
  const tAmp = wideQrs ? T_AMP_WIDE : T_AMP_NARROW;

  let v: Vec3 = [0, 0, 0];

  if (withP) {
    const env = pEnvelope(u, prShift) * P_AMP * pGainMult;
    v = vAdd(v, vScale(P_DIR, pInverted ? -env * 0.7 : env));
  }

  const q = qrsEnvelopes(u, wideQrs);
  v = vAdd(v, vScale(QRS1_DIR, q.g1 * amps.g1));
  v = vAdd(v, vScale(QRS2_DIR, q.g2 * amps.g2));
  v = vAdd(v, vScale(QRS3_DIR, q.g3 * amps.g3));

  v = vAdd(v, vScale(ST_DIR, stEnvelope(u, wideQrs) * ST_BASELINE));
  v = vAdd(v, vScale(T_DIR,  tEnvelope(u, wideQrs) * tAmp));

  return project(v, leadIdx);
}

// ---------------------------------------------------------------------------
// Family-specific primitives
// ---------------------------------------------------------------------------

/**
 * Sawtooth flutter waves (~300/min). `phase` is 0..1 over a single F-wave.
 * The flutter circuit's atrial activation points superiorly (−Y), which the
 * Dower projection turns into the classical inverted sawtooth in II/III/aVF
 * and a smaller upright deflection in aVR.
 */
function sawtoothFlutter(phase: number, leadIdx: number): number {
  const rise = phase < 0.7 ? phase / 0.7 : 1 - (phase - 0.7) / 0.3;
  const env = (rise * 2 - 1) * 10;
  return project(vScale(FLUTTER_DIR, env), leadIdx);
}

/** Sharp narrow pacing spike at the given beat-phase position (lead-agnostic). */
function pacingSpike(u: number, position: number): number {
  return gauss(u, position, 0.0015, 70);
}

const WIDE_QRS_DIR_1: Vec3 = [-0.20,  0.10, -0.30]; // initial small opposite swing
const WIDE_QRS_DIR_2: Vec3 = [ 0.30,  0.55,  0.55]; // dominant left/inferior/posterior
const WIDE_QRS_DIR_3: Vec3 = [-0.20, -0.20,  0.10]; // terminal slur
const WIDE_T_DIR: Vec3     = [-0.40, -0.30, -0.25]; // discordant T (opposite QRS)

/** Wide-QRS escape beat (idioventricular / AIVR / pulseless VT base). */
function wideQrsBeat(u: number, leadIdx: number, polarity: 1 | -1 = 1): number {
  const c = 0.22;
  const w = 0.024;
  const e1 = gauss(u, c - w * 2.4, w * 1.0, 1);
  const e2 = gauss(u, c, w * 1.9, 1);
  const e3 = gauss(u, c + w * 3.4, w * 1.7, 1);
  const eT = gauss(u, 0.5, 0.06, 1);

  let v: Vec3 = [0, 0, 0];
  v = vAdd(v, vScale(WIDE_QRS_DIR_1, e1 * 22 * polarity));
  v = vAdd(v, vScale(WIDE_QRS_DIR_2, e2 * 110 * polarity));
  v = vAdd(v, vScale(WIDE_QRS_DIR_3, e3 * 28 * polarity));
  v = vAdd(v, vScale(WIDE_T_DIR, eT * 26));
  return project(v, leadIdx);
}

const AGONAL_DIR_PRE:  Vec3 = [-0.15,  0.10, -0.10];
const AGONAL_DIR_MAIN: Vec3 = [ 0.30,  0.45,  0.35];
const AGONAL_DIR_POST: Vec3 = [-0.10, -0.10,  0.10];

/** Slow, wide, dying complex used for agonal rhythms. */
function agonalBeat(u: number, leadIdx: number): number {
  const c = 0.32;
  const w = 0.05;
  const e1 = gauss(u, c - w * 1.5, w, 1);
  const e2 = gauss(u, c, w * 1.2, 1);
  const e3 = gauss(u, c + w * 1.8, w * 1.3, 1);

  let v: Vec3 = [0, 0, 0];
  v = vAdd(v, vScale(AGONAL_DIR_PRE,  e1 * 14));
  v = vAdd(v, vScale(AGONAL_DIR_MAIN, e2 * 38));
  v = vAdd(v, vScale(AGONAL_DIR_POST, e3 * 12));
  return project(v, leadIdx) * 0.6;
}

/** Periodic VF chaos. */
function vfVoltagePeriodic(phase: number, leadIdx: number): number {
  const t = phase * Math.PI * 2 + leadIdx * 0.93;
  return (
    Math.sin(t * 5.11 + 1.08) * 38 +
    Math.sin(t * 13.97 + 1.9) * 41 +
    Math.sin(t * 27.61 + 0.51) * 34 +
    Math.sin(t * 43.73 + 2.71) * 21
  );
}

/** Tiny baseline drift (asystole / flatline). */
function flatlineVoltage(phase: number, leadIdx: number): number {
  const t = phase * Math.PI * 2 + leadIdx * 0.61;
  return Math.sin(t) * 0.35 + Math.sin(t * 4.91) * 0.28;
}

/** Pseudo-random surface-grade jitter (deterministic; tiles seamlessly). */
function motionNoise(phase: number, leadIdx: number): number {
  const t = phase * 2 * Math.PI;
  return (
    Math.sin(t * 11 + leadIdx * 0.7) * 0.5 +
    Math.sin(t * 27.3 + leadIdx * 1.4) * 0.32 +
    Math.sin(t * 47.7 + 1.1) * 0.18
  );
}

function cprArtifactVoltage(
  phase: number,
  tileWidthPx: number,
  leadIdx: number,
): number {
  const tileMs = tileWidthPx * ECG_MS_PER_PIXEL;
  const cyclesPerTile = Math.max(1, Math.round(tileMs / CPR_COMPRESSION_PERIOD_MS));
  const t = phase * cyclesPerTile * 2 * Math.PI;
  return Math.sin(t + leadIdx * 0.32) * 36 + Math.sin(t * 2 + 0.4) * 7;
}

const PVC_DIR_1: Vec3 = [ 0.15, -0.10,  0.30];
const PVC_DIR_2: Vec3 = [-0.40,  0.55,  0.60]; // ectopic axis: rightward & posterior pointing
const PVC_DIR_3: Vec3 = [ 0.20, -0.20,  0.10];
const PVC_T_DIR:  Vec3 = [ 0.40, -0.35, -0.30]; // discordant T

/** PVC beat — used by sinus-family overlays. */
function pvcBeatVoltage(u: number, leadIdx: number): number {
  const c = 0.22;
  const w = 0.022;
  const e1 = gauss(u, c - w * 2.4, w * 1.1, 1);
  const e2 = gauss(u, c, w * 1.9, 1);
  const e3 = gauss(u, c + w * 3.2, w * 1.7, 1);
  const eT = gauss(u, 0.46, 0.06, 1);

  let v: Vec3 = [0, 0, 0];
  v = vAdd(v, vScale(PVC_DIR_1, e1 * 22));
  v = vAdd(v, vScale(PVC_DIR_2, e2 * 105));
  v = vAdd(v, vScale(PVC_DIR_3, e3 * 30));
  v = vAdd(v, vScale(PVC_T_DIR, eT * 26));
  return project(v, leadIdx);
}

// ---------------------------------------------------------------------------
// Tile sizing helpers
// ---------------------------------------------------------------------------

export function rhythmCyclePixelWidth(rateBpm: number): number {
  const ms = 60000 / Math.max(20, Math.min(260, rateBpm));
  return ms / ECG_MS_PER_PIXEL;
}

// ---------------------------------------------------------------------------
// Sinus-family + ctx modifier overlays (ST shift, T mult, etc.)
// ---------------------------------------------------------------------------

/** ST-segment Gaussian envelope (positive bump centred over the J-point/T onset). */
function stOverlayEnvelope(beatPhase: number): number {
  return (
    Math.max(0, gauss(beatPhase, 0.32, 0.08, 1)) * 0.85 +
    Math.max(0, gauss(beatPhase, 0.42, 0.07, 1)) * 0.6
  );
}

const Q_DIR: Vec3       = [-0.50,  0.05, -0.20]; // pathologic Q points opposite the main QRS axis
const U_DIR: Vec3       = [ 0.30,  0.20,  0.10];
const DELTA_DIR: Vec3   = [ 0.45,  0.30,  0.20]; // pre-excitation slur, concordant with QRS axis
const OSBORN_DIR: Vec3  = [ 0.30,  0.05,  0.30]; // J-wave, more visible in lateral leads

function applyCtxOverlays(
  v: number,
  beatPhase: number,
  ctx: EcgScenarioContext,
  leadIdx: number,
  wideQrs: boolean,
): number {
  let out = v;

  // ACS injury vector — projected through the same Dower matrix so the ST
  // shift is geometrically consistent across all 12 leads from a single
  // direction + magnitude.
  const acsVec = ctx.acsInjuryVecMm;
  if (acsVec) {
    out += projectXyzToLead(acsVec, leadIdx) * 5.5 * stOverlayEnvelope(beatPhase);
  }

  // Per-lead `stShiftMm` is still honoured for callers that haven't migrated
  // to injury vectors (or for non-ACS shifts like pericarditis).
  const stShift = ctx.stShiftMm[leadIdx] ?? 0;
  if (stShift !== 0) {
    out += stShift * 5.5 * stOverlayEnvelope(beatPhase);
  }

  const tMult = ctx.tMultiplier[leadIdx] ?? 1;
  if (tMult !== 1) {
    const tEnv = tEnvelope(beatPhase, wideQrs) * (wideQrs ? T_AMP_WIDE : T_AMP_NARROW);
    const tBase = projectXyzToLead(T_DIR, leadIdx) * tEnv;
    out += tBase * (tMult - 1);
  }

  const qMult = ctx.qMultiplier[leadIdx] ?? 1;
  if (qMult !== 1) {
    const env = gauss(beatPhase, 0.175, 0.008, 1);
    out += projectXyzToLead(Q_DIR, leadIdx) * env * (qMult - 1) * 18;
  }

  if (ctx.uMultiplier > 0) {
    const env = gauss(beatPhase, 0.62, 0.04, 1);
    out += projectXyzToLead(U_DIR, leadIdx) * env * 7 * ctx.uMultiplier;
  }

  if (ctx.deltaWave) {
    const env = gauss(beatPhase, 0.155, 0.022, 1);
    out += projectXyzToLead(DELTA_DIR, leadIdx) * env * 9;
  }

  if (ctx.osbornWave) {
    const env = gauss(beatPhase, 0.235, 0.012, 1);
    out += projectXyzToLead(OSBORN_DIR, leadIdx) * env * 12;
  }

  if (ctx.paced) {
    out += pacingSpike(beatPhase, 0.17);
  }

  return out;
}

/** Projected stand-alone P-wave used by AV blocks / standstill / paced AV-seq. */
function pWaveProjected(u: number, leadIdx: number, prShift = 0): number {
  return projectXyzToLead(P_DIR, leadIdx) * pEnvelope(u, prShift) * P_AMP;
}

/** Projected stand-alone T-wave (used by paced renderers to add a discordant T). */
function tWaveProjected(u: number, leadIdx: number, wideQrs: boolean): number {
  const dir = wideQrs ? WIDE_T_DIR : T_DIR;
  const amp = wideQrs ? T_AMP_WIDE : T_AMP_NARROW;
  return projectXyzToLead(dir, leadIdx) * tEnvelope(u, wideQrs) * amp;
}

// ---------------------------------------------------------------------------
// RhythmRenderer table
// ---------------------------------------------------------------------------

export interface RhythmRenderer {
  /** Default rate when the rhythm is rate-bearing (null = arrhythmic / non-pulsatile). */
  defaultRate: number | null;
  /** Tile width in pixels. */
  tileWidthPx: (rateBpm: number | null, ctx: EcgScenarioContext) => number;
  /** Returns voltage at xPx within tileWidthPx (centred on y=0). */
  sample: (
    xPx: number,
    tileWidthPx: number,
    ctx: EcgScenarioContext,
    leadIdx: number,
  ) => number;
  family: EcgRhythmFamily;
}

function tileForRate(defaultRate: number) {
  return (rateBpm: number | null) => rhythmCyclePixelWidth(rateBpm ?? defaultRate);
}

function phaseWithin(xPx: number, tileWidthPx: number): number {
  return (((xPx % tileWidthPx) + tileWidthPx) % tileWidthPx) / tileWidthPx;
}

// --- SINUS family ---------------------------------------------------------

const sinusRenderer = (defaultRate: number, ampTone = 1): RhythmRenderer => ({
  defaultRate,
  family: 'sinus',
  tileWidthPx: (rate) => {
    const r = rate ?? defaultRate;
    return rhythmCyclePixelWidth(r) * Math.max(1, 1 /* PVC handled separately */);
  },
  sample: (xPx, tileW, ctx, leadIdx) => {
    const beats = Math.max(1, ctx.pvcEveryNBeats || 1);
    const beatWidthPx = tileW / beats;
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const beatIdx = Math.min(beats - 1, Math.floor(xWithin / beatWidthPx));
    const beatPhase = (xWithin - beatIdx * beatWidthPx) / beatWidthPx;
    const isPVC = ctx.pvcEveryNBeats > 0 && beatIdx === ctx.pvcEveryNBeats - 1;

    if (isPVC) return pvcBeatVoltage(beatPhase, leadIdx);

    const wideQrs = false;
    let v = beatWithLeadMorphology(beatPhase, wideQrs, leadIdx);
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, wideQrs);
    return v * ampTone;
  },
});

const SINUS_RENDERER = sinusRenderer(76);
const SINUS_BRADY_RENDERER = sinusRenderer(48, 1.05);
const SINUS_TACH_RENDERER: RhythmRenderer = {
  ...sinusRenderer(122, 0.93),
  // Slightly fused T/P at fast rates — re-implement to inject extra hump.
  sample(xPx, tileW, ctx, leadIdx) {
    const beats = Math.max(1, ctx.pvcEveryNBeats || 1);
    const beatWidthPx = tileW / beats;
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const beatIdx = Math.min(beats - 1, Math.floor(xWithin / beatWidthPx));
    const beatPhase = (xWithin - beatIdx * beatWidthPx) / beatWidthPx;
    const isPVC = ctx.pvcEveryNBeats > 0 && beatIdx === ctx.pvcEveryNBeats - 1;
    if (isPVC) return pvcBeatVoltage(beatPhase, leadIdx);

    let v = beatWithLeadMorphology(beatPhase, false, leadIdx);
    v += gauss(beatPhase, 0.92, 0.06, 5);
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
    return v * 0.93;
  },
};

const SINUS_ARRHYTHMIA_RENDERER: RhythmRenderer = {
  defaultRate: 76,
  family: 'sinus',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 76) * 4,
  sample(xPx, tileW, ctx, leadIdx) {
    const beats = 4;
    const baseW = tileW / beats;
    // Phasic respiratory R-R variation: shorter on inspiration, longer on expiration.
    const spans = [0.78, 0.95, 1.12, 1.15];
    const total = spans.reduce((a, b) => a + b, 0);
    const norm = spans.map((s) => (s / total) * tileW);

    const xWithin = ((xPx % tileW) + tileW) % tileW;
    let acc = 0;
    let beatIdx = 0;
    for (let i = 0; i < beats; i++) {
      const w = norm[i]!;
      if (xWithin < acc + w) {
        beatIdx = i;
        break;
      }
      acc += w;
    }
    const w = norm[beatIdx]!;
    const beatPhase = (xWithin - acc) / w;
    let v = beatWithLeadMorphology(beatPhase, false, leadIdx);
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
    return v;
  },
};

const WANDERING_RENDERER: RhythmRenderer = {
  defaultRate: 70,
  family: 'sinus',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 70) * 3,
  sample(xPx, tileW, ctx, leadIdx) {
    const beats = 3;
    const beatWidthPx = tileW / beats;
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const beatIdx = Math.min(beats - 1, Math.floor(xWithin / beatWidthPx));
    const beatPhase = (xWithin - beatIdx * beatWidthPx) / beatWidthPx;
    const opts: Parameters<typeof beatWithLeadMorphology>[3] =
      beatIdx === 0
        ? { withP: true, pGainMult: 1 }
        : beatIdx === 1
          ? { withP: true, pGainMult: 0.4, prShift: -0.005 }
          : { withP: true, pInverted: true, prShift: 0.005 };
    let v = beatWithLeadMorphology(beatPhase, false, leadIdx, opts);
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
    return v;
  },
};

// --- ATRIAL family --------------------------------------------------------

const AFIB_RENDERER: RhythmRenderer = {
  defaultRate: 110,
  family: 'atrial',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 110) * 4,
  sample(xPx, tileW, ctx, leadIdx) {
    // 4 irregularly-spaced beats per tile.
    const spans = [0.7, 1.1, 0.85, 1.35];
    const total = spans.reduce((a, b) => a + b, 0);
    const norm = spans.map((s) => (s / total) * tileW);
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    let acc = 0;
    let beatIdx = 0;
    for (let i = 0; i < spans.length; i++) {
      const w = norm[i]!;
      if (xWithin < acc + w) {
        beatIdx = i;
        break;
      }
      acc += w;
    }
    const w = norm[beatIdx]!;
    const beatPhase = (xWithin - acc) / w;
    let v = beatWithLeadMorphology(beatPhase, false, leadIdx, { withP: false });
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
    // Fibrillatory baseline
    v += Math.sin(xPx * 0.71 + leadIdx * 1.1) * 2.6;
    v += Math.sin(xPx * 1.93 + leadIdx * 0.5) * 1.6;
    return v;
  },
};

const AFLUTTER_RENDERER: RhythmRenderer = {
  defaultRate: 150,
  family: 'atrial',
  tileWidthPx: (rate) => {
    // Tile is one ventricular cycle (2 flutter waves at 2:1 conduction).
    const r = rate ?? 150;
    return rhythmCyclePixelWidth(r);
  },
  sample(xPx, tileW, ctx, leadIdx) {
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const beatPhase = xWithin / tileW;
    // Two flutter sawtooth waves per ventricular cycle (2:1 conduction).
    const fPhase1 = (beatPhase * 2) % 1;
    const flutter = sawtoothFlutter(fPhase1, leadIdx);
    let v = beatWithLeadMorphology(beatPhase, false, leadIdx, { withP: false });
    v += flutter;
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
    return v;
  },
};

const SVT_RENDERER: RhythmRenderer = {
  defaultRate: 180,
  family: 'atrial',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 180),
  sample(xPx, tileW, ctx, leadIdx) {
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const beatPhase = xWithin / tileW;
    let v = beatWithLeadMorphology(beatPhase, false, leadIdx, { withP: false });
    // Retrograde notch in the T region — small inverted P-shaped vector.
    v += projectXyzToLead(P_DIR, leadIdx) * gauss(beatPhase, 0.55, 0.025, -1) * 4;
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
    return v * 0.96;
  },
};

// --- JUNCTIONAL family ----------------------------------------------------

const junctionalRenderer = (rate: number): RhythmRenderer => ({
  defaultRate: rate,
  family: 'junctional',
  tileWidthPx: (r) => rhythmCyclePixelWidth(r ?? rate),
  sample(xPx, tileW, ctx, leadIdx) {
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const beatPhase = xWithin / tileW;
    // Junctional: inverted P (when present) and narrow QRS.
    const hasP = leadIdx === 1 || leadIdx === 2 || leadIdx === 5;
    let v = beatWithLeadMorphology(beatPhase, false, leadIdx, {
      withP: hasP,
      pInverted: true,
      prShift: 0.07, // P close to QRS or buried
    });
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
    return v;
  },
});

const JUNCT_BRADY_RENDERER = junctionalRenderer(34);
const JUNCT_RENDERER = junctionalRenderer(50);
const ACCEL_JUNCT_RENDERER = junctionalRenderer(80);
const JUNCT_TACH_RENDERER = junctionalRenderer(120);

// --- AV BLOCK family ------------------------------------------------------

const AV_BLOCK_1_RENDERER: RhythmRenderer = {
  defaultRate: 70,
  family: 'av_block',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 70),
  sample(xPx, tileW, ctx, leadIdx) {
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const beatPhase = xWithin / tileW;
    // Long PR — push P backward in beat (simulate by shifting P leftward rel to QRS).
    let v = beatWithLeadMorphology(beatPhase, false, leadIdx, {
      withP: true,
      prShift: -0.025,
    });
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
    return v;
  },
};

const AV_BLOCK_MOBITZ1_RENDERER: RhythmRenderer = {
  defaultRate: 60,
  family: 'av_block',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 60) * 4,
  sample(xPx, tileW, ctx, leadIdx) {
    const beats = 4;
    const beatW = tileW / beats;
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const beatIdx = Math.min(beats - 1, Math.floor(xWithin / beatW));
    const beatPhase = (xWithin - beatIdx * beatW) / beatW;
    // PR lengthens 0.18 → 0.22 → 0.26 → drop QRS on 4th beat (P only).
    const prShifts = [-0.04, -0.025, -0.005];
    if (beatIdx < 3) {
      let v = beatWithLeadMorphology(beatPhase, false, leadIdx, {
        withP: true,
        prShift: prShifts[beatIdx]!,
      });
      v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
      return v;
    }
    // Dropped beat: P only, no QRS/T.
    return pWaveProjected(beatPhase, leadIdx);
  },
};

const AV_BLOCK_MOBITZ2_RENDERER: RhythmRenderer = {
  defaultRate: 55,
  family: 'av_block',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 55) * 4,
  sample(xPx, tileW, ctx, leadIdx) {
    const beats = 4;
    const beatW = tileW / beats;
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const beatIdx = Math.min(beats - 1, Math.floor(xWithin / beatW));
    const beatPhase = (xWithin - beatIdx * beatW) / beatW;
    // Fixed PR for conducted beats, drop the 4th.
    if (beatIdx < 3) {
      let v = beatWithLeadMorphology(beatPhase, false, leadIdx, {
        withP: true,
        prShift: -0.005,
      });
      v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
      return v;
    }
    return pWaveProjected(beatPhase, leadIdx);
  },
};

const AV_BLOCK_2TO1_RENDERER: RhythmRenderer = {
  defaultRate: 45,
  family: 'av_block',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 45) * 2,
  sample(xPx, tileW, ctx, leadIdx) {
    const beats = 2;
    const beatW = tileW / beats;
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const beatIdx = Math.min(beats - 1, Math.floor(xWithin / beatW));
    const beatPhase = (xWithin - beatIdx * beatW) / beatW;
    if (beatIdx === 0) {
      let v = beatWithLeadMorphology(beatPhase, false, leadIdx, {
        withP: true,
        prShift: -0.005,
      });
      v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
      return v;
    }
    // Dropped P only.
    return pWaveProjected(beatPhase, leadIdx);
  },
};

const AV_BLOCK_3_RENDERER: RhythmRenderer = {
  defaultRate: 38,
  family: 'av_block',
  // Tile is the LCM-ish of P-rate (80) and escape rate (38) — pick a wide tile.
  tileWidthPx: (rate) => {
    const escape = rate ?? 38;
    return rhythmCyclePixelWidth(escape) * 3;
  },
  sample(xPx, tileW, ctx, leadIdx) {
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const escapeBeats = 3;
    const escapeW = tileW / escapeBeats;
    const escapeIdx = Math.min(escapeBeats - 1, Math.floor(xWithin / escapeW));
    const escapePhase = (xWithin - escapeIdx * escapeW) / escapeW;

    // Independent P at ~80 bpm overlaid on top.
    const pPeriodPx = rhythmCyclePixelWidth(80);
    const pPhase = ((xWithin % pPeriodPx) + pPeriodPx) % pPeriodPx / pPeriodPx;
    const pComponent = pWaveProjected(pPhase, leadIdx);

    // Escape QRS (wide).
    const qrs = wideQrsBeat(escapePhase, leadIdx);
    let v = qrs * 0.6 + pComponent;
    v = applyCtxOverlays(v, escapePhase, ctx, leadIdx, true);
    return v;
  },
};

const VENTRICULAR_STANDSTILL_RENDERER: RhythmRenderer = {
  defaultRate: null,
  family: 'av_block',
  tileWidthPx: () => rhythmCyclePixelWidth(80) * 3,
  sample(xPx, tileW, _ctx, leadIdx) {
    const pPeriodPx = rhythmCyclePixelWidth(80);
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const pPhase = ((xWithin % pPeriodPx) + pPeriodPx) % pPeriodPx / pPeriodPx;
    return pWaveProjected(pPhase, leadIdx) + flatlineVoltage(xWithin / tileW, leadIdx);
  },
};

// --- PACED family ---------------------------------------------------------

const PACED_ATRIAL_RENDERER: RhythmRenderer = {
  defaultRate: 70,
  family: 'paced',
  tileWidthPx: tileForRate(70),
  sample(xPx, tileW, ctx, leadIdx) {
    const beatPhase = phaseWithin(xPx, tileW);
    let v = beatWithLeadMorphology(beatPhase, false, leadIdx, { withP: true, prShift: 0 });
    v += pacingSpike(beatPhase, 0.045);
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
    return v;
  },
};

const PACED_VENTRICULAR_RENDERER: RhythmRenderer = {
  defaultRate: 70,
  family: 'paced',
  tileWidthPx: tileForRate(70),
  sample(xPx, tileW, ctx, leadIdx) {
    const beatPhase = phaseWithin(xPx, tileW);
    let v = wideQrsBeat(beatPhase, leadIdx) * 0.85;
    v += pacingSpike(beatPhase, 0.18);
    v += tWaveProjected(beatPhase, leadIdx, true) * 0.5;
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, true);
    return v;
  },
};

const PACED_DUAL_RENDERER: RhythmRenderer = {
  defaultRate: 70,
  family: 'paced',
  tileWidthPx: tileForRate(70),
  sample(xPx, tileW, ctx, leadIdx) {
    const beatPhase = phaseWithin(xPx, tileW);
    let v = wideQrsBeat(beatPhase, leadIdx) * 0.85;
    v += pacingSpike(beatPhase, 0.045);
    v += pacingSpike(beatPhase, 0.18);
    v += tWaveProjected(beatPhase, leadIdx, true) * 0.5;
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, true);
    return v;
  },
};

const PACED_AV_SEQ_RENDERER: RhythmRenderer = {
  defaultRate: 70,
  family: 'paced',
  tileWidthPx: tileForRate(70),
  sample(xPx, tileW, ctx, leadIdx) {
    const beatPhase = phaseWithin(xPx, tileW);
    // Native P (sensed) + ventricular pace.
    let v = pWaveProjected(beatPhase, leadIdx);
    v += wideQrsBeat(beatPhase, leadIdx) * 0.8;
    v += pacingSpike(beatPhase, 0.18);
    v += tWaveProjected(beatPhase, leadIdx, true) * 0.5;
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, true);
    return v;
  },
};

const FAILURE_TO_CAPTURE_RENDERER: RhythmRenderer = {
  defaultRate: 70,
  family: 'paced',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 70) * 3,
  sample(xPx, tileW, ctx, leadIdx) {
    const beats = 3;
    const beatW = tileW / beats;
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const beatIdx = Math.min(beats - 1, Math.floor(xWithin / beatW));
    const beatPhase = (xWithin - beatIdx * beatW) / beatW;
    if (beatIdx === 1) {
      // Failed capture: pacing spike but no QRS.
      return pacingSpike(beatPhase, 0.18) + flatlineVoltage(beatPhase, leadIdx);
    }
    let v = wideQrsBeat(beatPhase, leadIdx) * 0.85;
    v += pacingSpike(beatPhase, 0.18);
    v += tWaveProjected(beatPhase, leadIdx, true) * 0.5;
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, true);
    return v;
  },
};

// --- VENTRICULAR / ARREST family ------------------------------------------

const idioventricularRenderer = (rate: number): RhythmRenderer => ({
  defaultRate: rate,
  family: 'ventricular',
  tileWidthPx: (r) => rhythmCyclePixelWidth(r ?? rate),
  sample(xPx, tileW, ctx, leadIdx) {
    const beatPhase = phaseWithin(xPx, tileW);
    const v = wideQrsBeat(beatPhase, leadIdx);
    return applyCtxOverlays(v, beatPhase, ctx, leadIdx, true);
  },
});

const IDIOVENTRICULAR_RENDERER = idioventricularRenderer(32);
const ACCEL_IDIOVENT_RENDERER = idioventricularRenderer(78);

const VT_RENDERER: RhythmRenderer = {
  defaultRate: 168,
  family: 'ventricular',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 168),
  sample(xPx, tileW, ctx, leadIdx) {
    const beatPhase = phaseWithin(xPx, tileW);
    const v = wideQrsBeat(beatPhase, leadIdx) * 0.94;
    return applyCtxOverlays(v, beatPhase, ctx, leadIdx, true);
  },
};

// pulseless_vt is visually identical to vt; semantics are arrest.
const PULSELESS_VT_RENDERER: RhythmRenderer = {
  ...VT_RENDERER,
  family: 'arrest',
};

const VFIB_RENDERER: RhythmRenderer = {
  defaultRate: null,
  family: 'arrest',
  tileWidthPx: () => 280,
  sample(xPx, tileW, _ctx, leadIdx) {
    const phase = phaseWithin(xPx, tileW);
    return vfVoltagePeriodic(phase + leadIdx * 0.03, leadIdx) * 0.85;
  },
};

const TORSADES_RENDERER: RhythmRenderer = {
  defaultRate: 220,
  family: 'ventricular',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 220) * 6,
  sample(xPx, tileW, ctx, leadIdx) {
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const phase = xWithin / tileW;
    // 6 wide complexes per tile, with sinusoidally modulated polarity.
    const beats = 6;
    const beatW = tileW / beats;
    const beatIdx = Math.floor(xWithin / beatW);
    const beatPhase = (xWithin - beatIdx * beatW) / beatW;
    const env = Math.sin(phase * Math.PI * 2);
    const polarity = env >= 0 ? 1 : -1;
    let v = wideQrsBeat(beatPhase, leadIdx, polarity as 1 | -1) * (0.7 + 0.5 * Math.abs(env));
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, true);
    return v;
  },
};

const AGONAL_RENDERER: RhythmRenderer = {
  defaultRate: 18,
  family: 'arrest',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 18) * 2,
  sample(xPx, tileW, _ctx, leadIdx) {
    const beats = 2;
    const beatW = tileW / beats;
    const xWithin = ((xPx % tileW) + tileW) % tileW;
    const beatIdx = Math.min(beats - 1, Math.floor(xWithin / beatW));
    const beatPhase = (xWithin - beatIdx * beatW) / beatW;
    // Beats are irregular and dying; second beat is much smaller.
    const amp = beatIdx === 0 ? 1 : 0.55;
    return agonalBeat(beatPhase, leadIdx) * amp + flatlineVoltage(beatPhase, leadIdx);
  },
};

const ASYSTOLE_RENDERER: RhythmRenderer = {
  defaultRate: null,
  family: 'arrest',
  tileWidthPx: () => 360,
  sample(xPx, tileW, _ctx, leadIdx) {
    const phase = phaseWithin(xPx, tileW);
    return flatlineVoltage(phase + leadIdx * 0.02, leadIdx);
  },
};

const PEA_RENDERER: RhythmRenderer = {
  defaultRate: 48,
  family: 'arrest',
  tileWidthPx: (rate) => rhythmCyclePixelWidth(rate ?? 48),
  sample(xPx, tileW, ctx, leadIdx) {
    const beatPhase = phaseWithin(xPx, tileW);
    let v = beatWithLeadMorphology(beatPhase, false, leadIdx) * 0.38;
    v += Math.sin(xPx * 0.0022) * 1.2;
    v = applyCtxOverlays(v, beatPhase, ctx, leadIdx, false);
    return v;
  },
};

const UNKNOWN_RENDERER: RhythmRenderer = {
  ...SINUS_RENDERER,
  family: 'sinus',
};

// ---------------------------------------------------------------------------
// Master table
// ---------------------------------------------------------------------------

export const RHYTHM_RENDERERS: Record<EcgRhythmKind, RhythmRenderer> = {
  sinus: SINUS_RENDERER,
  sinus_brady: SINUS_BRADY_RENDERER,
  sinus_tach: SINUS_TACH_RENDERER,
  sinus_arrhythmia: SINUS_ARRHYTHMIA_RENDERER,
  wandering_pacemaker: WANDERING_RENDERER,
  afib: AFIB_RENDERER,
  aflutter: AFLUTTER_RENDERER,
  svt: SVT_RENDERER,
  junctional_brady: JUNCT_BRADY_RENDERER,
  junctional: JUNCT_RENDERER,
  junctional_tach: JUNCT_TACH_RENDERER,
  accelerated_junctional: ACCEL_JUNCT_RENDERER,
  av_block_1: AV_BLOCK_1_RENDERER,
  av_block_2_mobitz1: AV_BLOCK_MOBITZ1_RENDERER,
  av_block_2_mobitz2: AV_BLOCK_MOBITZ2_RENDERER,
  av_block_2_2to1: AV_BLOCK_2TO1_RENDERER,
  av_block_3: AV_BLOCK_3_RENDERER,
  ventricular_standstill: VENTRICULAR_STANDSTILL_RENDERER,
  paced_atrial: PACED_ATRIAL_RENDERER,
  paced_ventricular: PACED_VENTRICULAR_RENDERER,
  paced_dual: PACED_DUAL_RENDERER,
  paced_av_sequential: PACED_AV_SEQ_RENDERER,
  failure_to_capture: FAILURE_TO_CAPTURE_RENDERER,
  idioventricular: IDIOVENTRICULAR_RENDERER,
  accelerated_idioventricular: ACCEL_IDIOVENT_RENDERER,
  vt: VT_RENDERER,
  pulseless_vt: PULSELESS_VT_RENDERER,
  vfib: VFIB_RENDERER,
  torsades: TORSADES_RENDERER,
  agonal: AGONAL_RENDERER,
  asystole: ASYSTOLE_RENDERER,
  pea: PEA_RENDERER,
  unknown: UNKNOWN_RENDERER,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Tile width that respects the rhythm + any PVC repetition cycle. */
export function rhythmStripeWidthForContext(ctx: EcgScenarioContext): number {
  const renderer = RHYTHM_RENDERERS[ctx.kind] ?? UNKNOWN_RENDERER;
  const baseTile = renderer.tileWidthPx(ctx.rateBpm, ctx);
  const beats = Math.max(1, ctx.pvcEveryNBeats || 1);
  // PVC overlay only applies to sinus-family renderers.
  if (RHYTHM_FAMILY[ctx.kind] !== 'sinus' || beats === 1) return baseTile;
  return baseTile * beats;
}

/**
 * Rich contextual sampler. Returns a voltage centred at 0 — caller projects
 * onto baseline. Adds CPR artifact, respiratory wander, motion noise, and
 * applies amplitude scaling outside the per-rhythm renderer.
 */
export function sampleLeadVoltageContext(
  xPx: number,
  tileWidthPx: number,
  ctx: EcgScenarioContext,
  leadIdx: number,
): number {
  const renderer = RHYTHM_RENDERERS[ctx.kind] ?? UNKNOWN_RENDERER;
  const phase = phaseWithin(xPx, tileWidthPx);
  let v = renderer.sample(xPx, tileWidthPx, ctx, leadIdx);

  v *= ctx.amplitude;

  if (ctx.respWanderMm > 0 && ctx.respRateBpm && ctx.respRateBpm > 6) {
    const tileMs = tileWidthPx * ECG_MS_PER_PIXEL;
    const respPeriodMs = 60000 / ctx.respRateBpm;
    const cyclesPerTile = Math.max(1, Math.round(tileMs / respPeriodMs));
    v +=
      Math.sin(phase * cyclesPerTile * 2 * Math.PI + leadIdx * 0.21) *
      ctx.respWanderMm *
      4.2;
  }

  if (ctx.motion > 0) {
    v += motionNoise(phase, leadIdx) * ctx.motion * 6;
  }

  if (ctx.cprArtifact) {
    v += cprArtifactVoltage(phase, tileWidthPx, leadIdx);
  }

  return v;
}

// ---------------------------------------------------------------------------
// Legacy helpers retained for back-compat (still exported in case external
// callers import them).
// ---------------------------------------------------------------------------

export interface VoltageSampleOpts {
  kind: EcgRhythmKind;
  rateBpm: number | null;
  leadIdx: number;
}

export function rhythmStripeWidth(kind: EcgRhythmKind, rateBpm: number | null): number {
  const renderer = RHYTHM_RENDERERS[kind] ?? UNKNOWN_RENDERER;
  // Build a minimal stub ctx for renderers that need ctx.pvcEveryNBeats etc.
  const stub = {
    kind,
    rateBpm,
    label: '',
    stShiftMm: new Array(12).fill(0),
    tMultiplier: new Array(12).fill(1),
    qMultiplier: new Array(12).fill(1),
    prMultiplier: 1,
    qrsWidthMult: 1,
    uMultiplier: 0,
    pvcEveryNBeats: 0,
    avBlock: 'none' as const,
    paced: false,
    cprArtifact: false,
    respWanderMm: 0,
    respRateBpm: null,
    motion: 0,
    amplitude: 1,
    deltaWave: false,
    osbornWave: false,
    flags: [],
  } as unknown as EcgScenarioContext;
  return renderer.tileWidthPx(rateBpm, stub);
}

export function sampleLeadVoltageSpatial(
  xPx: number,
  stripeWidthPx: number,
  o: VoltageSampleOpts,
): number {
  const phaseWithinTile = phaseWithin(xPx, stripeWidthPx);
  if (o.kind === 'asystole') return flatlineVoltage(phaseWithinTile + o.leadIdx * 0.02, o.leadIdx);
  if (o.kind === 'vfib') return vfVoltagePeriodic(phaseWithinTile + o.leadIdx * 0.03, o.leadIdx);
  return sampleLeadVoltage(xPx * ECG_MS_PER_PIXEL, o);
}

export function sampleLeadVoltage(globalTimeMs: number, o: VoltageSampleOpts): number {
  // Project onto the renderer table without overlays — used by trainer previews.
  const xPx = globalTimeMs / ECG_MS_PER_PIXEL;
  const renderer = RHYTHM_RENDERERS[o.kind] ?? UNKNOWN_RENDERER;
  const stub = {
    kind: o.kind,
    rateBpm: o.rateBpm,
    label: '',
    stShiftMm: new Array(12).fill(0),
    tMultiplier: new Array(12).fill(1),
    qMultiplier: new Array(12).fill(1),
    prMultiplier: 1,
    qrsWidthMult: 1,
    uMultiplier: 0,
    pvcEveryNBeats: 0,
    avBlock: 'none' as const,
    paced: false,
    cprArtifact: false,
    respWanderMm: 0,
    respRateBpm: null,
    motion: 0,
    amplitude: 1,
    deltaWave: false,
    osbornWave: false,
    flags: [],
  } as unknown as EcgScenarioContext;
  const tileW = renderer.tileWidthPx(o.rateBpm, stub);
  return renderer.sample(xPx, tileW, stub, o.leadIdx);
}
