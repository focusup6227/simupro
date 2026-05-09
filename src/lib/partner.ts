import {
  interventionCertifications,
  type LegacySupabaseIntervention,
  type PartnerSimulationRole,
  type UserAction,
  type UserRole,
} from '@/lib/types';

/** Embedded in assessment text for grading — partner performed under user direction */
export const PARTNER_DELEGATION_MARKER = '[PARTNER ACTION]';

export const PARTNER_ADVICE_PROMPT_MARKER = '[PARTNER ADVICE CONTEXT]';

const PARTNER_NAMES = [
  'Alex',
  'Jordan',
  'Sam',
  'Riley',
  'Casey',
  'Morgan',
  'Drew',
  'Jamie',
  'Taylor',
  'Quinn',
] as const;

function fieldProviderRole(userRole: UserRole): PartnerSimulationRole | null {
  if (userRole === 'emt' || userRole === 'aemt' || userRole === 'paramedic') {
    return userRole;
  }
  if (userRole === 'tester') {
    return 'paramedic';
  }
  return null;
}

/**
 * Random partner at same certification or lower (by intervention ladder).
 */
export function rollPartnerForUser(userRole: UserRole): {
  role: PartnerSimulationRole;
  name: string;
} {
  const field = fieldProviderRole(userRole);
  const capIdx =
    field != null
      ? interventionCertifications.indexOf(field)
      : interventionCertifications.indexOf('paramedic');
  const maxIdx =
    capIdx >= 0 ? capIdx : interventionCertifications.length - 1;
  const choices = interventionCertifications.slice(0, maxIdx + 1);
  const role = choices[Math.floor(Math.random() * choices.length)]!;
  const name =
    PARTNER_NAMES[Math.floor(Math.random() * PARTNER_NAMES.length)]!;
  return { role, name };
}

export function partnerCanPerform(
  intervention: LegacySupabaseIntervention,
  partnerRole: PartnerSimulationRole,
): boolean {
  const p = interventionCertifications.indexOf(partnerRole);
  const i = interventionCertifications.indexOf(
    intervention.certificationLevel,
  );
  return p >= 0 && i >= 0 && i <= p;
}

/**
 * Whether `partner` is at least as senior as `min` on the EMS certification
 * ladder. Used to gate partner-delegated actions whose minimum role is
 * declared on the catalog entry rather than per-intervention.
 */
export function partnerMeetsMinRole(
  partner: PartnerSimulationRole,
  min: PartnerSimulationRole,
): boolean {
  return (
    interventionCertifications.indexOf(partner) >=
    interventionCertifications.indexOf(min)
  );
}

export type NextAdviceGate = {
  /** Minimum simulation seconds between proactive checks */
  minSecondsBetweenProactiveChecks: number;
  /** Do not proactive-nudge within this many sim seconds after a user action */
  quietSecondsAfterUserAction: number;
  /** Dedup window for identical or near-identical advice text */
  dedupeWindowSec: number;
  /**
   * Reject a proposed advice if its Jaccard token similarity to any recent
   * advice within `dedupeWindowSec` is at least this much. 0 disables fuzzy
   * dedup; 1 reduces fuzzy dedup to exact-token-set match.
   */
  tokenSimilarityDedup: number;
};

const DEFAULT_GATE: NextAdviceGate = {
  minSecondsBetweenProactiveChecks: 45,
  quietSecondsAfterUserAction: 15,
  dedupeWindowSec: 300,
  tokenSimilarityDedup: 0.8,
};

/**
 * Stopwords stripped before similarity scoring. Kept tight so clinical content
 * (drug names, vitals, anatomy) drives the score, not connective tissue.
 */
