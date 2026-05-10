-- RLS policies on several tables call public.is_admin(). The invoker role must be
-- able to EXECUTE that function; otherwise SELECT can fail with a server error
-- (often surfaced as HTTP 500) instead of returning filtered rows.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tester_or_admin() TO authenticated;
