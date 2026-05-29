
"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";

function utcTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Whole UTC calendar days between two ISO date strings (YYYY-MM-DD). */
function utcDaysBetween(prevIso: string, todayIso: string): number {
  const p = Date.UTC(
    Number(prevIso.slice(0, 4)),
    Number(prevIso.slice(5, 7)) - 1,
    Number(prevIso.slice(8, 10))
  );
  const t = Date.UTC(
    Number(todayIso.slice(0, 4)),
    Number(todayIso.slice(5, 7)) - 1,
    Number(todayIso.slice(8, 10))
  );
  return Math.round((t - p) / 86_400_000);
}

/**
 * Call once after a simulation session is saved as completed successfully (not failed).
 * Uses UTC calendar dates for streak logic (matches roadmap MVP).
 */
export async function bumpTrainingStreakAfterSuccessfulSimulation(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = utcTodayIsoDate();

  const { data: profile, error: fetchErr } = await supabase
    .from("profiles")
    .select(
      "current_streak, longest_streak, last_training_activity_date, total_completed_simulations"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (fetchErr || !profile) return;

  const prevTotal = profile.total_completed_simulations ?? 0;
  const total = prevTotal + 1;

  let nextStreak = profile.current_streak ?? 0;
  const last = profile.last_training_activity_date;

  if (!last) {
    nextStreak = 1;
  } else if (last === today) {
    nextStreak = Math.max(1, profile.current_streak ?? 1);
  } else {
    const gap = utcDaysBetween(last, today);
    if (gap === 1) {
      nextStreak = (profile.current_streak ?? 0) + 1;
    } else {
      nextStreak = 1;
    }
  }

  const longest = Math.max(profile.longest_streak ?? 0, nextStreak);

  await supabase
    .from("profiles")
    .update({
      last_training_activity_date: today,
      current_streak: nextStreak,
      longest_streak: longest,
      total_completed_simulations: total,
    })
    .eq("id", user.id);
}
