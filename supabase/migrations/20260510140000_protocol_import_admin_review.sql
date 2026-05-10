-- Admin QA queue for failed protocol PDF extractions + user resolution messaging.

ALTER TABLE public.user_protocol_imports
  ADD COLUMN admin_review_status text CHECK (
    admin_review_status IS NULL OR admin_review_status IN ('open', 'resolved')
  ),
  ADD COLUMN admin_review_notes text,
  ADD COLUMN resolved_by_admin_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN admin_resolved_at timestamptz,
  ADD COLUMN resolution_message_for_user text;

ALTER TABLE public.workplace_protocol_imports
  ADD COLUMN admin_review_status text CHECK (
    admin_review_status IS NULL OR admin_review_status IN ('open', 'resolved')
  ),
  ADD COLUMN admin_review_notes text,
  ADD COLUMN resolved_by_admin_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN admin_resolved_at timestamptz,
  ADD COLUMN resolution_message_for_user text;

CREATE INDEX user_protocol_imports_admin_open_idx
  ON public.user_protocol_imports (admin_review_status)
  WHERE admin_review_status = 'open';

CREATE INDEX workplace_protocol_imports_admin_open_idx
  ON public.workplace_protocol_imports (admin_review_status)
  WHERE admin_review_status = 'open';

-- Per-user dismissal of "we fixed your import" banners (works for personal + workplace imports).
CREATE TABLE public.protocol_import_resolution_acks (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  import_scope text NOT NULL CHECK (import_scope IN ('user', 'workplace')),
  import_id uuid NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, import_scope, import_id)
);

ALTER TABLE public.protocol_import_resolution_acks ENABLE ROW LEVEL SECURITY;

CREATE POLICY protocol_import_resolution_acks_own
  ON public.protocol_import_resolution_acks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can read/update any protocol import row (review queue + fixes).
CREATE POLICY user_protocol_imports_admin_select
  ON public.user_protocol_imports
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY user_protocol_imports_admin_update
  ON public.user_protocol_imports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY workplace_protocol_imports_admin_select
  ON public.workplace_protocol_imports
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY workplace_protocol_imports_admin_update
  ON public.workplace_protocol_imports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can download any protocol PDF for re-scrub.
CREATE POLICY protocol_pdf_select_admin
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'protocol-pdfs' AND public.is_admin());
