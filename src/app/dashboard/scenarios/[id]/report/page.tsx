
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { processSimulationResults } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, Home, CheckCircle, XCircle, AlertTriangle, Hospital, RefreshCw, ListOrdered, Loader, Star, BookOpen, Target, Dumbbell, Printer, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  useUser,
  useSupabase,
  useDoc,
  useMemoSupabase,
  useCollection,
} from "@/supabase";
import type { Scenario, SimulationSession, Insight, User, UserRole, CertificationActions, UserAction, ProtocolDeviation, ProtocolWin } from "@/lib/types";
import type { Json } from "@/lib/supabase/database.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DEVIATION_KIND_LABEL: Record<ProtocolDeviation['kind'], string> = {
  scope: 'Scope Violation',
  dosage: 'Dosage Error',
  indication: 'Indication Error',
  contraindication: 'Contraindication',
  other: 'Other',
};


export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { toast } = useToast();
  const { user: authUser } = useUser();
  const client = useSupabase();

  const scenarioId = (params?.id as string) || '';
  const sessionId = searchParams?.get('sessionId') ?? null;
  const userIdFromQuery = searchParams?.get('userId') ?? null;

  const [isProcessing, setIsProcessing] = useState(false);

  const reportForUserId = userIdFromQuery || authUser?.id;

  const sessionSpec = useMemoSupabase(
    () =>
      client && reportForUserId && sessionId
        ? ({
            table: 'simulation_sessions',
            eq: { user_id: reportForUserId, id: sessionId },
          } as const)
        : null,
    [client, reportForUserId, sessionId]
  );
  const { data: sessionRows, isLoading: isLoadingSession } = useCollection<SimulationSession>(sessionSpec);
  const session = sessionRows?.[0];

  const scenarioSpec = useMemoSupabase(
    () =>
      client && scenarioId
        ? ({ table: 'scenarios', id: scenarioId, live: false } as const)
        : null,
    [client, scenarioId]
  );
  const { data: scenario, isLoading: isLoadingScenario } = useDoc<Scenario>(scenarioSpec);

  const userSpec = useMemoSupabase(
    () =>
      client && reportForUserId
        ? ({ table: 'profiles', id: reportForUserId } as const)
        : null,
    [client, reportForUserId]
  );
  const { data: user, isLoading: isLoadingUser } = useDoc<User>(userSpec);

  const insightsSpec = useMemoSupabase(
    () =>
      client && sessionId
        ? ({
            table: 'session_insights',
            eq: { session_id: sessionId },
          } as const)
        : null,
    [client, sessionId]
  );
  const { data: insights, isLoading: isLoadingInsights, error: insightError } = useCollection<Insight>(insightsSpec);
  const insight = insights?.find((i) => i.id === 'ai_feedback') ?? insights?.[0];

  const simulationFailed = session?.status === 'failed';

  const userRoleForSession = useMemo(() => {
    if (session?.userRole) return session.userRole;
    if (user?.role === 'tester') return user.testRole || 'emt';
    return user?.role;
  }, [session, user]);

  const handleProcessResults = useCallback(async () => {
    if (!session || !scenario || !user || !reportForUserId || !sessionId || !client) return;

    setIsProcessing(true);
    toast({ title: 'Analyzing Performance...', description: 'Please wait while the AI grades your simulation.' });

    try {
      const insightData = await processSimulationResults({
        sessionId,
        scenarioId,
      });

      const { error: upsertError } = await client.from('session_insights').upsert(
        {
          session_id: sessionId,
          id: 'ai_feedback',
          assessment_score: insightData.assessmentScore,
          treatment_score: insightData.treatmentScore,
          ai_feedback: insightData.aiFeedback,
          reasoning: insightData.reasoning,
          premium_feedback: insightData.premiumFeedback ?? null,
          protocol_deviations: (insightData.protocolDeviations ?? []) as unknown as Json,
          protocol_wins: (insightData.protocolWins ?? []) as unknown as Json,
        },
        { onConflict: 'session_id,id' }
      );
      if (upsertError) throw upsertError;

      if (scenario.id === 'welcome-tutorial') {
        const { error: profileErr } = await client
          .from('profiles')
          .update({ has_completed_tutorial: true })
          .eq('id', reportForUserId);
        if (profileErr) console.error(profileErr);
      }

      toast({ title: 'Analysis Complete!', description: 'Your performance report is ready.' });
    } catch (err: unknown) {
      console.error('Error processing simulation results:', err);
      toast({
        variant: 'destructive',
        title: 'Error Generating Report',
        description: err instanceof Error ? err.message : 'Could not process your simulation data.',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    session,
    scenario,
    user,
    reportForUserId,
    sessionId,
    scenarioId,
    toast,
    client,
  ]);

  useEffect(() => {
    const isDataLoaded = !isLoadingSession && !isLoadingScenario && !isLoadingUser && !isLoadingInsights;

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

  const chartData = [
    { name: "Assessment", value: insight?.assessmentScore ?? 0 },
    { name: "Treatment", value: insight?.treatmentScore ?? 0 },
  ];

  const chartConfig = {
    value: { label: "Score", color: "hsl(var(--chart-1))" },
  };

  const relevantMandatoryActions = useMemo(() => {
    if (!scenario || !userRoleForSession) return [];
    const role =
      userRoleForSession === 'admin' || userRoleForSession === 'student' || userRoleForSession === 'tester'
        ? 'emt'
        : userRoleForSession;
    return scenario.mandatoryActions[role as keyof CertificationActions] || [];
  }, [scenario, userRoleForSession]);

  const relevantSuggestedActions = useMemo(() => {
     if (!scenario || !userRoleForSession) return [];
    const role =
      userRoleForSession === 'admin' || userRoleForSession === 'student' || userRoleForSession === 'tester'
        ? 'emt'
        : userRoleForSession;
    return scenario.suggestedActions[role as keyof CertificationActions] || [];
  }, [scenario, userRoleForSession]);

  const isLoadingInitialData = isLoadingSession || isLoadingScenario || isLoadingUser;

  if (!sessionId || !reportForUserId) {
    return (
      <div className="p-8 text-center">
        Missing session or user. Open this report from your dashboard history.
      </div>
    );
  }

  if (isLoadingInitialData) {
      return (
          <div className="max-w-4xl mx-auto space-y-8 p-8">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <div className="grid md:grid-cols-3 gap-6">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-64 w-full" />
              </div>
              <Skeleton className="h-40 w-full" />
          </div>
      );
  }

  if (isProcessing) {
     return (
        <div className="max-w-4xl mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
            <Loader className="h-16 w-16 animate-spin text-primary mb-6" />
            <h2 className="text-2xl font-bold tracking-tight mb-2">Analyzing Performance...</h2>
            <p className="text-muted-foreground text-center">
                The AI is grading your simulation. Please wait a moment, and do not navigate away from this page.
            </p>
        </div>
    );
  }

  if ((!isLoadingSession || !isLoadingScenario) && (!session || !scenario)) {
    return <div className="p-8 text-center">Could not load report data. Please try again.</div>;
  }

  const renderActionDetails = (action: UserAction) => {
    if (action.assessment !== 'None') {
      return `Assessment: ${action.assessment}`;
    }
    if (action.treatments.length > 0) {
      return `Treatments: ${action.treatments.join(', ')}`;
    }
    if (action.destination) {
      return `Destination: ${action.destination} (Mode: ${action.transportMode})`;
    }
    return 'No specific details.';
  };

  const isLoadingInsightsData = isLoadingInsights && !insight;

  const protocolWins: ProtocolWin[] = Array.isArray(insight?.protocolWins)
    ? (insight!.protocolWins as ProtocolWin[])
    : [];
  const protocolDeviations: ProtocolDeviation[] = Array.isArray(insight?.protocolDeviations)
    ? (insight!.protocolDeviations as ProtocolDeviation[])
    : [];
  const showProtocolAudit = protocolWins.length > 0 || protocolDeviations.length > 0;

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Simulation Report</h1>
          <p className="text-muted-foreground capitalize">Scenario: {scenario?.title} (as {userRoleForSession})</p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.print()}
          data-print-hide
          aria-label="Print report"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

       {simulationFailed && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Simulation Failed</AlertTitle>
          <AlertDescription>
            The patient has died. Review the scenario objectives and your actions to understand what went wrong.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Assessment</CardTitle>
            <CardDescription>Accuracy Score</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingInsightsData ? <Skeleton className="h-10 w-24" /> : <p className="text-4xl font-bold">{insight?.assessmentScore ?? 0}%</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Treatment</CardTitle>
            <CardDescription>Appropriateness Score</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoadingInsightsData ? <Skeleton className="h-10 w-24" /> : <p className="text-4xl font-bold">{insight?.treatmentScore ?? 0}%</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Time Elapsed</CardTitle>
            <CardDescription>Total Simulation Time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{session?.timeElapsed || 0}s</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingInsightsData ? <Skeleton className="h-[250px] w-full" /> : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full min-w-0">
                <BarChart accessibilityLayer data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={8} />
                </BarChart>
                </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Scenario Objectives</CardTitle>
                <CardDescription>Key actions and failures for your role: <span className="capitalize font-bold">{userRoleForSession}</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><Hospital className="text-blue-500"/>Appropriate Destination</h4>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-bold">{scenario?.destination}:</span> {scenario?.destinationRationale}
                    </p>
                </div>
                <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><CheckCircle className="text-green-500"/>Mandatory Actions</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {relevantMandatoryActions.map((action, i) => <li key={i}>{action}</li>)}
                         {relevantMandatoryActions.length === 0 && <li>No mandatory actions for your role.</li>}
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><AlertTriangle className="text-yellow-500"/>Suggested Actions</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {relevantSuggestedActions.map((action, i) => <li key={i}>{action}</li>)}
                         {relevantSuggestedActions.length === 0 && <li>No suggested actions for your role.</li>}
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><XCircle className="text-red-500"/>Critical Failures</h4>
                     <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {scenario?.criticalFailures.map((failure, i) => <li key={i}>{failure}</li>)}
                    </ul>
                </div>
            </CardContent>
        </Card>
      </div>


      {showProtocolAudit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Protocol Audit (NASEMSO)
            </CardTitle>
            <CardDescription>
              Three-Point Check (ID, dosage, indication) against the protocol source of truth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {protocolWins.length > 0 && (
              <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/30">
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-green-900 dark:text-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Protocol-aligned actions
                </h4>
                <ul className="space-y-3">
                  {protocolWins.map((win, i) => (
                    <li key={`win-${i}`} className="text-sm">
                      <p className="font-medium text-foreground">
                        <span className="font-mono text-xs text-muted-foreground mr-2">
                          t={win.actionTime}s
                        </span>
                        {win.treatment}
                      </p>
                      {win.expected && (
                        <p className="text-sm text-muted-foreground">{win.expected}</p>
                      )}
                      {win.observed && win.observed !== win.expected && (
                        <p className="text-xs text-muted-foreground">{win.observed}</p>
                      )}
                      {win.reference && (
                        <p className="text-xs text-muted-foreground/80 font-mono">
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
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Protocol deviations
                </h4>
                <ul className="space-y-4">
                  {protocolDeviations.map((dev, i) => (
                    <li
                      key={`dev-${i}`}
                      className="rounded-md border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200">
                          {DEVIATION_KIND_LABEL[dev.kind] ?? 'Other'}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          t={dev.actionTime}s
                        </span>
                        <span className="text-sm font-medium text-foreground">{dev.treatment}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-semibold text-foreground">Expected:</span>{' '}
                          <span className="text-muted-foreground">{dev.expected}</span>
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">Observed:</span>{' '}
                          <span className="text-muted-foreground">{dev.observed}</span>
                        </p>
                        {dev.reference && (
                          <p className="text-xs text-muted-foreground/80 font-mono">
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
                <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-200">
                  No protocol deviations detected — protocol-aligned care.
                </p>
              )
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Feedback</CardTitle>
          <CardDescription>Personalized suggestions for improvement from our AI educator.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingInsightsData ? (
             <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
          ) : insight?.aiFeedback ? (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>Improvement Suggestions</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">
                {insight.aiFeedback}
              </AlertDescription>
            </Alert>
          ) : insightError ? (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Feedback</AlertTitle>
                <AlertDescription>
                    There was a problem loading the AI feedback. It might be a permission issue.
                    <pre className="mt-2 text-xs bg-muted p-2 rounded">{insightError.message}</pre>
                </AlertDescription>
            </Alert>
          ) : (
             <div className="text-center p-8">
                <p className="text-muted-foreground">Could not generate AI feedback for this session.</p>
                 {(!session?.status || session.status === 'in-progress') && (
                    <Button variant="secondary" className="mt-4" onClick={() => void handleProcessResults()} disabled={isProcessing}>
                        <RefreshCw className="mr-2"/>
                        Retry Analysis
                    </Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {insight?.premiumFeedback && (
        <Card className="border-yellow-300/60 dark:border-yellow-500/40">
          <div className="h-1 w-full bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-400" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              Premium Deep-Dive Coaching
            </CardTitle>
            <CardDescription>
              Structured analysis available because you ran a Premium scenario.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {insight.premiumFeedback.whatWentWell && insight.premiumFeedback.whatWentWell.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-semibold">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  What Went Well
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {insight.premiumFeedback.whatWentWell.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
            {insight.premiumFeedback.criticalIssues && insight.premiumFeedback.criticalIssues.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Critical Issues
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {insight.premiumFeedback.criticalIssues.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
            {insight.premiumFeedback.actionableTips && insight.premiumFeedback.actionableTips.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-semibold">
                  <Target className="h-4 w-4 text-yellow-500" />
                  Actionable Tips
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {insight.premiumFeedback.actionableTips.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
            {insight.premiumFeedback.protocolReferences && insight.premiumFeedback.protocolReferences.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-semibold">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  Protocol References
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {insight.premiumFeedback.protocolReferences.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
            {insight.premiumFeedback.drillSuggestions && insight.premiumFeedback.drillSuggestions.length > 0 && (
              <div className="md:col-span-2">
                <h4 className="mb-2 flex items-center gap-2 font-semibold">
                  <Dumbbell className="h-4 w-4 text-purple-500" />
                  Suggested Drills
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {insight.premiumFeedback.drillSuggestions.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

       <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListOrdered /> Action Log</CardTitle>
            <CardDescription>A detailed log of every action you took during the simulation.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingInsightsData ? (
                <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            ) : session?.actions && session.actions.length > 0 ? (
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Time</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {session.actions.map((action, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-mono">{action.time}s</TableCell>
                                <TableCell className="whitespace-pre-wrap">{renderActionDetails(action)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </div>
            ) : (
                <p className="text-muted-foreground text-center p-8">No actions were logged for this session.</p>
            )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-4" data-print-hide>
        <Button variant="outline" onClick={() => router.push('/dashboard/scenarios')}>
            <RefreshCw className="mr-2" /> Try Another Scenario
        </Button>
         <Button onClick={() => router.push('/dashboard')}>
            <Home className="mr-2" /> Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
