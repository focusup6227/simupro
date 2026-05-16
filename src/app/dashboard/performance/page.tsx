"use client";

// SimuPro Performance Analytics — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - useCollection<SimulationSession> + useCollection<Scenario>
//   - useCollection<RhythmQuizAttempt> for rhythm quiz section
//   - Fetch session_insights for completed session ids
//   - Build CombinedData: session × insight × scenario × averageScore × date
//   - Summary stats: total, average, best
//   - byDifficulty aggregation
//   - LineChart + BarChart via recharts
//   - RhythmPerformanceSection
//   - Detailed simulation history table

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useCollection,
  useSupabase,
  useUser,
  useMemoSupabase,
} from "@/supabase";
import type {
  SimulationSession,
  Insight,
  Scenario,
  RhythmQuizAttempt,
} from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart as ReBarChart,
} from "recharts";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, Stat, DiffPill } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

const RhythmPerformanceSection = dynamic(
  () =>
    import("@/components/rhythm-performance-section").then((m) => ({
      default: m.RhythmPerformanceSection,
    })),
  { loading: () => <Skeleton className="h-64 w-full bg-white/5" /> },
);

type CombinedData = {
  session: SimulationSession;
  insight: Insight;
  scenario: Scenario;
  averageScore: number;
  date: Date;
};

function sessionStartAsDate(s: SimulationSession): Date {
  const st = s.startTime as unknown;
  if (st instanceof Date) return st;
  return new Date(st as string | number);
}

