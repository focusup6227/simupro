"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  ALL_ECG_RHYTHM_KINDS,
  RHYTHM_FAMILY,
  RHYTHM_LABEL,
  RHYTHM_TEACHING_NOTE,
  type EcgRhythmKind,
} from "@/lib/ecg-rhythm";
import { Activity, Brain, CheckCircle2, XCircle } from "lucide-react";

interface RhythmIdQuizProps {
  observedRhythm: EcgRhythmKind | null;
  enabled: boolean;
  onLogAction: (label: string) => void;
  onPersistAttempt?: (input: {
    rhythmKind: EcgRhythmKind;
    userAnswer: EcgRhythmKind | "skipped";
    isCorrect: boolean;
    msToAnswer: number | null;
  }) => void;
}

interface QuizState {
  rhythm: EcgRhythmKind;
  options: EcgRhythmKind[];
  startedAt: number;
}

const FAMILY_ORDER = [
  "sinus",
  "atrial",
  "junctional",
  "av_block",
  "paced",
  "ventricular",
  "arrest",
] as const;

function pickDistractors(target: EcgRhythmKind, count = 3): EcgRhythmKind[] {
  const targetFamily = RHYTHM_FAMILY[target];
  const sameFamily = ALL_ECG_RHYTHM_KINDS.filter(
    (k) => k !== target && k !== "unknown" && RHYTHM_FAMILY[k] === targetFamily,
  );
  const otherFamily = ALL_ECG_RHYTHM_KINDS.filter(
    (k) => k !== target && k !== "unknown" && RHYTHM_FAMILY[k] !== targetFamily,
  );
  const pool: EcgRhythmKind[] = [];
  while (pool.length < count) {
    const next = sameFamily.length > 0 && pool.length < Math.min(2, count)
      ? sameFamily.splice(Math.floor(Math.random() * sameFamily.length), 1)[0]
      : otherFamily.splice(Math.floor(Math.random() * otherFamily.length), 1)[0];
    if (!next) break;
    pool.push(next);
  }
  return pool;
}

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

export function RhythmIdQuiz({
  observedRhythm,
  enabled,
  onLogAction,
  onPersistAttempt,
}: RhythmIdQuizProps) {
  const [open, setOpen] = useState(false);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [verdict, setVerdict] = useState<{ correct: boolean; chosen: EcgRhythmKind } | null>(null);
  const lastSeen = useRef<EcgRhythmKind | null>(null);

  useEffect(() => {
    if (!enabled || !observedRhythm || observedRhythm === "unknown") return;
    if (lastSeen.current === observedRhythm) return;
    lastSeen.current = observedRhythm;

    const distractors = pickDistractors(observedRhythm);
    const options = shuffle([observedRhythm, ...distractors]);
    setQuiz({ rhythm: observedRhythm, options, startedAt: Date.now() });
    setVerdict(null);
    setOpen(true);
  }, [observedRhythm, enabled]);

  const startManualQuiz = () => {
    if (!observedRhythm || observedRhythm === "unknown") return;
    const distractors = pickDistractors(observedRhythm);
    setQuiz({
      rhythm: observedRhythm,
      options: shuffle([observedRhythm, ...distractors]),
      startedAt: Date.now(),
    });
    setVerdict(null);
    setOpen(true);
  };

  const handlePick = (pick: EcgRhythmKind) => {
    if (!quiz) return;
    const correct = pick === quiz.rhythm;
    const msToAnswer = Date.now() - quiz.startedAt;
    setVerdict({ correct, chosen: pick });
    onLogAction(
      correct
        ? `Rhythm interpretation: ${RHYTHM_LABEL[quiz.rhythm]} (correct)`
        : `Rhythm interpretation: ${RHYTHM_LABEL[pick]} (incorrect, actual ${RHYTHM_LABEL[quiz.rhythm]})`,
    );
    onPersistAttempt?.({
      rhythmKind: quiz.rhythm,
      userAnswer: pick,
      isCorrect: correct,
      msToAnswer,
    });
  };

  const handleSkip = () => {
    if (!quiz) return;
    onLogAction("Rhythm interpretation: skipped");
    onPersistAttempt?.({
      rhythmKind: quiz.rhythm,
      userAnswer: "skipped",
      isCorrect: false,
      msToAnswer: null,
    });
    setOpen(false);
  };

  const sortedOptions = useMemo(() => {
    if (!quiz) return [];
    return [...quiz.options].sort(
      (a, b) =>
        FAMILY_ORDER.indexOf(RHYTHM_FAMILY[a]) - FAMILY_ORDER.indexOf(RHYTHM_FAMILY[b]),
    );
  }, [quiz]);

  if (!enabled) return null;

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" onClick={startManualQuiz}>
            <Brain className="mr-1.5 size-3.5" />
            Identify rhythm
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3" align="end">
          <div className="space-y-1">
            <p className="text-sm font-semibold">What rhythm is this?</p>
            <p className="text-xs text-muted-foreground">
              Quick check — your answer is logged for grading. Skip is allowed.
            </p>
          </div>

          {!verdict && (
            <div className="grid grid-cols-1 gap-1.5">
              {sortedOptions.map((opt) => (
                <Button
                  key={opt}
                  size="sm"
                  variant="outline"
                  className="justify-start"
                  onClick={() => handlePick(opt)}
                >
                  <Activity className="mr-1.5 size-3.5 opacity-60" />
                  {RHYTHM_LABEL[opt]}
                </Button>
              ))}
            </div>
          )}

          {verdict && quiz && (
            <div className="space-y-2">
              <Badge variant={verdict.correct ? "default" : "destructive"} className="gap-1">
                {verdict.correct ? (
                  <CheckCircle2 className="size-3" />
                ) : (
                  <XCircle className="size-3" />
                )}
                {verdict.correct ? "Correct" : "Incorrect"}
              </Badge>
              {!verdict.correct && (
                <p className="text-xs">
                  Actual: <span className="font-medium">{RHYTHM_LABEL[quiz.rhythm]}</span>
                </p>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                {RHYTHM_TEACHING_NOTE[quiz.rhythm]}
              </p>
              <Button size="sm" variant="ghost" className="w-full" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          )}

          {!verdict && (
            <Button size="sm" variant="ghost" className="w-full" onClick={handleSkip}>
              Skip
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
