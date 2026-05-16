"use client";

// SimuPro Post-Run Report — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - useDoc/useCollection for scenario, session, user, insights
//   - processSimulationResults action (auto-fires when no insight exists)
//   - Tutorial-completion flag on profile update
//   - chart data (assessment / treatment scores) — kept via recharts
//   - relevant mandatory + suggested actions by role
//   - protocol audit (wins + deviations)
//   - premium deep-dive feedback (whatWentWell / criticalIssues / actionableTips / protocolReferences / drillSuggestions)
//   - action log table
//   - print
//   - re-process / retry analysis

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { processSimulationResults } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  useUser,
  useSupabase,
  useDoc,
  useMemoSupabase,
  useCollection,
} from "@/supabase";
import type {
  Scenario,
  SimulationSession,
  Insight,
  User,
  CertificationActions,
  UserAction,
  ProtocolDeviation,
  ProtocolWin,
} from "@/lib/types";
import type { Json } from "@/lib/supabase/database.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, DiffPill } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

const DEVIATION_KIND_LABEL: Record<ProtocolDeviation["kind"], string> = {
  scope: "Scope Violation",
  dosage: "Dosage Error",
  indication: "Indication Error",
  contraindication: "Contraindication",
  other: "Other",
};

export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { toast } = useToast();
  const { user: authUser } = useUser();
  const client = useSupabase();

  const scenarioId = (params?.id as string) || "";
  const sessionId = searchParams?.get("sessionId") ?? null;
  const userIdFromQuery = searchParams?.get("userId") ?? null;

  const [isProcessing, setIsProcessing] = useState(false);
  const reportForUserId = userIdFromQuery || authUser?.id;

  // ── Data fetches (unchanged) ───────────────────────────────────────
  const sessionSpec = useMemoSupabase(
    () =>
      client && reportForUserId && sessionId
        ? ({
            table: "simulation_sessions",
            eq: { user_id: reportForUserId, id: sessionId },
          } as const)
        : null,
    [client, reportForUserId, sessionId],
  );
  const { data: sessionRows, isLoading: isLoadingSession } =
    useCollection<SimulationSession>(sessionSpec);
  const session = sessionRows?.[0];

  const scenarioSpec = useMemoSupabase(
    () =>
      client && scenarioId
        ? ({ table: "scenarios", id: scenarioId, live: false } as const)
        : null,
    [client, scenarioId],
  );
  const { data: scenario, isLoading: isLoadingScenario } =
    useDoc<Scenario>(scenarioSpec);

  const userSpec = useMemoSupabase(
    () =>
      client && reportForUserId
        ? ({ table: "profiles", id: reportForUserId } as const)
        : null,
    [client, reportForUserId],
  );
  const { data: user, isLoading: isLoadingUser } = useDoc<User>(userSpec);

  const insightsSpec = useMemoSupabase(
    () =>
      client && sessionId
        ? ({
            table: "session_insights",
            eq: { session_id: sessionId },
          } as const)
        : null,
    [client, sessionId],
  );
  const {
    data: insights,
    isLoading: isLoadingInsights,
    error: insightError,
  } = useCollection<Insight>(insightsSpec);
  const insight =
    insights?.find((i) => i.id === "ai_feedback") ?? insights?.[0];

  const simulationFailed = session?.status === "failed";

  const userRoleForSession = useMemo(() => {
    if (session?.userRole) return session.userRole;
    if (user?.role === "tester") return user.testRole || "emt";
    return user?.role;
  }, [session, user]);

  // ── Process results (unchanged) ────────────────────────────────────
  const handleProcessResults = useCallback(async () => {
    if (!session || !scenario || !user || !reportForUserId || !sessionId || !client) return;
    setIsProcessing(true);
    toast({
      title: "Analyzing Performance...",
      description: "Please wait while the AI grades your simulation.",
    });

    try {
      const insightData = await processSimulationResults({
        sessionId,
        scenarioId,
      });

      const { error: upsertError } = await client.from("session_insights").upsert(
        {
          session_id: sessionId,
          id: "ai_feedback",
          assessment_score: insightData.assessmentScore,
          treatment_score: insightData.treatmentScore,
          ai_feedback: insightData.aiFeedback,
          reasoning: insightData.reasoning,
          premium_feedback: insightData.premiumFeedback ?? null,
          protocol_deviations:
            (insightData.protocolDeviations ?? []) as unknown as Json,
          protocol_wins:
            (insightData.protocolWins ?? []) as unknown as Json,
        },
        { onConflict: "session_id,id" },
      );
      if (upsertError) throw upsertError;

      if (scenario.id === "welcome-tutorial") {
        const { error: profileErr } = await client
          .from("profiles")
          .update({ has_completed_tutorial: true })
          .eq("id", reportForUserId);
        if (profileErr) console.error(profileErr);
      }

      toast({
        title: "Analysis Complete!",
        description: "Your performance report is ready.",
      });
    } catch (err: unknown) {
      console.error("Error processing simulation results:", err);
      toast({
        variant: "destructive",
        title: "Error Generating Report",
        description:
          err instanceof Error
            ? err.message
            : "Could not process your simulation data.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [session, scenario, user, reportForUserId, sessionId, scenarioId, toast, client]);

  useEffect(() => {
    const isDataLoaded =
      !isLoadingSession &&
      !isLoadingScenario &&
      !isLoadingUser &&
      !isLoadingInsights;
    if (isDataLoaded && session && !insight && !isProcessing) {
      void handleProcessResults();
    }
  }, [
    isLoadingSession,
    isLoadingScenario,
    isLoadingUser,
    isLoadingInsights,
    session,
    insight,
    isProcessing,
    handleProcessResults,
  ]);

  // ── Derived data ───────────────────────────────────────────────────
  const chartData = [
    { name: "Assessment", value: insight?.assessmentScore ?? 0 },
    { name: "Treatment", value: insight?.treatmentScore ?? 0 },
  ];
  const chartConfig = {
    value: { label: "Score", color: "var(--orange)" },
  } as const;

  const relevantMandatoryActions = useMemo(() => {
    if (!scenario || !userRoleForSession) return [];
    const role =
      userRoleForSession === "admin" ||
      userRoleForSession === "student" ||
      userRoleForSession === "tester"
        ? "emt"
        : userRoleForSession;
    return scenario.mandatoryActions[role as keyof CertificationActions] || [];
  }, [scenario, userRoleForSession]);

  const relevantSuggestedActions = useMemo(() => {
    if (!scenario || !userRoleForSession) return [];
    const role =
      userRoleForSession === "admin" ||
      userRoleForSession === "student" ||
      userRoleForSession === "tester"
        ? "emt"
        : userRoleForSession;
    return scenario.suggestedActions[role as keyof CertificationActions] || [];
  }, [scenario, userRoleForSession]);

  const isLoadingInitialData =
    isLoadingSession || isLoadingScenario || isLoadingUser;

  const isLoadingInsightsData = isLoadingInsights && !insight;

  const protocolWins: ProtocolWin[] = Array.isArray(insight?.protocolWins)
    ? (insight!.protocolWins as ProtocolWin[])
    : [];
  const protocolDeviations: ProtocolDeviation[] = Array.isArray(
    insight?.protocolDeviations,
  )
    ? (insight!.protocolDeviations as ProtocolDeviation[])
    : [];
  const showProtocolAudit =
    protocolWins.length > 0 || protocolDeviations.length > 0;

  const overallScore = insight
    ? Math.round((insight.assessmentScore + insight.treatmentScore) / 2)
    : null;

  const overallAccent = overallScore == null
    ? "var(--text-mute)"
    : simulationFailed || overallScore < 50
    ? "var(--danger)"
    : overallScore >= 85
    ? "var(--success)"
    : overallScore >= 70
    ? "var(--orange-soft)"
    : "var(--warn)";

  const overallLabel = simulationFailed
    ? "// patient deceased"
    : overallScore == null
    ? "// pending"
    : overallScore >= 85
    ? "// strong"
    : overallScore >= 70
    ? "// solid"
    : overallScore >= 50
    ? "// room to grow"
    : "// review";

  const renderActionDetails = (action: UserAction) => {
    if (action.assessment !== "None") return `Assessment: ${action.assessment}`;
    if (action.treatments.length > 0)
      return `Treatments: ${action.treatments.join(", ")}`;
    if (action.destination)
      return `Destination: ${action.destination} (Mode: ${action.transportMode})`;
    return "No specific details.";
  };

  // ── Early returns ──────────────────────────────────────────────────
  if (!sessionId || !reportForUserId) {
    return (
      <div className="p-8 text-center text-[14px] text-[var(--text-mute)]">
        Missing session or user. Open this report from your dashboard history.
      </div>
    );
  }

  if (isLoadingInitialData) {
    return (
      <div className="p-8">
        <Skeleton className="h-6 w-48 mb-3 bg-white/5" />
        <Skeleton className="h-9 w-80 mb-7 bg-white/5" />
        <div className="grid grid-cols-[420px_1fr] gap-5 mb-5">
          <Skeleton className="h-48 rounded-xl bg-white/5" />
          <Skeleton className="h-48 rounded-xl bg-white/5" />
        </div>
        <Skeleton className="h-64 rounded-xl bg-white/5" />
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Icons.Refresh className="h-12 w-12 text-[var(--orange-soft)] mb-6 animate-spin" />
        <h2 className="font-display font-bold text-[24px] text-white mb-2">
          Analyzing Performance...
        </h2>
        <p className="text-[13.5px] text-[var(--text-mute)] text-center max-w-md">
          The AI is grading your simulation. Please wait a moment, and do not navigate away from this page.
        </p>
      </div>
    );
  }

  if (!session || !scenario) {
    return (
      <div className="p-8 text-center text-[14px] text-[var(--text-mute)]">
        Could not load report data. Please try again.
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="p-8 mx-auto w-full max-w-[1200px]">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
            // SESSION {sessionId.slice(0, 6)} ·{" "}
            {simulationFailed ? "FAILED" : "COMPLETED"}
            {session?.timeElapsed
              ? ` · ${Math.floor(session.timeElapsed / 60)}m ${session.timeElapsed % 60}s`
              : ""}
          </div>
          <h1 className="font-display font-bold text-[34px] text-white leading-none mb-2">
            {scenario.title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {scenario.difficulty && (
              <DiffPill level={scenario.difficulty as never} />
            )}
            {userRoleForSession && (
              <span className="tag uppercase">{String(userRoleForSession)}</span>
            )}
            <span className="tag">{scenario.patientProfile}</span>
            {simulationFailed ? (
              <span className="tag tag-rose">
                <Icons.X className="w-3 h-3" /> simulation failed
              </span>
            ) : (
              <span className="tag tag-emerald">
                <Icons.CheckCircle className="w-3 h-3" /> patient handoff complete
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2" data-print-hide>
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Print report"
            className="h-10 px-3 rounded-lg cta-secondary text-[13px] font-medium inline-flex items-center gap-2"
          >
            <Icons.Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/scenarios")}
            className="h-10 px-3 rounded-lg cta-secondary text-[13px] font-medium inline-flex items-center gap-2"
          >
            <Icons.Refresh className="w-3.5 h-3.5" /> Try another
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="h-10 px-4 rounded-lg cta-primary text-[13.5px] font-semibold inline-flex items-center gap-2"
          >
            Dashboard <Icons.Arrow className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {simulationFailed && (
        <div
          className="app-panel mb-5 p-4 flex items-start gap-3 relative overflow-hidden"
          style={{ borderColor: "rgba(248,113,113,0.30)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(248,113,113,0.12) 0%, transparent 60%)",
            }}
          />
          <span
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 relative z-10"
            style={{ background: "rgba(248,113,113,0.18)", color: "var(--danger)" }}
          >
            <Icons.X className="w-4 h-4" />
          </span>
          <div className="relative z-10">
            <div className="text-[13px] font-semibold text-white">
              Simulation failed
            </div>
            <div className="text-[12px] text-[var(--text-mute)] mt-0.5">
              The patient has died. Review the scenario objectives and your actions to understand what went wrong.
            </div>
          </div>
        </div>
      )}

      {/* ── Score hero + Objectives ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5 mb-5">
        {/* Overall score */}
        <div className="app-panel-2 p-6 relative overflow-hidden">
          <div
            className="absolute -top-16 -right-16 w-[18rem] h-[18rem] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${overallAccent}33 0%, transparent 60%)`,
              filter: "blur(30px)",
            }}
          />
          <div className="relative z-10 flex items-center gap-6">
            <div className="relative w-36 h-36 shrink-0">
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="7"
                />
                {overallScore != null && (
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke={overallAccent}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (1 - overallScore / 100)}
                    transform="rotate(-90 50 50)"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isLoadingInsightsData ? (
                  <Skeleton className="h-10 w-16 bg-white/5" />
                ) : (
                  <>
                    <span className="font-display font-bold text-[44px] text-white leading-none">
                      {overallScore ?? "—"}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-mute)] mt-1">
                      overall
                    </span>
                  </>
                )}
              </div>
            </div>
            <div>
              <div
                className="text-[11px] uppercase tracking-[0.22em] font-mono mb-1"
                style={{ color: overallAccent }}
              >
                {overallLabel}
              </div>
              <div className="space-y-2 text-[12.5px] mt-2">
                <div className="flex justify-between gap-6">
                  <span className="text-[var(--text-mute)]">Assessment</span>
                  <span className="font-mono tabular-nums text-white">
                    {isLoadingInsightsData ? "—" : insight?.assessmentScore ?? 0}
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-[var(--text-mute)]">Treatment</span>
                  <span className="font-mono tabular-nums text-white">
                    {isLoadingInsightsData ? "—" : insight?.treatmentScore ?? 0}
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-[var(--text-mute)]">Time elapsed</span>
                  <span className="font-mono tabular-nums text-white">
                    {session?.timeElapsed ?? 0}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Score breakdown chart */}
        <Panel title="Performance breakdown" sub="Assessment vs. treatment scores">
          <div className="px-5 pt-4 pb-5">
            {isLoadingInsightsData ? (
              <Skeleton className="h-[200px] w-full bg-white/5" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    stroke="#8595c0"
                    fontSize={12}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    stroke="#8595c0"
                    fontSize={11}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <Bar dataKey="value" fill="var(--orange)" radius={6} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </Panel>
      </div>

      {/* ── AI Feedback ──────────────────────────────────────────── */}
      <Panel title="AI coaching" sub="Personalized improvement notes" className="mb-5">
        <div className="px-5 py-4">
          {isLoadingInsightsData ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-white/5" />
              <Skeleton className="h-4 w-full bg-white/5" />
              <Skeleton className="h-4 w-3/4 bg-white/5" />
            </div>
          ) : insight?.aiFeedback ? (
            <div className="flex gap-3">
              <span className="w-4 h-4 mt-0.5 text-[var(--cyan-soft)] shrink-0">
                <Icons.Lightbulb className="w-4 h-4" />
              </span>
              <p className="text-[13.5px] text-white/85 leading-relaxed whitespace-pre-wrap">
                {insight.aiFeedback}
              </p>
            </div>
          ) : insightError ? (
            <div className="flex flex-col gap-2">
              <div className="text-[13px] text-[var(--danger)] font-medium">
                Error loading feedback
              </div>
              <pre className="text-[11px] bg-black/30 p-3 rounded font-mono text-[var(--text-mute)] overflow-x-auto">
                {insightError.message}
              </pre>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-[13px] text-[var(--text-mute)]">
                Could not generate AI feedback for this session.
              </p>
              {(!session?.status || session.status === "in-progress") && (
                <button
                  type="button"
                  onClick={() => void handleProcessResults()}
                  disabled={isProcessing}
                  className="cta-secondary mt-4 h-9 px-3 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5"
                >
                  <Icons.Refresh className="w-3.5 h-3.5" /> Retry analysis
                </button>
              )}
            </div>
          )}
        </div>
      </Panel>

      {/* ── Protocol audit (if any) ──────────────────────────────── */}
      {showProtocolAudit && (
        <Panel
          title="Protocol audit · NASEMSO"
          sub="Three-Point Check (ID, dosage, indication) against the protocol source of truth"
          className="mb-5"
        >
          <div className="px-5 py-4 space-y-5">
            {protocolWins.length > 0 && (
              <div
                className="rounded-md p-4 relative"
                style={{
                  background: "rgba(52,211,153,0.06)",
                  border: "1px solid rgba(52,211,153,0.25)",
                }}
              >
                <h4 className="text-[13px] font-semibold text-emerald-200 flex items-center gap-2 mb-3">
                  <Icons.CheckCircle className="w-4 h-4 text-emerald-300" />
                  Protocol-aligned actions
                </h4>
                <ul className="space-y-3">
                  {protocolWins.map((win, i) => (
                    <li key={`win-${i}`} className="text-[12.5px]">
                      <p className="text-white">
                        <span className="font-mono text-[10.5px] text-[var(--text-mute)] mr-2">
                          t={win.actionTime}s
                        </span>
                        {win.treatment}
                      </p>
                      {win.expected && (
                        <p className="text-[12px] text-[var(--text-mute)] mt-0.5">
                          {win.expected}
                        </p>
                      )}
                      {win.observed && win.observed !== win.expected && (
                        <p className="text-[11.5px] text-[var(--text-dim)] mt-0.5">
                          {win.observed}
                        </p>
                      )}
                      {win.reference && (
                        <p className="text-[11px] text-[var(--text-faint)] font-mono mt-0.5">
                          {win.reference}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {protocolDeviations.length > 0 ? (
              <div>
                <h4 className="text-[13px] font-semibold text-amber-200 flex items-center gap-2 mb-3">
                  <Icons.Refresh className="w-4 h-4" />
                  Protocol deviations
                </h4>
                <ul className="space-y-3">
                  {protocolDeviations.map((dev, i) => (
                    <li
                      key={`dev-${i}`}
                      className="rounded-md p-3"
                      style={{
                        background: "rgba(245,185,94,0.06)",
                        border: "1px solid rgba(245,185,94,0.25)",
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="tag tag-amber">
                          {DEVIATION_KIND_LABEL[dev.kind] ?? "Other"}
                        </span>
                        <span className="font-mono text-[10.5px] text-[var(--text-mute)]">
                          t={dev.actionTime}s
                        </span>
                        <span className="text-[12.5px] font-medium text-white">
                          {dev.treatment}
                        </span>
                      </div>
                      <div className="space-y-1 text-[12.5px]">
                        <p>
                          <span className="text-white font-semibold">Expected:</span>{" "}
                          <span className="text-[var(--text-mute)]">{dev.expected}</span>
                        </p>
                        <p>
                          <span className="text-white font-semibold">Observed:</span>{" "}
                          <span className="text-[var(--text-mute)]">{dev.observed}</span>
                        </p>
                        {dev.reference && (
                          <p className="text-[11px] text-[var(--text-faint)] font-mono mt-1">
                            {dev.reference}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              protocolWins.length > 0 && (
                <p
                  className="rounded-md p-3 text-[12.5px] text-emerald-200"
                  style={{
                    background: "rgba(52,211,153,0.06)",
                    border: "1px solid rgba(52,211,153,0.25)",
                  }}
                >
                  No protocol deviations detected — protocol-aligned care.
                </p>
              )
            )}
          </div>
        </Panel>
      )}

      {/* ── Premium feedback ─────────────────────────────────────── */}
      {insight?.premiumFeedback && (
        <Panel
          accent="orange"
          title={
            <span className="flex items-center gap-2">
              <Icons.Crown className="w-4 h-4 text-[var(--premium)]" />
              Premium deep-dive coaching
            </span>
          }
          sub="Structured analysis available because you ran a Premium scenario"
          className="mb-5"
        >
          <div className="px-5 py-4 grid gap-5 md:grid-cols-2">
            {insight.premiumFeedback.whatWentWell &&
              insight.premiumFeedback.whatWentWell.length > 0 && (
                <FeedbackList
                  title="What went well"
                  color="var(--success)"
                  icon={<Icons.CheckCircle className="w-4 h-4" />}
                  items={insight.premiumFeedback.whatWentWell}
                />
              )}
            {insight.premiumFeedback.criticalIssues &&
              insight.premiumFeedback.criticalIssues.length > 0 && (
                <FeedbackList
                  title="Critical issues"
                  color="var(--danger)"
                  icon={<Icons.X className="w-4 h-4" />}
                  items={insight.premiumFeedback.criticalIssues}
                />
              )}
            {insight.premiumFeedback.actionableTips &&
              insight.premiumFeedback.actionableTips.length > 0 && (
                <FeedbackList
                  title="Actionable tips"
                  color="var(--premium)"
                  icon={<Icons.Lightbulb className="w-4 h-4" />}
                  items={insight.premiumFeedback.actionableTips}
                />
              )}
            {insight.premiumFeedback.protocolReferences &&
              insight.premiumFeedback.protocolReferences.length > 0 && (
                <FeedbackList
                  title="Protocol references"
                  color="var(--cyan-soft)"
                  icon={<Icons.Book className="w-4 h-4" />}
                  items={insight.premiumFeedback.protocolReferences}
                />
              )}
            {insight.premiumFeedback.drillSuggestions &&
              insight.premiumFeedback.drillSuggestions.length > 0 && (
                <div className="md:col-span-2">
                  <FeedbackList
                    title="Suggested drills"
                    color="var(--cyan-electric)"
                    icon={<Icons.Heart className="w-4 h-4" />}
                    items={insight.premiumFeedback.drillSuggestions}
                  />
                </div>
              )}
          </div>
        </Panel>
      )}

      {/* ── Objectives ───────────────────────────────────────────── */}
      <Panel
        title="Scenario objectives"
        sub={
          <>
            Key actions and failures for your role:{" "}
            <span className="font-mono uppercase text-white">
              {String(userRoleForSession ?? "")}
            </span>
          </>
        }
        className="mb-5"
      >
        <div className="px-5 py-4 grid gap-5 md:grid-cols-2">
          <div>
            <h4 className="text-[12.5px] font-semibold text-white mb-2 flex items-center gap-2">
              <Icons.Hospital className="w-4 h-4 text-[var(--cyan-soft)]" />
              Appropriate destination
            </h4>
            <p className="text-[12.5px] text-[var(--text-mute)] leading-relaxed">
              <span className="text-white font-medium">
                {scenario?.destination}:
              </span>{" "}
              {scenario?.destinationRationale}
            </p>
          </div>
          <ObjectiveList
            title="Mandatory actions"
            color="var(--success)"
            icon={<Icons.CheckCircle className="w-4 h-4" />}
            items={relevantMandatoryActions}
            emptyLabel="No mandatory actions for your role."
          />
          <ObjectiveList
            title="Suggested actions"
            color="var(--warn)"
            icon={<Icons.Refresh className="w-4 h-4" />}
            items={relevantSuggestedActions}
            emptyLabel="No suggested actions for your role."
          />
          <ObjectiveList
            title="Critical failures"
            color="var(--danger)"
            icon={<Icons.X className="w-4 h-4" />}
            items={scenario?.criticalFailures ?? []}
          />
        </div>
      </Panel>

      {/* ── Action log ───────────────────────────────────────────── */}
      <Panel title="Action log" sub="Every action you took during the simulation" className="mb-5">
        <div className="px-2 py-1">
          {isLoadingInsightsData ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-8 w-full bg-white/5" />
              <Skeleton className="h-8 w-full bg-white/5" />
              <Skeleton className="h-8 w-full bg-white/5" />
            </div>
          ) : session?.actions && session.actions.length > 0 ? (
            session.actions.map((action, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2 border-b hair last:border-b-0"
              >
                <span className="font-mono tabular-nums text-[11px] text-[var(--text-dim)] w-12 shrink-0 mt-0.5">
                  t={action.time}s
                </span>
                <span className="text-[12.5px] text-white/85 leading-snug whitespace-pre-wrap">
                  {renderActionDetails(action)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-center text-[13px] text-[var(--text-mute)] py-8">
              No actions were logged for this session.
            </p>
          )}
        </div>
      </Panel>

      {/* ── Footer actions (print-hidden ones already in header) ── */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:justify-between mt-7"
        data-print-hide
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard/scenarios")}
          className="cta-secondary h-10 px-4 rounded-md text-[13px] font-medium inline-flex items-center justify-center gap-2"
        >
          <Icons.Refresh className="w-3.5 h-3.5" />
          Try another scenario
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="cta-primary h-10 px-4 rounded-md text-[13.5px] font-semibold inline-flex items-center justify-center gap-2"
        >
          <Icons.Dashboard className="w-3.5 h-3.5" />
          Back to dashboard
        </button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────
function FeedbackList({
  title,
  color,
  icon,
  items,
}: {
  title: string;
  color: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <div>
      <h4
        className="text-[12.5px] font-semibold mb-2 flex items-center gap-2"
        style={{ color }}
      >
        {icon}
        {title}
      </h4>
      <ul className="space-y-1.5 text-[12.5px] text-white/85 leading-relaxed">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span
              className="w-1 h-1 rounded-full mt-2 shrink-0"
              style={{ background: color }}
            />
            <span className="flex-1">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ObjectiveList({
  title,
  color,
  icon,
  items,
  emptyLabel,
}: {
  title: string;
  color: string;
  icon: React.ReactNode;
  items: string[];
  emptyLabel?: string;
}) {
  return (
    <div>
      <h4
        className="text-[12.5px] font-semibold mb-2 flex items-center gap-2"
        style={{ color }}
      >
        {icon}
        {title}
      </h4>
      <ul className="space-y-1.5 text-[12.5px] text-[var(--text-mute)] leading-relaxed">
        {items.length === 0 && emptyLabel && (
          <li className="text-[var(--text-dim)] italic">{emptyLabel}</li>
        )}
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span
              className="w-1 h-1 rounded-full mt-2 shrink-0"
              style={{ background: color }}
            />
            <span className="flex-1">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
