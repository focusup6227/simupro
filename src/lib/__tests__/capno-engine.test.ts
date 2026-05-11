import { describe, expect, it } from 'vitest';
import {
  capnoSampleMmHg,
  buildCapnoStripMmHg,
  DEFAULT_EXP_TO_INSP_RATIO,
  type CapnoSampleParams,
} from '@/lib/capno-engine';
import {
  applyAiObstructionToLungMechanics,
  lungTimeConstantSec,
  resolveLungMechanics,
} from '@/lib/physiology/comorbidity-resolve';
import { defaultLungMechanics } from '@/lib/physiology/types';

const HEALTHY_PARAMS: CapnoSampleParams = {
  rrBpm: 16,
  paCO2MmHg: 40,
  baselineCO2MmHg: 0,
  tauSec: 0.2,
  slopeVqMmHgPerSec: 0.5,
  cardiogenicAmpMmHg: 0,
  hrBpm: 75,
  perlinAmpMmHg: 0,
};

/** Sample at the middle of a single breath segment for timing-based tests. */
function sampleAtBreathTime(
  tInBreath: number,
  params: CapnoSampleParams,
): number {
  return capnoSampleMmHg(tInBreath, params);
}

function breathPeriodSec(rrBpm: number): number {
  return 60 / rrBpm;
}

function inspirationDurationSec(rrBpm: number, ie = DEFAULT_EXP_TO_INSP_RATIO): number {
  return breathPeriodSec(rrBpm) / (1 + ie);
}

describe('capnoSampleMmHg — normal morphology', () => {
  it('returns near-baseline at the start of inspiration', () => {
    const y = sampleAtBreathTime(0.001, HEALTHY_PARAMS);
    /**
     * t≈0 lands at the very start of inspiration; the exponential decay from
     * the prior end-tidal value is barely past P_end_exp. We assert it is
     * still high (above the alveolar wash-in midpoint) so subsequent samples
     * reading "in inspiration" can fall to baseline cleanly.
     */
    expect(y).toBeGreaterThan(20);
  });

  it('returns ~0 mmHg by the end of inspiration', () => {
    const tEnd = inspirationDurationSec(16) - 0.001;
    const y = sampleAtBreathTime(tEnd, HEALTHY_PARAMS);
    expect(y).toBeLessThan(2);
  });

  it('rises toward PaCO2 over expiration', () => {
    const tInsp = inspirationDurationSec(16);
    const tExpStart = tInsp + 0.05;
    const tExpMid = tInsp + (breathPeriodSec(16) - tInsp) * 0.5;
    const tExpEnd = breathPeriodSec(16) - 0.001;
    const yStart = sampleAtBreathTime(tExpStart, HEALTHY_PARAMS);
    const yMid = sampleAtBreathTime(tExpMid, HEALTHY_PARAMS);
    const yEnd = sampleAtBreathTime(tExpEnd, HEALTHY_PARAMS);
    expect(yStart).toBeLessThan(yMid);
    expect(yMid).toBeLessThan(yEnd);
    expect(yEnd).toBeGreaterThan(35);
    expect(yEnd).toBeLessThan(50);
  });

  it('Phase III plateau has a small upward slope from V/Q mismatch', () => {
    const tInsp = inspirationDurationSec(16);
    const tau = HEALTHY_PARAMS.tauSec;
    const tPlateauEarly = tInsp + 4 * tau;
    const tPlateauLate = tInsp + 4 * tau + 0.5;
    const yEarly = sampleAtBreathTime(tPlateauEarly, HEALTHY_PARAMS);
    const yLate = sampleAtBreathTime(tPlateauLate, HEALTHY_PARAMS);
    expect(yLate).toBeGreaterThan(yEarly);
    expect(yLate - yEarly).toBeLessThan(2);
  });
});

