"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/app/icons";
import type { User } from "@/lib/types";
import { logFunnelEvent } from "@/app/funnel-actions";

const NUDGE_DISMISS_KEY = "simupro_upgrade_nudge_dismissed";
/** Show the nudge only once a free user is demonstrably engaged. */
const NUDGE_MIN_COMPLETED = 3;

/**
 * Dismissible in-app upgrade nudge for engaged free users (>= 3 completed scenarios).
 * Dismissal persists in localStorage (mirrors the welcome-tour pattern). Emits
 * nudge_shown / nudge_clicked funnel events keyed by `placement`.
 */
export function UpgradeNudge({
  user,
  placement,
}: {
  user: User | null | undefined;
  placement: string;
}) {
  const router = useRouter();
  // Start hidden so we never flash before the localStorage check runs.
  const [dismissed, setDismissed] = useState(true);

  const completed = user?.totalCompletedSimulations ?? 0;
  const eligible =
    Boolean(user) && !user?.isPremium && completed >= NUDGE_MIN_COMPLETED;

  useEffect(() => {
    if (!eligible) return;
    try {
      if (window.localStorage.getItem(NUDGE_DISMISS_KEY) === "1") return;
    } catch {
      // localStorage unavailable — just show it.
    }
    setDismissed(false);
  }, [eligible]);

  const show = eligible && !dismissed;

  useEffect(() => {
    if (show) void logFunnelEvent("nudge_shown", { placement });
  }, [show, placement]);

  if (!show) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(NUDGE_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  const goPremium = () => {
    void logFunnelEvent("nudge_clicked", { placement });
    router.push("/billing");
  };

  return (
    <div
      className="app-panel relative overflow-hidden p-4 sm:p-5 flex items-start gap-4"
      style={{ borderColor: "rgba(251,191,36,0.30)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(251,191,36,0.10) 0%, transparent 60%)",
        }}
      />
      <span
        className="relative z-10 w-10 h-10 rounded-md flex items-center justify-center shrink-0"
        style={{ background: "rgba(251,191,36,0.12)", color: "var(--premium)" }}
      >
        <Icons.Crown className="w-5 h-5" />
      </span>
      <div className="relative z-10 flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-white">
          You&apos;ve completed {completed} scenarios — ready for more?
        </div>
        <p className="text-[12.5px] text-[var(--text-mute)] mt-1 leading-relaxed">
          Premium unlocks the full scenario library, the ECG trainer, advanced patient
          realism, and deep-dive AI coaching on every run.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={goPremium}
            className="cta-primary h-9 px-4 rounded-md text-[12.5px] font-semibold inline-flex items-center gap-1.5"
          >
            <Icons.Crown className="w-3.5 h-3.5" /> Upgrade to Premium
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="cta-ghost h-9 px-3 rounded-md text-[12.5px] font-medium"
          >
            Maybe later
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="relative z-10 text-[var(--text-mute)] hover:text-white shrink-0"
      >
        <Icons.X className="w-4 h-4" />
      </button>
    </div>
  );
}
