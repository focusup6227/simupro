export {
  extractComorbidityIdsFromText,
  extractComorbidityIdsFromTextWithDiagnostics,
} from '@/lib/physiology/comorbidity-extract';
export { COMORBIDITY_MATRIX } from '@/lib/physiology/comorbidity-matrix';
export {
  conditionIdsForScenario,
  defaultPathophysiologyAxes,
  resolveComorbidityAxes,
  resolveComorbidityAxesWithMeta,
} from '@/lib/physiology/comorbidity-resolve';
export type {
  ResolvedComorbidityResult,
} from '@/lib/physiology/comorbidity-resolve';
export type {
  ComorbidityModifier,
  ConditionCategory,
  ConditionId,
  ConditionNature,
  PathophysiologyAxes,
  PathophysiologyAxisKey,
} from '@/lib/physiology/types';
export {
  PATHOPHYSIOLOGY_AXIS_KEYS,
  asConditionId,
} from '@/lib/physiology/types';
