import { describe, expect, it } from 'vitest';
import {
  mergeVitalsForDisplay,
  unmergeVitalsFromDisplay,
} from '@/lib/physiology/pk-engine';
import { replayAutonomicAt } from '@/lib/physiology/autonomic-engine';
import {
  conditionIdsForScenario,
  resolveComorbidityAxes,
} from '@/lib/physiology/comorbidity-resolve';
import {
  parseTreatmentSelectionsToStressors,
  partnerTreatmentSelections,
} from '@/lib/physiology/intervention-stressor-parser';
import { zeroDeltas, type VitalDeltas } from '@/lib/physiology/pk-types';
import type { AutonomicEvent } from '@/lib/physiology/autonomic-types';
import {
  ADULT_SINUS_HR_CEILING_BPM,
  minPulsePressure,
  namesTachyarrhythmia,
  repairPulsePressure,
} from '@/lib/physiology/vital-plausibility';
import { curatedPhysiologyScenarios } from '@/lib/scenarios-data';

const deltas = (d: Partial<VitalDeltas>): VitalDeltas => ({ ...zeroDeltas(), ...d });
const num = (s: string) => Number.parseInt(s, 10);
const bpOf = (bp: string) => bp.split('/').map((n) => Number.parseInt(n, 10)) as [number, number];

describe('plausibility helpers', () => {
  it('minPulsePressure floors at 15 (10 obstructive), scaling down for profound hypotension', () => {
    expect(minPulsePressure(120)).toBe(15);
    expect(minPulsePressure(120, true)).toBe(10);
    expect(minPulsePressure(50)).toBe(10);
    expect(minPulsePressure(20)).toBe(8);
  });

  it('repairPulsePressure lowers the diastolic, never the systolic', () => {
    expect(repairPulsePressure(76, 76, 15)).toEqual({ sys: 76, dia: 61 });
    expect(repairPulsePressure(96, 78, 15)).toEqual({ sys: 96, dia: 78 });
    expect(repairPulsePressure(92, 80, 15)).toEqual({ sys: 92, dia: 77 });
  });

  it('namesTachyarrhythmia recognizes non-sinus rhythms but not sinus tach', () => {
    expect(namesTachyarrhythmia('220 bpm SVT')).toBe(true);
    expect(namesTachyarrhythmia('ECG rhythm: atrial fibrillation with RVR')).toBe(true);
    expect(namesTachyarrhythmia('wide-complex tachycardia')).toBe(true);
    expect(namesTachyarrhythmia('190 bpm sinus tachycardia')).toBe(false);
  });
});

describe('mergeVitalsForDisplay plausibility clamps', () => {
  const BASE = { hr: '132 bpm', bp: '88/58', rr: '24/min', spo2: '94%', gcs: '15' };

  it('engine-driven tachycardia cannot exceed the sinus ceiling', () => {
    const m = mergeVitalsForDisplay(BASE, deltas({ hr: 150 }));
    expect(num(m.hr)).toBe(ADULT_SINUS_HR_CEILING_BPM);
  });

  it('a baseline already above the ceiling (labeled tachyarrhythmia) is not pulled down', () => {
    const m = mergeVitalsForDisplay({ ...BASE, hr: '210 bpm SVT' }, deltas({ hr: 10 }));
    expect(num(m.hr)).toBe(210);
    const slower = mergeVitalsForDisplay({ ...BASE, hr: '210 bpm SVT' }, deltas({ hr: -30 }));
    expect(num(slower.hr)).toBe(180);
  });

  it('engine-driven tachypnea is capped at the adult RR ceiling', () => {
    const m = mergeVitalsForDisplay(BASE, deltas({ rr: 45 }));
    expect(num(m.rr)).toBe(50);
  });

  it('deltas cannot collapse pulse pressure (no 76/76)', () => {
    const m = mergeVitalsForDisplay(BASE, deltas({ sBp: -12, dBp: 18 }));
    const [sys, dia] = bpOf(m.bp);
    expect(sys).toBe(76);
    expect(sys - dia).toBeGreaterThanOrEqual(15);
  });

  it('leaves normal pulse-pressure narrowing alone', () => {
    const m = mergeVitalsForDisplay({ ...BASE, bp: '120/80' }, deltas({ sBp: -10, dBp: 5 }));
    expect(m.bp).toBe('110/85');
  });
});

