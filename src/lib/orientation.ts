import type { UserAction } from './types';

/**
 * Orientation (first-run) flow configuration.
 *
 * The orientation is a single, special-cased scenario (`welcome-tutorial`) that
 * teaches the runner UI rather than testing clinical judgement. Everything that
 * keys off "is this the orientation run?" should route through the helpers here
 * instead of comparing the raw id, so the gating stays in one place.
 */

export const ORIENTATION_SCENARIO_ID = 'welcome-tutorial';

export function isOrientationScenario(id?: string | null): boolean {
  return id === ORIENTATION_SCENARIO_ID;
}

export const ORIENTATION_SCENARIO_PATH = `/dashboard/scenarios/${ORIENTATION_SCENARIO_ID}`;

export interface OrientationObjective {
  /** Stable key used for progress tracking + analytics. */
  id: string;
  /** Short imperative shown in the checklist. */
  label: string;
  /** One-line hint on how to do it. */
  hint: string;
  /**
   * Returns true once the learner's action log satisfies this objective.
   * `ended` covers objectives that complete on finishing the run.
   */
  isComplete: (ctx: { actions: UserAction[]; ended: boolean }) => boolean;
}

/** Lowercased haystack of everything the learner typed / logged in one action. */
function actionText(action: UserAction): string {
  return [action.assessment ?? '', ...(action.treatments ?? [])]
    .join(' ')
    .toLowerCase();
}

function anyActionMatches(actions: UserAction[], re: RegExp): boolean {
  return actions.some((a) => re.test(actionText(a)));
}

/**
 * Ordered checklist that drives the in-run guidance panel. Each objective maps
 * to one of the panels the learner needs to touch to get comfortable with the
 * runner. They are intentionally low-stakes — the patient stays stable.
 */
export const ORIENTATION_OBJECTIVES: OrientationObjective[] = [
  {
    id: 'monitor',
    label: 'Light up the monitor',
    hint: 'Open the Equipment drawer and apply the 4-lead and pulse-ox.',
    isComplete: ({ actions }) =>
      anyActionMatches(
        actions,
        /4-?lead|four-?lead|pulse[- ]?ox|spo2|cardiac monitor|monitor lead/,
      ),
  },
  {
    id: 'glucose',
    label: 'Check a blood glucose',
    hint: 'In the Assessment tab, obtain a point-of-care blood glucose.',
    isComplete: ({ actions }) =>
      anyActionMatches(actions, /glucose|blood sugar|\bbgl\b|\bcbg\b|glucomet/),
  },
  {
    id: 'vitals',
    label: 'Get a full set of vitals',
    hint: 'Take a blood pressure / NIBP cycle so you can trend the patient.',
    isComplete: ({ actions }) =>
      anyActionMatches(
        actions,
        /blood pressure|\bbp\b|nibp|full set of vitals|reassess vital/,
      ),
  },
  {
    id: 'destination',
    label: 'Pick a receiving hospital',
    hint: 'Use the Destination tab to choose where you would transport.',
    isComplete: ({ actions }) =>
      actions.some((a) => Boolean(a.destination && a.destination.trim())),
  },
  {
    id: 'end',
    label: 'End the run for your debrief',
    hint: 'Hit End Simulation when you are done — your report marks orientation complete.',
    isComplete: ({ ended }) => ended,
  },
];

export interface OrientationProgress {
  /** Objective ids that are satisfied. */
  doneIds: string[];
  total: number;
  completedCount: number;
  /** True once every objective is satisfied. */
  allComplete: boolean;
  /**
   * True once every objective except the final "end the run" step is done —
   * i.e. the learner has exercised the UI and is ready to finish.
   */
  readyToEnd: boolean;
}

export function orientationProgress(
  actions: UserAction[],
  ended: boolean,
): OrientationProgress {
  const ctx = { actions, ended };
  const doneIds = ORIENTATION_OBJECTIVES.filter((o) => o.isComplete(ctx)).map(
    (o) => o.id,
  );
  const done = new Set(doneIds);
  const nonEnd = ORIENTATION_OBJECTIVES.filter((o) => o.id !== 'end');
  return {
    doneIds,
    total: ORIENTATION_OBJECTIVES.length,
    completedCount: doneIds.length,
    allComplete: doneIds.length === ORIENTATION_OBJECTIVES.length,
    readyToEnd: nonEnd.every((o) => done.has(o.id)),
  };
}
