import type { DynamicPatientResponseOutput } from '@/ai/flows/provide-dynamic-patient-responses';
import type { ArrestRhythmKind } from '@/lib/types';
import type { PriorPatientState } from '@/lib/patient-state';
import { parseVitalsToNumbers } from '@/lib/vitals-parse';

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

export function treatmentLooksLikeCpr(treatment: string): boolean {
  return /\bcpr\b|cardiopulmonary\s+resuscitation|chest\s+compress/i.test(treatment);
}

/**
 * Light first-person speech detector. Catches the most common ways a model
 * forgets the patient is deceased and slips back into dialogue ("I feel…",
 * "Doc, please…", "they say"). False positives are fine here because the
 * substitute narration is still useful.
 */
export function looksLikePatientSpeaking(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/[“"'].*[”"']/.test(t)) return true;
  if (/(^|\b)(i\b|i['’]m\b|i['’]ve\b|i feel\b|my\s+(chest|head|arm|leg|stomach|back|throat|belly|side))/i.test(t)) {
    return true;
  }
  if (/\b(doc|doctor|medic|nurse|sir|ma['’]?am|please|help me)\b[,:.!?]/i.test(t)) return true;
  return false;
}

/** Build an arrest-format HR string for a rhythm, preserving an existing PEA rate. */
function arrestHrForRhythm(rhythm: ArrestRhythmKind, existingHr: string | undefined): string {
  switch (rhythm) {
    case 'vfib':
      return 'V-fib';
    case 'pulseless_vt':
      return 'Pulseless VT';
    case 'asystole':
      return 'Asystole';
    case 'pea': {
      const m = existingHr?.match(/pea\s*@?\s*(\d{1,3})/i);
      const rate = m ? m[1] : '40';
      return `PEA @ ${rate} bpm`;
    }
  }
}

/** Force pulseless vitals (HR arrest-format, BP "0/0 (no pulse)") for an arrest rhythm. */
function pinArrestVitals(
  vitals: DynamicPatientResponseOutput['vitals'],
  rhythm: ArrestRhythmKind,
): DynamicPatientResponseOutput['vitals'] {
  return {
    ...vitals,
    hr: arrestHrForRhythm(rhythm, vitals.hr),
    bp: '0/0 (no pulse)',
  };
}

/**
 * A valid ROSC requires a sudden EtCO₂ recovery (≥ 35 mmHg) together with a
 * numeric perfusing HR and a perfusing BP. Anything short of all three is
 * **not** a real return of spontaneous circulation, so an arrested patient
 * may not regain a pulse on it.
 */
function isValidRosc(output: DynamicPatientResponseOutput): boolean {
  const n = parseVitalsToNumbers(output.vitals);
  return (
    n.etco2 !== null &&
    n.etco2 >= 35 &&
    n.hr !== null &&
    n.sys !== null &&
    n.sys > 0 &&
    !output.arrestRhythm
  );
}

/** Replace the first numeric run in a vitals string, preserving surrounding units/text. */
function clampNumberInString(str: string, clamped: number): string {
  return str.replace(/\d{1,3}/, String(clamped));
}

/** Replace both numbers in a "sys/dia" BP string, preserving units. */
function clampBpInString(str: string, sys: number, dia: number): string {
  let seen = 0;
  return str.replace(/\d{2,3}/g, (m) => {
    seen += 1;
    if (seen === 1) return String(sys);
    if (seen === 2) return String(dia);
    return m;
  });
}

const ADULT_MAX_DELTA = { hr: 40, sys: 40, dia: 25, rr: 12, spo2: 20, gcs: 5 };

/** Narrative keywords that license a larger single-turn vitals change. */
const NARRATED_CAUSE = /deteriorat|worsen|improv|arrest|rosc|sever|crash|shock|seiz|bleed|hemorrhage|decompensat|collaps|tension|anaphyla|overdose/i;

/**
 * Bound implausible single-turn numeric swings unless a new event is narrated
 * (a treatment was given, or the condition/response text names a cause) or an
 * arrest/ROSC transition is in progress. Pediatric patients get wider HR/RR
 * headroom. Returns the (possibly clamped) vitals and pushes "vitals_clamp"
 * once if anything was bounded.
 */
function clampVitalsContinuity(
  output: DynamicPatientResponseOutput,
  prior: PriorPatientState,
  corrections: string[],
  ctx: { treatmentGiven: boolean; transition: boolean },
): DynamicPatientResponseOutput['vitals'] {
  if (output.arrestRhythm || output.patientIsDeceased || ctx.transition) return output.vitals;
  if (ctx.treatmentGiven) return output.vitals;
  const narrated = NARRATED_CAUSE.test(`${output.conditionChange ?? ''} ${output.patientResponse ?? ''}`);
  if (narrated) return output.vitals;

  const pediatric = prior.ageBandYears !== null && prior.ageBandYears < 12;
  const max = pediatric ? { ...ADULT_MAX_DELTA, hr: 60, rr: 20 } : ADULT_MAX_DELTA;

  const cur = parseVitalsToNumbers(output.vitals);
  let vitals = output.vitals;
  let clamped = false;

  const bound = (priorN: number | null, curN: number | null, limit: number): number | null => {
    if (priorN === null || curN === null) return null;
    const delta = curN - priorN;
    if (Math.abs(delta) <= limit) return null;
    return priorN + Math.sign(delta) * limit;
  };

  const hrTarget = bound(prior.vitals.hr, cur.hr, max.hr);
  if (hrTarget !== null) {
    vitals = { ...vitals, hr: clampNumberInString(vitals.hr, hrTarget) };
    clamped = true;
  }

  const sysTarget = bound(prior.vitals.sys, cur.sys, max.sys);
  const diaTarget = bound(prior.vitals.dia, cur.dia, max.dia);
  if ((sysTarget !== null || diaTarget !== null) && cur.sys !== null && cur.dia !== null) {
    vitals = {
      ...vitals,
      bp: clampBpInString(vitals.bp, sysTarget ?? cur.sys, diaTarget ?? cur.dia),
    };
    clamped = true;
  }

  const rrTarget = bound(prior.vitals.rr, cur.rr, max.rr);
  if (rrTarget !== null) {
    vitals = { ...vitals, rr: clampNumberInString(vitals.rr, rrTarget) };
    clamped = true;
  }

  const spo2Target = bound(prior.vitals.spo2, cur.spo2, max.spo2);
  if (spo2Target !== null) {
    vitals = { ...vitals, spo2: clampNumberInString(vitals.spo2, spo2Target) };
    clamped = true;
  }

  const gcsTarget = bound(prior.vitals.gcs, cur.gcs, max.gcs);
  if (gcsTarget !== null) {
    vitals = { ...vitals, gcs: clampNumberInString(vitals.gcs, gcsTarget) };
    clamped = true;
  }

  if (clamped) corrections.push('vitals_clamp');
  return vitals;
}

/** Rule 1 — pin a confirmed-deceased patient to the canonical post-mortem state. */
function clampDeceased(output: DynamicPatientResponseOutput): DynamicPatientResponseOutput {
  const safeNarration = looksLikePatientSpeaking(output.patientResponse)
    ? 'Patient remains pulseless and unresponsive. No spontaneous movement, breathing, or verbal response.'
    : output.patientResponse?.trim() || 'Patient remains pulseless and unresponsive.';

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
    // Dead patients don't talk, don't radio, and don't worsen.
    hospitalResponse: undefined,
    medicalDirection: undefined,
    stressors: undefined,
    metabolicLabs: undefined,
  };
}

/**
 * Reconcile raw patient-AI output against the structured prior state using
 * ordered, deterministic clinical invariants. Returns the corrected output and
 * the list of invariant tags that fired (for telemetry). This is the safety
 * net that the prompt cannot guarantee on its own — see
 * `src/lib/patient-state.ts` for the prior-state shape.
 *
 * Invariant order (later rules see the result of earlier ones):
 *  1. Deceased clamp        — a dead patient stays dead.
 *  2/3. Arrest authority     — an engine- or prior-arrested patient stays
 *       pulseless unless a valid ROSC (rule 4) is present; the
 *       inappropriate-CPR reversal fires ONLY for a genuinely perfusing prior.
 *  4. Valid ROSC            — EtCO₂ ≥ 35 + numeric HR + perfusing BP.
 *  5. Arrest⇔pulse          — no half-states (arrestRhythm ⟺ "0/0" BP).
 *  6. Vitals continuity     — bound implausible single-turn swings.
 *  7. Metabolic labs        — engine owns them (set upstream in the flow).
 */
export function reconcilePatientResponse(
  prior: PriorPatientState,
  latestTreatment: string,
  aiOutput: DynamicPatientResponseOutput,
): { output: DynamicPatientResponseOutput; corrections: string[] } {
  const corrections: string[] = [];

  // Rule 1 — deceased clamp (terminal).
  if (prior.wasDeceased) {
    corrections.push('deceased_clamp');
    return { output: clampDeceased(aiOutput), corrections };
  }

  let output: DynamicPatientResponseOutput = { ...aiOutput };

  const arrestedContext = prior.wasArrested || prior.engineArrested;
  const rosc = isValidRosc(output);
  const treatmentIsCpr = treatmentLooksLikeCpr(latestTreatment);

  if (arrestedContext) {
    // Rules 2–4: engine / prior arrest authority.
    if (rosc) {
      // Legitimate return of spontaneous circulation — allow the pulse, just
      // make sure no stale arrestRhythm lingers. Not a correction.
      output.arrestRhythm = undefined;
      output.arrestRhythmRationale = undefined;
    } else {
      const outputPerfusing =
        !output.arrestRhythm &&
        !output.patientIsDeceased &&
        vitalsSuggestPerfusion(output.vitals);
      const rhythm: ArrestRhythmKind =
        output.arrestRhythm ?? prior.priorArrestRhythm ?? 'pea';
      if (outputPerfusing) {
        corrections.push(prior.engineArrested ? 'engine_arrest_authority' : 'arrest_continuity');
      }
      output.arrestRhythm = rhythm;
      output.patientIsDeceased = false;
      output.vitals = pinArrestVitals(output.vitals, rhythm);
    }
  } else {
    // Rule 3 (reversal) — perfusing patient receiving CPR. Reverting only fires
    // when the prior turn was genuinely perfusing AND not arrested.
    const outputArrested = Boolean(
      output.arrestRhythm || output.patientIsDeceased || vitalsSuggestPulselessArrest(output.vitals),
    );
    const priorPerfusing = prior.rawVitals ? vitalsSuggestPerfusion(prior.rawVitals) : true;
    if (treatmentIsCpr && priorPerfusing && outputArrested) {
      corrections.push('cpr_reversal');
      output.arrestRhythm = undefined;
      output.arrestRhythmRationale = undefined;
      output.patientIsDeceased = false;
      if (prior.rawVitals) output.vitals = { ...output.vitals, ...prior.rawVitals };
      output.conditionChange =
        'Patient still has a pulse—inappropriate CPR; stop compressions and reassess. ' +
        (output.conditionChange ?? '').trim();
    }
  }

  // Rule 5 — arrest⇔pulse consistency (no half-states).
  if (output.arrestRhythm) {
    const pinned = pinArrestVitals(output.vitals, output.arrestRhythm);
    if (pinned.bp !== output.vitals.bp || pinned.hr !== output.vitals.hr) {
      corrections.push('arrest_pulse_consistency');
    }
    output.vitals = pinned;
  } else if (!output.patientIsDeceased && vitalsSuggestPulselessArrest(output.vitals)) {
    // Claims a pulse but shows arrest-format vitals — restore prior perfusion if we can.
    if (prior.rawVitals && vitalsSuggestPerfusion(prior.rawVitals)) {
      corrections.push('arrest_pulse_consistency');
      output.vitals = { ...output.vitals, ...prior.rawVitals };
    }
  }

  // Rule 6 — vitals continuity clamp. Arrest/ROSC transitions (which legitimately
  // move vitals far) are exactly the arrested-context turns and any turn that
  // lands in an arrest rhythm; a perfusing→perfusing turn must stay continuous.
  output.vitals = clampVitalsContinuity(output, prior, corrections, {
    treatmentGiven: Boolean(latestTreatment.trim()),
    transition: arrestedContext || Boolean(output.arrestRhythm),
  });

  // Rule 7 — metabolic labs authority is enforced upstream in the flow (the
  // engine overwrites `metabolicLabs` from the snapshot before reconciliation);
  // we simply never reintroduce drift here.

  return { output, corrections };
}
