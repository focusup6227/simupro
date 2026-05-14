-- Allow Supabase service_role (Auth Admin API, server-side scripts) to update profiles
-- without hitting certification attestation or privilege-column guards. Those helpers
-- rely on auth.uid(); service clients have no JWT user, so is_admin() is false and
-- idempotent seed scripts (npm run seed:test-users) would otherwise fail.

CREATE OR REPLACE FUNCTION public.profiles_certification_attestation_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_is_admin boolean;
  old_tier int;
  new_tier int;
  latest_allowed date;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT public.is_admin() INTO actor_is_admin;
  IF actor_is_admin THEN
    RETURN NEW;
  END IF;

  latest_allowed := CURRENT_DATE + 1;

  IF TG_OP = 'INSERT' THEN
    old_tier := 0;
  ELSE
    old_tier := CASE
      WHEN OLD.role = 'tester' THEN CASE COALESCE(OLD.test_role, 'emt')
        WHEN 'emt' THEN 1 WHEN 'aemt' THEN 2 WHEN 'paramedic' THEN 3 ELSE 0 END
      WHEN OLD.role = 'emt' THEN 1
      WHEN OLD.role = 'aemt' THEN 2
      WHEN OLD.role = 'paramedic' THEN 3
      ELSE 0
    END;
  END IF;

  new_tier := CASE
    WHEN NEW.role = 'tester' THEN CASE COALESCE(NEW.test_role, 'emt')
      WHEN 'emt' THEN 1 WHEN 'aemt' THEN 2 WHEN 'paramedic' THEN 3 ELSE 0 END
    WHEN NEW.role = 'emt' THEN 1
    WHEN NEW.role = 'aemt' THEN 2
    WHEN NEW.role = 'paramedic' THEN 3
    ELSE 0
  END;

  IF new_tier = 0 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND new_tier <= old_tier THEN
    RETURN NEW;
  END IF;

  IF new_tier >= 2 THEN
    IF NEW.emt_program_completed_on IS NULL OR NEW.emt_program_completed_on > latest_allowed THEN
      RAISE EXCEPTION 'EMT program completion date is required and must not be in the future to select AEMT or higher.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF new_tier >= 3 THEN
    IF NEW.aemt_program_completed_on IS NULL OR NEW.aemt_program_completed_on > latest_allowed THEN
      RAISE EXCEPTION 'AEMT program completion date is required and must not be in the future to select Paramedic.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_guard_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

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
