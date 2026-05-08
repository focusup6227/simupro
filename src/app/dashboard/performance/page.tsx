"use client"

import { useCollection, useSupabase, useUser, useMemoSupabase } from "@/supabase";
import type { SimulationSession, Insight, Scenario, RhythmQuizAttempt } from "@/lib/types";
import { RhythmPerformanceSection } from "@/components/rhythm-performance-section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart, FileText, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart as ReBarChart } from 'recharts';
import { format } from "date-fns";

type CombinedData = {
    session: SimulationSession;
    insight: Insight;
    scenario: Scenario;
    averageScore: number;
    date: Date;
}

function sessionStartAsDate(s: SimulationSession): Date {
  const st = s.startTime as unknown;
  if (st instanceof Date) return st;
  return new Date(st as string | number);
}

function PerformanceDashboardSkeleton() {
    return (
        <div className="space-y-8">
            <div>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
            </div>
             <div className="grid gap-6 md:grid-cols-3">
                <Card><CardHeader><Skeleton className="h-4 w-24 mb-2" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-4 w-24 mb-2" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-4 w-24 mb-2" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                 <Card>
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                </Card>
                 <Card>
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-48 w-full" /></CardContent>
            </Card>
        </div>
    )
}

export default function PerformancePage() {
  const { user: authUser } = useUser();
  const client = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [combinedData, setCombinedData] = useState<CombinedData[]>([]);

  const sessionsSpec = useMemoSupabase(
    () => authUser && client
      ? {
          table: 'simulation_sessions' as const,
          eq: { user_id: authUser.id },
          order: { column: 'start_time', ascending: false },
        }
      : null,
    [authUser, client]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<SimulationSession>(sessionsSpec);

  const scenariosSpec = useMemoSupabase(
    () =>
      client ? ({ table: 'scenarios' as const, live: false } as const) : null,
    [client]
  );
  const { data: scenarios, isLoading: isLoadingScenarios } = useCollection<Scenario>(scenariosSpec);

  const rhythmAttemptsSpec = useMemoSupabase(
    () =>
      authUser && client
        ? ({
            table: 'rhythm_quiz_attempts' as const,
            eq: { user_id: authUser.id },
            order: { column: 'created_at', ascending: false },
            live: false,
          } as const)
        : null,
    [authUser, client],
  );
  const { data: rhythmAttempts } = useCollection<RhythmQuizAttempt>(rhythmAttemptsSpec);

  useEffect(() => {
    if (isLoadingSessions || isLoadingScenarios) return;

    const fetchData = async () => {
        if (!client || !authUser || !sessions || !scenarios) {
            setIsLoading(false);
            return;
        };

        const scenarioMap = new Map(scenarios.map(s => [s.id, s]));

        const completedSessions = sessions.filter(session => session.status === 'completed');
        const ids = completedSessions.map(s => s.id);
        if (ids.length === 0) {
          setCombinedData([]);
          setIsLoading(false);
          return;
        }

        const { data: insightRows } = await client
          .from('session_insights')
          .select('session_id, assessment_score, treatment_score')
          .in('session_id', ids);

        const firstBySession = new Map<string, Insight>();
        for (const row of insightRows ?? []) {
          const sid = String((row as { session_id?: string }).session_id ?? '');
          if (!sid || firstBySession.has(sid)) continue;
          firstBySession.set(sid, {
            id: 'x',
            assessmentScore: Number((row as { assessment_score?: number }).assessment_score),
            treatmentScore: Number((row as { treatment_score?: number }).treatment_score),
            aiFeedback: '',
            reasoning: '',
          });
        }

        const merged: CombinedData[] = [];
        for (const session of completedSessions) {
          const insight = firstBySession.get(session.id);
          const scenario = scenarioMap.get(session.scenarioId);
          if (!insight || !scenario) continue;
          merged.push({
            session,
            insight,
            scenario,
            averageScore: Math.round((insight.assessmentScore + insight.treatmentScore) / 2),
            date: sessionStartAsDate(session),
          });
        }

        setCombinedData(merged.sort((a, b) => a.date.getTime() - b.date.getTime()));
        setIsLoading(false);
    };

    void fetchData();

  }, [isLoadingSessions, isLoadingScenarios, client, authUser, sessions, scenarios]);

  const summaryStats = useMemo(() => {
    if (combinedData.length === 0) {
      return { total: 0, average: 0, best: 0 };
    }
    const total = combinedData.length;
    const average = Math.round(combinedData.reduce((acc, d) => acc + d.averageScore, 0) / total);
    const best = Math.max(...combinedData.map(d => d.averageScore));
    return { total, average, best };
  }, [combinedData]);

  const byDifficulty = useMemo(() => {
    const difficulties: { [key: string]: { scores: number[], count: number } } = {
        Beginner: { scores: [], count: 0 },
        Intermediate: { scores: [], count: 0 },
        Advanced: { scores: [], count: 0 },
    };

    combinedData.forEach(data => {
        const diff = data.scenario.difficulty;
        if (difficulties[diff]) {
            difficulties[diff].scores.push(data.averageScore);
            difficulties[diff].count++;
        }
    });

    return Object.entries(difficulties).map(([name, data]) => ({
        name,
        averageScore: data.count > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.count) : 0,
    }));
  }, [combinedData]);


  if (isLoading) {
    return <PerformanceDashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
        <p className="text-muted-foreground">
          Analyze your performance across all completed simulations.
        </p>
      </div>

       <div className="grid gap-6 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Scenarios</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summaryStats.total}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summaryStats.average}%</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Best Score</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summaryStats.best}%</div>
                </CardContent>
            </Card>
        </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Score Trend</CardTitle>
                <CardDescription>Your average score over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={combinedData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(d) => format(d, 'MMM d')} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} labelFormatter={(d) => format(d as Date, 'PPP')}/>
                        <Line type="monotone" dataKey="averageScore" stroke="hsl(var(--primary))" strokeWidth={2} name="Score" unit="%" />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Performance by Difficulty</CardTitle>
                <CardDescription>Your average score for each difficulty level.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={byDifficulty} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} cursor={{fill: 'hsl(var(--muted))'}}/>
                        <Bar dataKey="averageScore" fill="hsl(var(--primary))" name="Average Score" unit="%" />
                    </ReBarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>

      <RhythmPerformanceSection attempts={rhythmAttempts ?? []} />

      <Card>
        <CardHeader>
          <CardTitle>Detailed Simulation History</CardTitle>
          <CardDescription>A log of all your completed scenarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Scenario</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    No completed simulations found. Complete a scenario to see your results!
                  </TableCell>
                </TableRow>
              )}
               {combinedData.map(({session, averageScore, scenario}) => (
                <TableRow key={session.id}>
                    <TableCell>{format(sessionStartAsDate(session), 'PP')}</TableCell>
                    <TableCell className="font-medium">{session.scenarioTitle}</TableCell>
                    <TableCell><Badge variant="outline">{scenario.difficulty}</Badge></TableCell>
                    <TableCell>{averageScore}%</TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/scenarios/${session.scenarioId}/report?sessionId=${session.id}`}>
                                View Report <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </TableCell>
                </TableRow>
               ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
