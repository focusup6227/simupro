/**
 * The Assessment free-text box is for questions, exam steps, and findings.
 * Interventions are only performed (and graded / fed to physiology) when they
 * arrive through the Treatment tab or a partner instruction. Learners still
 * type orders into Assessment ("Start a line", "put him on oxygen"), and the
 * patient AI used to narrate them as performed while nothing was recorded.
 *
 * This module is the deterministic side of that fix:
 *  - `detectAssessmentIntervention` spots assessment text that reads like a
 *    treatment order, so the runner can nudge the learner and the server can
 *    tell the model the order was NOT carried out.
 *  - `stripPerformedInterventionNarration` removes narration that describes an
 *    intervention being carried out on a turn where none was.
 *
 * Pure functions only (no React / Genkit imports) so they run in vitest's node env.
 */

export type AssessmentInterventionDetection = {
  /** True when at least one clause reads like an intervention order. */
  looksLikeIntervention: boolean;
  /** Short human-readable labels for what matched (deduped, in match order). */
  matched: string[];
};

type InterventionPattern = { label: string; re: RegExp };

/**
 * Each pattern needs an action verb (or an unambiguous intervention phrase) so
 * exam language like "check blood glucose", "assess lung sounds", or history
 * questions about medications don't trip it.
 */
const INTERVENTION_PATTERNS: InterventionPattern[] = [
  {
    label: 'IV / IO access',
    re: /\b(start|establish|get|place|put in|insert|drop|run|set up|obtain|gain)\b[^.?!]{0,25}\b(line|iv|i\.v\.|io|i\.o\.|saline lock|catheter)\b|\b(iv|io)\s+(access|line|start)\b/i,
  },
  {
    label: 'IV fluids',
    re: /\b(start|give|hang|run|spike|bolus|open up|administer|push)\b[^.?!]{0,25}\b(fluids?|saline|ns|normal saline|lactated ringers?|lr|bolus|d10|d50)\b|\bfluid (bolus|challenge)\b/i,
  },
  {
    label: 'Oxygen',
    re: /\b(put|place|start|give|apply|administer|hook|get)\b[^.?!]{0,30}\b(oxygen|o2|non-?rebreather|nrb|nasal cannula|nc|cpap|bvm|bag[- ]valve)\b(?!\s*(sat|saturation|level|reading))|\b(\d{1,2}\s*(l|lpm|liters?)\b[^.?!]{0,15}\b(nrb|nc|non-?rebreather|nasal cannula|o2|oxygen))\b/i,
  },
  {
    label: 'Ventilation / airway',
    re: /\b(bag|ventilate|intubate|suction|insert)\b[^.?!]{0,25}\b(him|her|them|the patient|patient|airway|opa|npa|igel|i-gel|king|et tube|ett)\b|\b(insert|place)\s+(an?\s+)?(opa|npa|oral airway|nasal airway|i-?gel|king airway|supraglottic)\b/i,
  },
  {
    label: 'Hemorrhage control',
    re: /\b(apply|put|place|tighten|pack)\b[^.?!]{0,25}\b(tourniquet|tq|pressure dressing|hemostatic|gauze|direct pressure|bandage)\b|\b(pack|pressure on)\s+the\s+wound\b/i,
  },
  {
    label: 'Immobilization / splinting',
    re: /\b(apply|put|place|use|immobilize)\b[^.?!]{0,25}\b(splint|sling|c-?collar|collar|backboard|long board|traction|kted|ked|spinal motion restriction|smr)\b|\bsplint (the|his|her|that)\b/i,
  },
  {
    label: 'Medication',
    re: /\b(give|administer|push|draw up|hang|nebuli[sz]e)\b[^.?!]{0,30}\b(mg|mcg|aspirin|asa|nitro|nitroglycerin|epi|epinephrine|albuterol|duoneb|narcan|naloxone|glucose|oral glucose|d10|d50|glucagon|zofran|ondansetron|fentanyl|morphine|ketamine|versed|midazolam|amiodarone|adenosine|atropine|benadryl|diphenhydramine|solu-?medrol|magnesium|dextrose|medication|meds)\b/i,
  },
  {
    label: 'CPR / defibrillation',
    re: /\b(start|begin|initiate|do|perform|continue)\b[^.?!]{0,15}\b(cpr|compressions|chest compressions)\b|\b(shock|defibrillate|cardiovert|pace)\b\s+(him|her|them|the patient|patient)\b|\b(attach|apply|put on)\b[^.?!]{0,15}\b(aed|pads|defib pads)\b/i,
  },
  {
    label: 'Warming / cooling',
    re: /\b(blanket|blankets|heat packs?|hot packs?|cold packs?|ice packs?)\b|\b(warm (up|him|her|them|the patient|the (back|ambulance|rig|truck|box|unit))|heat up|crank (up )?the heat|turn (up )?the heat)\b|\b(cover|wrap)\s+(him|her|them|the patient)\b/i,
  },
  {
    label: 'Positioning',
    re: /\b(lay|laying|lie|place|put|get|sit|position|roll|move|elevate|raise)\b[^.?!]{0,25}\b(supine|prone|laying down|lying down|down flat|flat|fowler'?s|semi-?fowler'?s|position of comfort|recovery position|left lateral|trendelenburg|on (his|her|their) (side|back)|legs up|on the (cot|stretcher|stair chair))\b/i,
  },
];

