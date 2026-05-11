-- Security fix: prevent authenticated users from escalating privileges via
-- direct profile UPDATE. The current RLS policy (profiles_update) only checks
-- id = auth.uid() without column restrictions. This trigger rejects changes to
-- sensitive columns unless the actor holds is_admin = true.

CREATE OR REPLACE FUNCTION public.profiles_guard_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may update any column
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admins: reject mutations to privilege/billing columns
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot modify role' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot modify is_admin' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
    RAISE EXCEPTION 'Cannot modify is_premium' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'Cannot modify stripe_customer_id' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
    RAISE EXCEPTION 'Cannot modify stripe_subscription_id' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.premium_status IS DISTINCT FROM OLD.premium_status THEN
    RAISE EXCEPTION 'Cannot modify premium_status' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.premium_current_period_end IS DISTINCT FROM OLD.premium_current_period_end THEN
    RAISE EXCEPTION 'Cannot modify premium_current_period_end' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.current_streak IS DISTINCT FROM OLD.current_streak THEN
    RAISE EXCEPTION 'Cannot modify current_streak' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.longest_streak IS DISTINCT FROM OLD.longest_streak THEN
    RAISE EXCEPTION 'Cannot modify longest_streak' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_sensitive_cols ON public.profiles;
CREATE TRIGGER profiles_guard_sensitive_cols
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.profiles_guard_sensitive_columns();

-- Security fix: scenario_reviews UPDATE policy allows any tester to overwrite
-- another tester's review. Add owner-bound check: tester_id = auth.uid().
DROP POLICY IF EXISTS scenario_reviews_update ON public.scenario_reviews;
CREATE POLICY scenario_reviews_update ON public.scenario_reviews FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_tester_or_admin() AND tester_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_tester_or_admin() AND tester_id = auth.uid())
  );
