import { describe, expect, it } from 'vitest';
import { parseTreatmentSelectionsToStressors } from '@/lib/physiology/intervention-stressor-parser';
import { COMORBIDITY_MATRIX } from '@/lib/physiology/comorbidity-matrix';
import {
  defaultPathophysiologyAxes,
  resolveComorbidityAxes,
} from '@/lib/physiology/comorbidity-resolve';
import { buildPhysiologyFeedbackSnapshot } from '@/lib/physiology/feedback';
import {
  defaultAutonomicState,
  mergeAutonomicWithPkDeltas,
  replayAutonomicAt,
  tickAutonomic,
} from '@/lib/physiology/autonomic-engine';
import { mergeVitalsForDisplay } from '@/lib/physiology/pk-engine';
import { zeroDeltas } from '@/lib/physiology/pk-types';
import type { AutonomicEvent } from '@/lib/physiology/autonomic-types';
import type { AutonomicProfile } from '@/lib/types';

const baseVitals = {
  hr: '80 bpm',
  bp: '120/80',
  rr: '16/min',
  spo2: '96%',
  gcs: '15',
};

function axesFor(id: keyof typeof COMORBIDITY_MATRIX) {
  return resolveComorbidityAxes([COMORBIDITY_MATRIX[id].id]);
}

