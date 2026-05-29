import { describe, it, expect } from 'vitest';
import {
  defaultPathophysiologyAxes,
  resolveComorbidityAxes,
} from '@/lib/physiology/comorbidity-resolve';
import { COMORBIDITY_MATRIX } from '@/lib/physiology/comorbidity-matrix';
import { replayAutonomicAt } from '@/lib/physiology/autonomic-engine';
import { mergeVitalsForDisplay } from '@/lib/physiology/pk-engine';
import { zeroDeltas } from '@/lib/physiology/pk-types';
import type { AutonomicEvent } from '@/lib/physiology/autonomic-types';
import type { PathophysiologyAxes } from '@/lib/physiology/types';

/**
 * ATLS hemorrhage-class acceptance test — the clinical lesson the sim must
 * teach correctly. Encodes the Advanced Trauma Life Support classification for
 * a healthy ~80 kg adult (blood volume ≈ 5600 mL). ATLS defines classes by
 * VOLUME LOST, not bleed rate, so we read vitals at the sim-second where
 * cumulative loss crosses each class boundary.
 *
 * Source: StatPearls "Hemorrhagic Shock" (NBK470382), ACS/ATLS classes I–IV.
 * Dynamics cross-check: Pulse Physiology Engine hemorrhage benchmark
 * (10% loss/30 s → HR +30%, CO −15–20%, SVR +10–15%).
 *
 * This is a calibration target: it pins the behavior we tune the autonomic
 * constants (actuator ceiling, time constants, pulse-pressure split) against,
 * so "Claude picked 26 and 8" becomes "reproduces Class II→IV on the standard
 * trauma timeline." Cases that don't yet pass mark remaining tuning work.
 */
const BLOOD_VOL_ML = 5600; // 70 mL/kg × 80 kg
const BLEED_ML_PER_MIN = 240; // 4 mL/s
const BASE = { hr: '85 bpm', bp: '120/80', rr: '16/min', spo2: '98%', gcs: '15' };

const secAtLoss = (fraction: number) =>
  Math.round((BLOOD_VOL_ML * fraction) / (BLEED_ML_PER_MIN / 60));

const bleedEvent: AutonomicEvent[] = [
  {
    id: 'b',
    sessionId: 's',
    userId: 'u',
    kind: 'bleed_rate_set',
    payload: { rateMlPerMin: BLEED_ML_PER_MIN },
    simSeconds: 0,
    recordedAt: new Date(0).toISOString(),
  },
];

function vitalsAtLoss(
  fraction: number,
  axes: PathophysiologyAxes = defaultPathophysiologyAxes(),
) {
  const r = replayAutonomicAt(
    bleedEvent,
    secAtLoss(fraction),
    axes,
    80,
    { baselineBleedRateMlPerMin: BLEED_ML_PER_MIN },
    BASE,
    () => zeroDeltas(),
  );
  const m = mergeVitalsForDisplay(BASE, r.cumulativeDeltas);
  const [sys, dia] = m.bp.split('/').map((n) => Number.parseInt(n, 10));
  return {
    hr: Number.parseInt(m.hr, 10),
    sys,
    dia,
    pp: sys - dia,
    rr: Number.parseInt(m.rr, 10),
    phase: r.decompensationPhase,
  };
}

describe('ATLS hemorrhage classes (calibration target)', () => {
  it('Class I (<15% loss): vitals near-normal', () => {
    const v = vitalsAtLoss(0.1);
    expect(v.hr).toBeLessThanOrEqual(100);
    expect(v.sys).toBeGreaterThanOrEqual(105); // "no change" — within a few mmHg of baseline
    expect(v.rr).toBeLessThanOrEqual(20);
  });

  it('Class II (15–30% loss): tachycardia + narrowing pulse pressure, systolic preserved', () => {
    const v = vitalsAtLoss(0.25);
    expect(v.hr).toBeGreaterThanOrEqual(100);
    expect(v.hr).toBeLessThanOrEqual(120);
    expect(v.sys).toBeGreaterThanOrEqual(100); // "unchanged to slightly decreased"...
    expect(v.pp).toBeLessThan(40); // ...but pulse pressure narrows (the key sign)
    expect(v.rr).toBeGreaterThanOrEqual(20);
    expect(v.rr).toBeLessThanOrEqual(24);
  });

  it('Class III (30–40% loss): systolic clearly drops, HR 120–140', () => {
    const v = vitalsAtLoss(0.35);
    expect(v.hr).toBeGreaterThanOrEqual(120);
    expect(v.hr).toBeLessThanOrEqual(140);
    expect(v.sys).toBeLessThan(110);
    expect(v.rr).toBeGreaterThanOrEqual(24);
  });

  it('Class IV (>40% loss): systolic <90, HR >120, pulse pressure ≤25', () => {
    const v = vitalsAtLoss(0.45);
    expect(v.sys).toBeLessThan(90);
    expect(v.hr).toBeGreaterThan(120);
    expect(v.pp).toBeLessThanOrEqual(25);
  });
});

