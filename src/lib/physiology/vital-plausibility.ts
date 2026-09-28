/**
 * Physiologic plausibility bounds shared by the display merge
 * (`mergeVitalsForDisplay`) and the AI-output reconciler
 * (`reconcilePatientResponse`).
 *
 * These are *ceilings on compensation*, not on disease: an authored or
 * AI-reported tachyarrhythmia (SVT, VT, AFib RVR…) keeps its rate, but
 * sinus / compensatory tachycardia driven by shock physiology can't exceed
 * what a human sinus node actually produces, and a perfusing patient can't
 * show a pulse pressure of zero.
 */

/**
 * Adult compensatory sinus-tachycardia ceiling. Hypovolemic / obstructive shock
 * in adults rarely drives sinus rate above ~160–170 bpm; faster rates are a
 * tachyarrhythmia and must be labeled as one.
 */
export const ADULT_SINUS_HR_CEILING_BPM = 170;
/** Pediatric (<12 y) sinus ceiling — infants/children legitimately run 180–220. */
export const PEDIATRIC_SINUS_HR_CEILING_BPM = 220;

/** Adult spontaneous RR ceiling; beyond ~50/min tidal volume is dead-space only. */
export const ADULT_RR_CEILING = 50;
export const PEDIATRIC_RR_CEILING = 70;

/**
 * Minimum pulse pressure (SBP − DBP) for a perfusing patient. Compensated
 * shock narrows it (ATLS Class II–IV ≈ 20–25 mmHg), but a 96/78 or 76/76
 * reading is a charting artifact, not physiology.
 */
export const MIN_PULSE_PRESSURE_MMHG = 15;
/**
 * Obstructive physiology (tension pneumothorax, tamponade) legitimately
 * narrows pulse pressure further — but still never to zero while perfusing.
 */
export const MIN_PULSE_PRESSURE_OBSTRUCTIVE_MMHG = 10;

const TACHYARRHYTHMIA_RE =
  /\bsvt\b|supraventricular|\bv-?tach|\bvt\b|ventricular\s+tachy|wide[-\s]complex|torsade|a-?fib|atrial\s+fib|a-?flutter|atrial\s+flutter|\brvr\b|\bwpw\b|wolff|\bmat\b|multifocal\s+atrial|junctional\s+tachy|pre-?excit/i;

/** True when free text names a (non-sinus) tachyarrhythmia that licenses a rate above the sinus ceiling. */
export function namesTachyarrhythmia(text: string | null | undefined): boolean {
  if (!text) return false;
  return TACHYARRHYTHMIA_RE.test(text);
}

const OBSTRUCTIVE_RE = /tension|tamponade|obstructive|pericardial|beck'?s\s+triad|pulsus\s+paradox/i;

/** True when free text describes obstructive-shock physiology that intends a narrowed pulse pressure. */
export function describesObstructivePhysiology(text: string | null | undefined): boolean {
  if (!text) return false;
  return OBSTRUCTIVE_RE.test(text);
}

export function sinusHrCeiling(ageYears: number | null | undefined): number {
  return ageYears != null && ageYears < 12
    ? PEDIATRIC_SINUS_HR_CEILING_BPM
    : ADULT_SINUS_HR_CEILING_BPM;
}

export function rrCeiling(ageYears: number | null | undefined): number {
  return ageYears != null && ageYears < 12 ? PEDIATRIC_RR_CEILING : ADULT_RR_CEILING;
}

/**
 * Minimum pulse pressure for a given systolic. Scales down for profound
 * hypotension (a 50 mmHg systolic can't carry a 15 mmHg pulse pressure and
 * still have a meaningful diastolic) but never below 8 mmHg.
 */
export function minPulsePressure(sys: number, obstructive = false): number {
  const floor = obstructive
    ? MIN_PULSE_PRESSURE_OBSTRUCTIVE_MMHG
    : MIN_PULSE_PRESSURE_MMHG;
  return Math.min(floor, Math.max(8, Math.round(sys * 0.2)));
}

/**
 * Repair an implausibly narrow pulse pressure by lowering the diastolic.
 * Systolic is kept because it's the value learners act on (and the one the
 * AI / engine trajectory is about); a falsely high diastolic is the usual
 * artifact. Returns the input unchanged when already plausible.
 */
export function repairPulsePressure(
  sys: number,
  dia: number,
  minPp: number,
): { sys: number; dia: number } {
  if (sys <= 0) return { sys, dia };
  if (sys - dia >= minPp) return { sys, dia };
  return { sys, dia: Math.max(0, sys - minPp) };
}
