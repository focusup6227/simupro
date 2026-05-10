-- Drop legacy UID crosswalk table (import tooling removed from the app).

DROP POLICY IF EXISTS firebase_uid_mappings_all ON public.firebase_uid_mappings;

DROP TABLE IF EXISTS public.firebase_uid_mappings;