/**
 * Comorbidity modifiers on the hemorrhage response — the ATLS class table
 * assumes a healthy adult, but the two clinically dangerous deviations a sim
 * must teach are blunted tachycardia and reduced reserve. Assertions are
 * comparative against the healthy patient at the same blood loss, so they pin
 * the teaching point (direction + danger) rather than brittle absolute numbers.
 */
describe('ATLS hemorrhage — comorbidity modifiers', () => {
  const bbAxes = resolveComorbidityAxes([COMORBIDITY_MATRIX.BB_BLOCKADE.id]);
  // Severe diabetic autonomic neuropathy: blunted reflex + low vascular reserve
  // — a stand-in for the frail/elderly "reduced reserve" patient.
  const lowReserveAxes = resolveComorbidityAxes([
    COMORBIDITY_MATRIX.DIABETES_SEVERE.id,
  ]);

  it('β-blockade masks the tachycardia (the classic trauma trap)', () => {
    const healthy = vitalsAtLoss(0.35);
    const bb = vitalsAtLoss(0.35, bbAxes);
    // Heart rate is dramatically blunted vs the healthy Class III response...
    expect(bb.hr).toBeLessThan(healthy.hr - 25);
    expect(bb.hr).toBeLessThan(100); // looks reassuringly non-tachycardic
    // ...yet the patient is genuinely decompensating — BP still falls, because
    // α-mediated vasoconstriction is intact. HR does not reflect the bleed.
    expect(bb.sys).toBeLessThan(110);
  });

  it('reduced reserve decompensates harder and sooner than a healthy patient', () => {
    const healthy = vitalsAtLoss(0.35);
    const frail = vitalsAtLoss(0.35, lowReserveAxes);
    // Lower achievable compensation → lower pressure at the same blood loss...
    expect(frail.sys).toBeLessThan(healthy.sys);
    // ...blunted tachycardia (impaired autonomic response)...
    expect(frail.hr).toBeLessThan(healthy.hr);
    // ...and a worse decompensation phase than the still-decompensating healthy
    // patient at the identical loss.
    expect(frail.phase).toBe('crashing');
    expect(healthy.phase).not.toBe('crashing');
  });
});

/**
 * Pediatric hemorrhage pattern. A ~20 kg child (blood volume 70 mL/kg ≈
 * 1400 mL) compensates with aggressive tachycardia while defending blood
 * pressure, so a near-normal BP alongside marked tachycardia is the warning
 * sign and frank hypotension is a late, ominous finding.
 *
 * Honest limitation: the textbook *precipitous* systolic cliff once reserve is
 * exhausted is steeper than this lumped-MAP model produces (it declines
 * proportionally rather than via a sharp knee). The dominant teaching pattern —
 * tachycardia-first compensation, late hypotension — does hold and is what we
 * pin here. A true pediatric reserve model is future work.
 */
describe('ATLS hemorrhage — pediatric pattern', () => {
  const PEDS_BASE = {
    hr: '110 bpm',
    bp: '100/65',
    rr: '24/min',
    spo2: '98%',
    gcs: '15',
  };
  const PEDS_WT = 20;
  const PEDS_BV_ML = 70 * PEDS_WT; // 1400 mL
  const PEDS_RATE = 60; // mL/min
  const pedsEvent: AutonomicEvent[] = [
    { ...bleedEvent[0]!, payload: { rateMlPerMin: PEDS_RATE } },
  ];

  function pedsAtLoss(fraction: number) {
    const sec = Math.round((PEDS_BV_ML * fraction) / (PEDS_RATE / 60));
    const r = replayAutonomicAt(
      pedsEvent,
      sec,
      defaultPathophysiologyAxes(),
      PEDS_WT,
      { baselineBleedRateMlPerMin: PEDS_RATE, baselineMapMmHg: 77 },
      PEDS_BASE,
      () => zeroDeltas(),
    );
    const m = mergeVitalsForDisplay(PEDS_BASE, r.cumulativeDeltas);
    const [sys, dia] = m.bp.split('/').map((n) => Number.parseInt(n, 10));
    return {
      hr: Number.parseInt(m.hr, 10),
      sys,
      pp: sys - dia,
      phase: r.decompensationPhase,
    };
  }

  it('compensates with marked tachycardia while BP is still preserved (the warning sign)', () => {
    const v = pedsAtLoss(0.25);
    expect(v.hr).toBeGreaterThanOrEqual(140); // aggressive, tachycardia-first compensation
    expect(v.sys).toBeGreaterThanOrEqual(80); // BP not yet frankly hypotensive
  });

  it('hypotension and crash are late findings, not early ones', () => {
    const early = pedsAtLoss(0.25);
    const late = pedsAtLoss(0.45);
    expect(early.phase).not.toBe('crashing'); // still compensating at a quarter down
    expect(late.sys).toBeLessThan(75); // frank hypotension only when deep into loss
    expect(late.phase).toBe('crashing');
    expect(late.hr).toBeLessThanOrEqual(300); // bounded — no runaway
  });
});
