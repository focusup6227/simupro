-- Free clinical-role choice. Product decision: learners pick their certification tier
-- (EMT / AEMT / Paramedic) freely at signup and may change it anytime — no program-completion
-- date attestation. New accounts default to EMT (a real clinical tier) instead of the tier-0
-- 'student' placeholder. 'student' stays in the CHECK constraint for legacy rows.
--
-- This relaxes two prior guards:
--   1. profiles_cert_attestation_bi — required emt/aemt completion dates for AEMT+ tiers.
--      Dropped entirely (no attestation gate).
--   2. profiles_guard_sensitive_columns — blocked ALL role changes for non-admins. Relaxed to
--      allow movement between clinical tiers while still preventing self-promotion to the
--      privileged 'admin'/'tester' roles (and still freezing billing/streak columns).

-- New accounts start at EMT. The autocreate trigger (handle_new_auth_user) inserts without an
-- explicit role, so this default governs OAuth / magic-link signups too.
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'emt';

-- Drop the certification-attestation date gate. The function is left in place (unused) for
-- migration-history continuity; only the enforcing trigger is removed.
DROP TRIGGER IF EXISTS profiles_cert_attestation_bi ON public.profiles;

-- Relax the privilege guard: clinical tiers are self-selectable; staff roles are not.
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

  -- Non-admins may move between clinical tiers (emt/aemt/paramedic/student) freely, but may
  -- never grant themselves a privileged role, nor mutate an existing staff role.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NEW.role IN ('admin', 'tester') OR OLD.role IN ('admin', 'tester') THEN
      RAISE EXCEPTION 'Cannot modify role' USING ERRCODE = 'insufficient_privilege';
    END IF;
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
