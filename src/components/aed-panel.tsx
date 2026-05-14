"use client";

import { useEffect, useState } from "react";
import { usePhysiologyStore } from "@/stores/physiology-store";
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
  | 'apply_pads'
  | 'analyzing'
  | 'charging'
  | 'shock_ready'
  | 'shock_delivered';

export function AedPanel({
  role,
  currentArrestRhythm,
  hasROSC,
  onLogAction,
  onDeliveredShock,
  disabled,
}: AedPanelProps) {
  const [phase, setPhase] = useState<Phase>('apply_pads');
  const [shockCount, setShockCount] = useState(0);
  const [ivAccess, setIvAccess] = useState(false);
  const [epiCount, setEpiCount] = useState(0);

  // Rhythm change resets to apply/ready as appropriate
  useEffect(() => {
    if (phase === 'shock_ready' || phase === 'shock_delivered') {
      setPhase('apply_pads');
    }
  }, [currentArrestRhythm, phase]);

  const applyPads = () => {
    setPhase('analyzing');
    usePhysiologyStore.getState().applyMonitorPads();
    onLogAction('Apply Pads');
    // Simulate analysis delay (State 2)
    window.setTimeout(() => {
      const shockable = shockableArrestRhythm(currentArrestRhythm as EcgRhythmKind | null);
      setPhase(shockable ? 'charging' : 'shock_ready'); // non-shockable still goes to ready for clarity
    }, 2200);
  };

  const startCharge = () => {
    setPhase('charging');
    onLogAction('AED analyzing — Charging');
  };

  const deliverShock = () => {
    setPhase('shock_delivered');
    setShockCount((c) => c + 1);
    onLogAction('Delivered AED shock');
    onDeliveredShock?.();
    // Auto transition to CPR cycle after shock (State 5)
    window.setTimeout(() => {
      setPhase('apply_pads');
    }, 800);
  };

  const resumeCpr = () => {
    setPhase('apply_pads');
    onLogAction('Resumed CPR');
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
          {/* State 1: Apply Pads */}
          {phase === 'apply_pads' && (
            <Button
              variant="default"
              size="sm"
              onClick={applyPads}
              disabled={isLocked}
            >
              <HeartPulse className="mr-1.5 size-4" />
              Apply Pads
            </Button>
          )}

          {/* State 2: Analyzing - block CPR, "Do not touch patient" */}
          {phase === 'analyzing' && (
            <div className="text-sm font-semibold text-amber-400 sm:col-span-2">
              ANALYZING — Do not touch patient
            </div>
          )}

          {/* State 3: Charging - "Charging — Resume CPR" */}
          {phase === 'charging' && (
            <Button
              size="sm"
              variant="default"
              onClick={resumeCpr}
              disabled={isLocked}
            >
              <ArrowRight className="mr-1.5 size-4" />
              Charging — Resume CPR
            </Button>
          )}

          {/* State 4: Shock Ready - "Clear Patient", show shock */}
          {phase === 'shock_ready' && (
            <Button
              size="sm"
              variant="destructive"
              className="sm:col-span-2"
              onClick={deliverShock}
              disabled={isLocked}
            >
              <Zap className="mr-1.5 size-4" />
              Clear Patient — Deliver Shock
            </Button>
          )}

          {/* State 5: Shock Delivered -> CPR timer transition handled in handler */}
          {phase === 'shock_delivered' && (
            <div className="text-sm font-semibold text-emerald-400 sm:col-span-2">
              Shock Delivered — Resume CPR now
            </div>
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
    case 'apply_pads':
      label = "State 1: Apply Pads";
      break;
    case 'analyzing':
      label = "State 2: Analyzing — Do not touch patient";
      tone = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30";
      break;
    case 'charging':
      label = "State 3: Charging — Resume CPR";
      tone = "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30";
      break;
    case 'shock_ready':
      label = "State 4: Shock Ready — Clear Patient";
      tone = "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30";
      break;
    case 'shock_delivered':
      label = "State 5: Shock Delivered — Resume CPR";
      tone = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30";
      break;
  }
  return (
    <div className={`rounded-md px-3 py-2 text-sm font-medium ${tone}`}>{label}</div>
  );
}
