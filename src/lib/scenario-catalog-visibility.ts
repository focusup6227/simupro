import { HIDE_LEGACY_SCENARIOS_FROM_CATALOG } from "@/lib/feature-flags";
import { curatedPhysiologyScenarios } from "@/lib/scenarios-data";

const CURATED_PHYSIOLOGY_SCENARIO_IDS = new Set(
  curatedPhysiologyScenarios.map((s) => s.id),
);

/**
 * Learners may still open the tutorial by direct link (`/dashboard/scenarios/welcome-tutorial`);
 * it stays off the browse grid via the scenarios page filter.
 */
export function learnerMayOpenScenario(
  scenarioId: string,
  isStaff: boolean,
): boolean {
  if (isStaff || !HIDE_LEGACY_SCENARIOS_FROM_CATALOG) return true;
  if (scenarioId === "welcome-tutorial") return true;
  return CURATED_PHYSIOLOGY_SCENARIO_IDS.has(scenarioId);
}

/** Published scenarios listed on the learner browse page (tutorial excluded elsewhere). */
export function filterScenariosForLearnerBrowse<T extends { id: string }>(
  scenarios: T[],
  isStaff: boolean,
): T[] {
  if (isStaff || !HIDE_LEGACY_SCENARIOS_FROM_CATALOG) return scenarios;
  return scenarios.filter(
    (s) =>
      s.id !== "welcome-tutorial" && CURATED_PHYSIOLOGY_SCENARIO_IDS.has(s.id),
  );
}

export function countLearnerBrowseableScenarios<T extends { id: string }>(
  scenarios: T[],
  isStaff: boolean,
): number {
  return filterScenariosForLearnerBrowse(scenarios, isStaff).length;
}
