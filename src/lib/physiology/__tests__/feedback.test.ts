import { describe, expect, it } from 'vitest';
import {
  buildPhysiologyFeedbackSnapshot,
  clampFeedback01,
  clampPhysiologyFeedback,
  parseFeedbackNumber,
  parseMapMmHg,
} from '@/lib/physiology/feedback';
import { defaultPathophysiologyAxes } from '@/lib/physiology/comorbidity-resolve';

describe('physiology feedback snapshot', () => {
  it('parses vitals and derives bounded stress drives', () => {
    const feedback = buildPhysiologyFeedbackSnapshot({
      hr: '132 bpm',
      bp: '72/40',
      rr: '34/min',
      spo2: '84%',
      etco2: '58 mmHg',
      ph: 7.12,
      lactateMmol: 6.4,
      axes: defaultPathophysiologyAxes(),
    });

    expect(feedback.mapMmHg).toBeCloseTo(50.67, 2);
    expect(feedback.hypoxicDrive).toBeGreaterThan(0);
    expect(feedback.hypercarbicDrive).toBeGreaterThan(0);
    expect(feedback.acidemiaDrive).toBeGreaterThan(0);
    expect(feedback.shockDrive).toBeGreaterThan(0);
    expect(feedback.perfusionFactor).toBeGreaterThanOrEqual(0.15);
    expect(feedback.perfusionFactor).toBeLessThanOrEqual(1.15);
    expect(feedback.sympatheticAmplifier).toBeLessThanOrEqual(1.75);
    expect(feedback.vasoplegiaPenalty).toBeGreaterThanOrEqual(0);
    expect(feedback.inflammatoryCoagDrive).toBeGreaterThanOrEqual(0);
  });

  it('keeps helper parsing and clamps deterministic', () => {
    expect(parseFeedbackNumber('GCS 13 (E3 V4 M6)')).toBe(13);
    expect(parseMapMmHg('120/60')).toBe(80);
    expect(clampFeedback01(Number.NaN)).toBe(0);
    expect(clampPhysiologyFeedback(99, 0, 10)).toBe(10);
  });
});

