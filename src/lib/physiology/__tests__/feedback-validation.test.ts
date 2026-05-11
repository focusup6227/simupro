import { describe, expect, it } from 'vitest';
import {
  defaultPathophysiologyAxes,
  lungTimeConstantSec,
  resolveComorbidityAxes,
} from '@/lib/physiology/comorbidity-resolve';
import { buildPhysiologyFeedbackSnapshot } from '@/lib/physiology/feedback';
import {
  composeLungMechanicsForDisplay,
} from '@/lib/physiology/lung-mechanics-display';
import {
  effectDeltasAt,
} from '@/lib/physiology/pk-engine';
import {
  replayAutonomicAt,
} from '@/lib/physiology/autonomic-engine';
import {
  defaultMetabolicState,
  tickMetabolic,
} from '@/lib/physiology/metabolic-engine';
import { resolveDisplayEtco2MmHg } from '@/lib/physiology/etco2-display';
import type { DoseRecord } from '@/lib/physiology/pk-types';
import type { AutonomicEvent } from '@/lib/physiology/autonomic-types';
import { zeroDeltas } from '@/lib/physiology/pk-types';

const weightKg = 75;
const baseVitals = {
  hr: '82 bpm',
  bp: '122/78',
  rr: '16/min',
  spo2: '97%',
  gcs: '15',
};

function bolus(
  drugId: DoseRecord['drugId'],
  doseMg: number,
  simSeconds: number,
  route: DoseRecord['route'] = 'iv',
): DoseRecord {
  return {
    id: `${drugId}-${simSeconds}`,
    sessionId: 's',
    userId: 'u',
    drugId,
    interventionId: null,
    doseMg,
    route,
    kind: 'bolus',
    infusionRate: null,
    infusionRateKind: null,
    patientWeightKg: weightKg,
    simSeconds,
    administeredAt: new Date(0).toISOString(),
  };
}

