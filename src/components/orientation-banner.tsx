"use client";

import Link from "next/link";
import type { User } from "@/lib/types";
import { Icons } from "@/components/app/icons";
import { ORIENTATION_SCENARIO_PATH } from "@/lib/orientation";

interface OrientationBannerProps {
  user: User | null | undefined;
}

/**
 * First-run entry point for the orientation scenario. The orientation is hidden
 * from the browse list / dashboard queue, so this banner is the one surface that
 * points new learners at it. It disappears once their profile records the
 * tutorial as complete.
 */
export function OrientationBanner({ user }: OrientationBannerProps) {
  // Wait for profile to load before deciding; once we know it's complete, hide.
  if (!user || user.hasCompletedTutorial) return null;

  return (
    <Link
      href={ORIENTATION_SCENARIO_PATH}
      className="group app-panel relative block overflow-hidden p-5 transition-colors hover:border-[var(--accent)]/60"
    >
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] live-dot" />
        // new here · start your orientation
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-white text-[20px] leading-tight">
            Take the 5-minute orientation run
          </h2>
          <p className="mt-1 text-[13px] text-[var(--text-mute)]">
            A stable patient and a live checklist walk you through the monitor,
            equipment, assessment, and transport — no way to fail.
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-black transition-transform group-hover:translate-x-0.5">
          <Icons.Play className="w-4 h-4" />
          Start
          <Icons.Arrow className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}
