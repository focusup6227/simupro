import { describe, expect, it } from 'vitest';
import {
  DECEASED_VITALS,
  applyDynamicPatientOutputGuards,
  vitalsSuggestPerfusion,
  vitalsSuggestPulselessArrest,
} from '@/lib/patient-response-guards';
import type { DynamicPatientResponseOutput } from '@/ai/flows/provide-dynamic-patient-responses';

const perfusingVitals: DynamicPatientResponseOutput['vitals'] = {
  hr: '88 bpm',
  bp: '128/76 mmHg',
  rr: '16/min',
  spo2: '97%',
  gcs: '15',
  etco2: '36 mmHg',
};

function makeOutput(
  overrides: Partial<DynamicPatientResponseOutput> = {},
): DynamicPatientResponseOutput {
  return {
    patientResponse: 'I feel a little dizzy, doc.',
    vitals: { ...perfusingVitals },
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

describe('applyDynamicPatientOutputGuards — inappropriate CPR', () => {
  it('reverts arrest when user runs CPR on a perfusing patient', () => {
    const out = makeOutput({
      vitals: { ...perfusingVitals, hr: 'Asystole', bp: '0/0 (no pulse)' },
      arrestRhythm: 'asystole',
      patientIsDeceased: false,
    });
    const guarded = applyDynamicPatientOutputGuards(
      { currentVitals: perfusingVitals, treatment: 'Started CPR' },
      out,
    );
    expect(guarded.arrestRhythm).toBeUndefined();
    expect(guarded.patientIsDeceased).toBe(false);
    expect(guarded.vitals.hr).toBe(perfusingVitals.hr);
    expect(guarded.conditionChange).toMatch(/inappropriate CPR/i);
  });

  it('passes through normal arrest progression unchanged', () => {
    const out = makeOutput({
      patientResponse: 'Patient becomes unresponsive.',
      vitals: { ...perfusingVitals, hr: 'Asystole', bp: '0/0 (no pulse)' },
      arrestRhythm: 'asystole',
    });
    const guarded = applyDynamicPatientOutputGuards(
      {
        currentVitals: { ...perfusingVitals, bp: '70/40 mmHg' },
        treatment: 'Administered Epinephrine 1:10,000 1mg IV',
      },
      out,
    );
    // Not CPR, perfusing prior — guard should leave the AI output alone.
    expect(guarded.arrestRhythm).toBe('asystole');
  });
});

describe('applyDynamicPatientOutputGuards — post-mortem hallucination', () => {
  it('strips first-person speech and pins vitals when patient was already deceased', () => {
    const guarded = applyDynamicPatientOutputGuards(
      {
        currentVitals: DECEASED_VITALS,
        treatment: 'Continued ACLS',
        patientAlreadyDeceased: true,
      },
      makeOutput({
        patientResponse: '"Doc, my chest is on fire," the patient says.',
        vitals: perfusingVitals,
        arrestRhythm: undefined,
        patientIsDeceased: false,
        hospitalResponse: 'Copy that, will be ready.',
        medicalDirection: 'Give another epi.',
      }),
    );

    expect(guarded.patientIsDeceased).toBe(true);
    expect(guarded.arrestRhythm).toBe('asystole');
    expect(guarded.vitals.hr).toBe(DECEASED_VITALS.hr);
    expect(guarded.vitals.bp).toBe(DECEASED_VITALS.bp);
    expect(guarded.vitals.etco2).toBe(DECEASED_VITALS.etco2);
    expect(guarded.patientResponse).toMatch(/pulseless and unresponsive/i);
    expect(guarded.hospitalResponse).toBeUndefined();
    expect(guarded.medicalDirection).toBeUndefined();
  });

  it('keeps existing neutral narration when AI does not slip into speech', () => {
    const guarded = applyDynamicPatientOutputGuards(
      {
        currentVitals: DECEASED_VITALS,
        treatment: 'Documenting',
        patientAlreadyDeceased: true,
      },
      makeOutput({
        patientResponse:
          'No spontaneous movement. CPR has been ongoing for 25 minutes without ROSC.',
        vitals: { ...DECEASED_VITALS, etco2: '0 mmHg' },
      }),
    );
    expect(guarded.patientResponse).toMatch(/no spontaneous movement/i);
    expect(guarded.patientIsDeceased).toBe(true);
  });

  it('falls back to a default narration if the AI returns an empty string', () => {
    const guarded = applyDynamicPatientOutputGuards(
      {
        currentVitals: DECEASED_VITALS,
        treatment: 'Awaiting orders',
        patientAlreadyDeceased: true,
      },
      makeOutput({
        patientResponse: '',
        vitals: DECEASED_VITALS,
      }),
    );
    expect(guarded.patientResponse).toMatch(/pulseless and unresponsive/i);
  });
});
