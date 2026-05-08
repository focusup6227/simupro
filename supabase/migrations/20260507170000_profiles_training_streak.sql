-- Growth Phase A: training streaks and completion counts on profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_training_activity_date date,
  ADD COLUMN IF NOT EXISTS total_completed_simulations integer NOT NULL DEFAULT 0;
