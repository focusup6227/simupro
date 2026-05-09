CREATE TABLE public.simulation_pk_doses (
  id uuid PRIMARY KEY,
  session_id text NOT NULL REFERENCES public.simulation_sessions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  drug_id text NOT NULL,
  intervention_id text,
  dose_mg numeric,
  route text NOT NULL,
  kind text NOT NULL,
  infusion_rate numeric,
  infusion_rate_kind text,
  patient_weight_kg numeric NOT NULL,
  sim_seconds integer NOT NULL,
  administered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_pk_doses ENABLE ROW LEVEL SECURITY;

CREATE POLICY simulation_pk_doses_select_own ON public.simulation_pk_doses
  FOR SELECT
  USING (auth.uid () = user_id);

CREATE POLICY simulation_pk_doses_insert_own ON public.simulation_pk_doses
  FOR INSERT
  WITH CHECK (auth.uid () = user_id);

CREATE INDEX simulation_pk_doses_session_idx ON public.simulation_pk_doses (session_id, sim_seconds);
