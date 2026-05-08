/**
 * Persistence helper for rhythm-identification quiz attempts.
 *
 * Used by both the in-scenario inline quiz (RhythmIdQuiz) and the standalone
 * trainer page so each attempt survives sessions and can be aggregated on the
 * Performance dashboard.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { RHYTHM_FAMILY, type EcgRhythmKind } from '@/lib/ecg-rhythm';
import type { Database } from '@/lib/supabase/database.types';

export interface RecordRhythmQuizAttemptInput {
  source: 'trainer' | 'scenario';
  scenarioId?: string | null;
  sessionId?: string | null;
  rhythmKind: EcgRhythmKind;
  /** The user's answer (an EcgRhythmKind, or 'skipped'). */
  userAnswer: EcgRhythmKind | 'skipped';
  isCorrect: boolean;
  difficulty?: string | null;
  msToAnswer?: number | null;
}

export async function recordRhythmQuizAttempt(
  supabase: SupabaseClient<Database> | null,
  userId: string | null | undefined,
  input: RecordRhythmQuizAttemptInput,
): Promise<void> {
  if (!supabase || !userId) return;
  try {
    await supabase.from('rhythm_quiz_attempts').insert({
      user_id: userId,
      source: input.source,
      scenario_id: input.scenarioId ?? null,
      session_id: input.sessionId ?? null,
      rhythm_kind: input.rhythmKind,
      user_answer: input.userAnswer,
      is_correct: input.isCorrect,
      difficulty: input.difficulty ?? null,
      family: RHYTHM_FAMILY[input.rhythmKind],
      ms_to_answer: input.msToAnswer ?? null,
    });
  } catch (err) {
    // Quiz logging is best-effort — never block the simulation flow.
    console.warn('Failed to record rhythm quiz attempt', err);
  }
}
