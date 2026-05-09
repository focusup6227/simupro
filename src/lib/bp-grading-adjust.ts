import type { UserAction } from '@/lib/types';

/** Embedded in assessment text for deterministic grading */
export const BP_GRADING_MANUAL_MARKER = '[BP_GRADING_MANUAL]';

const MANUAL_BP_RE =
  /manual blood pressure|auscultat.*\bbp\b|palpat.*\bbp\b|\[BP_GRADING_MANUAL\]/i;
const NIBP_COMPLETE_RE =
  /nibp cycle complete.*automated|\[BP_GRADING_NIBP\]/i;

/**
 * Strip the internal grading markers (e.g. [BP_GRADING_MANUAL], [BP_GRADING_NIBP])
 * from any user-facing string. The markers stay in the underlying action data so
 * grading still works, but the user never sees the bracketed tokens in the
 * simulation log or live action log.
 */
const GRADING_MARKER_RE = /\s*\[BP_GRADING_(?:MANUAL|NIBP)\]\s*/g;
export function stripGradingMarkers(text: string): string {
  return text.replace(GRADING_MARKER_RE, ' ').replace(/\s{2,}/g, ' ').trim();
}

function actionQualifiesBp(a: UserAction): boolean {
  if (MANUAL_BP_RE.test(a.assessment)) return true;
  return a.treatments.some((t) => MANUAL_BP_RE.test(t) || NIBP_COMPLETE_RE.test(t));
}

function earliestBpElapsed(actions: UserAction[]): number | null {
  let best: number | null = null;
  for (const a of actions) {
    if (!actionQualifiesBp(a)) continue;
    best = best === null ? a.time : Math.min(best, a.time);
  }
  return best;
}

export function userLoggedBloodPressure(actions: UserAction[]): boolean {
  return actions.some((a) => actionQualifiesBp(a));
}

/**
 * −15 if no manual BP log and no NIBP-complete log; +5 if any BP logged by ≤120s.
 */
export function adjustScoresForBloodPressure(
  userActions: UserAction[],
  assessmentScore: number,
  reasoning: string,
): { assessmentScore: number; reasoning: string } {
  let score = assessmentScore;
  let reason = reasoning;

  const gotBp = userLoggedBloodPressure(userActions);
  if (!gotBp) {
    score = Math.max(0, score - 15);
    reason += `\n\n[Blood pressure] No manual blood pressure or completed NIBP cycle was logged — expected on every patient (−15 assessment).`;
  } else {
    const earlyAt = earliestBpElapsed(userActions);
    if (earlyAt !== null && earlyAt <= 120) {
      score = Math.min(100, score + 5);
      reason += `\n\n[Blood pressure] Blood pressure obtained within the first 2 minutes (+5 assessment).`;
    }
  }

  return { assessmentScore: score, reasoning: reason };
}
