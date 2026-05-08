import type { DynamicPatientResponseOutput } from '@/ai/flows/provide-dynamic-patient-responses';

type VitalShape = Pick<DynamicPatientResponseOutput['vitals'], 'hr' | 'bp'>;

/** True if HR/BP text suggests pulseless cardiac arrest (not perfusing). */
export function vitalsSuggestPulselessArrest(v: VitalShape): boolean {
  const hr = v.hr.toLowerCase();
  const bp = v.bp.toLowerCase();
  if (/asystole|v-?fib|vfib|pulseless|pea\b|no pulse|cardiac arrest/.test(hr)) return true;
  if (/0\/0|no pulse/.test(bp)) return true;
  return false;
}

/** True if vitals look like an organized perfusing rhythm (inverse of pulseless arrest heuristics). */
export function vitalsSuggestPerfusion(v: VitalShape): boolean {
  return !vitalsSuggestPulselessArrest(v);
}

function treatmentLooksLikeCpr(treatment: string): boolean {
  const t = treatment.toLowerCase();
  return /\bcpr\b|cardiopulmonary\s+resuscitation/i.test(t);
}

/**
 * If the model declared arrest on a patient that was perfusing and the user only did CPR,
 * strip structured arrest and revert vitals to the prior snapshot (reliable fallback).
 */
export function applyDynamicPatientOutputGuards(
  input: {
    currentVitals?: DynamicPatientResponseOutput['vitals'];
    treatment: string;
  },
  output: DynamicPatientResponseOutput,
): DynamicPatientResponseOutput {
  const { currentVitals, treatment } = input;
  if (!currentVitals || !vitalsSuggestPerfusion(currentVitals)) {
    return output;
  }
  if (!treatmentLooksLikeCpr(treatment)) {
    return output;
  }
  if (vitalsSuggestPerfusion(output.vitals) && !output.arrestRhythm && !output.patientIsDeceased) {
    return output;
  }

  const hadBadArrest = Boolean(output.arrestRhythm || output.patientIsDeceased || vitalsSuggestPulselessArrest(output.vitals));

  if (!hadBadArrest) {
    return output;
  }

  const next: DynamicPatientResponseOutput = {
    ...output,
    arrestRhythm: undefined,
    arrestRhythmRationale: undefined,
    patientIsDeceased: false,
    vitals: { ...currentVitals },
    conditionChange:
      'Patient still has a pulse—inappropriate CPR; stop compressions and reassess. ' +
      (output.conditionChange ?? '').trim(),
  };
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[SimuPro] patient-response-guards: corrected inappropriate CPR/arrest output; prior vitals restored.',
    );
  }
  return next;
}
