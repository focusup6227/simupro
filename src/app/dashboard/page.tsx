
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart, FileText, Flame, PlayCircle, Users, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCollection,
  useSupabase,
  useMemoSupabase,
  useUser,
  useDashboardProfile,
} from "@/supabase";
import type { Scenario, SimulationSession, Insight, User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatAppTimestamp } from '@/lib/date-utils';

export default function DashboardPage() {
  const { user: authUser } = useUser();
  const client = useSupabase();
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [isLoadingAverageScore, setIsLoadingAverageScore] = useState(true);

  const scenariosSpec = useMemoSupabase(
    () =>
      client ? ({ table: 'scenarios' as const, live: false } as const) : null,
    [client]
  );
  const { data: scenarios, isLoading: isLoadingScenarios } = useCollection<Scenario>(scenariosSpec);

  const { data: userData, isLoading: isUserDataLoading } = useDashboardProfile();

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
  const { data: allSessions, isLoading: isLoadingSessions } = useCollection<SimulationSession>(sessionsSpec);

  useEffect(() => {
    const fetchAndCalculateAverage = async () => {
      if (!client || !authUser || !allSessions) {
        if (!isLoadingSessions) setIsLoadingAverageScore(false);
        return;
      }

      setIsLoadingAverageScore(true);
      try {
        const completedIds = allSessions.filter(s => s.status === 'completed').map(s => s.id);
        if (completedIds.length === 0) {
          setAverageScore(0);
          return;
        }

        const { data: insightRows } = await client
          .from('session_insights')
          .select('session_id, assessment_score, treatment_score')
          .in('session_id', completedIds);

        const picked = new Map<string, Insight>();
        for (const row of insightRows ?? []) {
          const sid = String((row as { session_id?: string }).session_id ?? '');
          if (!sid || picked.has(sid)) continue;
          picked.set(sid, {
            id: 'x',
            assessmentScore: Number((row as { assessment_score?: number }).assessment_score),
            treatmentScore: Number((row as { treatment_score?: number }).treatment_score),
            aiFeedback: '',
            reasoning: '',
          });
        }

        let totalScore = 0;
        let count = 0;
        for (const ins of picked.values()) {
          if (ins.assessmentScore != null && ins.treatmentScore != null) {
            totalScore += (ins.assessmentScore + ins.treatmentScore) / 2;
            count++;
          }
        }

        setAverageScore(count > 0 ? Math.round(totalScore / count) : 0);
      } catch (error) {
        console.error("Error fetching insights for average score:", error);
        setAverageScore(null);
      } finally {
        setIsLoadingAverageScore(false);
      }
    };

    void fetchAndCalculateAverage();
  }, [client, authUser, allSessions, isLoadingSessions]);

  const recentSessions = allSessions?.slice(0, 5) || [];
  const completedSessionsCount = allSessions?.filter(s => s.status === 'completed' || s.status === 'failed').length ?? 0;

  const isLoading = isLoadingScenarios || isLoadingSessions || isUserDataLoading;

   if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-12 w-48" />
        </div>
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader><Skeleton className="h-4 w-24 mb-2" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-4 w-24 mb-2" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-4 w-24 mb-2" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-4 w-24 mb-2" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
                 <Table><TableHeader><TableRow><TableHead><Skeleton className="h-4 w-24" /></TableHead><TableHead><Skeleton className="h-4 w-12" /></TableHead><TableHead><Skeleton className="h-4 w-20" /></TableHead><TableHead className="text-right"><Skeleton className="h-4 w-16" /></TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell colSpan={4} className="h-24 text-center"><Skeleton className="h-4 w-full" /></TableCell></TableRow></TableBody></Table>
            </CardContent>
        </Card>
      </div>
    );
  }

  const showTutorialPrompt = !isUserDataLoading && userData && userData.hasCompletedTutorial === false;


  return (
    <div className="space-y-8">

      {showTutorialPrompt && (
        <Alert className="border-primary/50 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle className="text-lg font-semibold">Welcome to EMS Simu-Pro!</AlertTitle>
          <AlertDescription className="mt-2">
            Ready to get started? Launch our quick tutorial scenario to learn the basics of the simulation interface.
          </AlertDescription>
          <div className="mt-4">
              <Button asChild>
                  <Link href="/dashboard/scenarios/welcome-tutorial">Start Tutorial <ArrowRight className="ml-2"/></Link>
              </Button>
          </div>
        </Alert>
      )}


      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your training progress.
          </p>
        </div>
        <div className="flex gap-2">
            <Link href="/dashboard/scenarios">
            <Button size="lg">
                <PlayCircle className="mr-2" /> Start New Scenario
            </Button>
            </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Scenarios Completed
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-1/3" /> : (
                <>
                    <div className="text-2xl font-bold">{completedSessionsCount}</div>
                    <p className="text-xs text-muted-foreground">
                      {completedSessionsCount > 0 ? 'Good work!' : 'No history yet'}
                    </p>
                </>
             )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Score
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingAverageScore ? <Skeleton className="h-8 w-1/3" /> : (
                <>
                    <div className="text-2xl font-bold">{averageScore !== null ? `${averageScore}%` : 'N/A'}</div>
                    <p className="text-xs text-muted-foreground">
                    Across all completed simulations
                    </p>
                </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Training streak
            </CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-1/3" /> : (
                <>
                    <div className="text-2xl font-bold">{userData?.currentStreak ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Best {userData?.longestStreak ?? 0} · UTC calendar days
                    </p>
                </>
             )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Scenarios
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-1/3" /> : (
                <>
                    <div className="text-2xl font-bold">{scenarios?.length ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                    Ready to practice
                    </p>
                </>
             )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>A log of your recently completed scenarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scenario</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                   <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                          <Skeleton className="h-4 w-full" />
                      </TableCell>
                  </TableRow>
                )}
                {!isLoading && recentSessions.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                      No recent activity. Complete a scenario to get started!
                      </TableCell>
                  </TableRow>
                )}
                {!isLoading && recentSessions.map(session => (
                  <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.scenarioTitle}</TableCell>
                      <TableCell className="capitalize">{session.status}</TableCell>
                      <TableCell>{formatAppTimestamp(session.startTime)}</TableCell>
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
          </div>
           <div className="md:hidden space-y-4">
             {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4"><Skeleton className="h-20 w-full" /></Card>
             ))}
              {!isLoading && recentSessions.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                    No recent activity. Complete a scenario to get started!
                </div>
              )}
              {!isLoading && recentSessions.map(session => (
                <Card key={session.id} className="p-4">
                    <div className="flex flex-col space-y-2">
                       <p className="font-bold">{session.scenarioTitle}</p>
                       <div className="flex justify-between text-sm">
                           <span className="text-muted-foreground">Status:</span>
                           <span className="capitalize font-medium">{session.status}</span>
                       </div>
                       <div className="flex justify-between text-sm">
                           <span className="text-muted-foreground">Date:</span>
                           <span className="font-medium">{formatAppTimestamp(session.startTime)}</span>
                       </div>
                       <Button variant="outline" size="sm" asChild className="mt-2">
                           <Link href={`/dashboard/scenarios/${session.scenarioId}/report?sessionId=${session.id}`}>
                                View Report <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                       </Button>
                    </div>
                </Card>
              ))}
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
