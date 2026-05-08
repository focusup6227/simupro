/**
 * Rhythm taxonomy + free-text classifier for the ECG monitor and trainer.
 *
 * The kind union covers every label exposed in the rhythm trainer and scenario
 * authoring form. `classifyEcgRhythm` parses scenario / AI HR strings into a
 * structured context (kind + rate + label). Both the live monitor and the
 * static print-out template render off this single source of truth.
 */

export type EcgRhythmFamily =
  | 'sinus'
  | 'atrial'
  | 'junctional'
  | 'av_block'
  | 'paced'
  | 'ventricular'
  | 'arrest';

export type EcgRhythmKind =
  // SINUS
  | 'sinus'
  | 'sinus_brady'
  | 'sinus_tach'
  | 'sinus_arrhythmia'
  | 'wandering_pacemaker'
  // ATRIAL / JUNCTIONAL
  | 'afib'
  | 'aflutter'
  | 'svt'
  | 'junctional_brady'
  | 'junctional'
  | 'junctional_tach'
  | 'accelerated_junctional'
  // AV BLOCKS
  | 'av_block_1'
  | 'av_block_2_mobitz1'
  | 'av_block_2_mobitz2'
  | 'av_block_2_2to1'
  | 'av_block_3'
  | 'ventricular_standstill'
  // PACED
  | 'paced_atrial'
  | 'paced_ventricular'
  | 'paced_dual'
  | 'paced_av_sequential'
  | 'failure_to_capture'
  // VENTRICULAR / ARREST
  | 'idioventricular'
  | 'accelerated_idioventricular'
  | 'vt'
  | 'pulseless_vt'
  | 'vfib'
  | 'torsades'
  | 'agonal'
  | 'asystole'
  // OTHER
  | 'pea'
  | 'unknown';

export const ALL_ECG_RHYTHM_KINDS: readonly EcgRhythmKind[] = [
  'sinus',
  'sinus_brady',
  'sinus_tach',
  'sinus_arrhythmia',
  'wandering_pacemaker',
  'afib',
  'aflutter',
  'svt',
  'junctional_brady',
  'junctional',
  'junctional_tach',
  'accelerated_junctional',
  'av_block_1',
  'av_block_2_mobitz1',
  'av_block_2_mobitz2',
  'av_block_2_2to1',
  'av_block_3',
  'ventricular_standstill',
  'paced_atrial',
  'paced_ventricular',
  'paced_dual',
  'paced_av_sequential',
  'failure_to_capture',
  'idioventricular',
  'accelerated_idioventricular',
  'vt',
  'pulseless_vt',
  'vfib',
  'torsades',
  'agonal',
  'asystole',
  'pea',
  'unknown',
] as const;

export const RHYTHM_FAMILY: Record<EcgRhythmKind, EcgRhythmFamily> = {
  sinus: 'sinus',
  sinus_brady: 'sinus',
  sinus_tach: 'sinus',
  sinus_arrhythmia: 'sinus',
  wandering_pacemaker: 'sinus',
  afib: 'atrial',
  aflutter: 'atrial',
  svt: 'atrial',
  junctional_brady: 'junctional',
  junctional: 'junctional',
  junctional_tach: 'junctional',
  accelerated_junctional: 'junctional',
  av_block_1: 'av_block',
  av_block_2_mobitz1: 'av_block',
  av_block_2_mobitz2: 'av_block',
  av_block_2_2to1: 'av_block',
  av_block_3: 'av_block',
  ventricular_standstill: 'av_block',
  paced_atrial: 'paced',
  paced_ventricular: 'paced',
  paced_dual: 'paced',
  paced_av_sequential: 'paced',
  failure_to_capture: 'paced',
  idioventricular: 'ventricular',
  accelerated_idioventricular: 'ventricular',
  vt: 'ventricular',
  pulseless_vt: 'arrest',
  vfib: 'arrest',
  torsades: 'ventricular',
  agonal: 'arrest',
  asystole: 'arrest',
  pea: 'arrest',
  unknown: 'sinus',
};

export const RHYTHM_FAMILY_LABEL: Record<EcgRhythmFamily, string> = {
  sinus: 'Sinus',
  atrial: 'Atrial',
  junctional: 'Junctional',
  av_block: 'AV blocks',
  paced: 'Paced',
  ventricular: 'Ventricular',
  arrest: 'Arrest',
};

