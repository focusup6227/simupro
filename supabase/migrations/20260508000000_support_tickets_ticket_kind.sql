-- Classify tickets: general support, in-sim bug report, or feature request
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS ticket_kind text NOT NULL DEFAULT 'support';

UPDATE public.support_tickets
SET ticket_kind = 'issue'
WHERE scenario_id IS NOT NULL AND ticket_kind = 'support';

ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_ticket_kind_check;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_ticket_kind_check
  CHECK (ticket_kind IN ('support', 'issue', 'feature_request'));

CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_kind ON public.support_tickets (ticket_kind);