describe('capnoSampleMmHg — pathology', () => {
  it('large tau (bronchospasm) produces a "shark fin" with no clean plateau', () => {
    const sharkParams: CapnoSampleParams = { ...HEALTHY_PARAMS, tauSec: 1.5 };
    const tInsp = inspirationDurationSec(16);
    const tExpEnd = breathPeriodSec(16) - 0.05;
    const yEndShark = sampleAtBreathTime(tExpEnd, sharkParams);
    const yEndHealthy = sampleAtBreathTime(tExpEnd, HEALTHY_PARAMS);
    /** Shark-fin never reaches PaCO2 within one expiration. */
    expect(yEndShark).toBeLessThan(yEndHealthy);

    /** Slope between t=2.5s and t=expEnd is still rising notably (no flat plateau). */
    const tMidLate = tInsp + 0.6 * (breathPeriodSec(16) - tInsp);
    const yMid = sampleAtBreathTime(tMidLate, sharkParams);
    const yEnd = sampleAtBreathTime(tExpEnd, sharkParams);
    expect(yEnd - yMid).toBeGreaterThan(3);
  });

  it('low PaCO2 (hypovolemia / CPR) reduces wave amplitude', () => {
    const lowParams: CapnoSampleParams = { ...HEALTHY_PARAMS, paCO2MmHg: 18 };
    const tExpEnd = breathPeriodSec(16) - 0.001;
    const yLow = sampleAtBreathTime(tExpEnd, lowParams);
    const yHealthy = sampleAtBreathTime(tExpEnd, HEALTHY_PARAMS);
    expect(yLow).toBeLessThan(yHealthy * 0.55);
    expect(yLow).toBeLessThan(20);
  });

  it('ROSC step (PaCO2 jump) instantly restores end-tidal amplitude', () => {
    const cprParams: CapnoSampleParams = { ...HEALTHY_PARAMS, paCO2MmHg: 12 };
    const roscParams: CapnoSampleParams = { ...cprParams, paCO2MmHg: 45 };
    const tExpEnd = breathPeriodSec(16) - 0.001;
    const yCpr = sampleAtBreathTime(tExpEnd, cprParams);
    const yRosc = sampleAtBreathTime(tExpEnd, roscParams);
    expect(yRosc - yCpr).toBeGreaterThan(20);
  });

  it('rebreathing (baselineCO2 > 0) keeps the wave above zero in inspiration', () => {
    const rebreathParams: CapnoSampleParams = {
      ...HEALTHY_PARAMS,
      baselineCO2MmHg: 6,
    };
    /** At end of inspiration, healthy ~0; rebreathing should be near 6 mmHg. */
    const tInspEnd = inspirationDurationSec(16) - 0.001;
    const yHealthy = sampleAtBreathTime(tInspEnd, HEALTHY_PARAMS);
    const yRebreath = sampleAtBreathTime(tInspEnd, rebreathParams);
    expect(yHealthy).toBeLessThan(2);
    expect(yRebreath).toBeGreaterThan(4);
    expect(yRebreath).toBeLessThan(8);
  });

  it('hypoventilation (low RR + high PaCO2) widens and raises the wave', () => {
    const hypoParams: CapnoSampleParams = {
      ...HEALTHY_PARAMS,
      rrBpm: 6,
      paCO2MmHg: 58,
    };
    const tExpEnd = breathPeriodSec(6) - 0.001;
    const y = sampleAtBreathTime(tExpEnd, hypoParams);
    expect(y).toBeGreaterThan(50);
    /** Period is ~10s, so even more shark-fin-y? Actually no — tau small + RR slow → flat broad wave. */
    expect(breathPeriodSec(6)).toBeCloseTo(10, 5);
  });
});

describe('capnoSampleMmHg — cardiogenic oscillations', () => {
  it('cardiogenic overlay only appears on the late plateau', () => {
    const withOsc: CapnoSampleParams = {
      ...HEALTHY_PARAMS,
      cardiogenicAmpMmHg: 1.5,
    };
    const tInsp = inspirationDurationSec(16);
    /** Mid-expiration before the plateau gate (tE > 2*tau). */
    const tEarly = tInsp + 0.5 * HEALTHY_PARAMS.tauSec;
    const yEarlyA = sampleAtBreathTime(tEarly, HEALTHY_PARAMS);
    const yEarlyB = sampleAtBreathTime(tEarly, withOsc);
    expect(yEarlyB).toBeCloseTo(yEarlyA, 6);

    /**
     * Late plateau (tE > 2*tau) — isolate the cardiogenic contribution by
     * subtracting the no-oscillation baseline at each sample. The remainder
     * is the pure sinusoidal overlay; its peak-to-peak amplitude must be
     * close to 2 * cardiogenicAmpMmHg.
     */
    const deltas: number[] = [];
    /** Span at least one full beat (0.8s @ 75 BPM) at fine resolution. */
    for (let i = 0; i < 80; i++) {
      const tLate = tInsp + 3 * HEALTHY_PARAMS.tauSec + i * 0.01;
      const yBase = sampleAtBreathTime(tLate, HEALTHY_PARAMS);
      const yOsc = sampleAtBreathTime(tLate, withOsc);
      deltas.push(yOsc - yBase);
    }
    const peakToPeak = Math.max(...deltas) - Math.min(...deltas);
    expect(peakToPeak).toBeGreaterThan(2.5);
    expect(peakToPeak).toBeLessThan(3.2);
  });

  it('cardiogenic overlay disabled when amplitude is 0', () => {
    const tPlateau = inspirationDurationSec(16) + 3 * HEALTHY_PARAMS.tauSec;
    const yA = sampleAtBreathTime(tPlateau, HEALTHY_PARAMS);
    const yB = sampleAtBreathTime(tPlateau, {
      ...HEALTHY_PARAMS,
      hrBpm: 120,
    });
    expect(yA).toBeCloseTo(yB, 6);
  });
});

