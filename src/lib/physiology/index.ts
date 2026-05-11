export {
  extractComorbidityIdsFromText,
  extractComorbidityIdsFromTextWithDiagnostics,
} from '@/lib/physiology/comorbidity-extract';
export { COMORBIDITY_MATRIX } from '@/lib/physiology/comorbidity-matrix';
export {
  applyAiObstructionToLungMechanics,
  conditionIdsForScenario,
  defaultPathophysiologyAxes,
  lungTimeConstantSec,
  resolveComorbidityAxes,
  resolveComorbidityAxesWithMeta,
  resolveLungMechanics,
} from '@/lib/physiology/comorbidity-resolve';
export type {
  ResolvedComorbidityResult,
} from '@/lib/physiology/comorbidity-resolve';
export type {
  ComorbidityModifier,
  ConditionCategory,
  ConditionId,
  ConditionNature,
  LungMechanicsModifier,
  LungMechanicsState,
  PathophysiologyAxes,
  PathophysiologyAxisKey,
} from '@/lib/physiology/types';
export {
  buildPhysiologyFeedbackSnapshot,
  clampFeedback01,
  clampPhysiologyFeedback,
  parseFeedbackNumber,
  parseMapMmHg,
} from '@/lib/physiology/feedback';
export type {
  PhysiologyFeedbackInput,
  PhysiologyFeedbackSnapshot,
} from '@/lib/physiology/feedback';
export {
  defaultLungMechanics,
  PATHOPHYSIOLOGY_AXIS_KEYS,
  asConditionId,
} from '@/lib/physiology/types';
