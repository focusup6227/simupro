-- One-time role confirmation gate. Product decision: every existing learner should
-- re-pick their certification tier (EMT / AEMT / Paramedic) on their next login now that
-- role choice is free and self-serve. A null role_confirmed_at means "has not confirmed
-- yet" — the dashboard renders a non-dismissible picker until the user confirms, then this
-- column is stamped and the gate never shows again.
--
-- Existing rows are intentionally left NULL (no backfill) so all current users are prompted
-- once. New signups stamp this column when they pick a tier on /signup/complete-profile.
--
-- Self-serviceable: role_confirmed_at is not one of the columns frozen by
-- profiles_guard_sensitive_columns, so a normal user can set it on their own row. Role
-- movement between clinical tiers is already permitted by that guard (admin/tester stay
-- locked), so the picker needs no further privilege changes.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_confirmed_at timestamptz;
