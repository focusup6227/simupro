import { describe, expect, it } from 'vitest';
import {
  cardioversionSuccessProbability,
  isOrganizedTachyForCardioversion,
  tcpCaptureBand,
} from '@/lib/life-support-logic';

describe('life-support-logic', () => {
  it('tcpCaptureBand thresholds', () => {
    expect(tcpCaptureBand(35, 60)).toBe('none');
    expect(tcpCaptureBand(59, 60)).toBe('intermittent');
    expect(tcpCaptureBand(61, 60)).toBe('intermittent');
    expect(tcpCaptureBand(65, 60)).toBe('full');
  });

  it('organized tachy heuristic', () => {
    expect(isOrganizedTachyForCardioversion('svt')).toBe(true);
    expect(isOrganizedTachyForCardioversion('vfib')).toBe(false);
    expect(isOrganizedTachyForCardioversion('pulseless_vt')).toBe(false);
  });

  it('cardioversion probability is bounded', () => {
    const p = cardioversionSuccessProbability({
      kind: 'svt',
      energyJoules: 100,
      attempts: 2,
      rhythmResistance: 1,
    });
    expect(p).toBeGreaterThanOrEqual(0.06);
    expect(p).toBeLessThanOrEqual(0.94);
  });
});
