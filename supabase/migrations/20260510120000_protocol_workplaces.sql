-- Shared protocol libraries per workplace (Premium). One upload serves all members.

CREATE TABLE public.protocol_workplaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) >= 2),
  join_code text NOT NULL UNIQUE,
  created_by_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER protocol_workplaces_set_updated_at
  BEFORE UPDATE ON public.protocol_workplaces
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE public.protocol_workplace_members (
  workplace_id uuid NOT NULL REFERENCES public.protocol_workplaces (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workplace_id, user_id),
  UNIQUE (user_id)
);

CREATE TABLE public.workplace_protocol_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workplace_id uuid NOT NULL REFERENCES public.protocol_workplaces (id) ON DELETE CASCADE,
  uploaded_by_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
  extracted_interventions jsonb,
  extraction_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workplace_protocol_imports_workplace_id_idx
  ON public.workplace_protocol_imports (workplace_id);

CREATE TRIGGER workplace_protocol_imports_set_updated_at
  BEFORE UPDATE ON public.workplace_protocol_imports
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.profiles
  ADD COLUMN protocol_workplace_id uuid REFERENCES public.protocol_workplaces (id) ON DELETE SET NULL,
  ADD COLUMN active_workplace_protocol_import_id uuid REFERENCES public.workplace_protocol_imports (id) ON DELETE SET NULL;

-- RPCs: membership changes only through SECURITY DEFINER (avoid arbitrary inserts).
CREATE OR REPLACE FUNCTION public.create_protocol_workplace(p_name text)
RETURNS TABLE (id uuid, join_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  code text;
BEGIN
  IF length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'name_too_short';
  END IF;
  IF EXISTS (SELECT 1 FROM public.protocol_workplace_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'already_in_workplace';
  END IF;

  new_id := gen_random_uuid();
  code := upper(substr(replace(new_id::text || gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.protocol_workplaces (id, name, join_code, created_by_user_id)
  VALUES (new_id, trim(p_name), code, auth.uid());

  INSERT INTO public.protocol_workplace_members (workplace_id, user_id, role)
  VALUES (new_id, auth.uid(), 'admin');

  UPDATE public.profiles
  SET protocol_workplace_id = new_id
  WHERE profiles.id = auth.uid();

  RETURN QUERY SELECT new_id, code;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_protocol_workplace(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w_id uuid;
BEGIN
  SELECT pw.id
  INTO w_id
  FROM public.protocol_workplaces pw
  WHERE pw.join_code = upper(trim(p_code));

  IF w_id IS NULL THEN
    RAISE EXCEPTION 'invalid_join_code';
  END IF;

  IF EXISTS (SELECT 1 FROM public.protocol_workplace_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'already_in_workplace';
  END IF;

  INSERT INTO public.protocol_workplace_members (workplace_id, user_id, role)
  VALUES (w_id, auth.uid(), 'member');

  UPDATE public.profiles
  SET protocol_workplace_id = w_id
  WHERE profiles.id = auth.uid();

  RETURN w_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_protocol_workplace()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.protocol_workplace_members WHERE user_id = auth.uid();
  UPDATE public.profiles
  SET
    protocol_workplace_id = NULL,
    active_workplace_protocol_import_id = NULL
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_protocol_workplace(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_protocol_workplace(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_protocol_workplace() TO authenticated;

ALTER TABLE public.protocol_workplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_workplace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplace_protocol_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY protocol_workplaces_select_member
  ON public.protocol_workplaces
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.protocol_workplace_members m
      WHERE m.workplace_id = protocol_workplaces.id
        AND m.user_id = auth.uid()
    )
  );

-- Direct inserts only via RPC (SECURITY DEFINER).
CREATE POLICY protocol_workplaces_insert_deny
  ON public.protocol_workplaces
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY protocol_workplaces_update_deny
  ON public.protocol_workplaces
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY protocol_workplaces_delete_deny
  ON public.protocol_workplaces
  FOR DELETE
  TO authenticated
  USING (false);

CREATE POLICY protocol_workplace_members_select
  ON public.protocol_workplace_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.protocol_workplace_members m2
      WHERE m2.workplace_id = protocol_workplace_members.workplace_id
        AND m2.user_id = auth.uid()
    )
  );

CREATE POLICY protocol_workplace_members_insert_deny
  ON public.protocol_workplace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY protocol_workplace_members_delete_deny
  ON public.protocol_workplace_members
  FOR DELETE
  TO authenticated
  USING (false);

CREATE POLICY protocol_workplace_members_update_deny
  ON public.protocol_workplace_members
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY workplace_protocol_imports_select
  ON public.workplace_protocol_imports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.protocol_workplace_members m
      WHERE m.workplace_id = workplace_protocol_imports.workplace_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY workplace_protocol_imports_insert
  ON public.workplace_protocol_imports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.protocol_workplace_members m
      WHERE m.workplace_id = workplace_protocol_imports.workplace_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
  );

CREATE POLICY workplace_protocol_imports_update
  ON public.workplace_protocol_imports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.protocol_workplace_members m
      WHERE m.workplace_id = workplace_protocol_imports.workplace_id
        AND m.user_id = auth.uid()
    )
    AND (
      uploaded_by_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.protocol_workplace_members m2
        WHERE m2.workplace_id = workplace_protocol_imports.workplace_id
          AND m2.user_id = auth.uid()
          AND m2.role = 'admin'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.protocol_workplace_members m
      WHERE m.workplace_id = workplace_protocol_imports.workplace_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY workplace_protocol_imports_delete
  ON public.workplace_protocol_imports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.protocol_workplace_members m
      WHERE m.workplace_id = workplace_protocol_imports.workplace_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
  );

-- Storage: paths `workplace/{workplace_id}/{import_id}.pdf` — members read; admins write/delete.
CREATE POLICY protocol_pdf_workplace_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'protocol-pdfs'
    AND (string_to_array(name, '/'))[1] = 'workplace'
    AND EXISTS (
      SELECT 1
      FROM public.protocol_workplace_members m
      WHERE m.user_id = auth.uid()
        AND m.workplace_id::text = (string_to_array(name, '/'))[2]
    )
  );

CREATE POLICY protocol_pdf_workplace_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'protocol-pdfs'
    AND (string_to_array(name, '/'))[1] = 'workplace'
    AND EXISTS (
      SELECT 1
      FROM public.protocol_workplace_members m
      WHERE m.user_id = auth.uid()
        AND m.workplace_id::text = (string_to_array(name, '/'))[2]
        AND m.role = 'admin'
    )
  );

CREATE POLICY protocol_pdf_workplace_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'protocol-pdfs'
    AND (string_to_array(name, '/'))[1] = 'workplace'
    AND EXISTS (
      SELECT 1
      FROM public.protocol_workplace_members m
      WHERE m.user_id = auth.uid()
        AND m.workplace_id::text = (string_to_array(name, '/'))[2]
        AND m.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'protocol-pdfs'
    AND (string_to_array(name, '/'))[1] = 'workplace'
    AND EXISTS (
      SELECT 1
      FROM public.protocol_workplace_members m
      WHERE m.user_id = auth.uid()
        AND m.workplace_id::text = (string_to_array(name, '/'))[2]
        AND m.role = 'admin'
    )
  );

CREATE POLICY protocol_pdf_workplace_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'protocol-pdfs'
    AND (string_to_array(name, '/'))[1] = 'workplace'
    AND EXISTS (
      SELECT 1
      FROM public.protocol_workplace_members m
      WHERE m.user_id = auth.uid()
        AND m.workplace_id::text = (string_to_array(name, '/'))[2]
        AND m.role = 'admin'
    )
  );
