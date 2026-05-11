import { describe, expect, it } from 'vitest';
import {
  defaultMetabolicState,
  tickMetabolic,
} from '@/lib/physiology/metabolic-engine';
import { defaultPathophysiologyAxes } from '@/lib/physiology/comorbidity-resolve';
import { buildPhysiologyFeedbackSnapshot } from '@/lib/physiology/feedback';

describe('tickMetabolic', () => {
  it('accumulates lactate under sustained perfusion stress', () => {
    const axes = defaultPathophysiologyAxes();
    let st = defaultMetabolicState();

    st = tickMetabolic(st, 1, {
      axes,
      mapMmHg: 55,
      rrPerMin: 18,
      bleedRateMlPerMin: 40,
      decompensationPhase: 'decompensating',
      lactateBump: 0,
      pediatricScale: 1,
    });

    expect(st.lactateMmol).toBeGreaterThan(1);
    expect(st.bicarbMeqL).toBeLessThanOrEqual(24.0001);
    expect(st.ph).toBeLessThan(7.4);
  });

  it('is deterministic for identical single-step inputs', () => {
    const axes = defaultPathophysiologyAxes();
    const input = {
      axes,
      mapMmHg: 72,
      rrPerMin: 18,
      bleedRateMlPerMin: 0,
      decompensationPhase: 'baseline' as const,
      lactateBump: 0,
      pediatricScale: 1,
    };
    expect(tickMetabolic(defaultMetabolicState(), 1, input)).toEqual(
      tickMetabolic(defaultMetabolicState(), 1, input),
    );
  });

  it('responds to pediatricScale multiplier', () => {
    const axes = defaultPathophysiologyAxes();

    let a = defaultMetabolicState();
    let b = defaultMetabolicState();
    const inputBase = {
      axes,
      mapMmHg: 60,
      rrPerMin: 24,
      bleedRateMlPerMin: 0,
      decompensationPhase: 'compensated' as const,
      lactateBump: 0,
    };

    for (let i = 0; i < 20; i++) {
      a = tickMetabolic(a, 1, { ...inputBase, pediatricScale: 1 });
      b = tickMetabolic(b, 1, { ...inputBase, pediatricScale: 1.3 });
    }

    expect(b.lactateMmol).toBeGreaterThan(a.lactateMmol);
  });

  it('hypoxia and low perfusion feedback increase lactate generation', () => {
    const axes = defaultPathophysiologyAxes();
    const feedback = buildPhysiologyFeedbackSnapshot({
      hr: '128',
      bp: '66/38',
      rr: '30',
      spo2: '82%',
      etco2: '24 mmHg',
      ph: 7.18,
      lactateMmol: 5,
      axes,
    });
    const input = {
      axes,
      mapMmHg: 58,
      rrPerMin: 24,
      bleedRateMlPerMin: 20,
      decompensationPhase: 'decompensating' as const,
      lactateBump: 0,
      pediatricScale: 1,
    };

    const base = tickMetabolic(defaultMetabolicState(), 1, input);
    const coupled = tickMetabolic(defaultMetabolicState(), 1, {
      ...input,
      feedback,
    });
    expect(coupled.lactateMmol).toBeGreaterThan(base.lactateMmol);
  });
});
