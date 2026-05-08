-- Phase III: append-only autonomic / stressor event log (fluids, hemorrhage, O₂, etc.)
CREATE TABLE public.simulation_autonomic_events (
  id uuid PRIMARY KEY,
  session_id text NOT NULL REFERENCES public.simulation_sessions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sim_seconds integer NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_autonomic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY simulation_autonomic_events_select_own ON public.simulation_autonomic_events
  FOR SELECT
  USING (auth.uid () = user_id);

CREATE POLICY simulation_autonomic_events_insert_own ON public.simulation_autonomic_events
  FOR INSERT
  WITH CHECK (auth.uid () = user_id);

CREATE INDEX simulation_autonomic_events_session_idx ON public.simulation_autonomic_events (session_id, sim_seconds);

COMMENT ON TABLE public.simulation_autonomic_events IS
'Deterministic stressors for Phase III autonomic replay (parallel to simulation_pk_doses).';
