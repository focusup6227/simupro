import type { DecompensationPhase } from '@/lib/physiology/autonomic-types';

/** Friendly perfusion wording for EMS learners (avoid alarmist slang). */
export function learnerQualitativeDecompCue(phase: DecompensationPhase): string {
  switch (phase) {
    case 'baseline':
      return 'Compensation intact — reassess routinely.';
    case 'compensated':
      return 'Stress response present — tighten vital trends.';
    case 'decompensating':
      return 'Trending toward poor perfusion — escalate care.';
    case 'crashing':
      return 'Critically diminished perfusion — urgent interventions.';
    case 'arrested':
      return 'Circulation not sustainable without resuscitation.';
    default:
      return 'Trend vitals closely.';
  }
}
