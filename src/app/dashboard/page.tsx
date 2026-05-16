"use client";

// SimuPro Dashboard — Mission Board variation.
// Preserves all the original data hooks (sessions, scenarios, profile,
// session_insights for average score) and just rearranges into the new
// dense terminal-board layout.

import * as React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  useCollection,
  useSupabase,
  useMemoSupabase,
  useUser,
  useDashboardProfile,
} from "@/supabase";
import type {
  Scenario,
  SimulationSession,
  Insight,
} from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAppTimestamp } from "@/lib/date-utils";
import { countLearnerBrowseableScenarios } from "@/lib/scenario-catalog-visibility";
import { isTesterOrAdminUser } from "@/lib/user-permissions";
import { Panel, Stat, DiffPill } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

// ── Helpers ────────────────────────────────────────────────────────────
function clockUtc() {
  const d = new Date();
  return `${d.toUTCString().slice(17, 25)} UTC`;
}

// 28-day intensity stub. Real implementation would derive from session
// timestamps grouped by UTC day — kept inline for now to ship.
function buildStreakHeatmap(
  sessions: SimulationSession[] | null | undefined,
  days = 28,
): number[] {
  const counts = new Array(days).fill(0) as number[];
  if (!sessions?.length) return counts;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const s of sessions) {
    if (s.status !== "completed" && s.status !== "failed") continue;
    const t = new Date(s.startTime as unknown as string | number | Date).getTime();
    if (!Number.isFinite(t)) continue;
    const sessionDayStart = new Date(
      new Date(t).getFullYear(),
      new Date(t).getMonth(),
      new Date(t).getDate(),
    ).getTime();
    const offsetDays = Math.floor((todayStart - sessionDayStart) / dayMs);
    if (offsetDays < 0 || offsetDays >= days) continue;
    const idx = days - 1 - offsetDays;
    counts[idx] += 1;
  }

  return counts.map((c) => (c === 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : 3));
}

