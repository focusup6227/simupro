"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Brain, Flame, Target } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  RHYTHM_FAMILY_LABEL,
  RHYTHM_LABEL,
  type EcgRhythmFamily,
  type EcgRhythmKind,
} from "@/lib/ecg-rhythm";
import type { RhythmQuizAttempt } from "@/lib/types";

const FAMILIES: EcgRhythmFamily[] = [
  "sinus",
  "atrial",
  "junctional",
  "av_block",
  "paced",
  "ventricular",
  "arrest",
];

type SourceFilter = "all" | "trainer" | "scenario";

export function RhythmPerformanceSection({
  attempts,
}: {
  attempts: RhythmQuizAttempt[];
}) {
  const [filter, setFilter] = useState<SourceFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return attempts;
    return attempts.filter((a) => a.source === filter);
  }, [attempts, filter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const correct = filtered.filter((a) => a.isCorrect).length;
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);

    // Current streak — consecutive correct from most recent backward.
    const sorted = [...filtered].sort((a, b) => {
      const ad = new Date(a.createdAt as string | number).getTime();
      const bd = new Date(b.createdAt as string | number).getTime();
      return bd - ad;
    });
    let streak = 0;
    for (const a of sorted) {
      if (a.isCorrect) streak += 1;
      else break;
    }
    return { total, correct, accuracy, streak };
  }, [filtered]);

  const familyData = useMemo(() => {
    return FAMILIES.map((family) => {
      const inFamily = filtered.filter((a) => a.family === family);
      const correct = inFamily.filter((a) => a.isCorrect).length;
      const total = inFamily.length;
      return {
        family,
        label: RHYTHM_FAMILY_LABEL[family],
        correct,
        incorrect: total - correct,
        total,
      };
    });
  }, [filtered]);

  const trendData = useMemo(() => {
    // Weekly accuracy for the last 8 weeks.
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const buckets: { weekLabel: string; accuracy: number; total: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = now - (i + 1) * weekMs;
      const end = now - i * weekMs;
      const inRange = filtered.filter((a) => {
        const t = new Date(a.createdAt as string | number).getTime();
        return t >= start && t < end;
      });
      const total = inRange.length;
      const correct = inRange.filter((a) => a.isCorrect).length;
      const acc = total === 0 ? 0 : Math.round((correct / total) * 100);
      buckets.push({
        weekLabel: format(new Date(end - weekMs / 2), "MMM d"),
        accuracy: acc,
        total,
      });
    }
    return buckets;
  }, [filtered]);

  const recent = useMemo(() => {
    return [...filtered]
      .sort((a, b) => {
        const ad = new Date(a.createdAt as string | number).getTime();
        const bd = new Date(b.createdAt as string | number).getTime();
        return bd - ad;
      })
      .slice(0, 25);
  }, [filtered]);

  if (attempts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="size-5" />
            Rhythm Identification
          </CardTitle>
          <CardDescription>
            Practice rhythm interpretation to start tracking your accuracy here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/dashboard/ecg-trainer">Open the ECG Trainer</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Brain className="size-5" />
          Rhythm Identification
        </h2>
        <div className="flex gap-1.5">
          {(["all", "trainer", "scenario"] as SourceFilter[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
              className="capitalize"
            >
              {s === "all" ? "All" : s === "trainer" ? "Trainer only" : "In-scenario only"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total attempts</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.correct} correct</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accuracy}%</div>
            <p className="text-xs text-muted-foreground">
              {filter === "all" ? "all sources" : filter === "trainer" ? "trainer only" : "in-scenario only"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current streak</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.streak}</div>
            <p className="text-xs text-muted-foreground">consecutive correct</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accuracy by family</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={familyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="correct" stackId="a" fill="#22c55e" name="Correct" />
                  <Bar dataKey="incorrect" stackId="a" fill="#ef4444" name="Incorrect" />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly accuracy</CardTitle>
            <CardDescription>Last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent attempts</CardTitle>
          <CardDescription>Last {Math.min(25, recent.length)} answers</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Rhythm</TableHead>
                <TableHead>Your answer</TableHead>
                <TableHead className="text-right">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((a) => {
                const labelFor = (k: string) =>
                  RHYTHM_LABEL[k as EcgRhythmKind] ?? k;
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      {format(new Date(a.createdAt as string | number), "PP p")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{a.source}</Badge>
                    </TableCell>
                    <TableCell>{labelFor(a.rhythmKind)}</TableCell>
                    <TableCell>
                      {a.userAnswer === "skipped" ? (
                        <span className="text-muted-foreground italic">skipped</span>
                      ) : (
                        labelFor(a.userAnswer)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={a.isCorrect ? "default" : "destructive"}>
                        {a.isCorrect ? "✓" : "✗"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