/** Short labels used in dropdowns, quizzes, and monitor badges. */
export const RHYTHM_LABEL: Record<EcgRhythmKind, string> = {
  sinus: 'Sinus rhythm',
  sinus_brady: 'Sinus bradycardia',
  sinus_tach: 'Sinus tachycardia',
  sinus_arrhythmia: 'Sinus arrhythmia',
  wandering_pacemaker: 'Wandering atrial pacemaker',
  afib: 'Atrial fibrillation',
  aflutter: 'Atrial flutter',
  svt: 'Supraventricular tachycardia',
  junctional_brady: 'Junctional bradycardia',
  junctional: 'Junctional rhythm',
  junctional_tach: 'Junctional tachycardia',
  accelerated_junctional: 'Accelerated junctional',
  av_block_1: '1° AV block',
  av_block_2_mobitz1: '2° AV block · Mobitz I (Wenckebach)',
  av_block_2_mobitz2: '2° AV block · Mobitz II',
  av_block_2_2to1: '2° AV block · 2:1',
  av_block_3: '3° AV block (complete)',
  ventricular_standstill: 'Ventricular standstill',
  paced_atrial: 'Atrial paced',
  paced_ventricular: 'Ventricular paced',
  paced_dual: 'Dual-chamber paced',
  paced_av_sequential: 'Atrial-sensed, ventricular-paced',
  failure_to_capture: 'Pacing — failure to capture',
  idioventricular: 'Idioventricular (ventricular escape)',
  accelerated_idioventricular: 'Accelerated idioventricular',
  vt: 'Ventricular tachycardia',
  pulseless_vt: 'Pulseless VT',
  vfib: 'Ventricular fibrillation',
  torsades: 'Torsades de pointes',
  agonal: 'Agonal rhythm',
  asystole: 'Asystole',
  pea: 'PEA (pulseless electrical activity)',
  unknown: 'Rhythm strip (estimated)',
};

/** One-sentence clinical pearls for the trainer's reveal step. */
export const RHYTHM_TEACHING_NOTE: Record<EcgRhythmKind, string> = {
  sinus:
    'Regular P-QRS-T at 60–100 with upright P in II and inverted P in aVR.',
  sinus_brady:
    'Sinus rhythm at <60 — look for cause (athlete, sleep, vagal, drug, ischemia).',
  sinus_tach:
    'Sinus rhythm at >100 — almost always a response to something else (pain, fever, hypovolemia, hypoxia).',
  sinus_arrhythmia:
    'Sinus rhythm with phasic R-R variation tied to respiration — benign and common in young patients.',
  wandering_pacemaker:
    'P-wave morphology shifts beat-to-beat as pacing site migrates between SA node and atrial foci.',
  afib:
    'Irregularly irregular R-R, no discrete P waves, fibrillatory baseline. Risk of stroke; rate control or rhythm control as indicated.',
  aflutter:
    'Sawtooth flutter waves at ~300/min with regular AV conduction (most often 2:1 → ventricular rate ~150).',
  svt:
    'Narrow-complex regular tachycardia at 150–220 with hidden / retrograde P waves. Try vagal maneuvers, then adenosine.',
  junctional_brady:
    'AV-node escape rhythm at 30–40, narrow QRS, inverted or absent P waves.',
  junctional:
    'Regular narrow-complex rhythm at 40–60 with absent or inverted P waves — typical AV-node escape.',
  junctional_tach:
    'Narrow-complex rhythm at >100 originating from the AV junction — commonly drug or ischemia related.',
  accelerated_junctional:
    'Junctional pacemaker at 60–100 — often digoxin toxicity, ischemia, or post-cardiac surgery.',
  av_block_1:
    'Every P conducts but with PR > 200 ms. Usually benign; watch for progression.',
  av_block_2_mobitz1:
    'Progressive PR prolongation until a QRS is dropped, then resets — usually nodal and stable.',
  av_block_2_mobitz2:
    'Fixed PR with sudden non-conducted P waves. Infranodal, unstable; pacing often required.',
  av_block_2_2to1:
    'Every other P wave is dropped — cannot reliably distinguish Mobitz I vs II at the bedside; treat as the more dangerous.',
  av_block_3:
    'Complete AV dissociation: independent atrial and ventricular rates. Pace; treat the cause.',
  ventricular_standstill:
    'Atrial activity (P waves) only — no ventricular response. Imminent asystole; pace and start CPR.',
  paced_atrial:
    'Sharp pacing spike before each P wave — captures atrium, native AV conduction follows.',
  paced_ventricular:
    'Sharp pacing spike before each wide QRS; classically LBBB-like morphology.',
  paced_dual:
    'Two pacing spikes per cycle — atrial then ventricular. Confirms a working DDD pacemaker.',
  paced_av_sequential:
    'Native P sensed by the device; ventricular pacing follows. Spike sits just before a wide QRS.',
  failure_to_capture:
    'Pacing spike present but not followed by a captured complex — lead, threshold, or battery issue.',
  idioventricular:
    'Wide QRS escape rhythm at 20–40 with no P waves. Found post-arrest, severe brady, or AV block.',
  accelerated_idioventricular:
    'Wide-complex rhythm at 50–110 — common reperfusion rhythm after thrombolysis or PCI.',
  vt:
    'Wide-complex regular tachycardia at 120–250. Cardiovert if unstable; amiodarone or procainamide if stable.',
  pulseless_vt:
    'Wide-complex tachycardia without a pulse — shockable arrest rhythm. Defibrillate immediately.',
  vfib:
    'Chaotic, disorganized fibrillatory waveform — shockable arrest rhythm. Defibrillate ASAP and resume CPR.',
  torsades:
    'Polymorphic VT with twisting QRS amplitude — give magnesium, correct QT-prolonging cause.',
  agonal:
    'Slow, wide, dying complexes — pre-asystolic. Begin / continue CPR; usually progresses to asystole.',
  asystole:
    'Flat line with no organized electrical activity — confirm in ≥2 leads, continue CPR, treat reversible causes.',
  pea: 'Organized electrical activity without a palpable pulse. Search the H’s & T’s while running ACLS.',
  unknown: 'Insufficient data to classify — apply leads / take a 12-lead.',
};

