
"use client";

import {
  useCollection,
  useSupabase,
  useMemoSupabase,
  useDoc,
} from "@/supabase";
import type { SimulationSession, Insight, User } from "@/lib/types";
import { insightRowToInsight } from "@/lib/db-mappers";
import type { Database } from "@/lib/supabase/database.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";

type InsightRow = Database["public"]["Tables"]["session_insights"]["Row"];

function formatSessionDate(timestamp: Date | string | undefined) {
  if (!timestamp) return "N/A";
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleDateString();
}

function SessionScore({ sessionId }: { sessionId: string }) {
  const client = useSupabase();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchInsight() {
      if (!client || !sessionId) {
        setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await client
          .from("session_insights")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data) setInsight(insightRowToInsight(data as InsightRow));
        else setInsight(null);
      } catch (error) {
        console.error("Error fetching insight:", error);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchInsight();
  }, [client, sessionId]);

  if (isLoading) {
    return <Skeleton className="h-4 w-12" />;
  }

  if (insight) {
    const averageScore = Math.round((insight.assessmentScore + insight.treatmentScore) / 2);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <span className="flex items-center gap-1">
              {isNaN(averageScore) ? "N/A" : `${averageScore}%`}
              <Info className="h-3 w-3 text-muted-foreground" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Assessment: {insight.assessmentScore}%</p>
            <p>Treatment: {insight.treatmentScore}%</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className="flex items-center gap-1">
            N/A <Info className="h-3 w-3 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Score not yet calculated.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function UserPerformancePage() {
  const params = useParams();
  const userId = (params?.userId as string) || '';
  const client = useSupabase();

  const userSpec = useMemoSupabase(
    () =>
      client && userId ? ({ table: "profiles", id: userId } as const) : null,
    [client, userId]
  );
  const { data: user, isLoading: isLoadingUser } = useDoc<User>(userSpec);

  const sessionsSpec = useMemoSupabase(
    () =>
      client && userId
        ? ({
            table: "simulation_sessions",
            eq: { user_id: userId },
            order: { column: "start_time" as const, ascending: false },
          } as const)
        : null,
    [client, userId]
  );
  const { data: sessions, isLoading: isLoadingSessions } =
    useCollection<SimulationSession>(sessionsSpec);

  const isLoading = isLoadingUser || isLoadingSessions;

  return (
    <div className="space-y-8">
      <div>
        {isLoadingUser ? (
          <>
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/3" />
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight">Performance History</h1>
            <p className="text-muted-foreground">
              Showing results for:{" "}
              <span className="font-medium">{user?.displayName || user?.email}</span>
            </p>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulation History</CardTitle>
          <CardDescription>A log of this user&apos;s completed scenarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Scenario</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading history...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && sessions?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-12"
                  >
                    This user has no simulation history.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                sessions?.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{formatSessionDate(session.startTime)}</TableCell>
                    <TableCell className="font-medium">{session.scenarioTitle}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          session.status === "completed"
                            ? "default"
                            : session.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className="capitalize"
                      >
                        {session.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {session.timeElapsed ? `${session.timeElapsed}s` : "N/A"}
                    </TableCell>
                    <TableCell>
                      {session.status === "completed" ? (
                        <SessionScore sessionId={session.id} />
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="flex items-center gap-1">
                                N/A{" "}
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Session not completed or failed.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.status === "completed" && (
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/dashboard/scenarios/${session.scenarioId}/report?sessionId=${session.id}&userId=${userId}`}
                          >
                            View Report <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      )}
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
