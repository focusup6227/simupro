"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, BarChart3, Sparkles } from "lucide-react";

/** Static illustration only — not tied to real session data */
const SAMPLE_SCENARIO = {
  title: "Adult asthma exacerbation (sample)",
  role: "paramedic" as const,
  assessmentScore: 84,
  treatmentScore: 78,
  timeElapsedSec: 412,
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-none"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

export function SamplePerformanceReportPreview() {
  return (
    <section
      aria-labelledby="sample-report-heading"
      className="py-12 sm:py-16"
      style={{ background: "rgba(255,255,255,0.025)" }}
    >
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <Badge
            variant="secondary"
            className="mb-3 border-violet-500/25 bg-violet-500/10 text-violet-300"
          >
            <Sparkles className="mr-1.5 inline size-3.5" />
            Sample illustration
          </Badge>
          <h2
            id="sample-report-heading"
            className="text-2xl font-bold tracking-tight sm:text-3xl text-white"
          >
            Post-run performance report preview
          </h2>
          <p className="mt-3 text-white/45">
            After signed-in simulations, AI grades your assessments and interventions. Below is
            fictional output so you know what the report screen looks like (not from the free
            cockpit demo above).
          </p>
        </div>

        <Card className="overflow-hidden border-dashed">
          <CardHeader className="border-b bg-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">Simulation report</CardTitle>
                <CardDescription className="mt-1">
                  Scenario: {SAMPLE_SCENARIO.title} · as {SAMPLE_SCENARIO.role}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Assessment</CardTitle>
                  <CardDescription>Accuracy score</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{SAMPLE_SCENARIO.assessmentScore}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Treatment</CardTitle>
                  <CardDescription>Appropriateness score</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{SAMPLE_SCENARIO.treatmentScore}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Time</CardTitle>
                  <CardDescription>Elapsed in scenario</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{SAMPLE_SCENARIO.timeElapsedSec}s</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <BarChart3 className="size-5 text-primary" />
                Score overview
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <ScoreBar label="Assessment" value={SAMPLE_SCENARIO.assessmentScore} />
                <ScoreBar label="Treatment" value={SAMPLE_SCENARIO.treatmentScore} />
              </div>
            </div>

            <Alert>
              <Lightbulb className="size-4" />
              <AlertTitle>AI coaching snippet (sample)</AlertTitle>
              <AlertDescription className="space-y-2 whitespace-pre-wrap text-muted-foreground">
                {
                  'You recognized bronchospasm early and prioritized high-flow oxygen with nebulized albuterol. Strength: clear SAMPLE and repeated lung auscultation after each treatment. Opportunity: document peak flow sooner if available on scene.\n\nNext run: verbalize escalation criteria earlier (altered mental status, fatigue, declining SpO₂) so receiving teams hear your escalation plan.'
                }
              </AlertDescription>
            </Alert>

            <p className="text-center text-xs text-muted-foreground">
              Full accounts also include objection mapping, drill ideas, printable layout, and history from your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
