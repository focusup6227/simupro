-- Persist every rhythm-identification quiz attempt (in-scenario inline + standalone trainer).
-- Row-level security: each user sees / inserts only their own rows.

CREATE TABLE IF NOT EXISTS public.rhythm_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('trainer', 'scenario')),
  scenario_id text NULL,
  session_id text NULL REFERENCES public.simulation_sessions(id) ON DELETE SET NULL,
  rhythm_kind text NOT NULL,
  user_answer text NOT NULL,
  is_correct boolean NOT NULL,
  difficulty text NULL,
  family text NOT NULL,
  ms_to_answer integer NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rhythm_quiz_attempts_user_idx
  ON public.rhythm_quiz_attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS rhythm_quiz_attempts_session_idx
  ON public.rhythm_quiz_attempts (session_id);

ALTER TABLE public.rhythm_quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rhythm_quiz_attempts_select_own" ON public.rhythm_quiz_attempts;
CREATE POLICY "rhythm_quiz_attempts_select_own"
  ON public.rhythm_quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rhythm_quiz_attempts_insert_own" ON public.rhythm_quiz_attempts;
CREATE POLICY "rhythm_quiz_attempts_insert_own"
  ON public.rhythm_quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.rhythm_quiz_attempts TO authenticated;
