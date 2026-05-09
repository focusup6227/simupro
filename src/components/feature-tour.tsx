"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TourStep {
  /** Unique key for analytics / skip-to-step. */
  id: string;
  /** `data-tour="<this id>"` attribute the tour will scroll into view + spotlight. */
  anchor?: string;
  title: string;
  body: React.ReactNode;
}

interface FeatureTourProps {
  steps: TourStep[];
  open: boolean;
  onClose: (reason: "completed" | "skipped") => void;
  /** Optional storage key — when set, dismissal persists in localStorage so we don't re-prompt. */
  persistKey?: string;
}

const HIGHLIGHT_PADDING = 8;

/**
 * Lightweight in-house product tour. Renders a fixed dark overlay with a hole
 * cut around the active step's `data-tour="<anchor>"` element, plus a
 * floating card next to it.
 *
 * We deliberately avoid `react-joyride` here so the tour cooperates with
 * Radix portals already on the page (Dialog, Popover, AlertDialog) and our
 * mobile-friendly Tailwind layouts without bringing in another dep tree.
 */
export function FeatureTour({ steps, open, onClose, persistKey }: FeatureTourProps) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [highlight, setHighlight] = React.useState<DOMRect | null>(null);

  const currentStep = steps[stepIndex] ?? null;

  React.useEffect(() => {
    if (!open) {
      setStepIndex(0);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || !currentStep) {
      setHighlight(null);
      return;
    }
    if (!currentStep.anchor) {
      setHighlight(null);
      return;
    }
    let raf = 0;
    const update = () => {
      const el = document.querySelector(
        `[data-tour="${currentStep.anchor}"]`,
      ) as HTMLElement | null;
      if (!el) {
        setHighlight(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setHighlight(rect);
    };
    update();
    const el = document.querySelector(
      `[data-tour="${currentStep.anchor}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const tick = () => {
      update();
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, currentStep]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish("skipped");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex, steps.length]);

  const finish = React.useCallback(
    (reason: "completed" | "skipped") => {
      if (persistKey) {
        try {
          window.localStorage.setItem(persistKey, "1");
        } catch {
          // localStorage unavailable; ignore.
        }
      }
      onClose(reason);
    },
    [persistKey, onClose],
  );

  const next = React.useCallback(() => {
    setStepIndex((i) => {
      if (i >= steps.length - 1) {
        finish("completed");
        return i;
      }
      return i + 1;
    });
  }, [steps.length, finish]);

  const back = React.useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  if (!open || !currentStep) return null;

  const total = steps.length;
  const isLast = stepIndex >= total - 1;

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-label="SimuPro tour"
    >
      <TourBackdrop highlight={highlight} />
      <TourCard
        step={currentStep}
        stepIndex={stepIndex}
        total={total}
        highlight={highlight}
        onSkip={() => finish("skipped")}
        onBack={back}
        onNext={next}
        isLast={isLast}
      />
    </div>
  );
}

function TourBackdrop({ highlight }: { highlight: DOMRect | null }) {
  if (!highlight) {
    return <div className="absolute inset-0 bg-black/65" aria-hidden />;
  }
  const padded = {
    top: Math.max(0, highlight.top - HIGHLIGHT_PADDING),
    left: Math.max(0, highlight.left - HIGHLIGHT_PADDING),
    width: Math.min(window.innerWidth, highlight.width + HIGHLIGHT_PADDING * 2),
    height: Math.min(window.innerHeight, highlight.height + HIGHLIGHT_PADDING * 2),
  };
  return (
    <>
      <div className="absolute inset-0 bg-black/65" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-lg ring-2 ring-primary/80 transition-all"
        style={{
          top: padded.top,
          left: padded.left,
          width: padded.width,
          height: padded.height,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
        }}
      />
    </>
  );
}

function TourCard({
  step,
  stepIndex,
  total,
  highlight,
  onSkip,
  onBack,
  onNext,
  isLast,
}: {
  step: TourStep;
  stepIndex: number;
  total: number;
  highlight: DOMRect | null;
  onSkip: () => void;
  onBack: () => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useLayoutEffect(() => {
    if (!cardRef.current) return;
    const cardRect = cardRef.current.getBoundingClientRect();
    const cardW = cardRect.width;
    const cardH = cardRect.height;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;

    if (!highlight) {
      setPos({
        top: Math.max(margin, vh / 2 - cardH / 2),
        left: Math.max(margin, vw / 2 - cardW / 2),
      });
      return;
    }

    const spaceBelow = vh - highlight.bottom;
    const spaceAbove = highlight.top;
    const spaceRight = vw - highlight.right;

    let top = highlight.bottom + margin;
    let left = highlight.left;

    if (spaceBelow < cardH + margin && spaceAbove > cardH + margin) {
      top = highlight.top - cardH - margin;
    }
    if (spaceBelow < cardH + margin && spaceAbove < cardH + margin && spaceRight > cardW + margin) {
      top = highlight.top;
      left = highlight.right + margin;
    }

    left = Math.max(margin, Math.min(left, vw - cardW - margin));
    top = Math.max(margin, Math.min(top, vh - cardH - margin));
    setPos({ top, left });
  }, [highlight, step.id, total]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "absolute flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 rounded-lg border bg-card p-4 shadow-2xl",
      )}
      style={
        pos
          ? { top: pos.top, left: pos.left }
          : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Tour · step {stepIndex + 1} of {total}
          </span>
        </div>
        <button
          type="button"
          aria-label="Skip tour"
          onClick={onSkip}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{step.title}</h3>
        <div className="text-sm leading-snug text-muted-foreground">{step.body}</div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onBack}
          disabled={stepIndex === 0}
          className="px-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Skip
          </button>
          <Button type="button" size="sm" onClick={onNext}>
            {isLast ? "Got it" : "Next"} <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
