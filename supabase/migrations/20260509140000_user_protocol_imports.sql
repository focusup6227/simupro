-- Premium: per-user agency protocol PDF imports (private storage + extracted JSON).

CREATE TABLE public.user_protocol_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
  extracted_interventions jsonb,
  extraction_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_protocol_imports_user_id_idx ON public.user_protocol_imports (user_id);

CREATE TRIGGER user_protocol_imports_set_updated_at
  BEFORE UPDATE ON public.user_protocol_imports
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.profiles
  ADD COLUMN active_protocol_import_id uuid REFERENCES public.user_protocol_imports (id) ON DELETE SET NULL;

ALTER TABLE public.user_protocol_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own protocol imports"
  ON public.user_protocol_imports
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Private bucket: path layout `{user_id}/{import_id}.pdf`
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
  'protocol-pdfs',
  'protocol-pdfs',
  false,
  15728640,
  ARRAY['application/pdf']::text[]
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'protocol-pdfs');

CREATE POLICY "protocol_pdf_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'protocol-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "protocol_pdf_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'protocol-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "protocol_pdf_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'protocol-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'protocol-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "protocol_pdf_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'protocol-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
