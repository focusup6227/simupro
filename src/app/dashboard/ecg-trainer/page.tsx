"use client";

// SimuPro ECG Trainer — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - Premium / tester gating via isTesterOrAdminUser + isPremium
//   - 3 difficulty pools (beginner / intermediate / advanced)
//   - 7 family filters (sinus / atrial / junctional / av_block / paced / ventricular / arrest)
//   - pickQuestion logic: family-aware distractors (up to 2 same-family + 1+ other-family)
//   - LiveStrip rendering for leads II / III / aVF (matches scenario 4-lead monitor)
//   - Pause/resume with timed pause excluded from msToAnswer
//   - recordRhythmQuizAttempt with source='trainer'
//   - Per-family session stats + overall accuracy

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useDashboardProfile, useSupabase, useUser } from "@/supabase";
import { isTesterOrAdminUser } from "@/lib/user-permissions";
import { LiveStrip } from "@/components/ecg-monitor";
import {
  ALL_ECG_RHYTHM_KINDS,
  RHYTHM_FAMILY,
  RHYTHM_FAMILY_LABEL,
  RHYTHM_LABEL,
  RHYTHM_TEACHING_NOTE,
  type EcgRhythmFamily,
  type EcgRhythmKind,
} from "@/lib/ecg-rhythm";
import { deriveEcgScenarioContext } from "@/lib/ecg-scenario";
import { rhythmStripeWidthForContext } from "@/lib/ecg-waveform";
import { recordRhythmQuizAttempt } from "@/lib/rhythm-quiz-attempts";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";

type Difficulty = "beginner" | "intermediate" | "advanced";

const DIFFICULTY_POOLS: Record<Difficulty, EcgRhythmKind[]> = {
  beginner: [
    "sinus",
    "sinus_brady",
    "sinus_tach",
    "afib",
    "vfib",
    "asystole",
    "vt",
    "pulseless_vt",
    "pea",
  ],
  intermediate: [
    "sinus",
    "sinus_brady",
    "sinus_tach",
    "sinus_arrhythmia",
    "afib",
    "aflutter",
    "svt",
    "junctional",
    "junctional_tach",
    "av_block_1",
    "av_block_3",
    "vt",
    "vfib",
    "asystole",
    "pea",
    "idioventricular",
    "torsades",
  ],
  advanced: ALL_ECG_RHYTHM_KINDS.filter((k) => k !== "unknown"),
};