/** Clauses that start like a question to the patient/bystander are history, not orders. */
const QUESTION_START =
  /^(do|does|did|have|has|had|are|is|was|were|when|what|which|how|where|why|who|whose|any|anything|ever)\b/i;

/** Split on sentence punctuation / newlines so a question clause can be skipped on its own. */
function splitClauses(text: string): string[] {
  return text
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * Heuristically decide whether free-text assessment input is actually a
 * treatment order. False negatives just mean no nudge; false positives only
 * show a dismissible hint, so the patterns lean toward recall on the common
 * orders (IV, fluids, O2, bleeding control, splinting, meds, CPR, warming,
 * positioning).
 */
export function detectAssessmentIntervention(text: string): AssessmentInterventionDetection {
  const matched: string[] = [];
  const trimmed = (text ?? '').trim();
  if (!trimmed) return { looksLikeIntervention: false, matched };

  for (const clause of splitClauses(trimmed)) {
    // Strip leading bracketed runner markers like "[BP_GRADING_MANUAL]".
    const c = clause.replace(/^\[[A-Z_ ]+\]\s*/, '');
    if (QUESTION_START.test(c) && /\?\s*$/.test(c)) continue;
    for (const p of INTERVENTION_PATTERNS) {
      if (p.re.test(c) && !matched.includes(p.label)) matched.push(p.label);
    }
  }
  return { looksLikeIntervention: matched.length > 0, matched };
}

/**
 * Narration that describes an intervention being carried out ("as you prepare
 * for the IV", "you drape a blanket over him", "the fluids begin to run").
 */
const PERFORMED_NARRATION: RegExp[] = [
  /\b(as|while|when|after|once)\s+(you|your partner|the medic|the crew)\s+(\w+\s+){0,2}(prepare|prep|start|begin|place|insert|apply|spike|hang|drape|put|position|lay|cover|administer|give|push|tighten|splint|wrap|warm|bag|ventilate|secure)/i,
  /\b(you|your partner)\s+(start|started|place|placed|insert|inserted|apply|applied|drape|draped|put|hang|hung|spike|spiked|administer|administered|give|gave|push|pushed|lay|laid|cover|covered|secure|secured|position|positioned|tighten|tightened|splint|splinted|wrap|wrapped|slide|slid|tuck|tucked)\b/i,
  /\b(iv|line|catheter|needle|cannula|fluids?|bolus|saline|tourniquet|splint|blanket|heat packs?|oxygen|o2|non-?rebreather|mask|nasal cannula|collar)\b[^.!?]{0,40}\b(is now|are now|now in place|in place|begins? to|starts? to|running|flowing|drips?|secured|placed|applied|draped|tightened|hissing|takes effect)\b/i,
  /\b(needle|catheter)\s+(stick|goes in|pierces|enters|slides)\b/i,
];

export function narrationDescribesPerformedIntervention(text: string): boolean {
  return PERFORMED_NARRATION.some((re) => re.test(text));
}

export const ASSESSMENT_ONLY_FALLBACK_NARRATION =
  'The patient looks at you, waiting to see what you do next.';

/**
 * Remove sentences that narrate an intervention as performed. Used only on
 * turns where the learner's order arrived through the Assessment channel (so
 * nothing was actually done). Returns the original text when nothing matched.
 */
export function stripPerformedInterventionNarration(text: string): { text: string; changed: boolean } {
  const original = text ?? '';
  if (!narrationDescribesPerformedIntervention(original)) return { text: original, changed: false };
  const kept = original
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !narrationDescribesPerformedIntervention(s));
  let out = kept.join(' ').trim();
  // A lone interjection ("Ow!") left behind is a reaction to the removed action.
  if (out.replace(/[^a-z]/gi, '').length < 12) out = ASSESSMENT_ONLY_FALLBACK_NARRATION;
  return { text: out, changed: true };
}

/**
 * Note appended to the assessment text sent to the patient model when the
 * learner typed an intervention into the Assessment box.
 */
export function assessmentOnlyModelNote(detection: AssessmentInterventionDetection): string {
  return (
    `[SIMULATOR NOTE: The learner typed this in the ASSESSMENT box, which is for questions and findings only. ` +
    `The following were NOT performed and have NO physiologic effect this turn: ${detection.matched.join(', ')}. ` +
    `Do not narrate them as done or in progress; respond only to any questions/exam steps, and let the patient's condition evolve untreated.]`
  );
}
