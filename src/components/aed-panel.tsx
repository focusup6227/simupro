"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, HeartPulse, Shield, Syringe, Zap } from "lucide-react";
import {
  shockableArrestRhythm,
  type EcgRhythmKind,
} from "@/lib/ecg-rhythm";
import type { ArrestRhythmKind } from "@/lib/types";

type AedRole = "emt" | "aemt";

interface AedPanelProps {
  role: AedRole;
  /** The patient's underlying arrest rhythm reported by the AI. Drives shock/no-shock advice. */
  currentArrestRhythm: ArrestRhythmKind | null;
  /** Whether ROSC has been achieved (disables most buttons). */
  hasROSC: boolean;
  /** Submit a new user action (label appended to userActions; matches grading phrasings). */
  onLogAction: (label: string) => void;
  /** Called when the user delivers a shock. Parent decides whether to advance scenario state. */
  onDeliveredShock?: () => void;
  /** Disable buttons while a parent-side analysis or AI call is running. */
  disabled?: boolean;
}

type Phase =
  | "no_pads"
  | "ready"
  | "analyzing"
  | "shock_advised"
  | "no_shock_advised"
  | "post_shock";

export function AedPanel({
  role,
  currentArrestRhythm,
  hasROSC,
  onLogAction,
  onDeliveredShock,
  disabled,
}: AedPanelProps) {
  const [phase, setPhase] = useState<Phase>("no_pads");
  const [shockCount, setShockCount] = useState(0);
  const [ivAccess, setIvAccess] = useState(false);
  const [epiCount, setEpiCount] = useState(0);

  // If the rhythm changes mid-flow (e.g. ROSC, or deteriorates after shock),
  // reset the analyzer to ready so the operator must analyze again.
  useEffect(() => {
    setPhase((p) =>
      p === "shock_advised" || p === "no_shock_advised" ? "ready" : p,
    );
  }, [currentArrestRhythm]);

  const applyPads = () => {
    setPhase("ready");
    onLogAction("Applied AED pads");
  };

  const analyze = () => {
    setPhase("analyzing");
    onLogAction("AED analyzed rhythm");
    // Real AEDs take ~6–12 seconds; we simulate a short delay client-side.
    window.setTimeout(() => {
      const shockable = shockableArrestRhythm(currentArrestRhythm as EcgRhythmKind | null);
      setPhase(shockable ? "shock_advised" : "no_shock_advised");
    }, 1800);
  };

  const deliverShock = () => {
    setPhase("post_shock");
    setShockCount((c) => c + 1);
    onLogAction("Delivered AED shock");
    onDeliveredShock?.();
  };

  const resumeCpr = () => {
    setPhase("ready");
    onLogAction("Resumed CPR — no shock advised");
  };

  const resumeCprAfterShock = () => {
    setPhase("ready");
    onLogAction("Resumed CPR for 2-minute cycle");
  };

  const obtainIv = () => {
    setIvAccess(true);
    onLogAction("Established IV access");
  };

  const giveEpi = () => {
    setEpiCount((c) => c + 1);
    onLogAction("Administered epinephrine 1 mg IV/IO");
  };

  const isLocked = disabled || hasROSC;

  return (
    <Card className="border-emerald-700/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4 text-emerald-500" />
            {role === "aemt" ? "AED + ALS basics" : "Automated External Defibrillator"}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[11px]">
              Shocks: {shockCount}
            </Badge>
            {role === "aemt" && (
              <>
                <Badge variant="outline" className="text-[11px]">
                  IV: {ivAccess ? "yes" : "no"}
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  Epi: {epiCount}
                </Badge>
              </>
            )}
          </div>
        </div>
        <CardDescription className="pt-1 text-xs leading-relaxed">
          Follow the AED prompts. Continue high-quality CPR between analyses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <PhaseBanner phase={phase} hasROSC={hasROSC} />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            variant={phase === "no_pads" ? "default" : "outline"}
            size="sm"
            onClick={applyPads}
            disabled={isLocked || phase !== "no_pads"}
          >
            <HeartPulse className="mr-1.5 size-4" />
            Apply AED pads
          </Button>

          <Button
            variant={phase === "ready" ? "default" : "outline"}
            size="sm"
            onClick={analyze}
            disabled={isLocked || phase !== "ready"}
          >
            <Zap className="mr-1.5 size-4" />
            {phase === "analyzing" ? "Analyzing…" : "Analyze rhythm"}
          </Button>

          {phase === "shock_advised" && (
            <Button
              size="sm"
              variant="destructive"
              className="sm:col-span-2"
              onClick={deliverShock}
              disabled={isLocked}
            >
              <Zap className="mr-1.5 size-4" />
              Deliver shock — clear!
            </Button>
          )}

          {phase === "no_shock_advised" && (
            <Button
              size="sm"
              className="sm:col-span-2"
              variant="default"
              onClick={resumeCpr}
              disabled={isLocked}
            >
              <ArrowRight className="mr-1.5 size-4" />
              Resume CPR — no shock advised
            </Button>
          )}

          {phase === "post_shock" && (
            <Button
              size="sm"
              className="sm:col-span-2"
              onClick={resumeCprAfterShock}
              disabled={isLocked}
            >
              <ArrowRight className="mr-1.5 size-4" />
              Resume CPR (2-min cycle)
            </Button>
          )}
        </div>

        {role === "aemt" && (
          <div className="grid grid-cols-1 gap-2 border-t pt-3 sm:grid-cols-2">
            <Button
              variant="outline"
              size="sm"
              onClick={obtainIv}
              disabled={isLocked || ivAccess}
            >
              <Syringe className="mr-1.5 size-4" />
              {ivAccess ? "IV access established" : "Establish IV/IO access"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={giveEpi}
              disabled={isLocked || !ivAccess}
            >
              <Syringe className="mr-1.5 size-4" />
              Push epinephrine 1 mg
            </Button>
            {!ivAccess && (
              <p className="text-[11px] text-muted-foreground sm:col-span-2">
                IV/IO access required before epi push.
              </p>
            )}
          </div>
        )}

        {hasROSC && (
          <p className="text-center text-sm font-semibold text-emerald-600">
            ROSC achieved — switch to post-arrest care.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PhaseBanner({ phase, hasROSC }: { phase: Phase; hasROSC: boolean }) {
  if (hasROSC) return null;
  let label = "";
  let tone = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
  switch (phase) {
    case "no_pads":
      label = "Step 1: Apply pads to bare chest.";
      break;
    case "ready":
      label = "Step 2: Stop CPR and press Analyze.";
      break;
    case "analyzing":
      label = "Stand clear — AED is analyzing rhythm.";
      tone = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30";
      break;
    case "shock_advised":
      label = "Shock advised — clear the patient and deliver shock.";
      tone = "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30";
      break;
    case "no_shock_advised":
      label = "No shock advised — resume CPR for 2 minutes.";
      tone = "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30";
      break;
    case "post_shock":
      label = "Shock delivered. Resume CPR immediately.";
      tone = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30";
      break;
  }
  return (
    <div className={`rounded-md px-3 py-2 text-sm font-medium ${tone}`}>{label}</div>
  );
}
