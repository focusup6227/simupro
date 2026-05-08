-- Simu-Pro: Premium flags + RLS gating for premium scenarios

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- Can the current user access the given scenario?
-- - Non-premium scenarios: yes
-- - Tester/Admin: yes (internal access)
-- - Premium scenarios: only if user's profile has is_premium=true
CREATE OR REPLACE FUNCTION public.can_access_scenario(p_scenario_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.scenarios s
    WHERE s.id = p_scenario_id
      AND (
        s.is_premium = false
        OR public.is_tester_or_admin()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND COALESCE(p.is_premium, false) = true
        )
      )
  );
$$;

-- Allow RLS policy evaluation to call the helper
GRANT EXECUTE ON FUNCTION public.can_access_scenario(text) TO PUBLIC;

-- Premium gating on session creation
DROP POLICY IF EXISTS sim_sessions_insert ON public.simulation_sessions;
CREATE POLICY sim_sessions_insert ON public.simulation_sessions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_access_scenario(scenario_id)
  );

