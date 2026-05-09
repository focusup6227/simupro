"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppLogo from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { seedScenarios } from "@/lib/scenarios-data";
import { DEMO_SCENARIO_ID, DEMO_MAX_AI_TURNS } from "@/lib/demo-config";
import type { Message, UserAction, UserRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, Sparkles, User } from "lucide-react";
import { UnifiedCardiacMonitor } from "@/components/unified-cardiac-monitor";
import { EquipmentDrawer } from "@/components/equipment-drawer";
import { usePhysiologyStore } from "@/stores/physiology-store";
import { usePkStore } from "@/stores/pk-store";

export default function DemoPage() {
  const { toast } = useToast();
  const scenario = seedScenarios.find((s) => s.id === DEMO_SCENARIO_ID)!;

  const [role, setRole] = useState<Exclude<UserRole, "admin" | "tester" | "student">>("emt");
  const [time, setTime] = useState(0);
  const [messages, setMessages] = useState<Message[]>(() => [
    { role: "system", content: "Demo mode — limited turns. Sign up free for unlimited scenarios." },
    {
      role: "assistant",
      content: scenario.details,
      vitals: scenario.initialVitals,
    },
  ]);
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  const [assessmentInput, setAssessmentInput] = useState("");
  const [treatmentInput, setTreatmentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [patientDeceased, setPatientDeceased] = useState(false);
  const [ctaOpen, setCtaOpen] = useState(false);

  const turnsRemaining = DEMO_MAX_AI_TURNS - userActions.length;
  const atTurnLimit = userActions.length >= DEMO_MAX_AI_TURNS;

  const openCta = useCallback(() => setCtaOpen(true), []);

  useEffect(() => {
    usePkStore.getState().reset();
    usePhysiologyStore.getState().loadScenario(scenario.initialVitals);
    const s = usePhysiologyStore.getState();
    if (!s.isMonitorPowered) s.togglePowerMonitor();
    s.applyFourLead();
    if (!s.isEkgChannelOn) s.toggleEkgChannel();
    s.applyPulseOx();
    s.applyBpCuff();
    s.requestNibpCycle();

    return () => {
      usePhysiologyStore.getState().reset();
      usePkStore.getState().reset();
    };
  }, [scenario.id, scenario.initialVitals]);

  const submitAction = async () => {
    const assessment = assessmentInput.trim();
    const treatment = treatmentInput.trim();
    if (!assessment && !treatment) {
      toast({
        variant: "destructive",
        title: "Enter an action",
        description: "Add an assessment note and/or treatment before submitting.",
      });
      return;
    }
    if (atTurnLimit || patientDeceased) {
      openCta();
      return;
    }

    setIsLoading(true);
    const nextTime = time + 30;
    setTime(nextTime);

    const treatmentsList = treatment
      ? treatment.split(/\n|,/).map((s) => s.trim()).filter(Boolean)
      : [];

    const newAction: UserAction = {
      time: nextTime,
      assessment: assessment || "(none)",
      treatments: treatmentsList,
      destination: null,
    };

    const nextActions = [...userActions, newAction];
    const userMsg: Message = {
      role: "user",
      content: [assessment && `Assessment: ${assessment}`, treatment && `Treatment: ${treatment}`]
        .filter(Boolean)
        .join("\n"),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/demo/patient-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment: assessment || "(none)",
          treatment: treatment || "(none)",
          userRole: role,
          userActions: nextActions.slice(0, -1),
          currentVitals,
          patientCondition: [...messages].reverse().find((m) => m.role === "assistant")?.conditionChange,
        }),
      });
      const data: {
        patientResponse?: string;
        vitals?: typeof scenario.initialVitals;
        patientIsDeceased?: boolean;
        error?: string;
      } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not get patient response.");
      }

      setUserActions(nextActions);

      const assistantMsg: Message = {
        role: "assistant",
        content: data.patientResponse ?? "",
        vitals: data.vitals,
        conditionChange: (data as { conditionChange?: string }).conditionChange,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (data.vitals) {
        usePhysiologyStore.getState().updateVitals(data.vitals);
      }
      if (data.patientIsDeceased) {
        setPatientDeceased(true);
        toast({ title: "Simulation ended", description: "Review the outcome, then continue with a free account." });
        openCta();
      } else if (nextActions.length >= DEMO_MAX_AI_TURNS) {
        toast({
          title: "Demo complete",
          description: "You've used every demo turn. Sign up to keep training.",
        });
        openCta();
      }

      setAssessmentInput("");
      setTreatmentInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed.";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <AppLogo />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{turnsRemaining} demo turns left</Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/signup">Sign up free</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{scenario.title}</h1>
          <p className="text-muted-foreground">{scenario.description}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Training only — not medical advice. Do not enter real patient identifiers.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="space-y-4 xl:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Patient profile
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>{scenario.patientProfile}</p>
              </CardContent>
            </Card>
            <UnifiedCardiacMonitor scenario={scenario} />
            <EquipmentDrawer />
          </div>

          <div className="min-h-0 xl:col-span-3">
            <Card className="flex min-h-[280px] flex-1 flex-col">
              <CardHeader>
                <CardTitle className="text-base">Simulation log</CardTitle>
                <CardDescription>Submit assessments and treatments like the full trainer.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ScrollArea className="h-[min(50vh,420px)] rounded-md border p-3">
                  <div className="space-y-3 pr-3">
                    {messages.map((m, i) => (
                      <div
                        key={i}
                        className={
                          m.role === "user"
                            ? "ml-8 rounded-lg bg-primary/10 p-3 text-sm"
                            : m.role === "system"
                              ? "text-center text-xs text-muted-foreground"
                              : "mr-8 rounded-lg border bg-muted/40 p-3 text-sm"
                        }
                      >
                        {m.role !== "system" && (
                          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                            {m.role === "user" ? "You" : "Patient / scene"}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="demo-role">Your certification level</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                      <SelectTrigger id="demo-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="emt">EMT</SelectItem>
                        <SelectItem value="aemt">AEMT</SelectItem>
                        <SelectItem value="paramedic">Paramedic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo-assessment">Assessment</Label>
                  <Textarea
                    id="demo-assessment"
                    placeholder="Primary assessment, SOAP notes, questions to patient..."
                    value={assessmentInput}
                    onChange={(e) => setAssessmentInput(e.target.value)}
                    rows={3}
                    disabled={isLoading || atTurnLimit || patientDeceased}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-treatment">Treatment (one per line)</Label>
                  <Textarea
                    id="demo-treatment"
                    placeholder="Oral glucose&#10;High-flow O₂ via NRB"
                    value={treatmentInput}
                    onChange={(e) => setTreatmentInput(e.target.value)}
                    rows={3}
                    disabled={isLoading || atTurnLimit || patientDeceased}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void submitAction()}
                    disabled={isLoading || atTurnLimit || patientDeceased}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Thinking…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Submit action
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={openCta}>
                    End demo &amp; sign up
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={ctaOpen} onOpenChange={setCtaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save your progress — free account</DialogTitle>
            <DialogDescription>
              Create a SimuPro account for the full scenario library, performance reports, streaks, and
              unlimited AI responses.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/signup">
                Sign up free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/billing">See Premium</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
