import { describe, expect, it } from 'vitest';
import { reconcilePatientResponse } from '@/lib/patient-response-guards';
import {
  buildPriorPatientState,
  deriveEnginePacing,
  secondsBetweenLastActions,
  type PriorPatientState,
} from '@/lib/patient-state';
import type { DynamicPatientResponseOutput } from '@/ai/flows/provide-dynamic-patient-responses';
import { parseVitalsToNumbers } from '@/lib/vitals-parse';
import { curatedPhysiologyScenarios } from '@/lib/scenarios-data';

type Vitals = DynamicPatientResponseOutput['vitals'];

const tensionVitals: Vitals = {
  hr: '142 bpm',
  bp: '72/46 mmHg',
  rr: '38/min',
  spo2: '81%',
  gcs: '13',
};

function prior(vitals: Vitals, overrides: Partial<PriorPatientState> = {}): PriorPatientState {
  return {
    vitals: parseVitalsToNumbers(vitals),
    rawVitals: vitals,
    wasArrested: false,
    priorArrestRhythm: null,
    wasDeceased: false,
    priorCondition: 'Deteriorating obstructive shock.',
    engineArrested: false,
    enginePhase: 'decompensating',
    ageBandYears: 30,
    weightKg: 75,
    ...overrides,
  };
}

function out(vitals: Vitals, overrides: Partial<DynamicPatientResponseOutput> = {}): DynamicPatientResponseOutput {
  return {
    patientResponse: 'The patient gasps, unable to speak.',
    vitals,
    conditionChange: 'Patient is deteriorating rapidly.',
    ...overrides,
  };
}

describe('Rule 8 — vital plausibility', () => {
  it('clamps adult sinus HR and RR to physiologic ceilings (HR 300 / RR 60 → 170 / 50)', () => {
    const { output, corrections } = reconcilePatientResponse(
      prior(tensionVitals),
      'Rapid transport',
      out({ ...tensionVitals, hr: '300 bpm', rr: '60/min' }),
    );
    expect(output.vitals.hr).toBe('170 bpm');
    expect(output.vitals.rr).toBe('50/min');
    expect(corrections).toContain('vitals_plausibility');
  });

  it('keeps a rate above the sinus ceiling when a tachyarrhythmia is named', () => {
    const { output } = reconcilePatientResponse(
      prior(tensionVitals),
      '4-lead ECG',
      out({ ...tensionVitals, hr: '210 bpm' }, { conditionChange: 'ECG rhythm: SVT at 210.' }),
    );
    expect(output.vitals.hr).toBe('210 bpm');
  });

  it('gives pediatric patients wider HR headroom', () => {
    const { output } = reconcilePatientResponse(
      prior(tensionVitals, { ageBandYears: 0.5 }),
      '',
      out({ ...tensionVitals, hr: '205 bpm' }),
    );
    expect(output.vitals.hr).toBe('205 bpm');
  });

  it('repairs a collapsed pulse pressure (76/76 → 76/61) by lowering the diastolic', () => {
    const { output, corrections } = reconcilePatientResponse(
      prior({ ...tensionVitals, bp: '85/70' }, { priorCondition: 'Hemorrhagic shock.' }),
      'Radio report',
      out({ ...tensionVitals, bp: '76/76 mmHg' }, { conditionChange: 'Worsening shock.', patientResponse: 'Groans.' }),
    );
    expect(output.vitals.bp).toBe('76/61 mmHg');
    expect(corrections).toContain('vitals_plausibility');
  });

  it('allows narrower (but never zero) pulse pressure for obstructive physiology', () => {
    const { output } = reconcilePatientResponse(
      prior(tensionVitals, { priorCondition: 'Suspected tension pneumothorax.' }),
      '',
      out({ ...tensionVitals, bp: '70/68' }),
    );
    expect(output.vitals.bp).toBe('70/60');
  });

  it('does not touch arrest vitals', () => {
    const arrest: Vitals = { hr: 'PEA @ 40 bpm', bp: '0/0 (no pulse)', rr: '0/min', spo2: '—', gcs: '3' };
    const { output } = reconcilePatientResponse(
      prior(arrest, { wasArrested: true, priorArrestRhythm: 'pea' }),
      'Continue CPR',
      out(arrest, { arrestRhythm: 'pea' }),
    );
    expect(output.vitals.bp).toBe('0/0 (no pulse)');
  });
});