// ── Page ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user: authUser } = useUser();
  const client = useSupabase();
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [isLoadingAverageScore, setIsLoadingAverageScore] = useState(true);

  const scenariosSpec = useMemoSupabase(
    () => (client ? ({ table: "scenarios" as const, live: false } as const) : null),
    [client],
  );
  const { data: scenarios, isLoading: isLoadingScenarios } =
    useCollection<Scenario>(scenariosSpec);

  const { data: userData, isLoading: isUserDataLoading } = useDashboardProfile();

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
  const { data: allSessions, isLoading: isLoadingSessions } =
    useCollection<SimulationSession>(sessionsSpec);

  // Average score — same logic as the original dashboard
  useEffect(() => {
    const run = async () => {
      if (!client || !authUser || !allSessions) {
        if (!isLoadingSessions) setIsLoadingAverageScore(false);
        return;
      }
      setIsLoadingAverageScore(true);
      try {
        const completedIds = allSessions
          .filter((s) => s.status === "completed")
          .map((s) => s.id);
        if (completedIds.length === 0) {
          setAverageScore(0);
          return;
        }
        const { data: insightRows } = await client
          .from("session_insights")
          .select("session_id, assessment_score, treatment_score")
          .in("session_id", completedIds);

        const picked = new Map<string, Insight>();
        for (const row of insightRows ?? []) {
          const sid = String((row as { session_id?: string }).session_id ?? "");
          if (!sid || picked.has(sid)) continue;
          picked.set(sid, {
            id: "x",
            assessmentScore: Number((row as { assessment_score?: number }).assessment_score),
            treatmentScore: Number((row as { treatment_score?: number }).treatment_score),
            aiFeedback: "",
            reasoning: "",
          });
        }

        let total = 0;
        let count = 0;
        for (const ins of picked.values()) {
          if (ins.assessmentScore != null && ins.treatmentScore != null) {
            total += (ins.assessmentScore + ins.treatmentScore) / 2;
            count++;
          }
        }
        setAverageScore(count > 0 ? Math.round(total / count) : 0);
      } catch (err) {
        console.error("Error fetching insights for average score:", err);
        setAverageScore(null);
      } finally {
        setIsLoadingAverageScore(false);
      }
    };
    void run();
  }, [client, authUser, allSessions, isLoadingSessions]);

  const isStaff = Boolean(userData && isTesterOrAdminUser(userData));

  const availableScenarioCount = useMemo(() => {
    if (!scenarios) return 0;
    return countLearnerBrowseableScenarios(scenarios, isStaff);
  }, [scenarios, isStaff]);

  const recentSessions = (allSessions ?? []).slice(0, 5);
  const completedCount = (allSessions ?? []).filter(
    (s) => s.status === "completed" || s.status === "failed",
  ).length;

  const streakDays = userData?.currentStreak ?? 0;
  const longestStreak = userData?.longestStreak ?? 0;

  const heatmap = useMemo(
    () => buildStreakHeatmap(allSessions),
    [allSessions],
  );

  // Scenario picks — first 5 published, prioritized for the queue
  const queue = useMemo(() => {
    const all = (scenarios ?? [])
      .filter((s) => s.status === "published" && s.id !== "welcome-tutorial");
    return all.slice(0, 5);
  }, [scenarios]);

  const isLoading = isLoadingScenarios || isLoadingSessions || isUserDataLoading;

  // ── Loading skeleton ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-7">
        <Skeleton className="h-6 w-48 mb-3 bg-white/5" />
        <Skeleton className="h-8 w-64 mb-7 bg-white/5" />
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-[1.4fr_1fr] gap-5">
          <Skeleton className="h-96 rounded-xl bg-white/5" />
          <Skeleton className="h-96 rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  // ── Page ─────────────────────────────────────────────────────────────
  return (
    <div className="p-7">
      {/* Terminal-style top strip */}
      <div className="flex items-center gap-3 mb-4 font-mono text-[11px] text-[var(--text-mute)]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
        <span className="uppercase tracking-[0.16em]">
          // session {(authUser?.id ?? "----").slice(0, 4)} · idle · ready
        </span>
        <span
          className="flex-1 h-px"
          style={{
            background:
              "linear-gradient(to right, var(--border-soft), transparent)",
          }}
        />
        <ClientClock />
      </div>

      <h1 className="font-display font-bold text-white text-[28px] leading-none mb-1">
        Mission board
      </h1>
      <p className="text-[13px] text-[var(--text-mute)] mb-7">
        Your training queue, weak signal report, and live system status.
      </p>

      {/* ── Top 3 metric panels ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Streak heatmap */}
        <div className="app-panel p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1">
                // STREAK · DAYS
              </div>
              <div className="font-display font-bold text-[44px] text-white leading-none">
                {streakDays}
                <span className="text-[20px] text-[var(--text-mute)]">
                  /{longestStreak || streakDays}
                </span>
              </div>
            </div>
            <Icons.Flame className="w-5 h-5 text-[var(--orange-soft)]" />
          </div>
          <div className="grid grid-cols-7 gap-1.5 mt-3">
            {heatmap.map((intensity, i) => (
              <div
                key={i}
                className="h-3 rounded-sm"
                style={{
                  background:
                    intensity === 0
                      ? "rgba(255,255,255,0.04)"
                      : intensity === 1
                      ? "rgba(255,122,24,0.20)"
                      : intensity === 2
                      ? "rgba(255,122,24,0.50)"
                      : "rgba(255,122,24,0.90)",
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[9.5px] font-mono text-[var(--text-dim)] mt-2">
            <span>4 wks ago</span>
            <span>today</span>
          </div>
        </div>

        {/* Avg score sparkline */}
        <div className="app-panel p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1">
                // AVG SCORE
              </div>
              <div className="font-display font-bold text-[44px] text-white leading-none">
                {isLoadingAverageScore ? (
                  <Skeleton className="h-12 w-20 bg-white/5" />
                ) : averageScore == null ? (
                  <span className="text-[var(--text-mute)] text-[22px]">N/A</span>
                ) : (
                  <>
                    {averageScore}
                    <span className="text-[20px] text-[var(--text-mute)]">%</span>
                  </>
                )}
              </div>
            </div>
            <span className="tag tag-emerald">{completedCount} runs</span>
          </div>
          <svg
            viewBox="0 0 240 80"
            width="100%"
            height="80"
            className="mt-2"
            preserveAspectRatio="none"
          >
            {[20, 40, 60].map((y) => (
              <line key={y} x1="0" x2="240" y1={y} y2={y} stroke="rgba(255,255,255,0.04)" />
            ))}
            <path
              d="M 0 50 L 24 45 L 48 52 L 72 38 L 96 42 L 120 32 L 144 36 L 168 28 L 192 30 L 216 18 L 240 22"
              stroke="var(--cyan-electric)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Available scenarios */}
        <div className="app-panel p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1">
                // SCENARIOS · AVAILABLE
              </div>
              <div className="font-display font-bold text-[44px] text-white leading-none">
                {availableScenarioCount}
              </div>
            </div>
            <Icons.Hospital className="w-5 h-5 text-[var(--cyan-soft)]" />
          </div>
          <div className="text-[12px] text-[var(--text-mute)] mt-2">
            {completedCount === 0 ? "Start your first scenario below." : "Ready to run."}
          </div>
          <Link
            href="/dashboard/scenarios"
            className="cta-secondary mt-4 inline-flex h-9 px-3 items-center justify-center w-full rounded-md text-[12.5px] font-medium gap-1.5"
          >
            Browse library
            <Icons.Arrow className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        {/* Training queue */}
        <Panel
          title="Training queue"
          sub="Curated from your recent activity"
          action={
            <Link
              href="/dashboard/scenarios"
              className="text-[12.5px] text-[var(--text-mute)] hover:text-white font-medium inline-flex items-center gap-1"
            >
              View all <Icons.Arrow className="w-3 h-3" />
            </Link>
          }
        >
          <div className="px-2 py-1">
            {queue.length === 0 ? (
              <div className="px-3 py-8 text-center text-[13px] text-[var(--text-mute)]">
                No published scenarios yet.
              </div>
            ) : (
              queue.map((q, i) => {
                const isFirst = i === 0;
                return (
                  <div
                    key={q.id}
                    className="flex items-center gap-4 px-3 py-3 border-b hair last:border-b-0"
                    style={{
                      background: isFirst ? "rgba(255,122,24,0.04)" : undefined,
                    }}
                  >
                    <span
                      className="w-1 h-9 rounded-full shrink-0"
                      style={{ background: isFirst ? "var(--orange)" : "transparent" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-medium text-white truncate">
                          {q.title}
                        </span>
                        {isFirst && <span className="tag tag-orange">PICK</span>}
                        {q.tags?.[0] && <span className="tag">{q.tags[0]}</span>}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-mute)] font-mono mt-0.5 truncate">
                        {q.patientProfile}
                      </div>
                    </div>
                    {q.difficulty && <DiffPill level={q.difficulty as never} />}
                    <Link
                      href={`/dashboard/scenarios/${q.id}`}
                      className="cta-secondary h-8 px-3 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5"
                    >
                      Run <Icons.Arrow className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        {/* Side rail */}
        <div className="space-y-5">
          {/* Recent runs */}
          <Panel
            title="Recent runs"
            sub={recentSessions.length === 0 ? "Nothing yet" : `Last ${recentSessions.length}`}
          >
            <div className="px-2 py-1">
              {recentSessions.length === 0 ? (
                <div className="px-3 py-6 text-center text-[12.5px] text-[var(--text-mute)]">
                  Run a scenario to see it here.
                </div>
              ) : (
                recentSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2.5 border-b hair last:border-b-0"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{
                        background:
                          s.status === "completed"
                            ? "var(--success)"
                            : s.status === "failed"
                            ? "var(--danger)"
                            : "var(--warn)",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] text-white truncate font-medium">
                        {s.scenarioTitle}
                      </div>
                      <div className="text-[10.5px] text-[var(--text-dim)] font-mono mt-0.5">
                        {formatAppTimestamp(s.startTime)} · {s.status}
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/scenarios/${s.scenarioId}/report?sessionId=${s.id}`}
                      className="cta-ghost h-7 w-7 rounded-md inline-flex items-center justify-center"
                      aria-label="View report"
                    >
                      <Icons.Arrow className="w-4 h-4" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </Panel>

          {/* System status (static) */}
          <Panel title="System">
            <div className="px-5 py-3 space-y-2 text-[12px] font-mono">
              {[
                ["Patient AI", "operational", "ok"],
                ["Physiology engine", `${availableScenarioCount} scenarios`, "ok"],
                ["ECG renderer", "4-lead · 12-lead", "ok"],
                ["Replay timeline", "beta", "beta"],
              ].map(([label, status, kind]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[var(--text-mute)]">{label}</span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: kind === "beta" ? "var(--warn)" : "var(--success)",
                      }}
                    />
                    <span className={kind === "beta" ? "text-amber-300" : "text-emerald-300"}>
                      {status}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// Client-only clock to avoid hydration mismatch
function ClientClock() {
  const [t, setT] = React.useState<string>("");
  React.useEffect(() => {
    setT(clockUtc());
    const id = window.setInterval(() => setT(clockUtc()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span>{t}</span>;
}
