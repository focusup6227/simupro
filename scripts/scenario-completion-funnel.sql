-- SimuPro · Scenario completion drop-off — run against the live Postgres (Supabase SQL editor
-- or psql) to see the signup→start→finish picture from data you ALREADY have today.
--
-- The simulation_sessions table only knows three statuses: 'in-progress' | 'completed' |
-- 'failed'. A run a learner abandons just stays 'in-progress' forever, so "started but never
-- finished" ≈ stale in-progress sessions. The richer per-gate drop-off (radio report →
-- destination → handover) requires the funnel_events instrumentation added alongside this
-- file; these queries are the zero-instrumentation baseline you can run immediately.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Headline: how many started runs actually finish?
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  count(*)                                            AS total_sessions,
  count(*) FILTER (WHERE status = 'completed')        AS completed,
  count(*) FILTER (WHERE status = 'failed')           AS failed,
  count(*) FILTER (WHERE status = 'in-progress')      AS still_in_progress,
  round(100.0 * count(*) FILTER (WHERE status = 'completed') / nullif(count(*), 0), 1)
                                                       AS completion_pct,
  round(100.0 * count(*) FILTER (WHERE status = 'in-progress') / nullif(count(*), 0), 1)
                                                       AS abandoned_pct
FROM public.simulation_sessions;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Stale in-progress = almost certainly abandoned (no update in 24h+).
--    updated_at bumps on every autosave (messages/actions/time every ~1.5s), so a session
--    untouched for a day is not "still playing".
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  count(*)                                                          AS abandoned_runs,
  round(avg(time_elapsed) FILTER (WHERE time_elapsed IS NOT NULL))  AS avg_sim_seconds_before_quit
FROM public.simulation_sessions
WHERE status = 'in-progress'
  AND updated_at < now() - interval '24 hours';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Did they quit immediately, or get deep into the run before bailing?
--    Buckets the abandoned sessions by how far the sim clock got. A pile-up in the
--    "barely started" bucket points at first-action friction (AI latency, confusion);
--    a pile-up in the longer buckets points at the end-of-run completion gates.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  CASE
    WHEN time_elapsed IS NULL OR time_elapsed < 60   THEN 'a) <1 min (bounced)'
    WHEN time_elapsed < 300                          THEN 'b) 1-5 min'
    WHEN time_elapsed < 600                          THEN 'c) 5-10 min'
    ELSE                                                  'd) 10 min+ (deep, quit near end)'
  END AS depth_bucket,
  count(*) AS abandoned_runs
FROM public.simulation_sessions
WHERE status = 'in-progress'
  AND updated_at < now() - interval '24 hours'
GROUP BY 1
ORDER BY 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Which scenarios bleed the most learners?
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  scenario_id,
  scenario_title,
  count(*)                                                                       AS starts,
  count(*) FILTER (WHERE status = 'completed')                                   AS completed,
  count(*) FILTER (WHERE status = 'in-progress')                                 AS abandoned,
  round(100.0 * count(*) FILTER (WHERE status = 'completed') / nullif(count(*), 0), 1)
                                                                                 AS completion_pct
FROM public.simulation_sessions
GROUP BY scenario_id, scenario_title
HAVING count(*) >= 3            -- ignore noise from one-off scenarios
ORDER BY abandoned DESC, starts DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. First-run drop-off: do brand-new users (their very first session) finish at a
--    worse rate than returning users? Tells you whether onboarding is the leak.
-- ─────────────────────────────────────────────────────────────────────────────
WITH ranked AS (
  SELECT
    user_id,
    status,
    row_number() OVER (PARTITION BY user_id ORDER BY start_time) AS run_number
  FROM public.simulation_sessions
)
SELECT
  CASE WHEN run_number = 1 THEN 'first run' ELSE 'returning' END AS cohort,
  count(*)                                                       AS runs,
  count(*) FILTER (WHERE status = 'completed')                  AS completed,
  round(100.0 * count(*) FILTER (WHERE status = 'completed') / nullif(count(*), 0), 1)
                                                                AS completion_pct
FROM ranked
GROUP BY 1
ORDER BY 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Sign up but never even start: profiles with zero sessions. The top of the funnel.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  count(*) FILTER (WHERE s.user_id IS NULL) AS signed_up_never_started,
  count(DISTINCT p.id)                       AS total_users,
  round(100.0 * count(*) FILTER (WHERE s.user_id IS NULL) / nullif(count(DISTINCT p.id), 0), 1)
                                             AS never_started_pct
FROM public.profiles p
LEFT JOIN (SELECT DISTINCT user_id FROM public.simulation_sessions) s
  ON s.user_id = p.id;
