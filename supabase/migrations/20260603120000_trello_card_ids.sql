-- Trello sync: store the Trello card id we create for each tracked entity, so
-- later status changes MOVE the existing card instead of creating duplicates.
-- Populated server-side by /api/trello/sync (driven by Supabase DB webhooks).

ALTER TABLE public.support_tickets
  ADD COLUMN trello_card_id text UNIQUE;

ALTER TABLE public.ai_response_feedback
  ADD COLUMN trello_card_id text UNIQUE;

ALTER TABLE public.scenarios
  ADD COLUMN trello_card_id text UNIQUE;

ALTER TABLE public.user_protocol_imports
  ADD COLUMN trello_card_id text UNIQUE;

ALTER TABLE public.workplace_protocol_imports
  ADD COLUMN trello_card_id text UNIQUE;