describe('unmergeVitalsFromDisplay — no double counting of engine deltas', () => {
  const D = deltas({ hr: 28, sBp: -14, dBp: -4, rr: 9, spo2: -4 });

  it('re-merging the unmerged baseline reproduces the displayed vitals', () => {
    const displayed = { hr: '150 bpm', bp: '84/60 mmHg', rr: '30/min', spo2: '90% on O2', gcs: '14' };
    const base = unmergeVitalsFromDisplay(displayed, D);
    const again = mergeVitalsForDisplay(base, D);
    expect(num(again.hr)).toBe(150);
    expect(again.bp).toBe('84/60');
    expect(num(again.rr)).toBe(30);
    expect(num(again.spo2)).toBe(90);
    expect(base.spo2).toBe('94% on O2');
  });

  it('passes arrest-format vitals through unchanged', () => {
    const arrest = { hr: 'PEA @ 40 bpm', bp: '0/0 (no pulse)', rr: '0/min', spo2: '—', gcs: '3' };
    const base = unmergeVitalsFromDisplay(arrest, D);
    expect(base.bp).toBe('0/0 (no pulse)');
    expect(base.spo2).toBe('—');
  });

  it('an AI that echoes the displayed vitals no longer compounds the engine offset turn over turn', () => {
    // Before the fix the runner stored the AI's (already-merged) vitals as the
    // new baseline, so each turn re-applied the same engine deltas.
    let naiveBase = { hr: '132 bpm', bp: '88/58', rr: '24/min', spo2: '94%', gcs: '15' };
    let fixedBase = { ...naiveBase };
    for (let turn = 0; turn < 6; turn++) {
      naiveBase = mergeVitalsForDisplay(naiveBase, D); // old: store displayed as baseline
      const shown = mergeVitalsForDisplay(fixedBase, D);
      fixedBase = unmergeVitalsFromDisplay(shown, D); // new: store net of deltas
    }
    const naiveShown = mergeVitalsForDisplay(naiveBase, D);
    const fixedShown = mergeVitalsForDisplay(fixedBase, D);
    expect(num(naiveShown.hr)).toBe(ADULT_SINUS_HR_CEILING_BPM); // runaway (to the ceiling)
    expect(bpOf(naiveShown.bp)[0]).toBeLessThan(10);
    expect(num(fixedShown.hr)).toBe(160); // stable: 132 + 28
    expect(fixedShown.bp).toBe('74/54');
  });
});

describe('hemorrhage control slows decline (qa-engine-hemorrhagic-shock)', () => {
  const scenario = curatedPhysiologyScenarios.find((s) => s.id === 'qa-engine-hemorrhagic-shock')!;
  const axes = resolveComorbidityAxes(
    conditionIdsForScenario(scenario.patientProfile, scenario.comorbidities),
  );
  const base = scenario.initialVitals;

  function vitalsAt(sec: number, events: AutonomicEvent[]) {
    const r = replayAutonomicAt(events, sec, axes, 75, scenario.autonomicProfile, base, () => zeroDeltas());
    const m = mergeVitalsForDisplay(base, r.cumulativeDeltas);
    const [sys, dia] = bpOf(m.bp);
    return { hr: num(m.hr), sys, dia, phase: r.decompensationPhase, bleed: r.state.currentBleedRateMlPerMin };
  }

  // Partner-applied tourniquet at t=61 s, routed through the partner path.
  const tourniquet = parseTreatmentSelectionsToStressors(
    partnerTreatmentSelections(['bleeding-control'], 'TQ on — windlass locked, time noted.'),
    { sessionId: 's', userId: 'u', patientWeightKg: 75, simSeconds: 61 },
  );

  it('partner tourniquet chatter maps to a bleed_rate_set 0 event', () => {
    expect(tourniquet).toHaveLength(1);
    expect(tourniquet[0]!.kind).toBe('bleed_rate_set');
    expect(tourniquet[0]!.payload).toEqual({ rateMlPerMin: 0 });
  });

  it('with the tourniquet the engine plateaus; without it the patient keeps sliding', () => {
    const treated120 = vitalsAt(120, tourniquet);
    const treated500 = vitalsAt(500, tourniquet);
    const untreated500 = vitalsAt(500, []);

    expect(treated500.bleed).toBe(0);
    // Plateau: essentially no further systolic fall or tachycardia after control.
    expect(Math.abs(treated500.sys - treated120.sys)).toBeLessThanOrEqual(3);
    expect(treated500.hr - treated120.hr).toBeLessThanOrEqual(3);
    // Untreated is clearly worse at the same time point.
    expect(untreated500.sys).toBeLessThan(treated500.sys - 5);
    expect(untreated500.hr).toBeGreaterThan(treated500.hr);
    // Neither is anywhere near arrest by ~8 min on engine physiology alone.
    expect(treated500.phase).not.toBe('arrested');
    expect(treated500.sys - treated500.dia).toBeGreaterThanOrEqual(15);
    expect(untreated500.sys - untreated500.dia).toBeGreaterThanOrEqual(10);
  });
});

describe('partnerTreatmentSelections', () => {
  it('defaults bleeding control to direct pressure and infers packing', () => {
    const method = (text: string) =>
      partnerTreatmentSelections(['bleeding-control'], text)['bleeding-control']!.subOptions.Method;
    expect(method('Holding pressure')).toBe('Direct Pressure');
    expect(method('Wound packed')).toBe('Wound Packing');
  });

  it('infers O2 flow from the narrative (explicit L/min, else NRB = 15)', () => {
    expect(partnerTreatmentSelections(['oxygen'], 'O2 at 6 L via cannula')
      .oxygen!.subOptions['Flow Rate (L/min)']).toBe('6');
    expect(partnerTreatmentSelections(['oxygen'], 'Non-rebreather on')
      .oxygen!.subOptions['Flow Rate (L/min)']).toBe('15');
  });
});