describe('autonomic engine', () => {
  it('baroreflex HR delta is blunted with HYPERTENSION_CHRONIC vs healthy', () => {
    const healthy = defaultPathophysiologyAxes();
    const htn = axesFor('HYPERTENSION_CHRONIC');
    const ev: AutonomicEvent[] = [];
    let st = defaultAutonomicState(undefined, 75);
    const obs = { ...baseVitals, bp: '70/45' };
    const r1 = tickAutonomic(st, 1, healthy, obs, ev, 0, zeroDeltas());
    st = r1.state;
    st = defaultAutonomicState(undefined, 75);
    const r2 = tickAutonomic(st, 1, htn, obs, ev, 0, zeroDeltas());
    expect(Math.abs(r2.deltasForStep.hr)).toBeLessThan(Math.abs(r1.deltasForStep.hr));
  });

  it('baroreflex is further blunted with BB_BLOCKADE', () => {
    const htn = axesFor('HYPERTENSION_CHRONIC');
    const bb = axesFor('BB_BLOCKADE');
    const ev: AutonomicEvent[] = [];
    const obs = { ...baseVitals, bp: '65/40' };
    const rHtn = tickAutonomic(
      defaultAutonomicState(undefined, 75),
      1,
      htn,
      obs,
      ev,
      0,
      zeroDeltas(),
    );
    const rBb = tickAutonomic(
      defaultAutonomicState(undefined, 75),
      1,
      bb,
      obs,
      ev,
      0,
      zeroDeltas(),
    );
    expect(Math.abs(rBb.deltasForStep.hr)).toBeLessThan(
      Math.abs(rHtn.deltasForStep.hr) + 1e-6,
    );
  });

  it('hemorrhage drives decompensation; tourniquet (bleed_rate_set) stops blood loss', () => {
    const axes = defaultPathophysiologyAxes();
    const profile: AutonomicProfile = {
      baselineBleedRateMlPerMin: 100,
    };
    let st = defaultAutonomicState(profile, 75);
    let cum = zeroDeltas();
    for (let sec = 0; sec < 28; sec++) {
      const obs = {
        ...baseVitals,
        bp: `${Math.max(50, 118 - sec * 2)}/${Math.max(30, 76 - sec)}`,
      };
      const r = tickAutonomic(st, 1, axes, obs, [], sec, cum);
      st = r.state;
      cum = r.cumulativeDeltas;
    }
    const volBleeding = st.intravascularVolumeMl;

    const evTq: AutonomicEvent[] = [
      {
        id: 'tq',
        sessionId: 's',
        userId: 'u',
        kind: 'bleed_rate_set',
        payload: { rateMlPerMin: 0 },
        simSeconds: 2,
        recordedAt: new Date().toISOString(),
      },
    ];
    st = defaultAutonomicState(profile, 75);
    cum = zeroDeltas();
    for (let sec = 0; sec < 28; sec++) {
      const obs = {
        ...baseVitals,
        bp: `${Math.max(50, 118 - sec * 2)}/${Math.max(30, 76 - sec)}`,
      };
      const r = tickAutonomic(st, 1, axes, obs, evTq, sec, cum);
      st = r.state;
      cum = r.cumulativeDeltas;
    }
    expect(st.intravascularVolumeMl).toBeGreaterThan(volBleeding);
    expect(st.currentBleedRateMlPerMin).toBe(0);
  });

  it('CHF + fluid bolus increases pulmonary edema severity', () => {
    const axes = axesFor('CHF_CHRONIC');
    const profile: AutonomicProfile = {};
    const ev: AutonomicEvent[] = [
      {
        id: 'f1',
        sessionId: 's',
        userId: 'u',
        kind: 'fluid_bolus',
        payload: { volumeMl: 1000 },
        simSeconds: 0,
        recordedAt: new Date().toISOString(),
      },
    ];
    let st = defaultAutonomicState(profile, 75);
    const r = tickAutonomic(
      st,
      1,
      axes,
      baseVitals,
      ev,
      0,
      zeroDeltas(),
    );
    expect(r.state.pulmonaryEdemaSeverity).toBeGreaterThan(0.005);
    expect(r.deltasForStep.spo2).toBeLessThanOrEqual(0);
  });

  it('sepsis axes drive decompensation phase forward under hypotension', () => {
    const axes = axesFor('SEPSIS_ACUTE');
    let st = defaultAutonomicState(undefined, 75);
    st.decompensationPhase = 'baseline';
    const obs = { ...baseVitals, bp: '72/44', spo2: '90%' };
    const r = tickAutonomic(st, 1, axes, obs, [], 0, zeroDeltas());
    expect(['compensated', 'decompensating', 'crashing']).toContain(
      r.state.decompensationPhase,
    );
  });

  it('feedback drives RR up and penalizes vasoplegic BP response', () => {
    const axes = defaultPathophysiologyAxes();
    const feedback = buildPhysiologyFeedbackSnapshot({
      hr: '120',
      bp: '68/38',
      rr: '32',
      spo2: '84%',
      etco2: '58 mmHg',
      ph: 7.14,
      lactateMmol: 7,
      axes,
    });
    const observed = { ...baseVitals, bp: '68/38', spo2: '84%' };
    const withoutFeedback = tickAutonomic(
      defaultAutonomicState(undefined, 75),
      1,
      axes,
      observed,
      [],
      0,
      zeroDeltas(),
    );
    const withFeedbackNoPenalty = tickAutonomic(
      defaultAutonomicState(undefined, 75),
      1,
      axes,
      observed,
      [],
      0,
      zeroDeltas(),
      { ...feedback, vasoplegiaPenalty: 0 },
    );
    const withFeedback = tickAutonomic(
      defaultAutonomicState(undefined, 75),
      1,
      axes,
      observed,
      [],
      0,
      zeroDeltas(),
      feedback,
    );
    expect(withFeedback.deltasForStep.rr).toBeGreaterThan(
      withoutFeedback.deltasForStep.rr,
    );
    expect(withFeedback.deltasForStep.sBp).toBeLessThan(
      withFeedbackNoPenalty.deltasForStep.sBp,
    );
  });

  it('replayAutonomicAt matches sequential tickAutonomic (determinism)', () => {
    const axes = defaultPathophysiologyAxes();
    const events: AutonomicEvent[] = [
      {
        id: 'o2',
        sessionId: 's',
        userId: 'u',
        kind: 'oxygen_change',
        payload: { lpm: 15 },
        simSeconds: 2,
        recordedAt: new Date().toISOString(),
      },
    ];
    const replayed = replayAutonomicAt(
      events,
      15,
      axes,
      75,
      undefined,
      baseVitals,
      () => zeroDeltas(),
    );

    let st = defaultAutonomicState(undefined, 75);
    let cum = zeroDeltas();
    for (let sec = 0; sec <= 15; sec++) {
      const pkD = zeroDeltas();
      const pkMerged = mergeVitalsForDisplay(baseVitals, pkD);
      const observed = mergeVitalsForDisplay(pkMerged, cum);
      const r = tickAutonomic(
        st,
        1,
        axes,
        observed,
        events.filter((e) => e.simSeconds === sec),
        sec,
        cum,
      );
      st = r.state;
      cum = r.cumulativeDeltas;
    }
    expect(replayed.state.intravascularVolumeMl).toBeCloseTo(
      st.intravascularVolumeMl,
      4,
    );
    expect(replayed.cumulativeDeltas).toEqual(cum);
  });

  it('sustained hypoxia does not integrate RR to an impossible rate (regression: monitor showed 800/min)', () => {
    const axes = defaultPathophysiologyAxes();
    const replayed = replayAutonomicAt(
      [],
      600,
      axes,
      75,
      undefined,
      { ...baseVitals, spo2: '82%' },
      () => zeroDeltas(),
    );
    expect(replayed.cumulativeDeltas.rr).toBeLessThanOrEqual(45);
    expect(replayed.cumulativeDeltas.rr).toBeGreaterThanOrEqual(-10);
    const merged = mergeVitalsForDisplay(
      { ...baseVitals, spo2: '82%' },
      replayed.cumulativeDeltas,
    );
    const rrShown = Number.parseInt(merged.rr, 10);
    expect(rrShown).toBeLessThanOrEqual(60);
    expect(rrShown).toBeGreaterThan(16);
  });

  it('sustained vasoplegic hypotension does not integrate HR to an impossible rate (regression: HR ratcheted to 800+)', () => {
    const axes = axesFor('SEPSIS_ACUTE');
    const feedback = buildPhysiologyFeedbackSnapshot({
      hr: '120',
      bp: '60/35',
      rr: '30',
      spo2: '88%',
      etco2: '30 mmHg',
      ph: 7.2,
      lactateMmol: 6,
      axes,
    });
    const base = { ...baseVitals, bp: '60/35', spo2: '88%' };
    let st = defaultAutonomicState(undefined, 75);
    let cum = zeroDeltas();
    let peakHrShown = -Infinity;
    for (let sec = 0; sec <= 600; sec++) {
      const observed = mergeVitalsForDisplay(base, cum);
      const r = tickAutonomic(st, 1, axes, observed, [], sec, cum, feedback);
      st = r.state;
      cum = r.cumulativeDeltas;
      expect(cum.hr).toBeLessThanOrEqual(150);
      expect(cum.hr).toBeGreaterThanOrEqual(-50);
      const shown = Number.parseInt(mergeVitalsForDisplay(base, cum).hr, 10);
      expect(shown).toBeLessThanOrEqual(300);
      if (shown > peakHrShown) peakHrShown = shown;
    }
    expect(peakHrShown).toBeGreaterThan(80);
    const finalHr = Number.parseInt(mergeVitalsForDisplay(base, cum).hr, 10);
    expect(finalHr).toBeGreaterThan(80);
    expect(finalHr).toBeLessThanOrEqual(300);
  });

  it('ongoing hemorrhage drives falling BP and rising HR (volume→baroreflex coupling)', () => {
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
    const base = { ...baseVitals, hr: '88 bpm', bp: '86/50', spo2: '91%' };
    const profile: AutonomicProfile = { baselineBleedRateMlPerMin: 180 };
    let st = defaultAutonomicState(profile, 80);
    let cum = zeroDeltas();
    const sample: Record<number, { sys: number; hr: number }> = {};
    for (let sec = 0; sec <= 300; sec++) {
      const observed = mergeVitalsForDisplay(base, cum);
      const r = tickAutonomic(
        st,
        1,
        axes,
        observed,
        events.filter((e) => e.simSeconds === sec),
        sec,
        cum,
      );
      st = r.state;
      cum = r.cumulativeDeltas;
      const m = mergeVitalsForDisplay(base, cum);
      sample[sec] = {
        sys: Number.parseInt(m.bp.split('/')[0]!, 10),
        hr: Number.parseInt(m.hr, 10),
      };
    }
    expect(sample[300]!.sys).toBeLessThan(sample[30]!.sys);
    expect(sample[300]!.hr).toBeGreaterThan(sample[30]!.hr);
    expect(st.intravascularVolumeMl).toBeLessThan(st.volumeBaselineMl);
    expect(sample[300]!.hr).toBeLessThanOrEqual(300);
  });

  it('SpO₂ desaturates with tension pneumothorax and recovers after decompression (no integration to floor)', () => {
    const axes = defaultPathophysiologyAxes();
    const base = { ...baseVitals, spo2: '97%' };
    const start: AutonomicEvent = {
      id: 'pno',
      sessionId: 's',
      userId: 'u',
      kind: 'tension_pneumo_start',
      payload: { severity: 0.7 },
      simSeconds: 0,
      recordedAt: new Date(0).toISOString(),
    };
    const resolve: AutonomicEvent = {
      id: 'res',
      sessionId: 's',
      userId: 'u',
      kind: 'tension_pneumo_resolve',
      payload: {},
      simSeconds: 60,
      recordedAt: new Date(0).toISOString(),
    };
    const spo2 = (events: AutonomicEvent[], sec: number) =>
      Number.parseInt(
        mergeVitalsForDisplay(
          base,
          replayAutonomicAt(events, sec, axes, 80, undefined, base, () =>
            zeroDeltas(),
          ).cumulativeDeltas,
        ).spo2,
        10,
      );
    // Desaturates while the pneumo persists, but stays bounded — the old summed
    // dSpo2 would integrate to the 0 floor; now it tracks the shunt level.
    expect(spo2([start], 60)).toBeLessThan(95);
    expect(spo2([start], 60)).toBeGreaterThan(80);
    expect(spo2([start], 600)).toBeGreaterThan(80); // no drift to floor over 10 min
    // Recovers toward baseline after decompression.
    expect(spo2([start, resolve], 130)).toBeGreaterThan(spo2([start], 130) + 4);
  });

  it('intervention parser emits expected stressors', () => {
    const ctx = {
      sessionId: 's',
      userId: 'u',
      patientWeightKg: 80,
      simSeconds: 10,
    };
    const selected = {
      'fluid-bolus': {
        selected: true,
        subOptions: { 'Volume (mL)': '500mL' },
      },
      'bleeding-control': {
        selected: true,
        subOptions: { Method: 'Tourniquet Application' },
      },
    };
    const evs = parseTreatmentSelectionsToStressors(selected, ctx);
    expect(evs.some((e) => e.kind === 'fluid_bolus')).toBe(true);
    expect(evs.some((e) => e.kind === 'bleed_rate_set')).toBe(true);
  });

  it('mergeAutonomicWithPkDeltas sums axes', () => {
    const a = zeroDeltas();
    a.hr = 5;
    a.sBp = -10;
    const b = zeroDeltas();
    b.hr = 3;
    b.sBp = 4;
    const m = mergeAutonomicWithPkDeltas(a, b);
    expect(m.hr).toBe(8);
    expect(m.sBp).toBe(-6);
  });

  it('replayAutonomicAt is deterministic (repeatable)', () => {
    const axes = defaultPathophysiologyAxes();
    const events: AutonomicEvent[] = [];
    const a = replayAutonomicAt(
      events,
      12,
      axes,
      75,
      undefined,
      baseVitals,
      () => zeroDeltas(),
    );
    const b = replayAutonomicAt(
      events,
      12,
      axes,
      75,
      undefined,
      baseVitals,
      () => zeroDeltas(),
    );
    expect(a.cumulativeDeltas).toEqual(b.cumulativeDeltas);
    expect(a.state.intravascularVolumeMl).toBe(b.state.intravascularVolumeMl);
  });
});