describe('Rule 7 — engine-paced deterioration', () => {
  const engineOwned = { hemorrhageControlled: false, supportiveCare: false };
  const crash: Vitals = { hr: '190 bpm', bp: '50/35', rr: '48/min', spo2: '70%', gcs: '9' };

  it('bounds AI worsening per elapsed minute even when a cause is narrated', () => {
    const { output, corrections } = reconcilePatientResponse(
      prior(tensionVitals, { enginePacing: engineOwned, secondsSincePriorTurn: 60 }),
      'Oxygen via NRB',
      out(crash),
    );
    const n = parseVitalsToNumbers(output.vitals);
    expect(n.sys).toBe(68); // 72 − 4/min
    expect(n.dia).toBe(43);
    expect(n.hr).toBe(147);
    expect(n.rr).toBe(41);
    expect(n.spo2).toBe(79);
    expect(corrections).toContain('engine_paced_deterioration');
  });

  it('hemorrhage control shrinks the budget further than generic supportive care', () => {
    const run = (pacing: PriorPatientState['enginePacing']) =>
      parseVitalsToNumbers(
        reconcilePatientResponse(
          prior(tensionVitals, { enginePacing: pacing, secondsSincePriorTurn: 120 }),
          'Reassess',
          out(crash),
        ).output.vitals,
      );
    const none = run(engineOwned);
    const care = run({ hemorrhageControlled: false, supportiveCare: true });
    const controlled = run({ hemorrhageControlled: true, supportiveCare: true });
    expect(none.sys).toBe(64);
    expect(care.sys).toBe(68);
    expect(controlled.sys).toBeGreaterThan(care.sys!);
  });

  it('does not bound improvement, and is off when the engine does not own the scenario', () => {
    const better: Vitals = { hr: '118 bpm', bp: '96/64', rr: '24/min', spo2: '94%', gcs: '14' };
    const improved = reconcilePatientResponse(
      prior(tensionVitals, { enginePacing: engineOwned, secondsSincePriorTurn: 30 }),
      'Needle decompression',
      out(better, { conditionChange: 'Improving after decompression.' }),
    );
    expect(improved.output.vitals.bp).toBe('96/64');
    expect(improved.corrections).not.toContain('engine_paced_deterioration');

    const legacy = reconcilePatientResponse(prior(tensionVitals), 'Reassess', out(crash));
    expect(parseVitalsToNumbers(legacy.output.vitals).sys).toBe(50);
  });

  it('yields to the engine once it is crashing', () => {
    const { output } = reconcilePatientResponse(
      prior(tensionVitals, { enginePacing: engineOwned, enginePhase: 'crashing', secondsSincePriorTurn: 60 }),
      'Reassess',
      out(crash),
    );
    expect(parseVitalsToNumbers(output.vitals).sys).toBe(50);
  });
});

describe('Rule 2b — premature non-shockable arrest', () => {
  const pacing = { hemorrhageControlled: false, supportiveCare: true };
  const pea: Vitals = { hr: 'PEA @ 40 bpm', bp: '0/0 (no pulse)', rr: '0/min', spo2: '—', gcs: '3' };

  it('keeps an engine-owned patient with a measurable systolic ≥ 60 perfusing', () => {
    const { output, corrections } = reconcilePatientResponse(
      prior({ ...tensionVitals, bp: '66/44' }, { enginePacing: pacing, secondsSincePriorTurn: 45 }),
      'Rapid transport',
      out(pea, {
        arrestRhythm: 'pea',
        patientResponse: 'The patient goes limp — no pulse. Start CPR.',
        conditionChange: 'Cardiac arrest (PEA).',
      }),
    );
    expect(corrections).toContain('premature_arrest_block');
    expect(output.arrestRhythm).toBeUndefined();
    expect(output.vitals.bp).toBe('66/44');
    expect(output.patientResponse).not.toMatch(/cpr|no pulse/i);
    expect(output.conditionChange).toMatch(/pulse is still present/i);
  });

  it('still allows arrest when the engine is crashing, the prior BP was already profound, or the rhythm is shockable', () => {
    const crashing = reconcilePatientResponse(
      prior(tensionVitals, { enginePacing: pacing, enginePhase: 'crashing' }),
      '',
      out(pea, { arrestRhythm: 'pea' }),
    );
    expect(crashing.output.arrestRhythm).toBe('pea');

    const profound = reconcilePatientResponse(
      prior({ ...tensionVitals, bp: '52/38' }, { enginePacing: pacing }),
      '',
      out(pea, { arrestRhythm: 'pea' }),
    );
    expect(profound.output.arrestRhythm).toBe('pea');

    const vf = reconcilePatientResponse(
      prior(tensionVitals, { enginePacing: pacing }),
      '',
      out({ ...pea, hr: 'V-fib' }, { arrestRhythm: 'vfib' }),
    );
    expect(vf.output.arrestRhythm).toBe('vfib');
  });

  it('never applies to scenarios the engine does not own', () => {
    const { output } = reconcilePatientResponse(prior(tensionVitals), '', out(pea, { arrestRhythm: 'pea' }));
    expect(output.arrestRhythm).toBe('pea');
  });
});

