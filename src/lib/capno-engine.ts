/**
 * Physiology-style capnography waveform (teaching / simulation).
 * One breath cycle is phase ∈ [0, 1).
 */

const P1 = 0.06; // end Phase I (baseline)
const P2 = 0.38; // end Phase II (expiratory upstroke)
const P3 = 0.76; // end Phase III (plateau)

/** Mid-angle for Phase III tilt (2–5°). */
const PLATEAU_TILT_RAD = ((2 + 5) / 2) * (Math.PI / 180);

/** Normalized plateau amplitude contribution from tilt across Phase III. */
const PLATEAU_TILT_DELTA = 0.06;

export function plateauEndNormalized(): number {
  return 1 + Math.tan(PLATEAU_TILT_RAD) * PLATEAU_TILT_DELTA;
}

/**
 * Logistic sigmoid mapped so Phase II rises ~0 → ~1.
 * Higher `k` = steeper upstroke; lower `k` = “shark fin”.
 */
function sigmoidPhase2(u: number, k: number): number {
  const t = k * (u - 0.5);
  const lo = 1 / (1 + Math.exp(k * 0.5));
  const hi = 1 / (1 + Math.exp(-k * 0.5));
  const sig = 1 / (1 + Math.exp(-t));
  return (sig - lo) / (hi - lo + 1e-9);
}

/** Effective logistic steepness from obstruction (shark fin when > 0.5). */
export function capnoSigmoidK(obstructionFactor: number): number {
  const baseK = 18;
  if (obstructionFactor <= 0.5) return baseK;
  const shark = (obstructionFactor - 0.5) / 0.5;
  return baseK * (1 - shark * 0.72);
}

/**
 * Normalized EtCO₂ waveform value [0, ~1+] before scaling to mmHg.
 * Phase I: 0; Phase II: logistic; Phase III: slight linear tilt; Phase IV: exponential decay to ~0.
 */
export type CapnoWaveStyle = 'legacy' | 'nasal' | 'inline';

export function capnoNormalizedSample(
  phase01: number,
  obstructionFactor: number,
  waveVariant: 'standard' | 'inline' = 'standard',
): number {
  const p = ((phase01 % 1) + 1) % 1;

  if (p < P1) {
    return 0;
  }

  if (p < P2) {
    const u = (p - P1) / (P2 - P1);
    const k =
      waveVariant === 'inline'
        ? 22
        : capnoSigmoidK(obstructionFactor);
    return sigmoidPhase2(u, k);
  }

  if (p < P3) {
    const u = (p - P2) / (P3 - P2);
    const plateauStart = 1;
    const tilt = Math.tan(PLATEAU_TILT_RAD) * PLATEAU_TILT_DELTA * u;
    return plateauStart + tilt;
  }

  const u = (p - P3) / (1 - P3);
  const yStart = plateauEndNormalized();
  const gamma = 16;
  const y = yStart * Math.exp(-gamma * u);
  return Math.max(0, y);
}

export function capnoMmHgAtPhase(
  phase01: number,
  obstructionFactor: number,
  etco2TargetMmHg: number,
): number {
  const n = capnoNormalizedSample(phase01, obstructionFactor, 'standard');
  return Math.max(0, Math.min(n * etco2TargetMmHg, etco2TargetMmHg * 1.25));
}

export function capnoMmHgAtPhaseInline(
  phase01: number,
  etco2TargetMmHg: number,
): number {
  const n = capnoNormalizedSample(phase01, 0, 'inline');
  return Math.max(0, Math.min(n * etco2TargetMmHg, etco2TargetMmHg * 1.25));
}

/** Fill ys[i] = mmHg for horizontal positions scrolling through the breath cycle. */
export function buildCapnoStripMmHg(opts: {
  sampleCount: number;
  phaseOffset: number;
  /** How many full breath cycles span the strip width. */
  cyclesVisible: number;
  obstructionFactor: number;
  etco2MmHg: number;
  out: Float32Array;
  waveStyle?: CapnoWaveStyle;
  /** Advances each physics tick for deterministic nasal jitter. */
  breathTick?: number;
}): void {
  const {
    sampleCount,
    phaseOffset,
    cyclesVisible,
    obstructionFactor,
    etco2MmHg,
    out,
    waveStyle = 'legacy',
    breathTick = 0,
  } = opts;
  const n = Math.max(2, sampleCount);
  for (let i = 0; i < n; i++) {
    const xFrac = i / (n - 1);
    let adj =
      (phaseOffset + xFrac * cyclesVisible) % 1;
    adj = adj < 0 ? adj + 1 : adj >= 1 ? adj - 1 : adj;

    let mmHg: number;
    if (waveStyle === 'inline') {
      mmHg = capnoMmHgAtPhaseInline(adj, etco2MmHg);
    } else if (waveStyle === 'nasal') {
      let jitterPhase =
        adj + Math.sin(breathTick * 0.019 + phaseOffset * 2.7) * 0.05;
      jitterPhase = ((jitterPhase % 1) + 1) % 1;
      mmHg = capnoMmHgAtPhase(jitterPhase, obstructionFactor, etco2MmHg);
      mmHg *= 1 + Math.sin(i * 0.51 + breathTick * 0.11) * 0.12;
    } else {
      mmHg = capnoMmHgAtPhase(adj, obstructionFactor, etco2MmHg);
    }

    out[i] = mmHg;
  }
}
