-- Simu-Pro: initial Postgres schema for Supabase (Postgres + RLS)

-- ---------------------------------------------------------------------------
-- Tables (must exist before SECURITY DEFINER helpers that reference them)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  photo_url text,
  role text NOT NULL DEFAULT 'student'
    CHECK (role IN ('emt', 'aemt', 'paramedic', 'admin', 'tester', 'student')),
  test_role text CHECK (test_role IS NULL OR test_role IN ('emt', 'aemt', 'paramedic')),
  is_admin boolean NOT NULL DEFAULT false,
  has_completed_tutorial boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.scenarios (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'published')),
  category text CHECK (category IS NULL OR category = 'cardiac-arrest'),
  patient_profile text NOT NULL,
  initial_vitals jsonb NOT NULL DEFAULT '{}',
  details text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  tags text[] NOT NULL DEFAULT '{}',
  destination text NOT NULL,
  destination_rationale text NOT NULL,
  hospital_distances jsonb NOT NULL DEFAULT '{}',
  suggested_actions jsonb NOT NULL DEFAULT '{}',
  mandatory_actions jsonb NOT NULL DEFAULT '{}',
  critical_failures text[] NOT NULL DEFAULT '{}',
  patient_presentation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.interventions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  indication text,
  mechanism text,
  certification_level text NOT NULL CHECK (certification_level IN ('emt', 'aemt', 'paramedic')),
  sub_options jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.simulation_sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  scenario_id text NOT NULL REFERENCES public.scenarios (id) ON DELETE CASCADE,
  scenario_title text NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  status text NOT NULL CHECK (status IN ('in-progress', 'completed', 'failed')),
  time_elapsed integer,
  actions jsonb,
  user_role text CHECK (user_role IS NULL OR user_role IN ('emt', 'aemt', 'paramedic', 'admin', 'tester', 'student')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.session_insights (
  id text NOT NULL,
  session_id text NOT NULL REFERENCES public.simulation_sessions (id) ON DELETE CASCADE,
  assessment_score numeric NOT NULL,
  treatment_score numeric NOT NULL,
  ai_feedback text NOT NULL,
  reasoning text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, id)
);

CREATE TABLE public.scenario_reviews (
  id text PRIMARY KEY,
  scenario_id text NOT NULL REFERENCES public.scenarios (id) ON DELETE CASCADE,
  tester_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  tester_name text NOT NULL,
  tested_as_role text NOT NULL CHECK (tested_as_role IN ('emt', 'aemt', 'paramedic')),
  approved boolean NOT NULL,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_tickets (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  user_email text NOT NULL,
  message text NOT NULL,
  scenario_id text,
  scenario_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('new', 'in-progress', 'resolved')),
  responses jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Legacy UID crosswalk (removed in 20260510200000_drop_firebase_uid_mappings.sql)
CREATE TABLE public.firebase_uid_mappings (
  firebase_uid text PRIMARY KEY,
  auth_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Helpers (after tables: body references public.profiles)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT p.role = 'admin' OR COALESCE(p.is_admin, false)
     FROM public.profiles p WHERE p.id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tester_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT p.role IN ('admin', 'tester') OR COALESCE(p.is_admin, false)
     FROM public.profiles p WHERE p.id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_simulation_sessions_user_start ON public.simulation_sessions (user_id, start_time DESC);
CREATE INDEX idx_scenarios_status ON public.scenarios (status);
CREATE INDEX idx_support_tickets_status ON public.support_tickets (status);
CREATE INDEX idx_support_tickets_created ON public.support_tickets (created_at DESC);
CREATE INDEX idx_scenario_reviews_scenario ON public.scenario_reviews (scenario_id);
CREATE INDEX idx_session_insights_session ON public.session_insights (session_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER scenarios_updated BEFORE UPDATE ON public.scenarios
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER interventions_updated BEFORE UPDATE ON public.interventions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER simulation_sessions_updated BEFORE UPDATE ON public.simulation_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firebase_uid_mappings ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_delete ON public.profiles FOR DELETE TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- scenarios (learners: published only; tester/admin: drafts too)
CREATE POLICY scenarios_select ON public.scenarios FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR public.is_tester_or_admin()
  );
CREATE POLICY scenarios_insert ON public.scenarios FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY scenarios_update ON public.scenarios FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY scenarios_delete ON public.scenarios FOR DELETE TO authenticated
  USING (public.is_admin());

-- interventions (read all; write admin)
CREATE POLICY interventions_select ON public.interventions FOR SELECT TO authenticated
  USING (true);
CREATE POLICY interventions_insert ON public.interventions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY interventions_update ON public.interventions FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY interventions_delete ON public.interventions FOR DELETE TO authenticated
  USING (public.is_admin());

-- simulation_sessions
CREATE POLICY sim_sessions_select ON public.simulation_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY sim_sessions_insert ON public.simulation_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY sim_sessions_update ON public.simulation_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY sim_sessions_delete ON public.simulation_sessions FOR DELETE TO authenticated
  USING (public.is_admin());

-- session_insights (inherit session ownership)
CREATE POLICY session_insights_select ON public.session_insights FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.simulation_sessions s
      WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.is_admin())
    )
  );
CREATE POLICY session_insights_insert ON public.session_insights FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.simulation_sessions s
      WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.is_admin())
    )
  );
CREATE POLICY session_insights_update ON public.session_insights FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.simulation_sessions s
      WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.is_admin())
    )
  );
CREATE POLICY session_insights_delete ON public.session_insights FOR DELETE TO authenticated
  USING (public.is_admin());

-- scenario_reviews
CREATE POLICY scenario_reviews_select ON public.scenario_reviews FOR SELECT TO authenticated
  USING (public.is_tester_or_admin());
CREATE POLICY scenario_reviews_insert ON public.scenario_reviews FOR INSERT TO authenticated
  WITH CHECK (public.is_tester_or_admin() AND tester_id = auth.uid());
CREATE POLICY scenario_reviews_update ON public.scenario_reviews FOR UPDATE TO authenticated
  USING (public.is_tester_or_admin());
CREATE POLICY scenario_reviews_delete ON public.scenario_reviews FOR DELETE TO authenticated
  USING (public.is_admin());

-- support_tickets
CREATE POLICY support_tickets_select ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY support_tickets_insert ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY support_tickets_update ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_admin());
CREATE POLICY support_tickets_delete ON public.support_tickets FOR DELETE TO authenticated
  USING (public.is_admin());

-- Crosswalk table: deny authenticated direct access (service role used for one-off import)
CREATE POLICY firebase_uid_mappings_all ON public.firebase_uid_mappings FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenarios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interventions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.simulation_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenario_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
