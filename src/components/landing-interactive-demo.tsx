"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DEMO_SCENARIO_ID, DEMO_MAX_AI_TURNS } from "@/lib/demo-config";
import { seedScenarios } from "@/lib/scenarios-data";
import { seedInterventions } from "@/lib/interventions-data";
import type { Message, UserAction, ArrestRhythmKind } from "@/lib/types";
import { interventionCertifications } from "@/lib/types";
import { hospitals } from "@/lib/hospitals-data";
import { UnifiedCardiacMonitor } from "@/components/unified-cardiac-monitor";
import { EquipmentDrawer } from "@/components/equipment-drawer";
import { usePhysiologyStore } from "@/stores/physiology-store";
import { usePkStore } from "@/stores/pk-store";
import { AedPanel } from "@/components/aed-panel";
import {
  Droplets,
  ArrowRight,
  Clock,
  FileHeart,
  HeartPulse,
  Hospital,
  Loader2,
  MapPin,
  Radio,
  Sparkles,
  Siren,
  Thermometer,
  Truck,
  Waves,
} from "lucide-react";

type LandingRole = "emt" | "aemt" | "paramedic";

type SelectedTreatments = {
  [interventionId: string]: {
    selected: boolean;
    subOptions: { [label: string]: string };
  };
};

/** Cardiac-strip preview rhythm for the AED sandbox (not tied to diabetic scenario physiology). */
const AED_PREVIEW_RHYTHM: ArrestRhythmKind = "vfib";

function formatMissionTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LandingInteractiveDemo() {
  const { toast } = useToast();
  const scenario = useMemo(() => seedScenarios.find((s) => s.id === DEMO_SCENARIO_ID)!, []);

  const [role, setRole] = useState<LandingRole>("paramedic");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [missionTimeSec, setMissionTimeSec] = useState(0);
  const [messages, setMessages] = useState<Message[]>(() => [
    { role: "system", content: "Free preview · same diabetic-emergency sandbox below · limited AI replies per visitor." },
    {
      role: "assistant",
      content: scenario.details,
      vitals: scenario.initialVitals,
    },
  ]);
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  const [currentVitals, setCurrentVitals] = useState(scenario.initialVitals);
  const [assessmentInput, setAssessmentInput] = useState("");
  const [treatmentNotesInput, setTreatmentNotesInput] = useState("");
  const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatments>({});
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(() => {
    const keys = scenario.hospitalDistances ? Object.keys(scenario.hospitalDistances) : [];
    return keys.includes("mercy_general") ? "mercy_general" : keys[0] ?? null;
  });
  const [transportMode, setTransportMode] = useState<"Routine" | "Emergency">("Routine");
  const [radioReportInput, setRadioReportInput] = useState("");
  const [isGeneratingRadio, setIsGeneratingRadio] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [patientDeceased, setPatientDeceased] = useState(false);

  const turnsRemaining = DEMO_MAX_AI_TURNS - userActions.length;
  const atTurnLimit = userActions.length >= DEMO_MAX_AI_TURNS;

  const availableInterventions = useMemo(() => {
    const viewerLevel = interventionCertifications.indexOf(role);
    return seedInterventions.filter(
      (i) => interventionCertifications.indexOf(i.certificationLevel) <= viewerLevel
    );
  }, [role]);

  useEffect(() => {
    const id = window.setInterval(() => setElapsedSec((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  /** Seed the physiology store the same way the logged-in scenario page does so the UnifiedCardiacMonitor renders with vitals + applied equipment. */
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

  const filteredHospitals = useMemo(() => {
    const keys = new Set(Object.keys(scenario.hospitalDistances ?? {}));
    return hospitals.filter((h) => keys.has(h.id));
  }, [scenario.hospitalDistances]);

  const handleTreatmentSelection = (id: string, checked: boolean | "indeterminate") => {
    const intervention = seedInterventions.find((i) => i.id === id);
    const initialSubOptions =
      intervention?.subOptions?.reduce((acc, so) => {
        acc[so.label] = so.options[0]!;
        return acc;
      }, {} as Record<string, string>) ?? {};

    setSelectedTreatments((prev) => ({
      ...prev,
      [id]: {
        selected: !!checked,
        subOptions: checked ? prev[id]?.subOptions ?? initialSubOptions : {},
      },
    }));
  };

  const handleSubOptionChange = (interventionId: string, label: string, value: string) => {
    setSelectedTreatments((prev) => ({
      ...prev,
      [interventionId]: {
        selected: true,
        subOptions: { ...prev[interventionId]?.subOptions, [label]: value },
      },
    }));
  };

  const buildTreatmentsPayload = (): string => {
    const fromCheckbox = Object.entries(selectedTreatments)
      .filter(([, d]) => d.selected)
      .map(([id, details]) => {
        const intervention = seedInterventions.find((i) => i.id === id);
        if (!intervention) return "";
        const sub = Object.entries(details.subOptions)
          .map(([label, value]) => `${label}: ${value}`)
          .join(", ");
        return `${intervention.name}${sub ? ` (${sub})` : ""}`;
      })
      .filter(Boolean);
    const notes = treatmentNotesInput.trim();
    const lines = [...fromCheckbox, notes].filter(Boolean);
    return lines.join("\n");
  };

  const appendEcgLog = useCallback((label: string) => {
    setMessages((prev) => [...prev, { role: "system", content: `Logged · ${label}` }]);
  }, []);

  const appendAedLog = useCallback((label: string) => {
    setMessages((prev) => [...prev, { role: "system", content: `AED sandbox · ${label}` }]);
  }, []);

  const handleGenerateRadioReport = async () => {
    setIsGeneratingRadio(true);
    setRadioReportInput("Generating…");
    try {
      const res = await fetch("/api/demo/radio-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientProfile: scenario.patientProfile,
          scenarioDetails: scenario.details,
          userActions,
          currentVitals,
          userRole: role,
        }),
      });
      const data: { radioReport?: string; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate radio report.");
      setRadioReportInput(data.radioReport ?? "");
      toast({
        title: "Radio report ready",
        description: "Edit if needed, then tap Submit radio report for ED acknowledgement — counts as one demo AI reply.",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Request failed.";
      setRadioReportInput("");
      toast({ variant: "destructive", title: "Generation failed", description: msg });
    } finally {
      setIsGeneratingRadio(false);
    }
  };

  const submitStep = async () => {
    const assessmentBase = assessmentInput.trim();
    const treatmentsText = buildTreatmentsPayload();
    const hospital = selectedHospitalId ? hospitals.find((h) => h.id === selectedHospitalId) : null;
    const destLine =
      hospital != null
        ? `Destination: ${hospital.name} · Transport: ${transportMode}.`
        : "";

    const assessmentParts = [assessmentBase, destLine].filter(Boolean);
    const assessment = assessmentParts.length ? assessmentParts.join("\n\n") : "";

    if (!assessment && !treatmentsText) {
      toast({
        variant: "destructive",
        title: "Add something to send",
        description: "Enter an assessment, pick treatments, and/or choose destination details.",
      });
      return;
    }
    if (atTurnLimit || patientDeceased) {
      toast({
        title: "Demo limit reached",
        description: "Sign up free for the full scenario library and unlimited AI responses.",
      });
      return;
    }

    setIsLoading(true);
    const nextMission = missionTimeSec + 30;
    setMissionTimeSec(nextMission);

    const treatmentsList = treatmentsText
      ? treatmentsText.split(/\n/).map((s) => s.trim()).filter(Boolean)
      : [];

    const newAction: UserAction = {
      time: nextMission,
      assessment: assessment || "(none)",
      treatments: treatmentsList,
      destination: hospital?.name ?? null,
    };
    const nextActions = [...userActions, newAction];

    const userMsg: Message = {
      role: "user",
      content: [assessment && `Assessment / transport:\n${assessment}`, treatmentsText && `Treatments:\n${treatmentsText}`]
        .filter(Boolean)
        .join("\n\n"),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/demo/patient-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment: assessment || "(none)",
          treatment: treatmentsText || "(none)",
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
        conditionChange?: string;
        hospitalResponse?: string;
        medicalDirection?: string;
        error?: string;
      } = await res.json();

      if (!res.ok) throw new Error(data.error || "Could not get patient response.");

      setUserActions(nextActions);

      const assistantMsg: Message = {
        role: "assistant",
        content: data.patientResponse ?? "",
        vitals: data.vitals,
        conditionChange: data.conditionChange,
      };
      if (data.medicalDirection) {
        assistantMsg.content = data.medicalDirection;
      }

      const appended: Message[] = [];
      if (data.hospitalResponse) {
        appended.push({ role: "system", content: data.hospitalResponse });
      }
      if (data.patientResponse) {
        appended.push(assistantMsg);
      }
      setMessages((prev) => [...prev, ...appended]);
      if (data.vitals) {
        setCurrentVitals(data.vitals);
        usePhysiologyStore.getState().updateVitals(data.vitals);
      }
      if (data.patientIsDeceased) {
        setPatientDeceased(true);
      }

      setAssessmentInput("");
      setTreatmentNotesInput("");
      setSelectedTreatments({});
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Request failed.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /** Same contract as Dashboard → Scenario → Submit radio report: AI returns hospital acknowledgement + ongoing patient state. */
  const submitRadioReport = async () => {
    const handoffText = radioReportInput.trim();
    if (!handoffText || handoffText === "Generating…") {
      toast({
        variant: "destructive",
        title: "Nothing to transmit",
        description: "Generate or enter a hospital radio report, then submit.",
      });
      return;
    }
    if (atTurnLimit || patientDeceased) {
      toast({
        title: "Demo limit reached",
        description: "Sign up free for unlimited training.",
      });
      return;
    }

    const assessmentPayload = `Gave the following radio report:\n${handoffText}`;

    setIsLoading(true);
    const nextMission = missionTimeSec + 30;
    setMissionTimeSec(nextMission);

    const newAction: UserAction = {
      time: nextMission,
      assessment: assessmentPayload,
      treatments: [],
      destination: null,
    };
    const nextActions = [...userActions, newAction];

    const userMsg: Message = {
      role: "user",
      content: `Assessment: ${assessmentPayload}`,
    };
    setMessages((prev) => [...prev, userMsg]);

    const lastAssistantCondition = [...messages].reverse().find((m) => m.role === "assistant")?.conditionChange;

    try {
      const res = await fetch("/api/demo/patient-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment: assessmentPayload,
          treatment: "(none)",
          userRole: role,
          userActions: nextActions.slice(0, -1),
          currentVitals,
          patientCondition: lastAssistantCondition,
        }),
      });
      const data: {
        patientResponse?: string;
        vitals?: typeof scenario.initialVitals;
        patientIsDeceased?: boolean;
        conditionChange?: string;
        hospitalResponse?: string;
        medicalDirection?: string;
        error?: string;
      } = await res.json();

      if (!res.ok) throw new Error(data.error || "Could not get patient response.");

      setUserActions(nextActions);

      const assistantMsg: Message = {
        role: "assistant",
        content: data.patientResponse ?? "",
        vitals: data.vitals,
        conditionChange: data.conditionChange,
      };
      if (data.medicalDirection) {
        assistantMsg.content = data.medicalDirection;
      }

      const appended: Message[] = [];
      if (data.hospitalResponse) {
        appended.push({ role: "system", content: data.hospitalResponse });
      }
      if (data.patientResponse) {
        appended.push(assistantMsg);
      }
      setMessages((prev) => [...prev, ...appended]);
      if (data.vitals) {
        setCurrentVitals(data.vitals);
        usePhysiologyStore.getState().updateVitals(data.vitals);
      }
      if (data.patientIsDeceased) {
        setPatientDeceased(true);
      }

      setRadioReportInput("");
      toast({ title: "Report sent", description: "Receiving hospital responded on radio (see Scene log)." });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Request failed.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickAssess = (line: string) => {
    setAssessmentInput((prev) => (prev.trim() ? `${prev.trim()}\n${line}` : line));
  };

  const aedBridgeRole = role === "aemt" ? "aemt" : "emt";

  return (
    <section
      id="try-cockpit"
      aria-labelledby="landing-demo-heading"
      className="scroll-mt-[4.75rem] border-y bg-gradient-to-b from-muted/60 to-background py-12 sm:py-16"
    >
      <div className="container mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 text-center lg:text-left">
          <div>
            <Badge className="mb-3" variant="secondary">
              Live sandbox · Free · No sign-in
            </Badge>
            <h2 id="landing-demo-heading" className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Try the full cockpit
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground md:text-lg">
              Vitals, 4‑lead and 12‑lead monitors, AED interface, transports, and the full structured treatment list—same diabetic
              emergency preview on this page ({DEMO_MAX_AI_TURNS} AI responses per visitor, rate-limited).
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start">
          {/* Left rail — telemetry */}
          <div className="space-y-4 min-w-0 lg:sticky lg:top-[4.75rem]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5 font-mono tabular-nums">
                <Clock className="size-3.5" />
                Scene {formatMissionTime(missionTimeSec)}
              </Badge>
              <Badge variant="outline" className="tabular-nums text-muted-foreground">
                Preview Uptime {formatMissionTime(elapsedSec)}
              </Badge>
              <Badge variant={turnsRemaining <= 5 ? "destructive" : "secondary"}>{turnsRemaining} AI replies left</Badge>
              <Badge variant={patientDeceased ? "destructive" : "outline"}>{patientDeceased ? "Scenario ended in-app" : "In progress"}</Badge>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  <HeartPulse className="size-5 shrink-0" />
                  {scenario.title}
                </CardTitle>
                <CardDescription>{scenario.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p>
                  <span className="font-medium text-muted-foreground">Patient:</span> {scenario.patientProfile}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HeartPulse className="size-4 text-red-600" />
                  Vitals snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-5">
                {Object.entries(currentVitals).map(([k, value]) => (
                  <div key={k}>
                    <p className="font-semibold uppercase text-muted-foreground">{k}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <UnifiedCardiacMonitor
              scenario={scenario}
              cprActive={false}
              forcedRhythm={null}
              pulseless={false}
              onAction={(label) => appendEcgLog(label)}
              onRhythmChange={() => {}}
            />
            <EquipmentDrawer />

            <Card className="border-emerald-800/40 bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  AED + post-shock ALS (sandbox)
                </CardTitle>
                <CardDescription className="text-xs">
                  Preview only—rhythm differs from this medical scenario but matches the cardiac-arrest tooling in full
                  simulations.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <AedPanel
                  role={aedBridgeRole}
                  currentArrestRhythm={AED_PREVIEW_RHYTHM}
                  hasROSC={false}
                  onLogAction={(label) => appendAedLog(label)}
                  disabled={isLoading || atTurnLimit}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right rail — workflow */}
          <div className="flex min-h-0 min-w-0 flex-col gap-3">
            <p className="text-center text-xs text-muted-foreground lg:hidden">
              Vitals &amp; ECG monitor are above — scroll up to use live strips.
            </p>
            <Card className="flex w-full flex-col overflow-hidden">
              <Tabs defaultValue="story" className="flex flex-col">
                <div className="border-b px-4 pt-3">
                  <div className="mb-3 flex flex-wrap gap-3">
                    <div className="space-y-1.5 flex-1 min-w-[140px]">
                      <Label htmlFor="landing-role">Certification tier</Label>
                      <Select value={role} onValueChange={(v) => setRole(v as LandingRole)}>
                        <SelectTrigger id="landing-role">
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
                  <TabsList className="h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto p-1 sm:flex-nowrap">
                    <TabsTrigger value="story" className="shrink-0 px-2.5 text-xs sm:flex-1 sm:px-3 sm:text-sm">
                      Scene log
                    </TabsTrigger>
                    <TabsTrigger value="assessment" className="shrink-0 px-2.5 text-xs sm:flex-1 sm:px-3 sm:text-sm">
                      Assess
                    </TabsTrigger>
                    <TabsTrigger value="treatment" className="shrink-0 px-2.5 text-xs sm:flex-1 sm:px-3 sm:text-sm">
                      Treatments
                    </TabsTrigger>
                    <TabsTrigger value="destination" className="shrink-0 px-2.5 text-xs sm:flex-1 sm:px-3 sm:text-sm">
                      Transport
                    </TabsTrigger>
                    <TabsTrigger value="radioReport" className="shrink-0 px-2.5 text-xs sm:flex-1 sm:px-3 sm:text-sm">
                      <span className="sm:hidden">SBAR</span>
                      <span className="hidden sm:inline">Radio report</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="story" className="mt-0 flex flex-col p-4 pt-4 focus-visible:outline-none">
                  <div className="max-h-[min(42vh,16rem)] overflow-y-auto rounded-md border bg-muted/20 p-3 sm:max-h-[min(52vh,20rem)]">
                    <div className="space-y-3">
                      {messages.map((m, i) => (
                        <div
                          key={i}
                          className={
                            m.role === "user"
                              ? "ml-4 rounded-lg bg-primary/10 p-3 text-sm"
                              : m.role === "system"
                                ? "text-center text-xs text-muted-foreground"
                                : "mr-4 rounded-lg border bg-muted/40 p-3 text-sm"
                          }
                        >
                          {m.role === "user" ? (
                            <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">You</p>
                          ) : m.role === "assistant" ? (
                            <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Patient / scene</p>
                          ) : (
                            <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                              Receiving hospital (radio)
                            </p>
                          )}
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="assessment" className="mt-0 flex flex-col gap-3 p-4 pt-4 focus-visible:outline-none">
                  <Label className="text-xs font-normal text-muted-foreground">Shortcuts (tap to append)</Label>
                  <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => quickAssess("Request a 4-lead ECG reading.")}>
                        <FileHeart className="mr-2 size-4" /> 4‑Lead
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => quickAssess("Request a 12-lead ECG reading.")}>
                        <FileHeart className="mr-2 size-4" /> 12‑Lead
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => quickAssess("Check blood glucose level.")}>
                        <Droplets className="mr-2 size-4" /> Glucose
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => quickAssess("Check patient's temperature.")}>
                        <Thermometer className="mr-2 size-4" /> Temp
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => quickAssess("Check end-tidal CO2 reading.")}>
                        <Waves className="mr-2 size-4" /> EtCO₂
                      </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landing-assessment">Assessment & scene notes</Label>
                    <Textarea
                      id="landing-assessment"
                      rows={5}
                      value={assessmentInput}
                      onChange={(e) => setAssessmentInput(e.target.value)}
                      disabled={isLoading || atTurnLimit || patientDeceased}
                      placeholder="Primary assessment, SAMPLE history, interventions you performed…"
                      className="min-h-[7.5rem] resize-y text-base sm:min-h-[120px]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="treatment" className="mt-0 flex max-h-[min(72vh,38rem)] flex-col gap-3 overflow-hidden p-4 pt-4 focus-visible:outline-none">
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                    <Label className="mb-3 block">Choose structured treatments ({availableInterventions.length} available)</Label>
                    <div className="grid grid-cols-1 gap-3 pb-1">
                      {availableInterventions.map((t) => {
                        const showSubs =
                          !!(selectedTreatments[t.id]?.selected && t.subOptions && t.subOptions.length > 0);
                        const tid = `landing-tr-${t.id}`;
                        return (
                          <div key={t.id} className={cn(showSubs && "rounded-md border bg-muted/20 p-3")}>
                            <div className="flex gap-2">
                              <Checkbox
                                id={tid}
                                checked={selectedTreatments[t.id]?.selected || false}
                                onCheckedChange={(c) => handleTreatmentSelection(t.id, c)}
                                className="mt-0.5"
                              />
                              <label htmlFor={tid} className="cursor-pointer text-sm font-medium leading-snug">
                                {t.name}
                              </label>
                            </div>
                            {showSubs && (
                              <div className="mt-3 ml-7 grid gap-2 border-l-2 border-primary/40 pl-3 sm:grid-cols-2">
                                {t.subOptions!.map((so) => (
                                  <div key={so.label} className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{so.label}</Label>
                                    <Select
                                      onValueChange={(v) => handleSubOptionChange(t.id, so.label, v)}
                                      value={
                                        selectedTreatments[t.id]?.subOptions?.[so.label] ?? so.options[0]
                                      }
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {so.options.map((opt) => (
                                          <SelectItem key={opt} value={opt}>
                                            {opt}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-3 shrink-0 space-y-2 border-t pt-3">
                    <Label htmlFor="landing-treatment-notes">Extra treatment narrative (optional)</Label>
                    <Textarea
                      id="landing-treatment-notes"
                      rows={3}
                      value={treatmentNotesInput}
                      onChange={(e) => setTreatmentNotesInput(e.target.value)}
                      disabled={isLoading || atTurnLimit || patientDeceased}
                      placeholder="Narrative or items not listed above."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="destination" className="mt-0 flex flex-col gap-5 p-4 pt-4 focus-visible:outline-none">
                  <RadioGroup
                    value={selectedHospitalId ?? ""}
                    onValueChange={(v) => setSelectedHospitalId(v || null)}
                    className="space-y-3"
                  >
                    {filteredHospitals.map((h) => (
                      <label
                        key={h.id}
                        htmlFor={`landing-h-${h.id}`}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      >
                        <RadioGroupItem value={h.id} id={`landing-h-${h.id}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap justify-between gap-2">
                            <span className="font-semibold">{h.name}</span>
                            {scenario.hospitalDistances[h.id] !== undefined && (
                              <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                <MapPin className="size-3.5 shrink-0" />
                                ~{scenario.hospitalDistances[h.id]} min
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {h.capabilities.map((cap) => (
                              <Badge key={cap} variant="outline" className="text-[10px] capitalize">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>

                  <div>
                    <Label className="mb-2 block">Transport mode</Label>
                    <RadioGroup
                      value={transportMode}
                      onValueChange={(v) => setTransportMode(v as "Routine" | "Emergency")}
                      className="flex flex-wrap gap-3"
                    >
                      <label
                        htmlFor="landing-mode-routine"
                        className="flex flex-1 min-w-[120px] cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 has-[:checked]:bg-muted"
                      >
                        <RadioGroupItem value="Routine" id="landing-mode-routine" />
                        <Truck className="size-4" /> Routine
                      </label>
                      <label
                        htmlFor="landing-mode-em"
                        className="flex flex-1 min-w-[120px] cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 has-[:checked]:bg-muted"
                      >
                        <RadioGroupItem value="Emergency" id="landing-mode-em" />
                        <Siren className="size-4" /> Lights &amp; sirens
                      </label>
                    </RadioGroup>
                  </div>
                </TabsContent>

                <TabsContent value="radioReport" className="mt-0 flex flex-col gap-4 p-4 pt-4 focus-visible:outline-none">
                  <p className="text-sm text-muted-foreground">
                    AI-generated <strong className="text-foreground">SBAR-style</strong> hospital handoff from your action log and vitals (same engine as logged-in simulations).{" "}
                    <strong className="text-foreground">Submit radio report</strong> transmits to the simulated receiving ED — you get ED acknowledgement plus updated patient/scene replies in the Scene log; that submit counts toward the demo AI limit.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto sm:flex-initial"
                      onClick={() => void handleGenerateRadioReport()}
                      disabled={isGeneratingRadio || isLoading || patientDeceased}
                    >
                      {isGeneratingRadio ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Radio className="mr-2 size-4" />
                          Generate radio report
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      className="w-full sm:w-auto sm:flex-initial"
                      onClick={() => void submitRadioReport()}
                      disabled={
                        isLoading ||
                        isGeneratingRadio ||
                        atTurnLimit ||
                        patientDeceased ||
                        !radioReportInput.trim() ||
                        radioReportInput === "Generating…"
                      }
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Hospital className="mr-2 size-4" />
                          Submit radio report
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landing-radio-report">Hospital radio report — edit before use</Label>
                    <Textarea
                      id="landing-radio-report"
                      rows={10}
                      value={radioReportInput}
                      onChange={(e) => setRadioReportInput(e.target.value)}
                      readOnly={isGeneratingRadio}
                      placeholder="Tap Generate radio report above. You can revise the wording here."
                      className="min-h-[12rem] resize-y font-mono text-sm leading-relaxed"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex flex-wrap gap-3 border-t p-4 sm:p-5">
                <Button
                  size="lg"
                  className="flex-1 min-w-[220px]"
                  onClick={() => void submitStep()}
                  disabled={isLoading || atTurnLimit || patientDeceased}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Updating patient…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-4" /> Send step to AI patient
                    </>
                  )}
                </Button>
                {patientDeceased ? (
                  <Button variant="outline" disabled>
                    Unlock unlimited <ArrowRight className="ml-2 size-4" />
                  </Button>
                ) : (
                  <Button variant="outline" asChild>
                    <Link href="/signup">
                      Unlock unlimited <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </Card>

            <p className="text-center text-xs text-muted-foreground">
              Educational simulation only — not medical advice. Do not enter real PHI.{" "}
              <Hospital className="inline size-3 align-text-bottom opacity-70" /> Hospital ETA is illustrative.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
