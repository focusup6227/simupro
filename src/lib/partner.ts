import {
  interventionCertifications,
  type Intervention,
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
  intervention: Intervention,
  partnerRole: PartnerSimulationRole,
): boolean {
  const p = interventionCertifications.indexOf(partnerRole);
  const i = interventionCertifications.indexOf(
    intervention.certificationLevel,
  );
  return p >= 0 && i >= 0 && i <= p;
}

export type NextAdviceGate = {
  /** Minimum simulation seconds between proactive checks */
  minSecondsBetweenProactiveChecks: number;
  /** Do not proactive-nudge within this many sim seconds after a user action */
  quietSecondsAfterUserAction: number;
  /** Dedup window for identical advice text */
  dedupeWindowSec: number;
};

const DEFAULT_GATE: NextAdviceGate = {
  minSecondsBetweenProactiveChecks: 45,
  quietSecondsAfterUserAction: 15,
  dedupeWindowSec: 300,
};

/**
 * Returns whether a proactive advice call is allowed at this simulation second.
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

  const txt = args.proposedAdviceText;
  if (txt) {
    const dup = args.lastAdviceTexts.some(
      (e) =>
        e.text.trim() === txt.trim() && t - e.simTime <= gate.dedupeWindowSec,
    );
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
