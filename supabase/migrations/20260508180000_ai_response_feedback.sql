-- User reports of poor AI patient replies + full sim log for admin review / preferred-response capture.
CREATE TABLE public.ai_response_feedback (
  id text PRIMARY KEY,
  session_id text REFERENCES public.simulation_sessions (id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  scenario_id text NOT NULL REFERENCES public.scenarios (id) ON DELETE CASCADE,
  scenario_title text NOT NULL,
  assistant_message_index integer NOT NULL,
  flagged_assistant_content text NOT NULL,
  messages_snapshot jsonb NOT NULL,
  user_actions_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  simulation_role text,
  simulation_time_seconds integer,
  user_comment text NOT NULL,
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'validated', 'dismissed')),
  admin_preferred_response text,
  admin_review_notes text,
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_response_feedback_status_created
  ON public.ai_response_feedback (review_status, created_at DESC);

CREATE INDEX idx_ai_response_feedback_session ON public.ai_response_feedback (session_id);

COMMENT ON TABLE public.ai_response_feedback IS
  'Learner-flagged AI replies with conversation snapshot; admins validate and optional preferred response for prompts.';

ALTER TABLE public.ai_response_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_feedback_select ON public.ai_response_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY ai_feedback_insert ON public.ai_response_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ai_feedback_update ON public.ai_response_feedback FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY ai_feedback_delete ON public.ai_response_feedback FOR DELETE TO authenticated
  USING (public.is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_response_feedback;

CREATE TRIGGER ai_response_feedback_updated BEFORE UPDATE ON public.ai_response_feedback
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
