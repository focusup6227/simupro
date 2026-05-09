import type { DynamicPatientResponseOutput } from '@/ai/flows/provide-dynamic-patient-responses';

type VitalShape = Pick<DynamicPatientResponseOutput['vitals'], 'hr' | 'bp'>;

/** Canonical vitals string set for a confirmed-deceased patient. */
export const DECEASED_VITALS: DynamicPatientResponseOutput['vitals'] = {
  hr: 'Asystole',
  bp: '0/0 (no pulse)',
  rr: '0/min, apneic',
  spo2: '— (no perfusion)',
  gcs: '3 (E1, V1, M1)',
  etco2: '0 mmHg',
};

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
 * Light first-person speech detector. Catches the most common ways a model
 * forgets the patient is deceased and slips back into dialogue ("I feel…",
 * "Doc, please…", "they say"). Never tries to be cute about it — false
 * positives are fine here because the substitute narration is still useful.
 */
function looksLikePatientSpeaking(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/[“"'].*[”"']/.test(t)) return true;
  if (/(^|\b)(i\b|i['’]m\b|i['’]ve\b|i feel\b|my\s+(chest|head|arm|leg|stomach|back|throat))/i.test(t)) {
    return true;
  }
  if (/\b(doc|doctor|medic|sir|ma['’]?am|please)\b[,:.!?]/i.test(t)) return true;
  return false;
}

interface DynamicPatientGuardInput {
  currentVitals?: DynamicPatientResponseOutput['vitals'];
  treatment: string;
  /**
   * True when the engine / prior turn already declared the patient deceased.
   * After this, the AI is not allowed to "wake the patient up" with new
   * verbal responses or perfusing vitals — we hard-clamp to the deceased
   * canonical state.
   */
  patientAlreadyDeceased?: boolean;
}

/**
 * Post-processes the AI patient-response output before it reaches the runner.
 *
 * Two distinct guards live here:
 *
 * 1. **Inappropriate CPR** — If a perfusing patient was suddenly declared
 *    arrested only because the user clicked "CPR", revert the arrest and
 *    keep vitals continuous with the prior snapshot.
 *
 * 2. **Post-mortem hallucination** — Once the engine has flagged the patient
 *    as deceased, the model is **not** permitted to produce new patient
 *    speech or restore perfusing vitals. We replace any first-person
 *    response with a neutral environmental description and pin vitals to
 *    {@link DECEASED_VITALS}.
 */
export function applyDynamicPatientOutputGuards(
  input: DynamicPatientGuardInput,
  output: DynamicPatientResponseOutput,
): DynamicPatientResponseOutput {
  const { currentVitals, treatment, patientAlreadyDeceased } = input;

  // Guard 2 takes precedence — if the patient was already deceased, anything
  // the model says about them speaking, breathing, improving, etc. is wrong.
  if (patientAlreadyDeceased) {
    const safeNarration = looksLikePatientSpeaking(output.patientResponse)
      ? 'Patient remains pulseless and unresponsive. No spontaneous movement, breathing, or verbal response.'
      : output.patientResponse?.trim() ||
        'Patient remains pulseless and unresponsive.';

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[SimuPro] patient-response-guards: post-mortem AI output suppressed; vitals pinned to DECEASED_VITALS.',
      );
    }

    return {
      ...output,
      patientResponse: safeNarration,
      vitals: { ...DECEASED_VITALS },
      arrestRhythm: 'asystole',
      arrestRhythmRationale:
        output.arrestRhythmRationale ??
        'Patient previously declared deceased — engine pins rhythm to asystole regardless of model output.',
      patientIsDeceased: true,
      conditionChange:
        output.conditionChange?.trim() ||
        'Patient remains deceased. Continue documentation per termination-of-resuscitation protocol.',
      // Drop any phantom hospital / medical-direction speech once the patient
      // is dead — the AI shouldn't be carrying on a conversation.
      hospitalResponse: undefined,
      medicalDirection: undefined,
    };
  }

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
