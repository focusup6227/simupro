"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Activity, Brain, CheckCircle2, Lock, Pause, Play, RefreshCw, Sparkles, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
    const next = sameFamily.length > 0 && distractors.length < 2
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
      currentVitals: { hr: '' },
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
      source: 'trainer',
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

  if (profileLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-5" />
              ECG Trainer is a Premium feature
            </CardTitle>
            <CardDescription>
              Practice rhythm interpretation across the full taxonomy outside of scenarios. Upgrade to unlock unlimited
              practice, family-specific drills, and progress tracking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/billing">Upgrade to Premium</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const accuracy = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="size-6" />
            ECG Trainer
          </h1>
          <p className="text-sm text-muted-foreground">
            Practice rhythm identification with family-aware distractors. Every attempt is saved to your performance dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5">
            <Trophy className="size-3" />
            {stats.correct}/{stats.total} ({accuracy}%)
          </Badge>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={togglePause}
            disabled={Boolean(verdict) || !question}
            className="gap-1.5"
            aria-pressed={stripPaused}
          >
            {stripPaused ? (
              <>
                <Play className="size-3.5" /> Resume
              </>
            ) : (
              <>
                <Pause className="size-3.5" /> Pause
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={newQuestion}>
            <RefreshCw className="mr-1.5 size-3.5" />
            Skip
          </Button>
        </div>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4" />
              Filters
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={difficulty === d ? "default" : "outline"}
                  onClick={() => setDifficulty(d)}
                  className="capitalize"
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {FAMILIES.map((family) => (
            <Button
              key={family}
              size="sm"
              variant={familyFilter.has(family) ? "default" : "outline"}
              onClick={() => toggleFamily(family)}
            >
              {RHYTHM_FAMILY_LABEL[family]}
            </Button>
          ))}
          {familyFilter.size > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setFamilyFilter(new Set())}>
              Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4 text-emerald-500" />
            What rhythm is this?
          </CardTitle>
          <CardDescription>
            Three views: lead II, V1, and V5. Use Pause to freeze the strips (timed pause excluded from your score timing).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
                pid={`trainer-${question.rhythm}-v1`}
                ctx={ctx}
                tileW={tileW}
                leadIdx={6}
                leadLabel="V1"
                height={90}
                paused={stripPaused}
              />
              <LiveStrip
                pid={`trainer-${question.rhythm}-v5`}
                ctx={ctx}
                tileW={tileW}
                leadIdx={10}
                leadLabel="V5"
                height={90}
                paused={stripPaused}
              />
            </div>
          )}

          {question && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {question.options.map((opt) => {
                const isPicked = verdict?.chosen === opt;
                const isCorrect = verdict && opt === question.rhythm;
                const tone = !verdict
                  ? "outline"
                  : isCorrect
                    ? "default"
                    : isPicked
                      ? "destructive"
                      : "outline";
                return (
                  <Button
                    key={opt}
                    variant={tone}
                    onClick={() => handleAnswer(opt)}
                    disabled={Boolean(verdict) || stripPaused}
                    className="justify-start"
                  >
                    <Activity className="mr-2 size-3.5 opacity-70" />
                    {RHYTHM_LABEL[opt]}
                  </Button>
                );
              })}
            </div>
          )}

          {verdict && question && (
            <div className="space-y-3 rounded-md border border-border/60 bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {verdict.correct ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-500" /> Correct
                  </>
                ) : (
                  <>
                    <XCircle className="size-4 text-rose-500" /> Not quite — actual: {RHYTHM_LABEL[question.rhythm]}
                  </>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {RHYTHM_TEACHING_NOTE[question.rhythm]}
              </p>
              <Button onClick={newQuestion}>Next rhythm</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Session breakdown</CardTitle>
          <CardDescription>Per-family accuracy this session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {FAMILIES.map((family) => {
            const s = familyStats[family];
            const pct = s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100);
            return (
              <div key={family} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{RHYTHM_FAMILY_LABEL[family]}</span>
                  <span className="text-muted-foreground">
                    {s.correct}/{s.total} ({pct}%)
                  </span>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
