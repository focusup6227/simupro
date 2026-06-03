-- Conversion funnel instrumentation: free→paid events (billing views, paywall hits,
-- checkout starts, conversions, nudge impressions/clicks). Written server-side via the
-- service role; read by admins for the conversion-metrics view.
CREATE TABLE public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL, -- nullable: anonymous demo
  event text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_funnel_events_event_created ON public.funnel_events (event, created_at DESC);
CREATE INDEX idx_funnel_events_user ON public.funnel_events (user_id);

COMMENT ON TABLE public.funnel_events IS
  'Free→paid conversion funnel events (viewed_billing, hit_paywall, started_checkout, converted, nudge_shown, nudge_clicked). Written via service role; admin-readable.';

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- Admin-only read. Writes happen through the service-role key (server actions / API routes),
-- which bypasses RLS, so no INSERT policy is granted to authenticated/anon users.
CREATE POLICY funnel_events_select ON public.funnel_events FOR SELECT TO authenticated
  USING (public.is_admin());