export interface EcgRhythmContext {
  kind: EcgRhythmKind;
  /** Approximate BPM for timed rhythms (null when not pulsatile). */
  rateBpm: number | null;
  /** Short label for UI badges. */
  label: string;
}

function clampBpm(n: number, min = 30, max = 220): number {
  if (!Number.isFinite(n) || n <= 0) return 72;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function bpmFor(kind: EcgRhythmKind, requested: number | null): number | null {
  switch (kind) {
    case 'asystole':
    case 'vfib':
    case 'pulseless_vt':
    case 'unknown':
      return null;
    case 'agonal':
      return clampBpm(requested ?? 18, 8, 30);
    case 'idioventricular':
      return clampBpm(requested ?? 32, 20, 40);
    case 'accelerated_idioventricular':
      return clampBpm(requested ?? 78, 50, 110);
    case 'vt':
      return clampBpm(requested ?? 168, 120, 250);
    case 'torsades':
      return clampBpm(requested ?? 220, 180, 260);
    case 'svt':
      return clampBpm(requested ?? 180, 150, 240);
    case 'aflutter':
      return clampBpm(requested ?? 150, 75, 175);
    case 'afib':
      return clampBpm(requested ?? 110, 60, 180);
    case 'sinus_brady':
      return clampBpm(requested ?? 48, 30, 59);
    case 'sinus_tach':
      return clampBpm(requested ?? 122, 101, 180);
    case 'sinus':
    case 'sinus_arrhythmia':
    case 'wandering_pacemaker':
      return clampBpm(requested ?? 76, 60, 100);
    case 'junctional_brady':
      return clampBpm(requested ?? 32, 20, 39);
    case 'junctional':
      return clampBpm(requested ?? 48, 40, 60);
    case 'accelerated_junctional':
      return clampBpm(requested ?? 80, 60, 100);
    case 'junctional_tach':
      return clampBpm(requested ?? 120, 100, 180);
    case 'av_block_1':
      return clampBpm(requested ?? 70, 45, 100);
    case 'av_block_2_mobitz1':
      return clampBpm(requested ?? 60, 35, 90);
    case 'av_block_2_mobitz2':
      return clampBpm(requested ?? 55, 30, 80);
    case 'av_block_2_2to1':
      return clampBpm(requested ?? 45, 30, 70);
    case 'av_block_3':
      return clampBpm(requested ?? 38, 20, 50);
    case 'ventricular_standstill':
      return null;
    case 'paced_atrial':
    case 'paced_ventricular':
    case 'paced_dual':
    case 'paced_av_sequential':
    case 'failure_to_capture':
      return clampBpm(requested ?? 70, 60, 90);
    case 'pea':
      return clampBpm(requested ?? 48, 20, 80);
  }
}

export function labelForRhythm(kind: EcgRhythmKind, rate: number | null): string {
  const base = RHYTHM_LABEL[kind];
  if (rate == null) return base;
  return `${base} · ~${rate} bpm`;
}

interface PhraseRule {
  patterns: RegExp[];
  kind: EcgRhythmKind;
}

/**
 * Phrase rules are scanned in order. The first match wins. More specific
 * variants must appear before generic ones (e.g. `pulseless vt` before `vt`,
 * `accelerated idioventricular` before `idioventricular`).
 */
const PHRASE_RULES: PhraseRule[] = [
  // Arrest first — these supersede anything else.
  { kind: 'asystole', patterns: [/asystole|flat[- ]?line|p[- ]?wave asystole(?! .*standstill)/i] },
  { kind: 'pulseless_vt', patterns: [/pulseless\s+v[- ]?(?:tach|t)|pvt\b/i] },
  { kind: 'vfib', patterns: [/v[- ]?fib|ventricular\s+fib/i] },
  { kind: 'torsades', patterns: [/torsade(?:s)?|polymorphic\s+v[- ]?t/i] },
  { kind: 'agonal', patterns: [/agonal/i] },
  { kind: 'pea', patterns: [/\bpea\b|pulseless\s+electrical/i] },

  // Bradycardia escape rhythms / ventricular standstill.
  { kind: 'ventricular_standstill', patterns: [/ventricular\s+standstill/i] },
  { kind: 'accelerated_idioventricular', patterns: [/aivr|accel(?:erated)?\s+(?:idio)?vent(?:ricular)?|accel\s+vent/i] },
  { kind: 'idioventricular', patterns: [/idioventricular|vent(?:ricular)?\s+(?:rhythm|escape)|vent\s+rhythm/i] },

  // Atrial / junctional.
  { kind: 'aflutter', patterns: [/a(?:trial)?[- ]?flutter|a-?flut/i] },
  { kind: 'svt', patterns: [/\bsvt\b|psvt|supraventricular\s+tach/i] },
  { kind: 'afib', patterns: [/a(?:trial)?[- ]?fib|atrial\s+fibrill/i] },

  // Junctional rhythms (specific before generic).
  { kind: 'accelerated_junctional', patterns: [/accel(?:erated)?\s+junct|accel\s+junct/i] },
  { kind: 'junctional_tach', patterns: [/junct(?:ional)?\s+tach|junct\s+tach/i] },
  { kind: 'junctional_brady', patterns: [/junct(?:ional)?\s+brady|junct\s+brady/i] },
  { kind: 'junctional', patterns: [/junct(?:ional)?(?:\s+(?:rhythm|escape))?/i] },

  // AV blocks (specific before generic).
  { kind: 'av_block_2_mobitz1', patterns: [/wenckebach|mobitz\s*(?:1|i)\b/i] },
  { kind: 'av_block_2_mobitz2', patterns: [/mobitz\s*(?:2|ii)\b/i] },
  { kind: 'av_block_2_2to1', patterns: [/\b2\s*[:/]\s*1\s*(?:av\s*)?block\b|2\s+to\s+1\s+block/i] },
  { kind: 'av_block_3', patterns: [/3(?:rd)?[- ]?degree|third[- ]?degree|complete\s+(?:heart|av)\s+block|\bchb\b/i] },
  { kind: 'av_block_1', patterns: [/1(?:st)?[- ]?degree(?:\s+av)?\s*block|first[- ]?degree(?:\s+av)?\s*block|1°\s*av/i] },

  // Paced rhythms.
  { kind: 'failure_to_capture', patterns: [/failure\s+to\s+capture|loss\s+of\s+capture/i] },
  { kind: 'paced_av_sequential', patterns: [/atrial[- ]?sensed|av\s+sequential|atrial\s+sense.*paced/i] },
  { kind: 'paced_dual', patterns: [/dual[- ]?chamber\s+paced|\bddd\b/i] },
  { kind: 'paced_atrial', patterns: [/atrial\s+paced|\baai\b/i] },
  { kind: 'paced_ventricular', patterns: [/ventricular\s+paced|\bvvi\b/i] },
  { kind: 'wandering_pacemaker', patterns: [/wandering\s+(?:atrial\s+)?pacemaker|\bwap\b/i] },

  // Sinus variations.
  { kind: 'sinus_arrhythmia', patterns: [/sinus\s+arrhythmia/i] },
  { kind: 'sinus_tach', patterns: [/sinus\s+tach(?:ycardia)?|s(?:inus)?\.?\s*tachy/i] },
  { kind: 'sinus_brady', patterns: [/sinus\s+brady(?:cardia)?|s(?:inus)?\.?\s*brady/i] },
  { kind: 'sinus', patterns: [/normal\s+sinus|nsr|sinus(?:\s+rhythm)?/i] },

  // Generic VT (after pulseless_vt, torsades).
  { kind: 'vt', patterns: [/v[- ]?tach|ventricular\s+tach|monomorphic\s+v[- ]?t|\bvt\b/i] },

  // Generic "no pulse" / "cardiac arrest" → asystole as a safe arrest fallback.
  { kind: 'asystole', patterns: [/no\s+pulse|pulseless(?!\s+(?:vt|electrical))|cardiac\s+arrest|code\s+blue|\b0\s*bpm\b|\b0\s*\/\s*min\b/i] },
];

/**
 * Map free-text HR / rhythm scenario strings to a structured rhythm context.
 * Falls back to numeric heart-rate parsing when no phrase matches.
 */
export function classifyEcgRhythm(hrRaw: string): EcgRhythmContext {
  const hr = (hrRaw ?? '').toString().trim();
  if (!hr) return { kind: 'unknown', rateBpm: null, label: RHYTHM_LABEL.unknown };

  // Capture an optional explicit rate hint (e.g. "PEA @ 28 bpm" or "VT 168").
  const rateHint = (() => {
    const m = hr.match(/(\d{2,3})\s*(?:bpm|\/min)?/i);
    return m ? clampBpm(Number.parseInt(m[1]!, 10)) : null;
  })();

  for (const rule of PHRASE_RULES) {
    if (rule.patterns.some((re) => re.test(hr))) {
      const rate = bpmFor(rule.kind, rateHint);
      return {
        kind: rule.kind,
        rateBpm: rate,
        label: labelForRhythm(rule.kind, rate),
      };
    }
  }

  // Pure-numeric fallback ("88", "112 bpm", "44/min").
  const numMatch = hr.match(/(\d{2,3})\s*(?:bpm|\/min)?/i);
  if (numMatch) {
    const n = clampBpm(Number.parseInt(numMatch[1]!, 10));
    if (n > 100)
      return { kind: 'sinus_tach', rateBpm: n, label: labelForRhythm('sinus_tach', n) };
    if (n < 60)
      return { kind: 'sinus_brady', rateBpm: n, label: labelForRhythm('sinus_brady', n) };
    return { kind: 'sinus', rateBpm: n, label: labelForRhythm('sinus', n) };
  }

  // Last-resort numeric scan (digits anywhere).
  const loose = hr.replace(/\D/g, '');
  if (loose.length >= 2) {
    const n = clampBpm(Number.parseInt(loose.slice(0, 3), 10));
    if (n >= 35 && n <= 220) {
      const kind: EcgRhythmKind = n > 100 ? 'sinus_tach' : n < 60 ? 'sinus_brady' : 'sinus';
      return { kind, rateBpm: n, label: labelForRhythm(kind, n) };
    }
  }

  return { kind: 'unknown', rateBpm: null, label: RHYTHM_LABEL.unknown };
}

export function shockableArrestRhythm(kind: EcgRhythmKind | null | undefined): boolean {
  return kind === 'vfib' || kind === 'pulseless_vt';
}

export function isArrestRhythm(kind: EcgRhythmKind | null | undefined): boolean {
  if (!kind) return false;
  return RHYTHM_FAMILY[kind] === 'arrest';
}
