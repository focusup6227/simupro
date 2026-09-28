import { describe, expect, it } from 'vitest';
import {
  EPI_MIN_INTERVAL_SECONDS,
  canGiveEpi,
  epiDoseStatus,
  formatMmSs,
} from '@/lib/aed-state';

describe('epiDoseStatus', () => {
  it('allows the first dose at any time', () => {
    expect(epiDoseStatus(null, 0)).toEqual({ state: 'no_doses' });
    expect(canGiveEpi(null, 42)).toBe(true);
  });

  it('locks repeat doses for 3 minutes of sim time', () => {
    expect(EPI_MIN_INTERVAL_SECONDS).toBe(180);
    expect(epiDoseStatus(100, 107)).toEqual({
      state: 'locked',
      secondsSinceLast: 7,
      secondsUntilDue: 173,
    });
    expect(canGiveEpi(100, 279)).toBe(false);
  });

  it('reproduces the bug report: 6 presses in 7 seconds yield one dose', () => {
    let lastDoseAt: number | null = null;
    let doses = 0;
    for (const t of [60, 61, 62, 64, 65, 67]) {
      if (canGiveEpi(lastDoseAt, t)) {
        lastDoseAt = t;
        doses += 1;
      }
    }
    expect(doses).toBe(1);
  });

  it('marks a dose due once 3 minutes have passed', () => {
    expect(epiDoseStatus(100, 280)).toEqual({ state: 'due', secondsSinceLast: 180 });
    expect(epiDoseStatus(100, 400)).toEqual({ state: 'due', secondsSinceLast: 300 });
    expect(canGiveEpi(100, 280)).toBe(true);
  });

  it('does not unlock early when the sim clock moves backwards', () => {
    expect(epiDoseStatus(100, 50)).toEqual({
      state: 'locked',
      secondsSinceLast: 0,
      secondsUntilDue: 180,
    });
  });
});

describe('formatMmSs', () => {
  it('formats minutes and seconds', () => {
    expect(formatMmSs(134)).toBe('2:14');
    expect(formatMmSs(5)).toBe('0:05');
    expect(formatMmSs(0)).toBe('0:00');
    expect(formatMmSs(0.2)).toBe('0:01');
    expect(formatMmSs(-3)).toBe('0:00');
  });
});