describe('tension pneumothorax, EMT scope — BLS care + transport gets a realistic window', () => {
  it('an AI that narrates relentless decline every 30 s does not arrest the patient within 5 min', () => {
    let vitals: Vitals = { ...tensionVitals };
    let condition = 'Deteriorating obstructive shock.';
    for (let turn = 1; turn <= 10; turn++) {
      const n = parseVitalsToNumbers(vitals);
      // Worst-case model: big drops each turn, and it declares PEA once SBP < 65.
      const next: Vitals = {
        hr: `${(n.hr ?? 142) + 40} bpm`,
        bp: `${(n.sys ?? 72) - 12}/${(n.dia ?? 46) - 8}`,
        rr: `${(n.rr ?? 38) + 10}/min`,
        spo2: `${(n.spo2 ?? 81) - 6}%`,
        gcs: '12',
      };
      const aiArrests = (n.sys ?? 72) < 65;
      const { output } = reconcilePatientResponse(
        prior(vitals, {
          priorCondition: condition,
          enginePacing: { hemorrhageControlled: false, supportiveCare: true },
          secondsSincePriorTurn: 30,
        }),
        'BVM ventilation with high-flow O2, occlusive dressing, rapid transport',
        aiArrests
          ? out({ hr: 'PEA @ 50 bpm', bp: '0/0 (no pulse)', rr: '0/min', spo2: '—', gcs: '3' }, { arrestRhythm: 'pea' })
          : out(next),
      );
      expect(output.arrestRhythm).toBeUndefined();
      vitals = output.vitals;
      condition = output.conditionChange ?? condition;
    }
    const final = parseVitalsToNumbers(vitals);
    expect(final.sys).toBeGreaterThanOrEqual(60);
    expect(final.hr).toBeLessThanOrEqual(170);
    expect(final.rr).toBeLessThanOrEqual(50);
    expect((final.sys ?? 0) - (final.dia ?? 0)).toBeGreaterThanOrEqual(10);
  });
});

describe('prior-state plumbing', () => {
  const hemScenario = curatedPhysiologyScenarios.find((s) => s.id === 'qa-engine-hemorrhagic-shock')!;
  const engine = { currentBleedRateMlPerMin: 0, supplementalO2Boost: 0, cpapActive: false, airwaySecured: false };

  it('derives hemorrhage control from the engine bleed rate for bleeding scenarios', () => {
    expect(deriveEnginePacing(hemScenario.autonomicProfile, engine)).toEqual({
      hemorrhageControlled: true,
      supportiveCare: true,
    });
    expect(
      deriveEnginePacing(hemScenario.autonomicProfile, { ...engine, currentBleedRateMlPerMin: 85 }),
    ).toEqual({ hemorrhageControlled: false, supportiveCare: false });
    expect(deriveEnginePacing(undefined, engine)).toBeNull();
  });

  it('threads pacing + turn timing through buildPriorPatientState', () => {
    const p = buildPriorPatientState({
      priorVitals: hemScenario.initialVitals,
      decompensationPhase: 'decompensating',
      scenario: hemScenario,
      engineState: { ...engine, supplementalO2Boost: 1, currentBleedRateMlPerMin: 85 },
      secondsSincePriorTurn: 40,
    });
    expect(p.enginePacing).toEqual({ hemorrhageControlled: false, supportiveCare: true });
    expect(p.secondsSincePriorTurn).toBe(40);
  });

  it('secondsBetweenLastActions reads the last two logged action times', () => {
    expect(secondsBetweenLastActions([{ time: 10 }, { time: 61 }, { time: 95 }])).toBe(34);
    expect(secondsBetweenLastActions([{ time: 10 }])).toBeNull();
  });
});