describe('physiology golden paths', () => {
  it('asthma plus albuterol reduces airway time constant', () => {
    const axes = defaultPathophysiologyAxes();
    const asthmatic = composeLungMechanicsForDisplay({
      comorbidityIds: ['ASTHMA_CHRONIC'],
      finalEtco2MmHg: 45,
      aiObstruction: 0.7,
      drugConcentrations: {},
      axes,
      rrBpm: 28,
    });
    const treated = composeLungMechanicsForDisplay({
      comorbidityIds: ['ASTHMA_CHRONIC'],
      finalEtco2MmHg: 45,
      aiObstruction: 0.7,
      drugConcentrations: { albuterol: 0.02 },
      axes,
      rrBpm: 28,
    });
    expect(treated.airwayResistanceCmH2OPerLPerSec).toBeLessThan(
      asthmatic.airwayResistanceCmH2OPerLPerSec,
    );
    expect(lungTimeConstantSec(treated)).toBeLessThan(lungTimeConstantSec(asthmatic));
  });

  it('hemorrhage trends toward tachycardia, lower pressure, and rising lactate', () => {
    const axes = defaultPathophysiologyAxes();
    const events: AutonomicEvent[] = [
      {
        id: 'bleed',
        sessionId: 's',
        userId: 'u',
        kind: 'bleed_rate_set',
        payload: { rateMlPerMin: 180 },
        simSeconds: 0,
        recordedAt: new Date(0).toISOString(),
      },
    ];
    const replayed = replayAutonomicAt(
      events,
      90,
      axes,
      weightKg,
      { baselineBleedRateMlPerMin: 180 },
      { ...baseVitals, bp: '86/50', spo2: '91%' },
      () => zeroDeltas(),
    );
    const metabolic = tickMetabolic(defaultMetabolicState(), 90, {
      axes,
      mapMmHg: 62,
      rrPerMin: 28,
      bleedRateMlPerMin: replayed.state.currentBleedRateMlPerMin,
      decompensationPhase: replayed.decompensationPhase,
      lactateBump: 0,
      pediatricScale: 1,
      feedback: buildPhysiologyFeedbackSnapshot({
        hr: '128',
        bp: '86/50',
        rr: '28',
        spo2: '91%',
        etco2: '24',
        ph: 7.32,
        lactateMmol: 2.5,
        axes,
      }),
    });

    expect(replayed.state.intravascularVolumeMl).toBeLessThan(
      replayed.state.volumeBaselineMl,
    );
    expect(replayed.cumulativeDeltas.hr).toBeGreaterThan(0);
    expect(metabolic.lactateMmol).toBeGreaterThan(1);
  });

  it('opioid plus benzodiazepine is worse than either alone and naloxone is partial', () => {
    const axes = defaultPathophysiologyAxes();
    const fent = bolus('fentanyl', 0.1, 0);
    const midaz = bolus('midazolam', 5, 0);
    const nlx = bolus('naloxone', 0.4, 30);
    const fentOnly = effectDeltasAt([fent], 60, axes, weightKg);
    const midazOnly = effectDeltasAt([midaz], 60, axes, weightKg);
    const combined = effectDeltasAt([fent, midaz], 60, axes, weightKg);
    const reversed = effectDeltasAt([fent, midaz, nlx], 60, axes, weightKg);
    expect(combined.rr).toBeLessThan(fentOnly.rr + midazOnly.rr);
    expect(reversed.rr).toBeGreaterThan(combined.rr);
    expect(reversed.gcs ?? 0).toBeLessThan(0);
  });

  it('cardiac arrest EtCO2 clamps low and releases after ROSC', () => {
    const low = resolveDisplayEtco2MmHg({
      baselineMmHg: 42,
      ventilationMode: 'spontaneous',
      decompensationPhase: 'arrested',
      pulseless: true,
    });
    const rosc = resolveDisplayEtco2MmHg({
      baselineMmHg: 42,
      ventilationMode: 'spontaneous',
      decompensationPhase: 'arrested',
      pulseless: false,
    });
    expect(low).toBeLessThanOrEqual(14);
    expect(rosc).toBeGreaterThan(35);
  });

  it('massive overdose and shock remain finite and clamped', () => {
    const axes = resolveComorbidityAxes(['BB_BLOCKADE', 'SEPSIS_ACUTE', 'RENAL_MODERATE']);
    const feedback = buildPhysiologyFeedbackSnapshot({
      hr: '180',
      bp: '48/28',
      rr: '4',
      spo2: '62%',
      etco2: '72',
      ph: 6.9,
      lactateMmol: 18,
      axes,
    });
    const deltas = effectDeltasAt(
      [
        bolus('fentanyl', 2, 0),
        bolus('midazolam', 50, 0),
        bolus('nitroglycerin', 10, 0, 'sl'),
        bolus('epinephrine-cardiac', 10, 0),
        bolus('albuterol', 25, 0, 'neb'),
      ],
      120,
      axes,
      weightKg,
      feedback,
    );
    for (const value of Object.values(deltas)) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(feedback.perfusionFactor).toBeGreaterThanOrEqual(0.15);
    expect(feedback.perfusionFactor).toBeLessThanOrEqual(1.15);
  });

  it('multi-hour autonomic replay remains deterministic', () => {
    const axes = defaultPathophysiologyAxes();
    const stateA = replayAutonomicAt(
      [],
      3 * 60 * 60,
      axes,
      weightKg,
      undefined,
      baseVitals,
      () => zeroDeltas(),
    );
    const stateB = replayAutonomicAt(
      [],
      3 * 60 * 60,
      axes,
      weightKg,
      undefined,
      baseVitals,
      () => zeroDeltas(),
    );
    expect(stateA.cumulativeDeltas).toEqual(stateB.cumulativeDeltas);
    expect(stateA.state).toEqual(stateB.state);
  });
});

