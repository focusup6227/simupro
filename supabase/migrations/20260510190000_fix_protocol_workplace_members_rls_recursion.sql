-- RLS on protocol_workplace_members used EXISTS subqueries on the same table, which
-- re-entered that table's policies and triggered 42P17 (infinite recursion). Helpers
-- read membership with SECURITY DEFINER (owner bypasses RLS), matching create/join RPCs.

CREATE OR REPLACE FUNCTION public.protocol_workplace_membership_exists(
  p_workplace_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.protocol_workplace_members m
    WHERE m.workplace_id = p_workplace_id
      AND m.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.protocol_workplace_member_has_admin_role(
  p_workplace_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.protocol_workplace_members m
    WHERE m.workplace_id = p_workplace_id
      AND m.user_id = p_user_id
      AND m.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.protocol_workplace_membership_exists(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.protocol_workplace_member_has_admin_role(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS protocol_workplaces_select_member ON public.protocol_workplaces;
CREATE POLICY protocol_workplaces_select_member
  ON public.protocol_workplaces
  FOR SELECT
  TO authenticated
  USING (public.protocol_workplace_membership_exists(protocol_workplaces.id, auth.uid()));

DROP POLICY IF EXISTS protocol_workplace_members_select ON public.protocol_workplace_members;
CREATE POLICY protocol_workplace_members_select
  ON public.protocol_workplace_members
  FOR SELECT
  TO authenticated
  USING (
    public.protocol_workplace_membership_exists(protocol_workplace_members.workplace_id, auth.uid())
  );

DROP POLICY IF EXISTS workplace_protocol_imports_select ON public.workplace_protocol_imports;
CREATE POLICY workplace_protocol_imports_select
  ON public.workplace_protocol_imports
  FOR SELECT
  TO authenticated
  USING (
    public.protocol_workplace_membership_exists(workplace_protocol_imports.workplace_id, auth.uid())
  );

DROP POLICY IF EXISTS workplace_protocol_imports_insert ON public.workplace_protocol_imports;
CREATE POLICY workplace_protocol_imports_insert
  ON public.workplace_protocol_imports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by_user_id = auth.uid()
    AND public.protocol_workplace_member_has_admin_role(workplace_id, auth.uid())
  );

DROP POLICY IF EXISTS workplace_protocol_imports_update ON public.workplace_protocol_imports;
CREATE POLICY workplace_protocol_imports_update
  ON public.workplace_protocol_imports
  FOR UPDATE
  TO authenticated
  USING (
    public.protocol_workplace_membership_exists(workplace_id, auth.uid())
    AND (
      uploaded_by_user_id = auth.uid()
      OR public.protocol_workplace_member_has_admin_role(workplace_id, auth.uid())
    )
  )
  WITH CHECK (public.protocol_workplace_membership_exists(workplace_id, auth.uid()));

DROP POLICY IF EXISTS workplace_protocol_imports_delete ON public.workplace_protocol_imports;
CREATE POLICY workplace_protocol_imports_delete
  ON public.workplace_protocol_imports
  FOR DELETE
  TO authenticated
  USING (public.protocol_workplace_member_has_admin_role(workplace_id, auth.uid()));

DROP POLICY IF EXISTS protocol_pdf_workplace_select ON storage.objects;
CREATE POLICY protocol_pdf_workplace_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'protocol-pdfs'
    AND (string_to_array(name, '/'))[1] = 'workplace'
    AND public.protocol_workplace_membership_exists(
      (string_to_array(name, '/'))[2]::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS protocol_pdf_workplace_insert ON storage.objects;
CREATE POLICY protocol_pdf_workplace_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'protocol-pdfs'
    AND (string_to_array(name, '/'))[1] = 'workplace'
    AND public.protocol_workplace_member_has_admin_role(
      (string_to_array(name, '/'))[2]::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS protocol_pdf_workplace_update ON storage.objects;
CREATE POLICY protocol_pdf_workplace_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'protocol-pdfs'
    AND (string_to_array(name, '/'))[1] = 'workplace'
    AND public.protocol_workplace_member_has_admin_role(
      (string_to_array(name, '/'))[2]::uuid,
      auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'protocol-pdfs'
    AND (string_to_array(name, '/'))[1] = 'workplace'
    AND public.protocol_workplace_member_has_admin_role(
      (string_to_array(name, '/'))[2]::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS protocol_pdf_workplace_delete ON storage.objects;
CREATE POLICY protocol_pdf_workplace_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'protocol-pdfs'
    AND (string_to_array(name, '/'))[1] = 'workplace'
    AND public.protocol_workplace_member_has_admin_role(
      (string_to_array(name, '/'))[2]::uuid,
      auth.uid()
    )
  );