const FAMILIES: EcgRhythmFamily[] = [
  "sinus",
  "atrial",
  "junctional",
  "av_block",
  "paced",
  "ventricular",
  "arrest",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

function pickQuestion(pool: EcgRhythmKind[]): {
  rhythm: EcgRhythmKind;
  options: EcgRhythmKind[];
} {
  const eligible = pool.filter((k) => k !== "unknown");
  const rhythm = eligible[Math.floor(Math.random() * eligible.length)]!;
  const sameFamily = eligible.filter(
    (k) => k !== rhythm && RHYTHM_FAMILY[k] === RHYTHM_FAMILY[rhythm],
  );
  const otherFamily = eligible.filter(
    (k) => k !== rhythm && RHYTHM_FAMILY[k] !== RHYTHM_FAMILY[rhythm],
  );
  const distractors: EcgRhythmKind[] = [];
  while (distractors.length < 3) {
    const next =
      sameFamily.length > 0 && distractors.length < 2
        ? sameFamily.splice(Math.floor(Math.random() * sameFamily.length), 1)[0]
        : otherFamily.splice(Math.floor(Math.random() * otherFamily.length), 1)[0];
    if (!next) break;
    distractors.push(next);
  }
  return { rhythm, options: shuffle([rhythm, ...distractors]) };
}

interface SessionStat {
  correct: number;
  total: number;
}

interface QuestionTiming {
  questionStart: number;
  totalPausedMs: number;
  pauseStartedAt: number | null;
}

function thinkingMsElapsed(t: QuestionTiming): number {
  const now = Date.now();
  const activePause = t.pauseStartedAt ? now - t.pauseStartedAt : 0;
  return Math.max(0, now - t.questionStart - t.totalPausedMs - activePause);
}

export default function EcgTrainerPage() {
  const supabase = useSupabase();
  const { user: authUser } = useUser();
  const { data: userData, isLoading: profileLoading } = useDashboardProfile();

  const isAuthorized = useMemo(() => {
    if (!userData) return false;
    if (isTesterOrAdminUser(userData)) return true;
    return Boolean(userData.isPremium);
  }, [userData]);

  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [familyFilter, setFamilyFilter] = useState<Set<EcgRhythmFamily>>(new Set());
  const [question, setQuestion] = useState<ReturnType<typeof pickQuestion> | null>(null);
  const [verdict, setVerdict] = useState<{ correct: boolean; chosen: EcgRhythmKind } | null>(null);
  const [stats, setStats] = useState<SessionStat>({ correct: 0, total: 0 });
  const [familyStats, setFamilyStats] = useState<Record<EcgRhythmFamily, SessionStat>>({
    sinus: { correct: 0, total: 0 },
    atrial: { correct: 0, total: 0 },
    junctional: { correct: 0, total: 0 },
    av_block: { correct: 0, total: 0 },
    paced: { correct: 0, total: 0 },
    ventricular: { correct: 0, total: 0 },
    arrest: { correct: 0, total: 0 },
  });
  const timingRef = useRef<QuestionTiming>({
    questionStart: Date.now(),
    totalPausedMs: 0,
    pauseStartedAt: null,
  });
  const [stripPaused, setStripPaused] = useState(false);

  const pool = useMemo(() => {
    let p = DIFFICULTY_POOLS[difficulty];
    if (familyFilter.size > 0) {
      p = p.filter((k) => familyFilter.has(RHYTHM_FAMILY[k]));
    }
    return p.length === 0 ? DIFFICULTY_POOLS[difficulty] : p;
  }, [difficulty, familyFilter]);

  const newQuestion = () => {
    setVerdict(null);
    const q = pickQuestion(pool);
    setQuestion(q);
    timingRef.current = {
      questionStart: Date.now(),
      totalPausedMs: 0,
      pauseStartedAt: null,
    };
    setStripPaused(false);
  };

  const togglePause = () => {
    if (verdict) return;
    const t = timingRef.current;
    const now = Date.now();
    if (t.pauseStartedAt === null) {
      t.pauseStartedAt = now;
      setStripPaused(true);
    } else {
      t.totalPausedMs += now - t.pauseStartedAt;
      t.pauseStartedAt = null;
      setStripPaused(false);
    }
  };

  useEffect(() => {
    if (isAuthorized && !question) newQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, pool]);

  const ctx = useMemo(() => {
    if (!question) return null;
    return deriveEcgScenarioContext({
      forcedRhythm: question.rhythm,
      currentVitals: { hr: "" },
    });
  }, [question]);
  const tileW = useMemo(() => (ctx ? rhythmStripeWidthForContext(ctx) : 0), [ctx]);

  const handleAnswer = (pick: EcgRhythmKind) => {
    if (!question || verdict || stripPaused) return;
    const correct = pick === question.rhythm;
    const family = RHYTHM_FAMILY[question.rhythm];
    setVerdict({ correct, chosen: pick });
    setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setFamilyStats((s) => ({
      ...s,
      [family]: {
        correct: s[family].correct + (correct ? 1 : 0),
        total: s[family].total + 1,
      },
    }));
    void recordRhythmQuizAttempt(supabase, authUser?.id, {
      source: "trainer",
      rhythmKind: question.rhythm,
      userAnswer: pick,
      isCorrect: correct,
      difficulty,
      msToAnswer: thinkingMsElapsed(timingRef.current),
    });
  };

  const toggleFamily = (family: EcgRhythmFamily) => {
    setFamilyFilter((prev) => {
      const next = new Set(prev);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      return next;
    });
  };

  // ── Loading state ──────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="p-7 space-y-4">
        <Skeleton className="h-8 w-64 bg-white/5" />
        <Skeleton className="h-32 w-full bg-white/5 rounded-xl" />
        <Skeleton className="h-64 w-full bg-white/5 rounded-xl" />
      </div>
    );
  }

  // ── Premium-gated state ────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Panel accent="orange">
          <div className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <span
                className="w-12 h-12 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(251,191,36,0.12)",
                  color: "var(--premium)",
                }}
              >
                <Icons.Crown className="w-6 h-6" />
              </span>
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.22em] text-[var(--premium)] font-mono mb-1">
                  // PREMIUM FEATURE
                </div>
                <h1 className="font-display font-bold text-[24px] text-white leading-tight">
                  ECG Trainer
                </h1>
              </div>
            </div>
            <p className="text-[13.5px] text-[var(--text-mute)] leading-relaxed mb-5">
              Practice rhythm interpretation across the full taxonomy outside of scenarios.
              Upgrade to unlock unlimited practice, family-specific drills, and progress tracking.
            </p>
            <Link
              href="/billing"
              className="cta-primary inline-flex h-11 px-5 rounded-md text-[13.5px] font-semibold items-center gap-2"
            >
              <Icons.Crown className="w-3.5 h-3.5" /> Upgrade to Premium
              <Icons.Arrow className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  const accuracy = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);

  // ── Main UI ────────────────────────────────────────────────────────
  return (
    <div className="p-7 max-w-[1200px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
            // RHYTHM DRILL · LIVE STRIPS
          </div>
          <h1 className="font-display font-bold text-[30px] text-white leading-none flex items-center gap-2.5">
            ECG Trainer
          </h1>
          <p className="text-[13px] text-[var(--text-mute)] mt-2">
            Practice rhythm identification with family-aware distractors. Every attempt is saved to your performance dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="tag tag-emerald">
            <Icons.Crown className="w-3 h-3" />
            {stats.correct}/{stats.total} · {accuracy}%
          </span>
          <button
            type="button"
            onClick={togglePause}
            disabled={Boolean(verdict) || !question}
            aria-pressed={stripPaused}
            className="cta-secondary h-9 px-3 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Icons.Refresh className="w-3.5 h-3.5" />
            {stripPaused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={newQuestion}
            className="cta-secondary h-9 px-3 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5"
          >
            <Icons.Refresh className="w-3.5 h-3.5" /> Skip
          </button>
        </div>
      </div>

      {/* Filters */}
      <Panel
        title={
          <span className="flex items-center gap-2">
            <Icons.Lightbulb className="w-4 h-4 text-[var(--cyan-soft)]" />
            Filters
          </span>
        }
        action={
          <div className="flex flex-wrap gap-1.5">
            {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((d) => {
              const active = difficulty === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className="h-7 px-3 rounded-md text-[11.5px] font-medium capitalize transition"
                  style={{
                    background: active ? "rgba(255,122,24,0.16)" : "rgba(255,255,255,0.03)",
                    border: active
                      ? "1px solid rgba(255,122,24,0.40)"
                      : "1px solid var(--border-soft)",
                    color: active ? "var(--orange-soft)" : "var(--text-mute)",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        }
      >
        <div className="p-4 flex flex-wrap gap-1.5">
          {FAMILIES.map((family) => {
            const active = familyFilter.has(family);
            return (
              <button
                key={family}
                type="button"
                onClick={() => toggleFamily(family)}
                className="h-7 px-2.5 rounded-md text-[11.5px] font-medium transition"
                style={{
                  background: active ? "rgba(63,184,229,0.12)" : "rgba(255,255,255,0.03)",
                  border: active
                    ? "1px solid rgba(63,184,229,0.40)"
                    : "1px solid var(--border-soft)",
                  color: active ? "var(--cyan-soft)" : "var(--text-mute)",
                }}
              >
                {RHYTHM_FAMILY_LABEL[family]}
              </button>
            );
          })}
          {familyFilter.size > 0 && (
            <button
              type="button"
              onClick={() => setFamilyFilter(new Set())}
              className="cta-ghost h-7 px-2 rounded-md text-[11.5px] inline-flex items-center gap-1"
            >
              <Icons.X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </Panel>

      {/* Strips + answer panel */}
      <Panel
        title={
          <span className="flex items-center gap-2">
            <Icons.Heart className="w-4 h-4 text-emerald-400" />
            What rhythm is this?
          </span>
        }
        sub="Three views: II / III / aVF — same limb set as the scenario 4-lead monitor. Pause freezes strips (excluded from score timing)."
      >
        <div className="p-5 space-y-4">
          {ctx && question && (
            <div className="grid gap-3">
              <LiveStrip
                pid={`trainer-${question.rhythm}-ii`}
                ctx={ctx}
                tileW={tileW}
                leadIdx={1}
                leadLabel="II"
                height={120}
                paused={stripPaused}
              />
              <LiveStrip
                pid={`trainer-${question.rhythm}-iii`}
                ctx={ctx}
                tileW={tileW}
                leadIdx={2}
                leadLabel="III"
                height={90}
                paused={stripPaused}
              />
              <LiveStrip
                pid={`trainer-${question.rhythm}-avf`}
                ctx={ctx}
                tileW={tileW}
                leadIdx={5}
                leadLabel="aVF"
                height={90}
                paused={stripPaused}
              />
            </div>
          )}

          {question && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {question.options.map((opt) => {
                const isPicked = verdict?.chosen === opt;
                const isCorrect = verdict && opt === question.rhythm;
                const baseClass =
                  "h-10 px-3 rounded-md text-[13px] font-medium inline-flex items-center gap-2 transition text-left justify-start";
                let extra = "cta-secondary hover:text-white";
                if (verdict) {
                  if (isCorrect) {
                    extra = "";
                  } else if (isPicked) {
                    extra = "";
                  } else {
                    extra = "cta-secondary opacity-50";
                  }
                }
                const inlineStyle: React.CSSProperties = verdict
                  ? isCorrect
                    ? {
                        background: "rgba(52,211,153,0.14)",
                        border: "1px solid rgba(52,211,153,0.45)",
                        color: "#6ee7b7",
                      }
                    : isPicked
                    ? {
                        background: "rgba(248,113,113,0.12)",
                        border: "1px solid rgba(248,113,113,0.45)",
                        color: "#fda4a4",
                      }
                    : {}
                  : {};
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleAnswer(opt)}
                    disabled={Boolean(verdict) || stripPaused}
                    className={`${baseClass} ${extra} disabled:cursor-not-allowed`}
                    style={inlineStyle}
                  >
                    <Icons.Heart className="w-3.5 h-3.5 opacity-70" />
                    {RHYTHM_LABEL[opt]}
                  </button>
                );
              })}
            </div>
          )}

          {verdict && question && (
            <div
              className="rounded-md p-4 mt-2 space-y-3"
              style={{
                background: verdict.correct
                  ? "rgba(52,211,153,0.06)"
                  : "rgba(248,113,113,0.06)",
                border: verdict.correct
                  ? "1px solid rgba(52,211,153,0.30)"
                  : "1px solid rgba(248,113,113,0.30)",
              }}
            >
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                {verdict.correct ? (
                  <>
                    <Icons.CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Correct</span>
                  </>
                ) : (
                  <>
                    <Icons.X className="w-4 h-4 text-rose-400" />
                    <span className="text-rose-300">
                      Not quite — actual: {RHYTHM_LABEL[question.rhythm]}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[12.5px] text-white/85 leading-relaxed">
                {RHYTHM_TEACHING_NOTE[question.rhythm]}
              </p>
              <button
                type="button"
                onClick={newQuestion}
                className="cta-primary h-9 px-4 rounded-md text-[13px] font-semibold inline-flex items-center gap-2"
              >
                Next rhythm <Icons.Arrow className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </Panel>

      {/* Session breakdown */}
      <Panel title="Session breakdown" sub="Per-family accuracy this session">
        <div className="p-5 space-y-3">
          {FAMILIES.map((family) => {
            const s = familyStats[family];
            const pct = s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100);
            return (
              <div key={family}>
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="text-white">{RHYTHM_FAMILY_LABEL[family]}</span>
                  <span className="font-mono tabular-nums text-[var(--text-mute)]">
                    {s.correct}/{s.total} ({pct}%)
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background:
                        pct >= 85
                          ? "var(--success)"
                          : pct >= 70
                          ? "var(--orange)"
                          : pct >= 50
                          ? "var(--warn)"
                          : pct > 0
                          ? "var(--danger)"
                          : "transparent",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
