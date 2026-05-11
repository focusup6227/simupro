/**
 * "CapnoSyn" tau-based capnography engine.
 *
 * Replaces the previous piecewise sigmoid+exponential model with a single
 * physiology-driven sampler. Each breath is split into:
 *
 *   t in [0, T_i)  inspiration  →  exponential decay from end-expiratory CO2
 *                                  back to the inspired baseline
 *   t in [T_i, T)  expiration   →  exponential wash-in from baseline up to
 *                                  alveolar CO2, plus a linear V/Q slope
 *                                  (covers classical Phases II + III)
 *
 * The same time constant tau = Ra * Cs governs both halves (inspiration and
 * expiration share airway resistance and lung compliance).
 *
 * Layered on top:
 *   - Cardiogenic oscillation: small sinusoidal ripple synced to the R wave
 *     via {@link getCardiacBeatPhase01}, gated to the late plateau only.
 *   - Sensor fuzz: 1D Perlin noise (high-frequency stochastic) so the trace
 *     reads as a real infrared sensor signal rather than a math drawing.
 *
 * Pathology drives the look of the wave entirely through the inputs:
 *   - Bronchospasm / COPD: large tau → slow upstroke ("shark fin").
 *   - Hypovolemia / arrest: low paCO2 → low amplitude.
 *   - ROSC: paCO2 step → instant amplitude jump.
 *   - Rebreathing: baselineCO2 > 0 → wave never returns to zero.
 *   - Hypoventilation: low rrBpm + high paCO2 → wide tall waves.
 *   - PE: low paCO2 + steep slopeVQ → small amplitude, climbing plateau.
 */

import { getCardiacBeatPhase01 } from '@/lib/ecg-waveform';
import { perlin1d } from '@/lib/noise/perlin1d';

/** Default expiration:inspiration ratio (1:2 = E twice as long as I). */
export const DEFAULT_EXP_TO_INSP_RATIO = 2;

/** Sensor-style affects only sensor-fuzz amplitude and minor jitter. */
export type CapnoWaveStyle = 'legacy' | 'nasal' | 'inline';

/** Inputs that fully determine one capnography sample at simulation time `t`. */
export type CapnoSampleParams = {
  rrBpm: number;
  /** Expiration:inspiration ratio. Defaults to 2 (1:2 normal). */
  expToInspRatio?: number;
  paCO2MmHg: number;
  baselineCO2MmHg: number;
  tauSec: number;
  slopeVqMmHgPerSec: number;
  cardiogenicAmpMmHg: number;
  hrBpm: number;
  perlinAmpMmHg: number;
};

const MIN_TAU_SEC = 0.05;
const MIN_RR_BPM = 4;
const MAX_RR_BPM = 60;

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

/** Quick sentinel: fall back gracefully when the engine is fed garbage. */
function safeRrBpm(rr: number): number {
  return clamp(rr, MIN_RR_BPM, MAX_RR_BPM);
}

function safeTauSec(tau: number): number {
  return Math.max(MIN_TAU_SEC, Number.isFinite(tau) ? tau : 0.2);
}

/**
 * Single capnography sample at simulation time `simSec`. Returns mmHg
 * (>= 0). The function is pure — same inputs always produce the same value
 * — which keeps it cheap to call in a tight render loop.
 */
export function capnoSampleMmHg(
  simSec: number,
  p: CapnoSampleParams,
): number {
  const rr = safeRrBpm(p.rrBpm);
  const tau = safeTauSec(p.tauSec);
  const ie = p.expToInspRatio && p.expToInspRatio > 0
    ? p.expToInspRatio
    : DEFAULT_EXP_TO_INSP_RATIO;

  const periodSec = 60 / rr;
  const inspTime = periodSec / (1 + ie);
  const expTime = periodSec - inspTime;

  const baseline = Math.max(0, p.baselineCO2MmHg);
  const paCO2 = Math.max(baseline, p.paCO2MmHg);
  const slope = Math.max(0, p.slopeVqMmHgPerSec);

  /**
   * End-of-expiration value (the "ceiling" hit just before the next
   * inspiration begins). Starting point of the inspiratory decay arm.
   */
  const pEndExp =
    baseline + (paCO2 - baseline) * (1 - Math.exp(-expTime / tau)) + slope * expTime;

  const t = ((simSec % periodSec) + periodSec) % periodSec;

  let y: number;
  let inPlateau = false;

  if (t < inspTime) {
    /** Inspiration — exponential decay back to baseline. */
    y = baseline + (pEndExp - baseline) * Math.exp(-t / tau);
  } else {
    /** Expiration — wash-in to PaCO2 plus V/Q slope. */
    const tE = t - inspTime;
    y = baseline + (paCO2 - baseline) * (1 - Math.exp(-tE / tau)) + slope * tE;
    /**
     * Cardiogenic oscillations only show on the plateau, after wash-in is
     * effectively complete (~2 tau) and not in the very last sliver of
     * expiration where the next inspiration is already starting to bleed
     * through downstream of the sensor.
     */
    inPlateau = tE > 2 * tau && tE < expTime - 0.05;
  }

  if (inPlateau && p.cardiogenicAmpMmHg > 0 && p.hrBpm > 0) {
    const beat = getCardiacBeatPhase01(simSec * 1000, p.hrBpm);
    if (Number.isFinite(beat)) {
      y += p.cardiogenicAmpMmHg * Math.sin(2 * Math.PI * beat);
    }
  }

  if (p.perlinAmpMmHg > 0) {
    y += perlin1d(simSec * 60) * p.perlinAmpMmHg;
  }

  return Math.max(0, y);
}

/**
 * Fill `out[i]` (mmHg) with capnography samples spanning a scrolling
 * window. The right edge of the strip is the most recent simulation time;
 * older samples sit further left. Cardiogenic oscillations and Perlin
 * sensor fuzz advance with absolute simulation time, so the cardiogenic
 * ripple stays phase-locked to the ECG even as the breath cycle scrolls.
 */
export function buildCapnoStripMmHg(opts: {
  sampleCount: number;
  /** Simulation time (seconds) at the right edge of the strip. */
  simSecAtRightEdge: number;
  /** How many full breath cycles the strip should span horizontally. */
  cyclesVisible: number;
  out: Float32Array;
  params: CapnoSampleParams;
  waveStyle?: CapnoWaveStyle;
}): void {
  const { sampleCount, simSecAtRightEdge, cyclesVisible, out, params, waveStyle = 'legacy' } = opts;
  const rr = safeRrBpm(params.rrBpm);
  const periodSec = 60 / rr;
  const stripDurationSec = Math.max(0.001, cyclesVisible * periodSec);

  /** Per-sensor noise scaling — nasal sensors are noisiest, mainstream cleanest. */
  const styleNoiseScale =
    waveStyle === 'nasal' ? 1.6 : waveStyle === 'inline' ? 0.6 : 1.0;
  const effectiveParams: CapnoSampleParams = {
    ...params,
    perlinAmpMmHg: params.perlinAmpMmHg * styleNoiseScale,
  };

  const n = Math.max(2, sampleCount);
  for (let i = 0; i < n; i++) {
    const xFrac = i / (n - 1);
    const tOffsetFromRight = (1 - xFrac) * stripDurationSec;
    const sampleSimSec = simSecAtRightEdge - tOffsetFromRight;
    out[i] = capnoSampleMmHg(sampleSimSec, effectiveParams);
  }
}
