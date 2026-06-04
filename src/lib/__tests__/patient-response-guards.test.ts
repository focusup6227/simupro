import { describe, expect, it } from 'vitest';
import {
  DECEASED_VITALS,
  reconcilePatientResponse,
  vitalsSuggestPerfusion,
  vitalsSuggestPulselessArrest,
} from '@/lib/patient-response-guards';
import type { PriorPatientState } from '@/lib/patient-state';
import type { DynamicPatientResponseOutput } from '@/ai/flows/provide-dynamic-patient-responses';

const perfusingVitals: DynamicPatientResponseOutput['vitals'] = {
  hr: '88 bpm',
  bp: '128/76 mmHg',
  rr: '16/min',
  spo2: '97%',
  gcs: '15',
  etco2: '36 mmHg',
};

const arrestVitals: DynamicPatientResponseOutput['vitals'] = {
  hr: 'PEA @ 30 bpm',
  bp: '0/0 (no pulse)',
  rr: '8/min, agonal',
  spo2: '— (no perfusion)',
  gcs: '3',
  etco2: '14 mmHg',
};

function makeOutput(
  overrides: Partial<DynamicPatientResponseOutput> = {},
): DynamicPatientResponseOutput {
  return {
    patientResponse: 'The patient groans.',
    vitals: { ...perfusingVitals },
    ...overrides,
  };
}

function makePriorState(
  overrides: Partial<PriorPatientState> = {},
): PriorPatientState {
  return {
    vitals: { hr: 88, sys: 128, dia: 76, rr: 16, spo2: 97, gcs: 15, etco2: 36 },
    rawVitals: { ...perfusingVitals },
    wasArrested: false,
    priorArrestRhythm: null,
    wasDeceased: false,
    priorCondition: 'stable',
    engineArrested: false,
    enginePhase: 'compensated',
    ageBandYears: 30,
    weightKg: 75,
    ...overrides,
  };
}

describe('vitalsSuggestPulselessArrest', () => {
  it('detects asystole / pulseless / 0/0 patterns', () => {
    expect(vitalsSuggestPulselessArrest({ hr: 'Asystole', bp: '—' })).toBe(true);
    expect(vitalsSuggestPulselessArrest({ hr: 'V-fib', bp: '0/0' })).toBe(true);
    expect(vitalsSuggestPulselessArrest({ hr: 'PEA @ 28', bp: '0/0 (no pulse)' })).toBe(true);
  });

  it('classifies a perfusing rhythm as not arrested', () => {
    expect(vitalsSuggestPulselessArrest({ hr: '92 bpm', bp: '120/80' })).toBe(false);
    expect(vitalsSuggestPerfusion({ hr: '92 bpm', bp: '120/80' })).toBe(true);
  });
});

describe('reconcilePatientResponse — arrest continuity (the reported bug)', () => {
  it('PEA arrest + CPR stays arrested and does NOT flag CPR as inappropriate', () => {
    const { output, corrections } = reconcilePatientResponse(
      makePriorState({ wasArrested: true, priorArrestRhythm: 'pea', rawVitals: { ...arrestVitals } }),
      'Started CPR',
      makeOutput({
        vitals: { ...arrestVitals },
        arrestRhythm: 'pea',
        conditionChange: 'Patient remains in cardiac arrest; continuing high-quality CPR.',
      }),
    );

    expect(output.arrestRhythm).toBe('pea');
    expect(output.vitals.bp).toBe('0/0 (no pulse)');
    expect(corrections).not.toContain('cpr_reversal');
    expect(output.conditionChange).not.toMatch(/inappropriate CPR/i);
  });

  it('engine-arrested patient shown perfusing (no ROSC) is re-pinned pulseless', () => {
    const { output, corrections } = reconcilePatientResponse(
      makePriorState({ engineArrested: true, enginePhase: 'arrested' }),
      'Administered Epinephrine 1mg IV',
      makeOutput({
        vitals: { ...perfusingVitals, hr: '70 bpm', bp: '90/60 mmHg', etco2: '20 mmHg' },
      }),
    );

    expect(output.arrestRhythm).toBe('pea');
    expect(output.vitals.bp).toBe('0/0 (no pulse)');
    expect(corrections).toContain('engine_arrest_authority');
  });

  it('prior-arrested patient shown a pulse with no ROSC restores the prior rhythm', () => {
    const { output, corrections } = reconcilePatientResponse(
      makePriorState({ wasArrested: true, priorArrestRhythm: 'vfib', rawVitals: { ...arrestVitals } }),
      'Reassess pulse',
      makeOutput({
        vitals: { ...perfusingVitals, hr: '80 bpm', bp: '110/70 mmHg', etco2: '25 mmHg' },
      }),
    );

    expect(output.arrestRhythm).toBe('vfib');
    expect(output.vitals.hr).toBe('V-fib');
    expect(output.vitals.bp).toBe('0/0 (no pulse)');
    expect(corrections).toContain('arrest_continuity');
  });
});

