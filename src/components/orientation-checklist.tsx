"use client";

import * as React from "react";
import { Check, Circle, GraduationCap, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  ORIENTATION_OBJECTIVES,
  type OrientationProgress,
} from "@/lib/orientation";

interface OrientationChecklistProps {
  progress: OrientationProgress;
  /** Hide once the learner has finished / left the orientation. */
  className?: string;
}

/**
 * Persistent in-run guidance panel for the orientation scenario. Replaces the
 * one-shot product tour as the primary "what do I do next?" surface: the
 * objectives tick off live as the learner exercises each panel of the runner.
 */
export function OrientationChecklist({
  progress,
  className,
}: OrientationChecklistProps) {
  const done = React.useMemo(
    () => new Set(progress.doneIds),
    [progress.doneIds],
  );
  const pct = Math.round((progress.completedCount / progress.total) * 100);

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/30 bg-primary/5 p-3",
        className,
      )}
      aria-label="Orientation checklist"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-primary">
          <GraduationCap className="h-4 w-4" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Orientation
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {progress.completedCount}/{progress.total}
        </span>
      </div>

      <Progress value={pct} className="mb-3 h-1.5" />

      <ul className="space-y-1.5">
        {ORIENTATION_OBJECTIVES.map((objective) => {
          const isDone = done.has(objective.id);
          return (
            <li key={objective.id} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0" aria-hidden>
                {isDone ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/50" />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm leading-snug",
                    isDone
                      ? "text-muted-foreground line-through"
                      : "font-medium text-foreground",
                  )}
                >
                  {objective.label}
                </span>
                {!isDone && (
                  <span className="block text-xs leading-snug text-muted-foreground">
                    {objective.hint}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {progress.readyToEnd && !progress.allComplete && (
        <p className="mt-3 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <PartyPopper className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Nice — you have toured the runner. End the simulation to get your
          debrief.
        </p>
      )}
    </div>
  );
}