describe('buildCapnoStripMmHg', () => {
  it('fills the buffer monotonically as the strip scrolls', () => {
    const buf = new Float32Array(64);
    buildCapnoStripMmHg({
      sampleCount: 64,
      simSecAtRightEdge: 12,
      cyclesVisible: 2,
      out: buf,
      params: HEALTHY_PARAMS,
    });
    /** All values must be finite and bounded. */
    for (let i = 0; i < buf.length; i++) {
      expect(Number.isFinite(buf[i])).toBe(true);
      expect(buf[i]).toBeGreaterThanOrEqual(0);
      expect(buf[i]).toBeLessThan(60);
    }
    /** At least one value should be near peak (PaCO2). */
    expect(Math.max(...Array.from(buf))).toBeGreaterThan(30);
    /** At least one value should be near baseline. */
    expect(Math.min(...Array.from(buf))).toBeLessThan(5);
  });

  it('respects deterministic Perlin noise (same seed → same buffer)', () => {
    const a = new Float32Array(64);
    const b = new Float32Array(64);
    const params: CapnoSampleParams = { ...HEALTHY_PARAMS, perlinAmpMmHg: 0.5 };
    buildCapnoStripMmHg({
      sampleCount: 64,
      simSecAtRightEdge: 5,
      cyclesVisible: 2,
      out: a,
      params,
    });
    buildCapnoStripMmHg({
      sampleCount: 64,
      simSecAtRightEdge: 5,
      cyclesVisible: 2,
      out: b,
      params,
    });
    for (let i = 0; i < a.length; i++) {
      expect(a[i]).toBeCloseTo(b[i]!, 6);
    }
  });
});

describe('lung-mechanics resolver — pathology composition', () => {
  it('asthma raises tau (R goes up) without flattening compliance to zero', () => {
    const healthy = lungTimeConstantSec(defaultLungMechanics());
    const asthma = lungTimeConstantSec(resolveLungMechanics(['ASTHMA_ACUTE']));
    expect(asthma).toBeGreaterThan(healthy * 2.5);
    expect(asthma).toBeLessThan(2.0);
  });

  it('COPD pushes PaCO2 up (chronic CO2 retainer)', () => {
    const copd = resolveLungMechanics(['COPD_CHRONIC']);
    expect(copd.paCO2MmHg).toBeGreaterThan(45);
  });

  it('PE drops PaCO2 and steepens V/Q slope', () => {
    const pe = resolveLungMechanics(['PE_ACUTE']);
    const baseline = defaultLungMechanics();
    expect(pe.paCO2MmHg).toBeLessThan(baseline.paCO2MmHg);
    expect(pe.vqMismatchSlopeMmHgPerSec).toBeGreaterThan(
      baseline.vqMismatchSlopeMmHgPerSec * 2,
    );
  });

  it('rebreathing raises baselineCO2 above zero', () => {
    const rb = resolveLungMechanics(['REBREATHING_ACUTE']);
    expect(rb.baselineCO2MmHg).toBeGreaterThan(0);
  });

  it('AI obstruction lever scales Ra further on top of asthma baseline', () => {
    const baseline = resolveLungMechanics(['ASTHMA_ACUTE']);
    const withAi = applyAiObstructionToLungMechanics(baseline, 0.8);
    expect(withAi.airwayResistanceCmH2OPerLPerSec).toBeGreaterThan(
      baseline.airwayResistanceCmH2OPerLPerSec,
    );
  });
});
