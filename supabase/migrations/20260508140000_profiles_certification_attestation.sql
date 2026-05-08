-- Attested program completion dates; gate raising clinical certification tier (non-admins).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS emt_program_completed_on date,
  ADD COLUMN IF NOT EXISTS aemt_program_completed_on date;

COMMENT ON COLUMN public.profiles.emt_program_completed_on IS 'User-attested EMT program completion date; required to raise tier to AEMT.';
COMMENT ON COLUMN public.profiles.aemt_program_completed_on IS 'User-attested AEMT program completion date; required to raise tier to Paramedic.';

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
BEGIN
  SELECT public.is_admin() INTO actor_is_admin;
  IF actor_is_admin THEN
    RETURN NEW;
  END IF;

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
    IF NEW.emt_program_completed_on IS NULL OR NEW.emt_program_completed_on > CURRENT_DATE THEN
      RAISE EXCEPTION 'EMT program completion date is required and must not be in the future to select AEMT or higher.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF new_tier >= 3 THEN
    IF NEW.aemt_program_completed_on IS NULL OR NEW.aemt_program_completed_on > CURRENT_DATE THEN
      RAISE EXCEPTION 'AEMT program completion date is required and must not be in the future to select Paramedic.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_cert_attestation_bi ON public.profiles;
CREATE TRIGGER profiles_cert_attestation_bi
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.profiles_certification_attestation_guard();
