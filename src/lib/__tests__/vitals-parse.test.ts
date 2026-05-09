import { describe, expect, it } from 'vitest';
import {
  formatEtco2ForMonitor,
  formatSpo2ForMonitor,
  parseBpString,
  parseEtco2MmHg,
  parseHeartRateBpm,
} from '@/lib/vitals-parse';

describe('parseEtco2MmHg', () => {
  it('returns 35 default when value is missing', () => {
    expect(parseEtco2MmHg(undefined)).toBe(35);
    expect(parseEtco2MmHg(null)).toBe(35);
    expect(parseEtco2MmHg('')).toBe(35);
    expect(parseEtco2MmHg('   ')).toBe(35);
    expect(parseEtco2MmHg('mmHg')).toBe(35);
  });

  it('clamps the upper bound at 80 mmHg for hallucinated outliers', () => {
    expect(parseEtco2MmHg('999 mmHg')).toBe(80);
    expect(parseEtco2MmHg('120')).toBe(80);
  });

  it('allows a true 0 mmHg flatline for deceased / asystolic patients', () => {
    expect(parseEtco2MmHg('0 mmHg')).toBe(0);
    expect(parseEtco2MmHg('0')).toBe(0);
  });

  it('parses decimals and intermediate values cleanly', () => {
    expect(parseEtco2MmHg('12.5 mmHg')).toBeCloseTo(12.5);
    expect(parseEtco2MmHg('38')).toBe(38);
  });

  it('falls back when the string contains no numeric token', () => {
    expect(parseEtco2MmHg('—')).toBe(35);
    expect(parseEtco2MmHg('not measured')).toBe(35);
  });
});

describe('parseHeartRateBpm', () => {
  it('extracts numeric HR even from extreme labels', () => {
    expect(parseHeartRateBpm('300 bpm')).toBe(300);
    expect(parseHeartRateBpm('48')).toBe(48);
  });

  it('returns null when no numeric token is present', () => {
    expect(parseHeartRateBpm('Asystole')).toBeNull();
    expect(parseHeartRateBpm('')).toBeNull();
  });
});

describe('parseBpString', () => {
  it('parses 0/0 (no pulse)', () => {
    const r = parseBpString('0/0 (no pulse)');
    // BP regex requires 2-3 digits — 0/0 falls outside, so we expect null/null
    // and the runner relies on the no-pulse text classifier (vitalsSuggestPulselessArrest).
    expect(r.bpSys).toBeNull();
    expect(r.bpDia).toBeNull();
  });

  it('parses standard cuff readings', () => {
    expect(parseBpString('128/76 mmHg')).toEqual({ bpSys: 128, bpDia: 76 });
  });
});

describe('format helpers', () => {
  it('formats SpO2 stripping room-air suffix', () => {
    expect(formatSpo2ForMonitor('97% on Room Air')).toBe('97%');
    expect(formatSpo2ForMonitor('—')).toBe('');
  });

  it('formats EtCO2 readout with default when stored is empty', () => {
    expect(formatEtco2ForMonitor('')).toBe('35 mmHg');
    expect(formatEtco2ForMonitor('38 mmHg')).toBe('38 mmHg');
  });
});
