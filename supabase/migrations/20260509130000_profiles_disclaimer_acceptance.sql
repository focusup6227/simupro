-- B2C go-live: pre-access "Not Medical Advice" disclaimer acceptance gate
-- Each learner profile records when they explicitly clicked "I Understand" and which
-- version of the disclaimer they accepted. Older accounts (created before this
-- migration) start with NULL and the dashboard will block access until they accept.

alter table public.profiles
  add column if not exists disclaimer_accepted_at timestamptz,
  add column if not exists disclaimer_accepted_version text;

comment on column public.profiles.disclaimer_accepted_at is
  'UTC timestamp when the user clicked "I Understand" on the SimuPro Not-Medical-Advice gate. NULL = not yet accepted.';
comment on column public.profiles.disclaimer_accepted_version is
  'Version tag of the disclaimer text the user accepted (allows re-prompting on future material legal updates).';

-- Helpful index for the rare admin query "who hasn''t accepted".
create index if not exists idx_profiles_disclaimer_pending
  on public.profiles (id)
  where disclaimer_accepted_at is null;
