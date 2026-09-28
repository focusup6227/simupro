"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  aedTransition,
  epiDoseStatus,
  formatMmSs,
  type AedEvent,
  type AedPhase,
} from "@/lib/aed-state";

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
  /** Current simulation clock in seconds. Drives the epinephrine re-dose interval. */
  simTimeSeconds: number;
}

const ANALYSIS_MS = 2200;
const CHARGE_MS = 1500;
const POST_SHOCK_MS = 800;

export function AedPanel({
  role,
  currentArrestRhythm,
  hasROSC,
  onLogAction,
  onDeliveredShock,
  disabled,
  simTimeSeconds,
}: AedPanelProps) {
  const [phase, setPhase] = useState<AedPhase>('apply_pads');
  const [shockCount, setShockCount] = useState(0);
  const [ivAccess, setIvAccess] = useState(false);
  const [epiCount, setEpiCount] = useState(0);
  const [lastEpiAt, setLastEpiAt] = useState<number | null>(null);
  const epiStatus = epiDoseStatus(lastEpiAt, simTimeSeconds);

  // Read the rhythm when analysis finishes, not when the button was pressed.
  const rhythmRef = useRef(currentArrestRhythm);
  useEffect(() => {
    rhythmRef.current = currentArrestRhythm;
  }, [currentArrestRhythm]);
  const isShockable = () =>
    shockableArrestRhythm(rhythmRef.current as EcgRhythmKind | null);

  const timersRef = useRef<number[]>([]);
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const dispatch = (event: AedEvent) => setPhase((p) => aedTransition(p, event));
  const after = (ms: number, fn: () => void) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  // A rhythm change only matters if it disarms a pending shock.
  const [prevRhythm, setPrevRhythm] = useState(currentArrestRhythm);
  if (prevRhythm !== currentArrestRhythm) {
    setPrevRhythm(currentArrestRhythm);
    setPhase(
      aedTransition(phase, {
        type: 'rhythm_changed',
        shockable: shockableArrestRhythm(currentArrestRhythm as EcgRhythmKind | null),
      }),
    );
  }

  const runAnalysis = () => {
    after(ANALYSIS_MS, () => {
      const shockable = isShockable();
      dispatch({ type: 'analysis_complete', shockable });
      if (shockable) {
        onLogAction('AED analyzing — Charging');
        after(CHARGE_MS, () => dispatch({ type: 'charge_complete' }));
      } else {
        onLogAction('AED: no shock advised');
      }
    });
  };

  const applyPads = () => {
    dispatch({ type: 'apply_pads' });
    usePhysiologyStore.getState().applyMonitorPads();
    onLogAction('Apply Pads');
    runAnalysis();
  };

  const analyzeRhythm = () => {
    dispatch({ type: 'analyze' });
    onLogAction('AED analyzing rhythm');
    runAnalysis();
  };

  const deliverShock = () => {
    dispatch({ type: 'deliver_shock' });
    setShockCount((c) => c + 1);
    onLogAction('Delivered AED shock');
    onDeliveredShock?.();
    after(POST_SHOCK_MS, () => dispatch({ type: 'post_shock_elapsed' }));
  };

  const resumeCpr = () => {
    dispatch({ type: 'resume_cpr' });
    onLogAction('Resumed CPR');
  };

  const obtainIv = () => {
    setIvAccess(true);
    onLogAction("Established IV access");
  };

  const giveEpi = () => {
    // Guard in the handler too — rapid clicks can land before the disabled re-render.
    if (epiDoseStatus(lastEpiAt, simTimeSeconds).state === 'locked') return;
    setLastEpiAt(simTimeSeconds);
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

          {/* State 3: Charging — compressions continue while the AED charges */}
          {phase === 'charging' && (
            <div className="text-sm font-semibold text-sky-400 sm:col-span-2">
              Shock advised — Charging. Continue CPR.
            </div>
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

          {/* State 5: Shock Delivered — auto-advances to CPR */}
          {phase === 'shock_delivered' && (
            <div className="text-sm font-semibold text-emerald-400 sm:col-span-2">
              Shock Delivered — Resume CPR now
            </div>
          )}

          {/* No shock advised — back to compressions */}
          {phase === 'no_shock' && (
            <Button
              size="sm"
              variant="default"
              className="sm:col-span-2"
              onClick={resumeCpr}
              disabled={isLocked}
            >
              <ArrowRight className="mr-1.5 size-4" />
              No Shock Advised — Resume CPR
            </Button>
          )}

          {/* CPR cycle — re-analyze when the two-minute prompt fires */}
          {phase === 'cpr' && (
            <>
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Continue high-quality CPR. Re-analyze every 2 minutes.
              </p>
              <Button
                size="sm"
                variant="default"
                className="sm:col-span-2"
                onClick={analyzeRhythm}
                disabled={isLocked}
              >
                <HeartPulse className="mr-1.5 size-4" />
                Analyze Rhythm
              </Button>
            </>
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
              disabled={isLocked || !ivAccess || epiStatus.state === 'locked'}
            >
              <Syringe className="mr-1.5 size-4" />
              {epiStatus.state === 'locked'
                ? `Next epi in ${formatMmSs(epiStatus.secondsUntilDue)}`
                : "Push epinephrine 1 mg"}
            </Button>
            {!ivAccess && (
              <p className="text-[11px] text-muted-foreground sm:col-span-2">
                IV/IO access required before epi push.
              </p>
            )}
            {epiStatus.state !== 'no_doses' && (
              <p
                className={`text-[11px] sm:col-span-2 ${
                  epiStatus.state === 'due'
                    ? "font-semibold text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }`}
              >
                {epiStatus.state === 'due'
                  ? `Epi due — last dose ${formatMmSs(epiStatus.secondsSinceLast)} ago.`
                  : `Last epi ${formatMmSs(epiStatus.secondsSinceLast)} ago · repeat every 3–5 min.`}
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

function PhaseBanner({ phase, hasROSC }: { phase: AedPhase; hasROSC: boolean }) {
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
      label = "State 3: Shock Advised — Charging, continue CPR";
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
    case 'no_shock':
      label = "No Shock Advised — Resume CPR";
      tone = "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30";
      break;
    case 'cpr':
      label = "CPR in progress — Analyze at 2 minutes";
      tone = "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30";
      break;
  }
  return (
    <div className={`rounded-md px-3 py-2 text-sm font-medium ${tone}`}>{label}</div>
  );
}