export default function PerformancePage() {
  const { user: authUser } = useUser();
  const client = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [combinedData, setCombinedData] = useState<CombinedData[]>([]);

  const sessionsSpec = useMemoSupabase(
    () =>
      authUser && client
        ? {
            table: "simulation_sessions" as const,
            eq: { user_id: authUser.id },
            order: { column: "start_time", ascending: false },
          }
        : null,
    [authUser, client],
  );
  const { data: sessions, isLoading: isLoadingSessions } =
    useCollection<SimulationSession>(sessionsSpec);

  const scenariosSpec = useMemoSupabase(
    () => (client ? ({ table: "scenarios" as const, live: false } as const) : null),
    [client],
  );
  const { data: scenarios, isLoading: isLoadingScenarios } =
    useCollection<Scenario>(scenariosSpec);

  const rhythmAttemptsSpec = useMemoSupabase(
    () =>
      authUser && client
        ? ({
            table: "rhythm_quiz_attempts" as const,
            eq: { user_id: authUser.id },
            order: { column: "created_at", ascending: false },
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
      }
      const scenarioMap = new Map(scenarios.map((s) => [s.id, s]));
      const completed = sessions.filter((s) => s.status === "completed");
      const ids = completed.map((s) => s.id);
      if (ids.length === 0) {
        setCombinedData([]);
        setIsLoading(false);
        return;
      }
      const { data: insightRows } = await client
        .from("session_insights")
        .select("session_id, assessment_score, treatment_score")
        .in("session_id", ids);

      const firstBySession = new Map<string, Insight>();
      for (const row of insightRows ?? []) {
        const sid = String((row as { session_id?: string }).session_id ?? "");
        if (!sid || firstBySession.has(sid)) continue;
        firstBySession.set(sid, {
          id: "x",
          assessmentScore: Number((row as { assessment_score?: number }).assessment_score),
          treatmentScore: Number((row as { treatment_score?: number }).treatment_score),
          aiFeedback: "",
          reasoning: "",
        });
      }

      const merged: CombinedData[] = [];
      for (const session of completed) {
        const insight = firstBySession.get(session.id);
        const scenario = scenarioMap.get(session.scenarioId);
        if (!insight || !scenario) continue;
        merged.push({
          session,
          insight,
          scenario,
          averageScore: Math.round(
            (insight.assessmentScore + insight.treatmentScore) / 2,
          ),
          date: sessionStartAsDate(session),
        });
      }
      setCombinedData(merged.sort((a, b) => a.date.getTime() - b.date.getTime()));
      setIsLoading(false);
    };
    void fetchData();
  }, [isLoadingSessions, isLoadingScenarios, client, authUser, sessions, scenarios]);

  const summaryStats = useMemo(() => {
    if (combinedData.length === 0) return { total: 0, average: 0, best: 0 };
    const total = combinedData.length;
    const average = Math.round(
      combinedData.reduce((a, d) => a + d.averageScore, 0) / total,
    );
    const best = Math.max(...combinedData.map((d) => d.averageScore));
    return { total, average, best };
  }, [combinedData]);

  const byDifficulty = useMemo(() => {
    const diffs: { [k: string]: { scores: number[]; count: number } } = {
      Beginner: { scores: [], count: 0 },
      Intermediate: { scores: [], count: 0 },
      Advanced: { scores: [], count: 0 },
    };
    combinedData.forEach((d) => {
      const diff = d.scenario.difficulty;
      if (diffs[diff]) {
        diffs[diff].scores.push(d.averageScore);
        diffs[diff].count++;
      }
    });
    return Object.entries(diffs).map(([name, d]) => ({
      name,
      averageScore:
        d.count > 0
          ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.count)
          : 0,
    }));
  }, [combinedData]);

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-6 w-48 mb-3 bg-white/5" />
        <Skeleton className="h-9 w-80 mb-7 bg-white/5" />
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-5 mb-5">
          <Skeleton className="h-72 rounded-xl bg-white/5" />
          <Skeleton className="h-72 rounded-xl bg-white/5" />
        </div>
        <Skeleton className="h-64 rounded-xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
          // PERFORMANCE ANALYTICS · {summaryStats.total} RUNS
        </div>
        <h1 className="font-display font-bold text-[34px] text-white leading-none">
          Your trends.
        </h1>
        <p className="text-[13.5px] text-[var(--text-mute)] mt-2">
          Track score over time, performance by difficulty, and rhythm-quiz progress.
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <Stat
          label="Completed scenarios"
          value={summaryStats.total.toString()}
          sub="all time"
          accent="cyan"
          icon={<Icons.File />}
        />
        <Stat
          label="Average score"
          value={`${summaryStats.average}%`}
          sub="all completed runs"
          accent="orange"
          icon={<Icons.Chart />}
        />
        <Stat
          label="Best score"
          value={`${summaryStats.best}%`}
          sub="personal best"
          accent="amber"
          icon={<Icons.Crown />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Panel title="Score trend" sub="Your average score over time">
          <div className="px-2 pt-2 pb-4 h-72">
            {combinedData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[12.5px] text-[var(--text-mute)]">
                No completed simulations yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={280}>
                <LineChart
                  data={combinedData}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => format(d as Date, "MMM d")}
                    stroke="#8595c0"
                    fontSize={11}
                  />
                  <YAxis domain={[0, 100]} stroke="#8595c0" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "#0b1f44",
                      border: "1px solid #1c305e",
                      borderRadius: 8,
                      color: "#eaf0fb",
                      fontSize: 12,
                    }}
                    labelFormatter={(d) => format(d as Date, "PPP")}
                  />
                  <Line
                    type="monotone"
                    dataKey="averageScore"
                    stroke="var(--orange)"
                    strokeWidth={2}
                    dot={{ fill: "var(--orange)", r: 3 }}
                    name="Score"
                    unit="%"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="By difficulty" sub="Average score per tier">
          <div className="px-2 pt-2 pb-4 h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={280}>
              <ReBarChart
                data={byDifficulty}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#8595c0" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#8595c0" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#0b1f44",
                    border: "1px solid #1c305e",
                    borderRadius: 8,
                    color: "#eaf0fb",
                    fontSize: 12,
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar
                  dataKey="averageScore"
                  fill="var(--cyan-electric)"
                  radius={6}
                  name="Average score"
                  unit="%"
                />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Rhythm performance — uses your existing component, dark-mode compatible */}
      <Panel
        title="ECG trainer · rhythm performance"
        sub="From your rhythm quiz attempts"
        className="mb-5"
      >
        <div className="p-5">
          <RhythmPerformanceSection attempts={rhythmAttempts ?? []} />
        </div>
      </Panel>

      {/* History */}
      <Panel
        title="Simulation history"
        sub="Every completed scenario, sorted newest first"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-dim)] font-mono">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">Date</th>
                <th className="text-left font-medium px-2 py-2.5">Scenario</th>
                <th className="text-left font-medium px-2 py-2.5">Difficulty</th>
                <th className="text-left font-medium px-2 py-2.5">Score</th>
                <th className="text-right font-medium px-5 py-2.5">Report</th>
              </tr>
            </thead>
            <tbody>
              {combinedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center text-[13px] text-[var(--text-mute)] py-12"
                  >
                    No completed simulations yet. Run a scenario to see results here.
                  </td>
                </tr>
              ) : (
                [...combinedData]
                  .reverse() // newest first
                  .map(({ session, averageScore, scenario }) => (
                    <tr key={session.id} className="border-t hair">
                      <td className="px-5 py-3 font-mono text-[var(--text-mute)] tabular-nums">
                        {format(sessionStartAsDate(session), "PP")}
                      </td>
                      <td className="px-2 py-3 font-medium text-white">
                        {session.scenarioTitle}
                      </td>
                      <td className="px-2 py-3">
                        {scenario.difficulty && (
                          <DiffPill level={scenario.difficulty as never} />
                        )}
                      </td>
                      <td className="px-2 py-3 font-mono tabular-nums text-white">
                        {averageScore}%
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/dashboard/scenarios/${session.scenarioId}/report?sessionId=${session.id}`}
                          className="cta-ghost h-7 px-2.5 rounded-md text-[12px] inline-flex items-center gap-1"
                        >
                          View report
                          <Icons.Arrow className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