describe('reconcilePatientResponse — inappropriate CPR (perfusing patients only)', () => {
  it('reverts arrest when CPR is started on a genuinely perfusing patient', () => {
    const { output, corrections } = reconcilePatientResponse(
      makePriorState(),
      'Started CPR',
      makeOutput({
        vitals: { ...perfusingVitals, hr: 'Asystole', bp: '0/0 (no pulse)' },
        arrestRhythm: 'asystole',
      }),
    );

    expect(output.arrestRhythm).toBeUndefined();
    expect(output.vitals.hr).toBe(perfusingVitals.hr);
    expect(output.conditionChange).toMatch(/inappropriate CPR/i);
    expect(corrections).toContain('cpr_reversal');
  });
});

describe('reconcilePatientResponse — ROSC', () => {
  it('allows a pulse on a valid ROSC (EtCO₂ ≥ 35 + numeric HR + perfusing BP)', () => {
    const { output, corrections } = reconcilePatientResponse(
      makePriorState({ wasArrested: true, priorArrestRhythm: 'pea', rawVitals: { ...arrestVitals } }),
      'Continue CPR',
      makeOutput({
        vitals: { ...perfusingVitals, hr: '90 bpm', bp: '110/70 mmHg', etco2: '40 mmHg' },
      }),
    );

    expect(output.arrestRhythm).toBeUndefined();
    expect(output.vitals.hr).toBe('90 bpm');
    expect(corrections).not.toContain('arrest_continuity');
  });
});

describe('reconcilePatientResponse — arrest⇔pulse consistency', () => {
  it('forces BP to 0/0 when an arrest rhythm is set with a perfusing BP', () => {
    const { output, corrections } = reconcilePatientResponse(
      makePriorState(),
      'Assess rhythm',
      makeOutput({
        vitals: { ...perfusingVitals, hr: 'V-fib', bp: '120/80 mmHg' },
        arrestRhythm: 'vfib',
      }),
    );

    expect(output.vitals.bp).toBe('0/0 (no pulse)');
    expect(corrections).toContain('arrest_pulse_consistency');
  });
});

describe('reconcilePatientResponse — deceased clamp', () => {
  it('pins deceased vitals and strips stressors / metabolic labs / speech', () => {
    const { output, corrections } = reconcilePatientResponse(
      makePriorState({ wasDeceased: true }),
      'Continued ACLS',
      makeOutput({
        patientResponse: '"Doc, my chest is on fire," the patient says.',
        vitals: perfusingVitals,
        hospitalResponse: 'Copy that.',
        medicalDirection: 'Give another epi.',
        stressors: [{ kind: 'rebleed' }],
        metabolicLabs: { lactate: '6.0 mmol/L', bicarb: '12 mEq/L', ph: '7.10' },
      }),
    );

    expect(corrections).toContain('deceased_clamp');
    expect(output.patientIsDeceased).toBe(true);
    expect(output.arrestRhythm).toBe('asystole');
    expect(output.vitals.bp).toBe(DECEASED_VITALS.bp);
    expect(output.patientResponse).toMatch(/pulseless and unresponsive/i);
    expect(output.hospitalResponse).toBeUndefined();
    expect(output.medicalDirection).toBeUndefined();
    expect(output.stressors).toBeUndefined();
    expect(output.metabolicLabs).toBeUndefined();
  });
});

describe('reconcilePatientResponse — vitals continuity clamp', () => {
  it('bounds an implausible single-turn jump with no narrated cause', () => {
    const { output, corrections } = reconcilePatientResponse(
      makePriorState(),
      '', // pure assessment turn, no treatment
      makeOutput({
        vitals: { ...perfusingVitals, hr: '200 bpm' },
        conditionChange: 'Patient appears unchanged.',
        patientResponse: 'The patient rests quietly.',
      }),
    );

    expect(output.vitals.hr).toBe('128 bpm'); // 88 + 40 (adult HR cap)
    expect(corrections).toContain('vitals_clamp');
  });

  it('allows a wider swing for a pediatric patient', () => {
    const { output, corrections } = reconcilePatientResponse(
      makePriorState({
        ageBandYears: 0.5,
        vitals: { hr: 140, sys: 90, dia: 55, rr: 40, spo2: 98, gcs: 15, etco2: 36 },
        rawVitals: { hr: '140 bpm', bp: '90/55 mmHg', rr: '40/min', spo2: '98%', gcs: '15', etco2: '36 mmHg' },
      }),
      '',
      makeOutput({
        vitals: { hr: '180 bpm', bp: '90/55 mmHg', rr: '40/min', spo2: '98%', gcs: '15', etco2: '36 mmHg' },
        conditionChange: 'Patient appears unchanged.',
        patientResponse: 'The infant fusses.',
      }),
    );

    expect(output.vitals.hr).toBe('180 bpm'); // delta 40 ≤ pediatric cap 60
    expect(corrections).not.toContain('vitals_clamp');
  });
});
