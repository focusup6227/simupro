-- Certification trigger compared program dates to Postgres CURRENT_DATE (typically UTC).
-- Learners ahead of UTC can pick "today" in the browser while the stored calendar date is
-- still "tomorrow" relative to UTC midnight, which incorrectly raised check_violation.
-- Allow attestation dates through end of tomorrow UTC so global same-day selections succeed.

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