const ADVICE_STOPWORDS: ReadonlySet<string> = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'i', 'in', 'is',
  'it', 'its', 'of', 'on', 'or', 'so', 'that', 'the', 'their', 'them', 'they',
  'this', 'to', 'we', 'with', 'you', 'your', 'our', 'if', 'then', 'will',
  'can', 'has', 'have', 'had', 'was', 'were', 'am', 'do', 'does', 'did',
  'but', 'than', 'about', 'also', 'just', 'any', 'all', 'some', 'no', 'not',
  'her', 'his', 'him', 'she', 'he', 'me', 'my', 'us',
  // Common EMS-chatter contractions
  "i've", 'i’ve', "i'll", 'i’ll', "let's", 'let’s', "that's", 'that’s',
  "you've", 'you’ve', "you'll", 'you’ll', "we'll", 'we’ll', "we're", 'we’re',
  "i'm", 'i’m', "don't", 'don’t', "can't", 'can’t',
]);

function tokenizeAdvice(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[—–-]+/g, ' ')
    // Keep letters/digits/apostrophes/slashes (e.g. iv/io, mg/kg, J/kg).
    .replace(/[^\p{L}\p{N}'’/]+/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !ADVICE_STOPWORDS.has(t));
}

/**
 * Jaccard similarity over normalized, stopword-filtered word tokens.
 * Returns a value in [0, 1]. 1 = identical token sets, 0 = no overlap.
 */
export function partnerAdviceTokenSimilarity(a: string, b: string): number {
  const A = new Set(tokenizeAdvice(a));
  const B = new Set(tokenizeAdvice(b));
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Returns whether a proactive advice call is allowed at this simulation second.
 *
 * Dedup logic, when `proposedAdviceText` is provided:
 * 1. Exact (trimmed) match within `dedupeWindowSec` ⇒ reject.
 * 2. Token-set Jaccard similarity ≥ `tokenSimilarityDedup` against any recent
 *    advice within the same window ⇒ reject (catches paraphrases).
 */
export function canIssueProactiveAdvice(args: {
  currentSimTime: number;
  lastUserActionSimTime: number | null;
  lastProactiveCheckSimTime: number | null;
  lastAdviceTexts: { text: string; simTime: number }[];
  proposedAdviceText?: string;
  gate?: Partial<NextAdviceGate>;
}): boolean {
  const gate = { ...DEFAULT_GATE, ...args.gate };
  const t = args.currentSimTime;

  if (
    args.lastUserActionSimTime != null &&
    t - args.lastUserActionSimTime < gate.quietSecondsAfterUserAction
  ) {
    return false;
  }

  if (
    args.lastProactiveCheckSimTime != null &&
    t - args.lastProactiveCheckSimTime < gate.minSecondsBetweenProactiveChecks
  ) {
    return false;
  }

  const txt = args.proposedAdviceText?.trim();
  if (txt) {
    const dup = args.lastAdviceTexts.some((e) => {
      if (t - e.simTime > gate.dedupeWindowSec) return false;
      const prior = e.text.trim();
      if (prior === txt) return true;
      if (gate.tokenSimilarityDedup <= 0) return false;
      return (
        partnerAdviceTokenSimilarity(prior, txt) >= gate.tokenSimilarityDedup
      );
    });
    if (dup) return false;
  }

  return true;
}

/** Short blurb for UI — what the partner level can do */
export function partnerScopeBlurb(role: PartnerSimulationRole): string {
  switch (role) {
    case 'emt':
      return 'BLS, AED, vitals, airway adjuncts, nitro when protocol allows.';
    case 'aemt':
      return 'EMT scope plus IV/IO, more ALS basics per protocol.';
    case 'paramedic':
      return 'Full ALS — drugs, advanced airway, pacing, cardioversion.';
    default:
      return '';
  }
}

export function partnerAvatarLetter(role: PartnerSimulationRole): string {
  switch (role) {
    case 'emt':
      return 'E';
    case 'aemt':
      return 'A';
    case 'paramedic':
      return 'M';
    default:
      return 'P';
  }
}

/** Rough heuristic: mandatory line not clearly reflected in action text. */
export function mandatoryLikelyUnmet(
  mandatory: string[],
  actions: UserAction[],
): boolean {
  const blob = actions
    .map((a) => `${a.assessment} ${a.treatments.join(' ')}`.toLowerCase())
    .join(' | ');
  return mandatory.some((req) => {
    const tokens = req
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9]/g, ''))
      .filter((t) => t.length > 3);
    if (tokens.length === 0) return false;
    return !tokens.every((t) => blob.includes(t));
  });
}
