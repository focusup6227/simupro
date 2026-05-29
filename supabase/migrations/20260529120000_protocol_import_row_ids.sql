-- Trust pipeline Phase 1: stamp a stable `rowId` onto every extracted intervention that lacks
-- one, so per-row flags/threads/provenance (Phase 2+) can key off it. `rowId` lives inside the
-- existing `extracted_interventions` jsonb (camelCase, matching the stored Intervention shape) —
-- no new columns. Provenance is left absent for existing rows; the source text was not retained
-- at import time, so backfilled rows get provenance only on a future re-scrub.
--
-- Idempotent: elements that already carry `rowId` are untouched, so this is safe to re-run.

CREATE OR REPLACE FUNCTION public.protocol_import_backfill_row_ids(arr jsonb)
RETURNS jsonb
LANGUAGE sql
VOLATILE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN elem ? 'rowId' THEN elem
        ELSE elem || jsonb_build_object('rowId', gen_random_uuid()::text)
      END
      ORDER BY ord
    ),
    arr
  )
  FROM jsonb_array_elements(arr) WITH ORDINALITY AS e(elem, ord);
$$;

UPDATE public.user_protocol_imports
SET extracted_interventions = public.protocol_import_backfill_row_ids(extracted_interventions)
WHERE jsonb_typeof(extracted_interventions) = 'array'
  AND jsonb_array_length(extracted_interventions) > 0
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(extracted_interventions) AS el
    WHERE NOT (el ? 'rowId')
  );

UPDATE public.workplace_protocol_imports
SET extracted_interventions = public.protocol_import_backfill_row_ids(extracted_interventions)
WHERE jsonb_typeof(extracted_interventions) = 'array'
  AND jsonb_array_length(extracted_interventions) > 0
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(extracted_interventions) AS el
    WHERE NOT (el ? 'rowId')
  );

-- One-shot backfill helper; not needed at runtime.
DROP FUNCTION public.protocol_import_backfill_row_ids(jsonb);
