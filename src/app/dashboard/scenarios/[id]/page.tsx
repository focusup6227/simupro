

"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { Message, Scenario, User as UserType, UserRole, UserAction, ArrestRhythmKind, PartnerSimulationRole, DoctorPersonality } from "@/lib/types";
import { stripGradingMarkers, BP_GRADING_MANUAL_MARKER } from "@/lib/bp-grading-adjust";
import type { EcgRhythmKind } from "@/lib/ecg-rhythm";
import { shockableArrestRhythm } from "@/lib/ecg-rhythm";
import { effectiveSimulationRole, isTesterOrAdminUser } from "@/lib/user-permissions";
import {
  rollPartnerForUser,
  partnerAvatarLetter,
  PARTNER_DELEGATION_MARKER,
  canIssueProactiveAdvice,
  mandatoryLikelyUnmet,
  partnerCanPerform,
} from "@/lib/partner";
import type { Json } from "@/lib/supabase/database.types";
import type { Intervention } from "@/types/protocol";
import { toLicensureLevel } from "@/types/protocol";
import { seedInterventions } from "@/lib/interventions-data";
import { useProtocolStore, monitorMenuRowsToScenarioOverlay } from "@/stores/protocol-store";
import { getPatientResponse, generateRadioReport, getPartnerAdvice, runPartnerInstruction, runHospitalHandover } from "@/app/actions";
import { bumpTrainingStreakAfterSuccessfulSimulation } from "@/app/training-actions";
import { AlertCircle, ArrowRight, Activity, Clock, Flag, Hospital, MapPin, MessageSquare, Siren, SquareTerminal, Stethoscope, Syringe, User, Truck, Droplets, Thermometer, PhoneCall, Pause, Play, Zap, ListChecks, BookOpen, Star, Lock, Mic, MicOff } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useDoc,
  useSupabase,
  useUser,
  useMemoSupabase,
  useDashboardProfile,
} from "@/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { hospitals } from "@/lib/hospitals-data";
import { Badge } from "@/components/ui/badge";
import { InterventionTile } from "@/components/intervention-tile";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { UserGuide } from "@/components/user-guide";
import { UnifiedCardiacMonitor } from "@/components/unified-cardiac-monitor";
import { EquipmentDrawer } from "@/components/equipment-drawer";
import { PartnerPanel, type PartnerAdviceItem } from "@/components/partner-panel";
import { FeatureTour } from "@/components/feature-tour";
import {
  WELCOME_TOUR_ANCHORS,
  WELCOME_TOUR_STEPS,
  WELCOME_TOUR_STORAGE_KEY,
} from "@/lib/welcome-tour-steps";
import { listPkDoses, recordPkDoses } from "@/app/pk-actions";
import { listAutonomicEvents, recordAutonomicEvents } from "@/app/autonomic-actions";
import { ENABLE_AUTONOMIC_ENGINE, ENABLE_METABOLIC_ENGINE, ENABLE_PHARMACOKINETICS_ENGINE } from "@/lib/feature-flags";
import { learnerMayOpenScenario } from "@/lib/scenario-catalog-visibility";
import { summarizeRecentMedications } from "@/lib/pk-recent-medications";
import { parseTreatmentSelectionsToDoses } from "@/lib/physiology/dose-parser";
import { parseTreatmentSelectionsToStressors, aiStressorRowToAutonomicEvent } from "@/lib/physiology/intervention-stressor-parser";
import type { DoseRecord } from "@/lib/physiology/pk-types";
import { usePharmacokineticsTick } from "@/hooks/use-pharmacokinetics-tick";
import { useAutonomicTick } from "@/hooks/use-autonomic-tick";
import { useMetabolicTick } from "@/hooks/use-metabolic-tick";
import { applyEquipmentFromTreatmentSelections } from "@/lib/equipment-sync";
import { snapshotVitalsForAction } from "@/lib/action-vitals-snapshot";
import { resolveScenarioWeightKg } from "@/lib/physiology/scenario-physiology-defaults";
import { usePkStore } from "@/stores/pk-store";
import { useAutonomicStore } from "@/stores/autonomic-store";
import { useMetabolicStore } from "@/stores/metabolic-store";
import { usePhysiologyStore, scenarioVitalsFromStore } from "@/stores/physiology-store";
import { useScenarioMonitorPipStore } from "@/stores/scenario-monitor-pip-store";
import { AedPanel } from "@/components/aed-panel";
import { RhythmIdQuiz } from "@/components/rhythm-id-quiz";
import { recordRhythmQuizAttempt } from "@/lib/rhythm-quiz-attempts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useShallow } from "zustand/shallow";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from "next/link";


type SelectedTreatments = { 
  [interventionId: string]: {
    selected: boolean;
    subOptions: { [label: string]: string };
  }
};

type ActiveTab =
  | "assessment"
  | "treatment"
  | "destination"
  | "radioReport"
  | "cardiacArrest"
  | "handover";

/** Names used for the receiving ER physician at hospital handover. */
const DOCTOR_NAME_POOL = [
  "Patel",
  "Nguyen",
  "Kim",
  "Garcia",
  "Hoffman",
  "Reyes",
  "Okafor",
  "Wexler",
  "Brennan",
  "Tanaka",
  "Adesanya",
  "Sharma",
] as const;

function pickDoctorName(): string {
  const idx = Math.floor(Math.random() * DOCTOR_NAME_POOL.length);
  return DOCTOR_NAME_POOL[idx]!;
}

const reportIssueSchema = z.object({
  message: z.string().min(10, {
    message: "Please provide a detailed description of the issue (minimum 10 characters).",
  }),
});

type ReportIssueFormValues = z.infer<typeof reportIssueSchema>;

const badAiResponseSchema = z.object({
  comment: z.string().min(10, {
    message: "Please explain what was wrong with this reply (minimum 10 characters).",
  }),
});

type BadAiResponseFormValues = z.infer<typeof badAiResponseSchema>;

type DictationTarget =
  | "assessment"
  | "radioReport"
  | "medicalDirection"
  | "partnerInstruction"
  | "handover";

/**
 * Silence (ms) in hands-free mode after which we auto-submit the Assessment
 * box. Picked to be long enough that the learner can pause to think mid-line
 * but short enough that a clinical statement gets fired off promptly.
 */
const HANDS_FREE_AUTO_SUBMIT_MS = 3500;
/** Backoff before restarting recognition after onend in hands-free mode. */
const HANDS_FREE_RESTART_MS = 250;

/** Pixels from bottom to treat as “still following” the live tail (auto-scroll). */
const SIMULATION_LOG_NEAR_BOTTOM_PX = 80;

interface SpeechRecognitionEventLike extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
    length: number;
  };
}

/** https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent */
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

function speechRecognitionErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was denied. Allow microphone for this site in your browser settings, use HTTPS (or localhost), then try again.";
    case "audio-capture":
      return "No microphone was found or it is busy. Plug in a mic, close other apps using it, and try again.";
    case "network":
      return "Speech recognition couldn’t reach the recognition service (often a network block or Chromium using Google backends). Check your connection, VPN, firewall, or try another browser.";
    case "no-speech":
      return "Nothing was heard — speak after tapping Speak, stay close to the mic, then try again.";
    case "language-not-supported":
      return "This browser doesn’t support English (en-US) speech recognition — try Chrome or Edge.";
    case "aborted":
    case "canceled":
      return "";
    default:
      return code
        ? `Speech recognition failed (${code}). Please try again or type instead.`
        : "Speech recognition failed. Please try again.";
  }
}

function roleKeyForMandatory(
  role: UserRole,
  user: UserType | null,
): "emt" | "aemt" | "paramedic" {
  if (role === "emt" || role === "aemt" || role === "paramedic") return role;
  const e = effectiveSimulationRole(user ?? undefined);
  if (e === "emt" || e === "aemt" || e === "paramedic") return e;
  return "emt";
}

function monitorMenuOptsFromScenario(s: Scenario) {
  return {
    scenarioMedications: s.monitorMenuMedications ?? [],
    scenarioInterventions: s.monitorMenuInterventions ?? [],
  };
}

function parsePartnerRow(row: {
  partner_role?: string | null;
  partner_name?: string | null;
}): { name: string; role: PartnerSimulationRole } | null {
  const pr = row.partner_role;
  const pn = row.partner_name;
  if (!pr || !pn) return null;
  if (pr !== "emt" && pr !== "aemt" && pr !== "paramedic") return null;
  return { role: pr, name: pn };
}

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function SimulationPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useSupabase();
  const { user: authUser } = useUser();

  const scenarioSpec = useMemoSupabase(
    () =>
      supabase && id
        ? ({ table: 'scenarios', id, live: false } as const)
        : null,
    [supabase, id]
  );
  const { data: scenario, isLoading: isLoadingScenario } = useDoc<Scenario>(scenarioSpec);

  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('emt');

  const { data: userData, isLoading: isUserDataLoading } = useDashboardProfile();

  useEffect(() => {
    if (userData) {
      if (userData.role === 'tester') {
        setCurrentUserRole(userData.testRole || 'emt');
      } else {
        setCurrentUserRole(userData.role);
      }
    }
  }, [userData]);

  useEffect(() => {
    useProtocolStore.getState().setUserLevel(toLicensureLevel(currentUserRole));
  }, [currentUserRole]);

  useEffect(() => {
    if (!scenario) return;
    const { scenarioMedications, scenarioInterventions } = monitorMenuOptsFromScenario(scenario);
    useProtocolStore.getState().setScenarioOverlay(
      monitorMenuRowsToScenarioOverlay(scenarioMedications, scenarioInterventions),
    );
    return () => {
      useProtocolStore.getState().clearScenarioOverlay();
    };
  }, [scenario]);

  useEffect(() => {
    if (isLoadingScenario || isUserDataLoading || !scenario) return;
    const staff = isTesterOrAdminUser(userData);
    if (learnerMayOpenScenario(id, staff)) return;
    router.replace("/dashboard/scenarios");
  }, [isLoadingScenario, isUserDataLoading, scenario, id, userData, router]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const vitalsHr = usePhysiologyStore((s) => s.hr);
  const vitalsReady = Boolean(vitalsHr);
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentInput, setAssessmentInput] = useState('');
  const [radioReportInput, setRadioReportInput] = useState('');
  const [medicalDirectionInput, setMedicalDirectionInput] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatments>({});
  const [selectedDestination, setSelectedDestination] = useState<string | undefined>(undefined);
  const [transportMode, setTransportMode] = useState<'Routine' | 'Emergency' | undefined>(undefined);
  const [time, setTime] = useState(0);
  const simulationTimeRef = useRef(0);
  simulationTimeRef.current = time;
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  const [simulationEnded, setSimulationEnded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("assessment");
  const [endSimAlertOpen, setEndSimAlertOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnalyzingAED, setIsAnalyzingAED] = useState(false);
  const [cprStarted, setCprStarted] = useState(false);
  /** Latest rhythm kind currently being rendered on the monitor (for the rhythm-ID quiz). */
  const [observedRhythm, setObservedRhythm] = useState<EcgRhythmKind | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [badAiReportOpen, setBadAiReportOpen] = useState(false);
  const [badAiReportMessageIndex, setBadAiReportMessageIndex] = useState<number | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [activeDictationTarget, setActiveDictationTarget] = useState<DictationTarget | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /**
   * Hands-free mode: mic stays on, transcript appends to the Assessment box,
   * and after a brief silence the assessment auto-submits.
   */
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const handsFreeModeRef = useRef(false);
  const [partnerInstructionInput, setPartnerInstructionInput] = useState("");
  const [handoverInput, setHandoverInput] = useState("");
  const simulationLogScrollRef = useRef<HTMLDivElement>(null);
  const simulationLogNearBottomRef = useRef(true);
  const lastLearnerActionSimTimeRef = useRef<number | null>(null);
  const lastProactiveCheckSimTimeRef = useRef<number | null>(null);
  const lastPartnerSpeechSimTimeRef = useRef<number | null>(null);
  const recentProactiveAdviceRef = useRef<{ text: string; simTime: number }[]>([]);
  const proactiveInFlightRef = useRef(false);
  /** Avoid wiping physiology on re-fetch/tab-focus remount; only reset when switching scenario routes. */
  const prevScenarioRouteIdRef = useRef<string | null>(null);

  const [partner, setPartner] = useState<{
    name: string;
    role: PartnerSimulationRole;
  } | null>(null);
  const [partnerAdviceHistory, setPartnerAdviceHistory] = useState<PartnerAdviceItem[]>([]);

  /**
   * Hospital handover state. The receiving ER physician spawns the moment
   * the destination is confirmed; learner and doctor exchange turns until
   * `readyToOffload` is true, at which point the "Offload PT" button
   * unlocks and ends the scenario.
   */
  const [doctorIdentity, setDoctorIdentity] = useState<{
    name: string;
    personality?: DoctorPersonality;
  } | null>(null);
  const [handoverTurns, setHandoverTurns] = useState<
    { speaker: 'learner' | 'doctor'; text: string }[]
  >([]);
  const [handoverReadyToOffload, setHandoverReadyToOffload] = useState(false);
  const [handoverBusy, setHandoverBusy] = useState(false);
  const [doctorCritique, setDoctorCritique] = useState<string[]>([]);

  const partnerScopeInterventions = useMemo(() => {
    if (!partner) return [];
    return seedInterventions.filter((i) => partnerCanPerform(i, partner.role));
  }, [partner]);

  /** Drives pediatric chatter / dose overrides in the partner panel. */
  const isPediatricScenario = useMemo(() => {
    const band = scenario?.ageBand;
    return Boolean(band && band !== 'adult');
  }, [scenario?.ageBand]);

  const protocolMergeDeps = useProtocolStore(
    useShallow((s) => ({
      userLevel: s.userLevel,
      scenarioOverlay: s.scenarioOverlay,
      customOverrides: s.customOverrides,
    })),
  );
  const availableInterventions = useMemo(
    () => useProtocolStore.getState().availableInterventions(),
    // Zustand `getState()` hides reactive deps; `protocolMergeDeps` (useShallow) is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [protocolMergeDeps],
  );

  const reportForm = useForm<ReportIssueFormValues>({
    resolver: zodResolver(reportIssueSchema),
  });

  const badAiForm = useForm<BadAiResponseFormValues>({
    resolver: zodResolver(badAiResponseSchema),
    defaultValues: { comment: "" },
  });

  /** Assistant-only rows for “bad reply” reporting (index is position in full `messages` array). */
  const assistantReplyPicklist = useMemo(() => {
    const out: { index: number; preview: string }[] = [];
    messages.forEach((m, i) => {
      if (m.role !== "assistant") return;
      const raw = stripGradingMarkers(m.content);
      const preview = raw.length > 160 ? `${raw.slice(0, 160)}…` : raw;
      out.push({ index: i, preview });
    });
    return out;
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const speechWindow = window as SpeechRecognitionWindow;
    const hasSpeechApi = Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition);
    setIsSpeechSupported(hasSpeechApi);
  }, []);

  const stopDictation = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.onend = null;
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setActiveDictationTarget(null);
  }, []);

  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.stop();
      }
    };
  }, []);

  const onSimulationLogScroll = useCallback(() => {
    const el = simulationLogScrollRef.current;
    if (!el) return;
    simulationLogNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < SIMULATION_LOG_NEAR_BOTTOM_PX;
  }, []);

  useEffect(() => {
    const el = simulationLogScrollRef.current;
    if (!el || !simulationLogNearBottomRef.current) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, isLoading, isAnalyzingAED]);

  const appendTranscriptToTarget = useCallback((target: DictationTarget, transcript: string) => {
    const normalized = transcript.trim();
    if (!normalized) return;
    const join = (prev: string) =>
      `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${normalized}`;
    switch (target) {
      case "assessment":
        setAssessmentInput(join);
        break;
      case "radioReport":
        setRadioReportInput(join);
        break;
      case "medicalDirection":
        setMedicalDirectionInput(join);
        break;
      case "partnerInstruction":
        setPartnerInstructionInput(join);
        break;
      case "handover":
        setHandoverInput(join);
        break;
    }
  }, []);

  const startDictation = useCallback((target: DictationTarget) => {
    if (typeof window === "undefined") return;
    const speechWindow = window as SpeechRecognitionWindow;
    const RecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      toast({
        title: "Speech not supported",
        description: "Your browser does not support speech-to-text.",
        variant: "destructive",
      });
      return;
    }

    // Manually starting a non-assessment target while hands-free is active
    // would bounce them straight back to assessment; turn hands-free off so
    // the user gets the target they asked for.
    if (handsFreeModeRef.current && target !== "assessment") {
      handsFreeModeRef.current = false;
      setHandsFreeMode(false);
    }

    if (activeDictationTarget && activeDictationTarget !== target) {
      stopDictation();
    }

    if (activeDictationTarget === target) {
      // Toggling off the active target — if hands-free is on for assessment,
      // also turn it off so the auto-restart effect doesn't re-launch us.
      if (handsFreeModeRef.current && target === "assessment") {
        handsFreeModeRef.current = false;
        setHandsFreeMode(false);
      }
      stopDictation();
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const latest = event.results[event.results.length - 1]?.[0]?.transcript || "";
      appendTranscriptToTarget(target, latest);
    };

    recognition.onerror = (event: Event) => {
      const code = (event as SpeechRecognitionErrorEventLike).error ?? "";
      stopDictation();
      if (code === "aborted") return;
      const description = speechRecognitionErrorMessage(code);
      if (!description) return;
      toast({
        title: "Dictation couldn’t continue",
        description,
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setActiveDictationTarget(null);
      speechRecognitionRef.current = null;
    };

    speechRecognitionRef.current = recognition;
    setActiveDictationTarget(target);
    try {
      recognition.start();
    } catch {
      toast({
        title: "Couldn’t start dictation",
        description: "Recognition was interrupted. Wait a moment, then tap Speak again.",
        variant: "destructive",
      });
      stopDictation();
    }
  }, [activeDictationTarget, appendTranscriptToTarget, stopDictation, toast]);

  // Keep the hands-free flag mirrored into a ref so callbacks (e.g. recognition
  // event handlers, setTimeouts) can read the *current* value without
  // capturing a stale closure.
  useEffect(() => {
    handsFreeModeRef.current = handsFreeMode;
  }, [handsFreeMode]);

  // Stable ref pointing at the latest handleSubmitAssessment. Lets the
  // hands-free auto-submit timer call into the live function without making
  // the effect re-run on every assessmentInput keystroke.
  const handleSubmitAssessmentRef = useRef<() => void>(() => {});

  const toggleHandsFreeMode = useCallback(() => {
    if (!isSpeechSupported) {
      toast({
        title: "Speech not supported",
        description: "Your browser does not support speech-to-text.",
        variant: "destructive",
      });
      return;
    }
    setHandsFreeMode((prev) => {
      // Either toggling on or off: stop any in-flight recognition; the
      // auto-restart effect will (re)start it on the next tick if mode is on.
      stopDictation();
      const next = !prev;
      handsFreeModeRef.current = next;
      return next;
    });
  }, [isSpeechSupported, stopDictation, toast]);

  /** Most recent arrestRhythm value emitted by the patient AI. Null = not arrested. */
  const currentArrestRhythm: ArrestRhythmKind | null = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]!;
      if (m.role !== 'assistant') continue;
      // First non-arrest assistant message clears any prior arrestRhythm.
      return (m.arrestRhythm as ArrestRhythmKind | undefined) ?? null;
    }
    return null;
  }, [messages]);

  const isCardiacArrestScenario = useMemo(() => {
    if (scenario?.category === 'cardiac-arrest') return true;
    if (currentArrestRhythm) return true;
    const hr = (vitalsHr ?? '').toLowerCase();
    return /asystole|v-?fib|pulseless|pea\b|cardiac arrest|no pulse/.test(hr);
  }, [scenario, vitalsHr, currentArrestRhythm]);

  const hasROSC = useMemo(() => {
    if (!isCardiacArrestScenario || !vitalsReady) return false;
    if (currentArrestRhythm) return false;
    const hr = vitalsHr.toLowerCase();
    if (/asystole|v-?fib|pulseless|pea\b|no pulse|0\s*bpm/.test(hr)) return false;
    return parseInt(hr, 10) > 0;
  }, [isCardiacArrestScenario, vitalsReady, vitalsHr, currentArrestRhythm]);

  /** Translate the AI's arrest-rhythm enum into the broader EcgRhythmKind union. */
  const monitorForcedRhythm: EcgRhythmKind | null = useMemo(() => {
    if (currentArrestRhythm) return currentArrestRhythm as EcgRhythmKind;
    if (scenario?.initialRhythm) return scenario.initialRhythm as EcgRhythmKind;
    return null;
  }, [currentArrestRhythm, scenario]);

  useEffect(() => {
    if (!scenario) return;
    if (simulationEnded) {
      useScenarioMonitorPipStore.getState().clearPip();
      return;
    }
    if (vitalsReady) {
      useScenarioMonitorPipStore.getState().setPipSurface({
        scenario,
        cprActive: cprStarted && !hasROSC,
        forcedRhythm: monitorForcedRhythm,
        pulseless: Boolean(currentArrestRhythm),
        simulationEnded: false,
      });
    }
  }, [
    scenario,
    vitalsReady,
    simulationEnded,
    cprStarted,
    hasROSC,
    monitorForcedRhythm,
    currentArrestRhythm,
  ]);

  const [hasGivenReport, setHasGivenReport] = useState(false);
  const canEndSimulation = !!selectedDestination && hasGivenReport;
  
  // Auto-show the arrest tab when the AI declares a structured arrest rhythm
  // (mid-scenario codes), or when the user has already started CPR on a
  // category='cardiac-arrest' scenario.
  const showCardiacArrestTab =
    isCardiacArrestScenario && !hasROSC && (cprStarted || Boolean(currentArrestRhythm));

  useEffect(() => {
    if (showCardiacArrestTab || simulationEnded) {
      stopDictation();
    }
  }, [showCardiacArrestTab, simulationEnded, stopDictation]);

  // When the cardiac-arrest tab takes over (or the run ends), don't let
  // hands-free mode keep the mic alive — it would conflict with the AED panel
  // and rapidly re-arm auto-submit on stale state.
  useEffect(() => {
    if ((showCardiacArrestTab || simulationEnded) && handsFreeModeRef.current) {
      handsFreeModeRef.current = false;
      setHandsFreeMode(false);
    }
  }, [showCardiacArrestTab, simulationEnded]);

  // Hands-free auto-restart: when hands-free is on and recognition has ended
  // (Chrome stops it after silence/timeouts even with continuous=true),
  // re-start it after a small backoff so the mic stays effectively "open".
  useEffect(() => {
    if (!handsFreeMode) return;
    if (activeDictationTarget !== null) return;
    if (simulationEnded || showCardiacArrestTab) return;
    const t = setTimeout(() => {
      if (!handsFreeModeRef.current) return;
      if (speechRecognitionRef.current) return;
      startDictation("assessment");
    }, HANDS_FREE_RESTART_MS);
    return () => clearTimeout(t);
  }, [handsFreeMode, activeDictationTarget, simulationEnded, showCardiacArrestTab, startDictation]);

  // Hands-free auto-submit: each time the assessment text grows (a new
  // utterance was transcribed), arm a single-shot timer. If the learner
  // stays silent past HANDS_FREE_AUTO_SUBMIT_MS we fire the assessment.
  useEffect(() => {
    if (!handsFreeMode) return;
    const text = assessmentInput.trim();
    if (!text) return;
    if (isLoading || simulationEnded || showCardiacArrestTab) return;
    const t = setTimeout(() => {
      handleSubmitAssessmentRef.current();
    }, HANDS_FREE_AUTO_SUBMIT_MS);
    return () => clearTimeout(t);
  }, [handsFreeMode, assessmentInput, isLoading, simulationEnded, showCardiacArrestTab]);

   useEffect(() => {
    if (showCardiacArrestTab) {
      setActiveTab("cardiacArrest");
    } else if (hasROSC && activeTab === 'cardiacArrest') {
      setActiveTab("assessment");
    }
  }, [showCardiacArrestTab, hasROSC, activeTab]);


  // Effect to start the simulation and create the session document
   useEffect(() => {
    if (!scenario || !authUser || !supabase || sessionId || !userData) return;

    const canStartPremium =
      !scenario.isPremium ||
      isTesterOrAdminUser(userData) ||
      userData.isPremium;

    if (!canStartPremium) {
      router.push('/billing');
      return;
    }

    const startSimulation = async () => {
      const scenarioWeightKg = resolveScenarioWeightKg(scenario);
      try {
        const { data: existing, error: existingError } = await supabase
          .from('simulation_sessions')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('scenario_id', scenario.id)
          .eq('status', 'in-progress')
          .order('start_time', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingError) throw existingError;

        if (existing) {
          setSessionId(existing.id);

          const restoredMessages = (existing.messages as Message[] | null) ?? null;
          const restoredActions = (existing.actions as UserAction[] | null) ?? [];

          if (restoredMessages && restoredMessages.length > 0) {
            setMessages([
              { role: 'system', content: 'Resumed previous simulation. Continuing where you left off.' },
              ...restoredMessages,
            ]);
            const lastVitals = [...restoredMessages].reverse().find((m) => m.vitals)?.vitals;
            usePhysiologyStore.getState().loadScenario(lastVitals ?? scenario.initialVitals, {
              weightKg: scenarioWeightKg,
              ...monitorMenuOptsFromScenario(scenario),
            });
          } else {
            usePhysiologyStore.getState().loadScenario(scenario.initialVitals, {
              weightKg: scenarioWeightKg,
              ...monitorMenuOptsFromScenario(scenario),
            });
            const initialMessage: Message = { role: 'assistant', content: scenario.details, vitals: scenario.initialVitals };
            setMessages([
              { role: 'system', content: 'Resumed previous simulation. Continuing where you left off.' },
              initialMessage,
            ]);
          }

          setUserActions(restoredActions);
          if (typeof existing.time_elapsed === 'number') {
            setTime(existing.time_elapsed);
          }

          {
            let p = parsePartnerRow(existing);
            if (!p) {
              p = rollPartnerForUser(effectiveSimulationRole(userData));
              await supabase
                .from('simulation_sessions')
                .update({
                  partner_role: p.role,
                  partner_name: p.name,
                })
                .eq('id', existing.id)
                .eq('user_id', authUser.id);
            }
            setPartner(p);
          }

          if (ENABLE_PHARMACOKINETICS_ENGINE) {
            void listPkDoses(existing.id)
              .then((doses) => usePkStore.getState().ingestHydratedDoses(doses))
              .catch((e: unknown) => console.error('listPkDoses', e));
          }
          if (ENABLE_AUTONOMIC_ENGINE) {
            void listAutonomicEvents(existing.id)
              .then((events) =>
                useAutonomicStore.getState().ingestHydratedEvents(events),
              )
              .catch((e: unknown) => console.error('listAutonomicEvents', e));
          }
          return;
        }

        const newSessionId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const rolled = rollPartnerForUser(effectiveSimulationRole(userData));
        const { error } = await supabase.from('simulation_sessions').insert({
          id: newSessionId,
          user_id: authUser.id,
          scenario_id: scenario.id,
          scenario_title: scenario.title,
          status: 'in-progress',
          user_role: effectiveSimulationRole(userData),
          partner_role: rolled.role,
          partner_name: rolled.name,
        });
        if (error) throw error;

        setSessionId(newSessionId);
        setPartner(rolled);
        usePhysiologyStore.getState().loadScenario(scenario.initialVitals, {
          weightKg: scenarioWeightKg,
          ...monitorMenuOptsFromScenario(scenario),
        });

        const initialMessage: Message = { role: 'assistant', content: scenario.details, vitals: scenario.initialVitals };

        const seededMessages: Message[] = [
          { role: 'system', content: 'Simulation Started. Patient details loaded.'},
          initialMessage,
        ];

        // Tutorial-only: scripted partner intro that walks the learner into the
        // first concrete steps. Keeps fresh users from staring at a blank
        // monitor + tab list while the AI flows warm up.
        if (scenario.id === 'welcome-tutorial' && !userData?.hasCompletedTutorial) {
          seededMessages.push({
            role: 'partner',
            content:
              `Hey, I'm ${rolled.name} — your ${rolled.role.toUpperCase()} partner for this run. ` +
              `Let's keep it simple: open the Equipment drawer on the left and put on the 4-lead and pulse-ox so the monitor lights up, ` +
              `then jump to the Assessment tab and grab a blood glucose. I'll back you up if you get stuck.`,
            partnerName: rolled.name,
            partnerRole: rolled.role,
            urgency: 'low',
          });
        }

        setMessages(seededMessages);

      } catch (e: unknown) {
        console.error('Error starting simulation session:', e);
        toast({
          variant: 'destructive',
          title: 'Error Starting Simulation',
          description:
            e instanceof Error ? e.message : 'Could not create session in the database.',
        });
      }
    };

    void startSimulation();
   }, [scenario, authUser, supabase, sessionId, toast, userData, router]);

  useEffect(() => {
    if (
      prevScenarioRouteIdRef.current !== null &&
      prevScenarioRouteIdRef.current !== id
    ) {
      usePhysiologyStore.getState().reset();
      if (ENABLE_PHARMACOKINETICS_ENGINE) {
        usePkStore.getState().reset();
      }
      if (ENABLE_AUTONOMIC_ENGINE) {
        useAutonomicStore.getState().reset();
      }
      if (ENABLE_METABOLIC_ENGINE) {
        useMetabolicStore.getState().reset();
      }
    }
    prevScenarioRouteIdRef.current = id;
  }, [id]);

  useEffect(() => {
    usePhysiologyStore.getState().setPulseless(Boolean(currentArrestRhythm));
  }, [currentArrestRhythm]);

  /**
   * Auto-launch the welcome feature tour the first time the user opens the
   * orientation scenario. localStorage stops the prompt from re-firing on
   * later visits even if their profile field hasn't synced yet.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sessionId) return;
    if (id !== 'welcome-tutorial') return;
    if (userData?.hasCompletedTutorial) return;
    try {
      if (window.localStorage.getItem(WELCOME_TOUR_STORAGE_KEY) === '1') return;
    } catch {
      // localStorage unavailable; just show the tour.
    }
    const t = window.setTimeout(() => setTourOpen(true), 800);
    return () => window.clearTimeout(t);
  }, [id, sessionId, userData?.hasCompletedTutorial]);

  useEffect(() => {
    if (!supabase || !sessionId || !authUser || simulationEnded) return;
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      void supabase
        .from('simulation_sessions')
        .update({
          messages: messages as unknown as Json,
          actions: userActions as unknown as Json,
          time_elapsed: time,
        })
        .eq('id', sessionId)
        .eq('user_id', authUser.id);
    }, 1500);
    return () => clearTimeout(t);
   }, [supabase, sessionId, authUser, messages, userActions, time, simulationEnded]);


  useEffect(() => {
    if (simulationEnded || isPaused || isAnalyzingAED) return;
    const timer = setInterval(() => {
      setTime(prevTime => prevTime + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [simulationEnded, isPaused, isAnalyzingAED]);
  
  // Every 2 minutes during arrest, prompt the operator (EMT/AEMT/medic) to
  // re-analyze the rhythm. Driven by the in-tab AedPanel for AEDs and by manual
  // pulse/rhythm checks for paramedics — no silent AI call.
  useEffect(() => {
    if (!isCardiacArrestScenario || hasROSC || time === 0 || time % 120 !== 0) return;
    setMessages((prev) => [
      ...prev,
      {
        role: 'system',
        content:
          'Two-minute cycle complete — pause CPR, reassess pulse and rhythm. Re-analyze with the AED or take a rhythm strip.',
      },
    ]);
  }, [time, isCardiacArrestScenario, hasROSC]);

  useEffect(() => {
    if (!scenario || !partner || simulationEnded || isPaused || isLoading || !sessionId) return;

    const mandatory =
      scenario.mandatoryActions[roleKeyForMandatory(currentUserRole, userData)] ?? [];
    const unmet = mandatoryLikelyUnmet(mandatory, userActions);
    const t = time;

    const simIdleLearner =
      lastLearnerActionSimTimeRef.current == null
        ? t > 90
        : t - lastLearnerActionSimTimeRef.current > 90;
    const partnerQuiet =
      lastPartnerSpeechSimTimeRef.current == null
        ? t > 90
        : t - lastPartnerSpeechSimTimeRef.current > 90;

    const tickUnmet = t > 0 && t % 60 === 0 && unmet;
    const idleBoth = simIdleLearner && partnerQuiet && t > 90;

    if (!tickUnmet && !idleBoth) return;
    if (proactiveInFlightRef.current) return;

    if (
      !canIssueProactiveAdvice({
        currentSimTime: t,
        lastUserActionSimTime: lastLearnerActionSimTimeRef.current,
        lastProactiveCheckSimTime: lastProactiveCheckSimTimeRef.current,
        lastAdviceTexts: recentProactiveAdviceRef.current,
      })
    ) {
      return;
    }

    lastProactiveCheckSimTimeRef.current = t;
    proactiveInFlightRef.current = true;

    void (async () => {
      try {
        const lastAssistant = [...messages]
          .reverse()
          .find((m) => m.role === "assistant");
        const priorVitals = scenarioVitalsFromStore() ?? scenario.initialVitals;
        const out = await getPartnerAdvice({
          mode: "proactive",
          partnerRole: partner.role,
          partnerName: partner.name,
          userRole: currentUserRole,
          scenarioSummary: scenario.details.slice(0, 12000),
          mandatoryActions: mandatory,
          recentUserActions: userActions.slice(-6),
          lastPatientCondition: lastAssistant?.conditionChange,
          currentVitals: priorVitals,
          userQuestion: "",
          priorAdviceTexts: [...recentProactiveAdviceRef.current]
            .reverse()
            .map((x) => x.text)
            .slice(0, 6),
          isPediatric: isPediatricScenario,
        });
        if (!out.shouldSpeak || !out.advice.trim()) return;
        if (
          !canIssueProactiveAdvice({
            currentSimTime: t,
            lastUserActionSimTime: lastLearnerActionSimTimeRef.current,
            lastProactiveCheckSimTime: lastProactiveCheckSimTimeRef.current,
            lastAdviceTexts: recentProactiveAdviceRef.current,
            proposedAdviceText: out.advice,
          })
        ) {
          return;
        }

        recentProactiveAdviceRef.current = [
          ...recentProactiveAdviceRef.current.filter((x) => t - x.simTime <= 300),
          { text: out.advice, simTime: t },
        ];
        lastPartnerSpeechSimTimeRef.current = t;

        setPartnerAdviceHistory((h) =>
          [
            ...h,
            {
              id:
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `${t}-${Math.random()}`,
              text: out.advice,
              urgency: out.urgency,
              atSim: t,
            },
          ].slice(-5),
        );

        setMessages((prev) => [
          ...prev,
          {
            role: "partner",
            content: out.advice,
            partnerName: partner.name,
            partnerRole: partner.role,
            urgency: out.urgency,
          },
        ]);
      } catch (e: unknown) {
        console.error(e);
      } finally {
        proactiveInFlightRef.current = false;
      }
    })();
  }, [
    time,
    userActions,
    messages,
    scenario,
    partner,
    simulationEnded,
    isPaused,
    isLoading,
    sessionId,
    currentUserRole,
    userData,
    isPediatricScenario,
  ]);

  usePharmacokineticsTick({
    scenario,
    simSeconds: time,
  });

  useAutonomicTick({
    scenario,
    simSeconds: time,
  });

  useMetabolicTick({
    scenario,
    simSeconds: time,
  });


 const handleEndSimulation = useCallback(async (failed = false) => {
    if (simulationEnded || !scenario || !authUser || !supabase || !sessionId) {
      return;
    }
    setSimulationEnded(true);

    toast({
      title: "Ending Simulation...",
      description: "Saving your session data. You will be redirected shortly.",
    });

    try {
        const { error } = await supabase
          .from('simulation_sessions')
          .update({
            status: failed ? 'failed' : 'completed',
            time_elapsed: time,
            actions: userActions,
            end_time: new Date().toISOString(),
          })
          .eq('id', sessionId)
          .eq('user_id', authUser.id);
        if (error) throw error;

      if (!failed) {
        await bumpTrainingStreakAfterSuccessfulSimulation();
      }

      useScenarioMonitorPipStore.getState().clearPip();
      const url = `/dashboard/scenarios/${id}/report?sessionId=${sessionId}`;
      router.push(url);

    } catch (e: unknown) {
      console.error("Error ending simulation session:", e);
      setSimulationEnded(false);
      toast({
        variant: 'destructive',
        title: 'Error Ending Simulation',
        description: e instanceof Error ? e.message : 'Could not save session data to the database.',
      });
    }
  }, [router, id, time, userActions, toast, scenario, authUser, supabase, simulationEnded, sessionId]);


  const submitAction = useCallback(async (
    actionType: ActiveTab | "medicalDirection" | "cardiacArrest",
    payload: {
      assessment?: string;
      treatments?: string[];
      destination?: string;
      transport?: "Routine" | "Emergency";
    },
    partnerBroadcast?: {
      partnerLine: string;
      partnerName: string;
      partnerRole: PartnerSimulationRole;
    },
  ) => {
    if (!scenario || !userData || isLoading) return;

    setIsLoading(true);

    if (!partnerBroadcast) {
      lastLearnerActionSimTimeRef.current = time;
    } else {
      lastPartnerSpeechSimTimeRef.current = time;
    }

    let rawAssessment = payload.assessment ?? "None";
    if (
      partnerBroadcast &&
      rawAssessment === "None" &&
      (payload.treatments?.length ?? 0) > 0
    ) {
      rawAssessment = `Partner performed: ${(payload.treatments ?? []).join(", ")}.`;
    }
    if (partnerBroadcast && rawAssessment === "None") {
      rawAssessment = "Partner performed delegated action.";
    }

    const assessmentText = partnerBroadcast
      ? `${PARTNER_DELEGATION_MARKER} ${rawAssessment}`
      : rawAssessment;

    const treatmentsArray = payload.treatments || [];
    const destination = payload.destination || null;

    if (
      treatmentsArray.some((t) => /\bcpr\b|cardiopulmonary|resuscitation|compressions/i.test(t)) &&
      !cprStarted
    ) {
      setCprStarted(true);
    }

    let actionDescription = "";
    if (assessmentText !== "None") actionDescription = `Assessment: ${assessmentText}`;
    if (treatmentsArray.length > 0)
      actionDescription = `Treatments: ${treatmentsArray.join(", ")}`;
    if (destination) {
      actionDescription = `Selected Destination: ${destination}`;
      if (payload.transport) {
        actionDescription += ` (Transport: ${payload.transport})`;
      }
    }

    const partnerMessage: Message | null = partnerBroadcast
      ? {
          role: "partner",
          content: partnerBroadcast.partnerLine,
          partnerName: partnerBroadcast.partnerName,
          partnerRole: partnerBroadcast.partnerRole,
        }
      : null;

    const newMessages: Message[] = partnerMessage
      ? [...messages, partnerMessage]
      : [...messages, { role: "user", content: actionDescription }];
    setMessages(newMessages);

    const priorVitalsForAction = scenarioVitalsFromStore() ?? scenario.initialVitals;
    const lastAssistantForContext = [...messages].reverse().find((m) => m.role === 'assistant');
    const contextForAction =
      lastAssistantForContext?.conditionChange ?? scenario.patientProfile.slice(0, 240);

    const newAction: UserAction = {
      time: time,
      assessment: assessmentText,
      treatments: treatmentsArray,
      destination: destination,
      vitalsAtAction: snapshotVitalsForAction(priorVitalsForAction),
      context: contextForAction,
    };
    if (payload.transport) {
      newAction.transportMode = payload.transport;
    }
    const updatedUserActions = [...userActions, newAction];
    setUserActions(updatedUserActions);

    if (actionType === 'radioReport') {
        setHasGivenReport(true);
    }
    if(actionType === 'destination') {
      const hospital = hospitals.find(h => h.id === selectedDestination);
       if (hospital) {
          setHasGivenReport(true); // Technically this is destination confirmed, but it unlocks the end button
          toast({ title: 'Destination Selected', description: `En route to ${hospital.name} via ${payload.transport} transport.`});
       }
    }

    try {
      const lastAssistantMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0];
      const userRole = currentUserRole;
      const mandatoryActionsForRole =
        scenario.mandatoryActions[roleKeyForMandatory(userRole, userData)] || [];
      const priorVitals = scenarioVitalsFromStore() ?? scenario.initialVitals;
      // Engine truth-source for "already deceased" — once any prior assistant
      // message has flagged death, the AI must not "wake the patient up".
      const patientAlreadyDeceased = messages.some(
        (m) => m.role === 'assistant' && m.patientIsDeceased === true,
      );

      const recentMedications = ENABLE_PHARMACOKINETICS_ENGINE
        ? summarizeRecentMedications(
            usePkStore.getState().doses,
            seedInterventions,
            time,
            120,
          )
        : [];

      const autonomicSnapshot = ENABLE_AUTONOMIC_ENGINE
        ? useAutonomicStore.getState().state
        : null;
      const engineSummary =
        autonomicSnapshot != null
          ? `phase=${autonomicSnapshot.decompensationPhase}; bleed=${autonomicSnapshot.currentBleedRateMlPerMin.toFixed(0)}mL/min; vol=${autonomicSnapshot.intravascularVolumeMl.toFixed(0)}mL`
          : undefined;

      const metabolicSnapshot = ENABLE_METABOLIC_ENGINE
        ? (useMetabolicStore.getState().snapshotForAi() ?? undefined)
        : undefined;

      const response = await getPatientResponse({
        scenario: scenario.details,
        assessment: assessmentText,
        treatment: treatmentsArray.join(', '),
        patientCondition: lastAssistantMessage?.conditionChange,
        currentVitals: priorVitals,
        userRole: userRole,
        mandatoryActions: mandatoryActionsForRole,
        userActions: updatedUserActions,
        isPremium: Boolean(scenario.isPremium && userData?.isPremium),
        recentMedications,
        decompensationPhase: autonomicSnapshot?.decompensationPhase,
        engineSummary,
        metabolicSnapshot,
        patientAlreadyDeceased,
      });
      
      const newVitals = response.vitals;
      let updatedMessages = [...newMessages];

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: `${response.patientResponse}`, 
        vitals: newVitals, 
        conditionChange: response.conditionChange
      };

      if (response.arrestRhythm) {
        assistantMessage.arrestRhythm = response.arrestRhythm;
        assistantMessage.arrestRhythmRationale = response.arrestRhythmRationale;
      }
      if (response.patientIsDeceased) {
        assistantMessage.patientIsDeceased = true;
      }

      if (response.medicalDirection) {
        assistantMessage.content = response.medicalDirection;
      }
      
      if (response.hospitalResponse) {
        updatedMessages.push({ role: 'system', content: response.hospitalResponse });
      }

      if (response.patientResponse) {
        updatedMessages.push(assistantMessage);
      }

      if (
        ENABLE_AUTONOMIC_ENGINE &&
        response.stressors &&
        response.stressors.length > 0 &&
        sessionId &&
        userData?.id
      ) {
        const stressEvents = response.stressors
          .map((s) =>
            aiStressorRowToAutonomicEvent({
              kind: s.kind,
              payload: s.payload ?? {},
              simSeconds: time,
              sessionId,
              userId: userData.id,
            }),
          )
          .filter((e): e is NonNullable<typeof e> => Boolean(e));
        if (stressEvents.length > 0) {
          useAutonomicStore.getState().recordLocalEvents(stressEvents);
          void recordAutonomicEvents(sessionId, stressEvents).catch((e: unknown) => {
            console.error(e);
            toast({
              variant: 'destructive',
              title: 'Could not save AI stressor log',
              description: e instanceof Error ? e.message : 'Autonomic persistence failed.',
            });
          });
        }
      }

      setMessages(updatedMessages);
      usePhysiologyStore.getState().updateVitals(newVitals);

      if (response.patientIsDeceased) {
        toast({
          title: 'Critical outcome',
          description: 'The simulation marked the patient as deceased. End the run when you are ready.',
        });
      }

    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to get patient response.';
      const isRateLimited = /rate ?limit|too many|please wait|going a little fast/i.test(message);
      toast({
        title: isRateLimited ? 'Slow down a moment' : 'An error occurred',
        description: isRateLimited ? message : 'Failed to get patient response.',
        variant: 'destructive',
      });
      setMessages([...newMessages, { role: 'system', content: 'Error: Could not get AI response. Please try again.' }]);
    } finally {
      setIsLoading(false);
      // Reset only the inputs related to the submitted action
      if (actionType === 'assessment') setAssessmentInput('');
      if (actionType === 'radioReport') setRadioReportInput('');
      if (actionType === 'medicalDirection') setMedicalDirectionInput('');
      if (actionType === 'treatment' || actionType === 'cardiacArrest') setSelectedTreatments({});
    }
  }, [scenario, userData, isLoading, messages, time, userActions, toast, currentUserRole, selectedDestination, cprStarted, sessionId]);

  const [partnerSendBusy, setPartnerSendBusy] = useState(false);

  /**
   * Replaces the previous structured `delegatePartnerAction`. Takes a single
   * free-form instruction, asks the AI flow what to do (chatter, in-scope
   * treatmentIds, plain English summary), then funnels the result through
   * `submitAction` so the existing logging, partner messaging, vitals tick
   * and grading paths all keep working.
   */
  const handlePartnerInstruction = useCallback(
    async (instruction: string) => {
      if (!partner || !scenario) return;
      const trimmed = instruction.trim();
      if (!trimmed || partnerSendBusy) return;
      setPartnerSendBusy(true);
      try {
        const lastAssistant = [...messages]
          .reverse()
          .find((m) => m.role === "assistant");
        const result = await runPartnerInstruction({
          partnerRole: partner.role,
          partnerName: partner.name,
          userRole: currentUserRole,
          instruction: trimmed,
          scenarioSummary: scenario.details.slice(0, 8000),
          lastPatientCondition: lastAssistant?.conditionChange,
          interventions: partnerScopeInterventions.map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description?.slice(0, 220),
            certificationLevel: i.certificationLevel,
          })),
          isPediatric: isPediatricScenario,
        });
        // Always clear the input so the next instruction starts fresh.
        setPartnerInstructionInput("");

        // performed=false covers two cases that should NOT run submitAction
        // (no treatment / assessment to grade, no vitals tick):
        //   - refusal (out of scope) — chatter + refusalReason
        //   - question / opinion ask — chatter is the answer
        if (!result.performed) {
          const reason = result.refusalReason?.trim();
          setMessages((prev) => {
            const out: Message[] = [
              ...prev,
              {
                role: "partner",
                content: result.chatter,
                partnerName: partner.name,
                partnerRole: partner.role,
              },
            ];
            if (reason) {
              out.push({
                role: "system",
                content: `${partner.name} pushed back: ${reason}`,
              });
            }
            return out;
          });
          return;
        }

        const treatmentNames = result.treatmentIds
          .map((id) => seedInterventions.find((i) => i.id === id)?.name)
          .filter((n): n is string => Boolean(n));
        const hasTx = treatmentNames.length > 0;
        await submitAction(
          hasTx ? "treatment" : "assessment",
          {
            assessment: result.assessmentDetail,
            treatments: treatmentNames,
          },
          {
            partnerLine: `${partner.name}: ${result.chatter}`,
            partnerName: partner.name,
            partnerRole: partner.role,
          },
        );
        if (result.refusalReason?.trim()) {
          // Partial refusal — log the pushback so the learner sees it.
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: `${partner.name} pushed back: ${result.refusalReason!.trim()}`,
            },
          ]);
        }
      } catch (error) {
        console.error("runPartnerInstruction failed", error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to run partner instruction.";
        const rateLimited = /rate ?limit|too many|please wait/i.test(message);
        toast({
          title: rateLimited ? "Slow down a moment" : "Partner couldn't run that",
          description: rateLimited
            ? message
            : "The AI partner couldn't carry out that instruction. Try rephrasing.",
          variant: "destructive",
        });
      } finally {
        setPartnerSendBusy(false);
      }
    },
    [
      partner,
      scenario,
      partnerSendBusy,
      messages,
      currentUserRole,
      partnerScopeInterventions,
      isPediatricScenario,
      submitAction,
      toast,
    ],
  );

  /**
   * Logs a cardiac monitor / ECG action into the user-action log so it counts
   * for grading (matches `mandatoryActions` / `suggestedActions` phrasing) and
   * appears in the simulation chronology. Does not call the patient AI flow —
   * monitoring is observational and shouldn't burn rate-limit quota.
   */
  const handleEcgAction = useCallback((label: string) => {
    if (!scenario || !authUser) return;
    const priorVitalsForEcg = scenarioVitalsFromStore() ?? scenario.initialVitals;
    const lastAssistantForEcg = [...messages].reverse().find((m) => m.role === 'assistant');
    const ecgContext =
      lastAssistantForEcg?.conditionChange ?? scenario.patientProfile.slice(0, 240);
    const newAction: UserAction = {
      time: simulationTimeRef.current,
      assessment: '',
      treatments: [label],
      destination: null,
      vitalsAtAction: snapshotVitalsForAction(priorVitalsForEcg),
      context: ecgContext,
    };
    setUserActions((prev) => [...prev, newAction]);
    setMessages((prev) => [
      ...prev,
      { role: 'system', content: `Action logged · ${label}` },
    ]);
  }, [scenario, authUser, messages]);

  const nibpPhaseTrackedRef = useRef(usePhysiologyStore.getState().nibpPhase);
  useEffect(() => {
    return usePhysiologyStore.subscribe((state) => {
      const prev = nibpPhaseTrackedRef.current;
      nibpPhaseTrackedRef.current = state.nibpPhase;
      if (prev !== 'complete' && state.nibpPhase === 'complete') {
        handleEcgAction('NIBP cycle complete (automated). [BP_GRADING_NIBP]');
      }
    });
  }, [handleEcgAction]);

  const handleSubmitAssessment = () => {
    const assessmentText = assessmentInput.trim();
    if (assessmentText) {
      submitAction("assessment", { assessment: assessmentText });
    } else {
      toast({ title: 'No Input', description: 'Please enter your assessment findings.', variant: 'destructive' });
    }
  };
  // Mirror the latest handleSubmitAssessment into the ref the hands-free
  // auto-submit timer reads from.
  handleSubmitAssessmentRef.current = handleSubmitAssessment;

  const handleSubmitTreatments = async (actionType: 'treatment' | 'cardiacArrest' = 'treatment') => {
    const treatmentsArray = Object.entries(selectedTreatments)
      .filter(([, details]) => details.selected)
      .map(([id, details]) => {
        const intervention =
          availableInterventions.find((i) => i.id === id) ??
          seedInterventions.find((i) => i.id === id);
        if (!intervention) return '';
        const subOptionsStr = Object.entries(details.subOptions).map(([label, value]) => `${label}: ${value}`).join(', ');
        return `${intervention.name}${subOptionsStr ? ` (${subOptionsStr})` : ''}`;
      }).filter(Boolean);
    
    if (treatmentsArray.length > 0) {
      const weightKg = usePhysiologyStore.getState().weightKg;
      const uidForPk = authUser?.id;
      const pkDoses: DoseRecord[] =
        ENABLE_PHARMACOKINETICS_ENGINE && sessionId && uidForPk
          ? parseTreatmentSelectionsToDoses(selectedTreatments, {
              sessionId,
              userId: uidForPk,
              patientWeightKg: weightKg,
              simSeconds: simulationTimeRef.current,
            }).map((d) => ({
              ...d,
              id:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `pk-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              administeredAt: new Date().toISOString(),
            }))
          : [];
      for (const d of pkDoses) {
        usePkStore.getState().recordLocalDose(d);
      }
      if (
        ENABLE_PHARMACOKINETICS_ENGINE &&
        pkDoses.length > 0 &&
        sessionId
      ) {
        try {
          await recordPkDoses(sessionId, pkDoses);
        } catch (e: unknown) {
          console.error(e);
          toast({
            variant: 'destructive',
            title: 'Could not save medication log',
            description:
              e instanceof Error ? e.message : 'PK dose persistence failed.',
          });
        }
      }
      const autonomicEvents =
        ENABLE_AUTONOMIC_ENGINE && sessionId && uidForPk
          ? parseTreatmentSelectionsToStressors(selectedTreatments, {
              sessionId,
              userId: uidForPk,
              patientWeightKg: weightKg,
              simSeconds: simulationTimeRef.current,
            })
          : [];
      if (autonomicEvents.length > 0) {
        useAutonomicStore.getState().recordLocalEvents(autonomicEvents);
      }
      if (
        ENABLE_AUTONOMIC_ENGINE &&
        autonomicEvents.length > 0 &&
        sessionId
      ) {
        try {
          await recordAutonomicEvents(sessionId, autonomicEvents);
        } catch (e: unknown) {
          console.error(e);
          toast({
            variant: 'destructive',
            title: 'Could not save autonomic event log',
            description:
              e instanceof Error ? e.message : 'Autonomic persistence failed.',
          });
        }
      }
      applyEquipmentFromTreatmentSelections(selectedTreatments);
      await submitAction(actionType, { treatments: treatmentsArray });
    } else {
      toast({ title: 'No Treatments Selected', description: 'Please select at least one treatment.', variant: 'destructive' });
    }
  };

  const handleSubmitDestination = () => {
      const hospital = hospitals.find(h => h.id === selectedDestination);
      if (hospital && transportMode) {
          submitAction("destination", { destination: hospital.name, transport: transportMode });
          // Spawn the receiving ER physician and route the user to the
          // Handover tab. We deliberately don't pre-pin a personality —
          // the first runHospitalHandover call lets the model decide based
          // on field performance.
          if (!doctorIdentity) {
            const docName = pickDoctorName();
            setDoctorIdentity({ name: docName });
            setMessages((prev) => [
              ...prev,
              {
                role: 'system',
                content: `You arrive at ${hospital.name} via ${transportMode} transport. Dr. ${docName} meets you at the door for handover.`,
              },
            ]);
          }
          setActiveTab('handover');
      } else {
          toast({ title: 'Incomplete Selection', description: 'Please select both a hospital destination and a transport mode.', variant: 'destructive' });
      }
  };

  const handleSubmitHandover = useCallback(async () => {
    if (!scenario || !doctorIdentity || !selectedDestination) return;
    const text = handoverInput.trim();
    if (!text) return;
    if (handoverBusy) return;
    setHandoverBusy(true);
    try {
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant');
      const priorVitals = scenarioVitalsFromStore() ?? scenario.initialVitals;
      const mandatory =
        scenario.mandatoryActions[
          roleKeyForMandatory(currentUserRole, userData)
        ] ?? [];
      const hospital = hospitals.find((h) => h.id === selectedDestination);
      const out = await runHospitalHandover({
        hospitalName: hospital?.name ?? selectedDestination,
        doctorName: doctorIdentity.name,
        personality: doctorIdentity.personality,
        userRole: currentUserRole,
        scenarioSummary: scenario.details.slice(0, 8000),
        patientProfile: scenario.patientProfile,
        mandatoryActions: mandatory,
        userActions: userActions.slice(-30),
        lastPatientCondition: lastAssistant?.conditionChange,
        currentVitals: priorVitals,
        learnerHandover: text.slice(0, 4000),
        priorTurns: handoverTurns,
        gaveRadioReport: hasGivenReport,
        patientIsDeceased: messages.some(
          (m) => m.role === 'assistant' && m.patientIsDeceased,
        ),
      });
      // Pin personality on the first turn so the doctor stays in character.
      setDoctorIdentity({
        name: doctorIdentity.name,
        personality: out.personality,
      });
      setHandoverTurns((prev) => [
        ...prev,
        { speaker: 'learner', text },
        { speaker: 'doctor', text: out.doctorReply },
      ]);
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: `Handover to Dr. ${doctorIdentity.name}: ${text}`,
        },
        {
          role: 'doctor',
          content: out.doctorReply,
          doctorName: doctorIdentity.name,
          doctorPersonality: out.personality,
        },
      ]);
      if (out.readyToOffload) {
        setHandoverReadyToOffload(true);
      }
      if (out.critiqueNotes.length > 0) {
        setDoctorCritique((prev) => {
          const merged = [...prev, ...out.critiqueNotes];
          // Dedupe while keeping order; cap to last 8.
          const seen = new Set<string>();
          const uniq: string[] = [];
          for (const n of merged) {
            const key = n.trim().toLowerCase();
            if (!key || seen.has(key)) continue;
            seen.add(key);
            uniq.push(n.trim());
          }
          return uniq.slice(-8);
        });
      }
      setHandoverInput('');
    } catch (error) {
      console.error('runHospitalHandover failed', error);
      const message =
        error instanceof Error ? error.message : 'Handover failed.';
      const rateLimited = /rate ?limit|too many|please wait/i.test(message);
      toast({
        variant: 'destructive',
        title: rateLimited ? 'Slow down a moment' : 'Handover failed',
        description: rateLimited
          ? message
          : 'Could not reach the receiving doctor. Try again in a moment.',
      });
    } finally {
      setHandoverBusy(false);
    }
  }, [
    scenario,
    doctorIdentity,
    selectedDestination,
    handoverInput,
    handoverBusy,
    messages,
    currentUserRole,
    userData,
    userActions,
    handoverTurns,
    hasGivenReport,
    toast,
  ]);


  const handleSubmitRadioReport = () => {
    const handoffText = radioReportInput.trim();
    if (handoffText && handoffText !== "Generating report..." && handoffText !== "Error: Could not generate report.") {
        submitAction("radioReport", { assessment: `Gave the following radio report:\n${handoffText}` });
    } else {
        toast({ title: 'No Report to Submit', description: 'Please generate a radio report before submitting.', variant: 'destructive' });
    }
  };

  const handleRequestMedicalDirection = () => {
    const question = medicalDirectionInput.trim();
    if (question) {
        submitAction("medicalDirection", { assessment: `Request for medical direction: "${question}"` });
    } else {
        toast({ title: 'No Question Asked', description: 'Please type your question for medical direction in the text area.', variant: 'destructive' });
    }
  };
  
  const handleGenerateReport = async () => {
    if (!scenario || !scenarioVitalsFromStore() || !userData) return;
    setIsGeneratingReport(true);
    setRadioReportInput("Generating report...");
    try {
      const response = await generateRadioReport({
        patientProfile: scenario.patientProfile,
        scenarioDetails: scenario.details,
        userActions,
        currentVitals: scenarioVitalsFromStore()!,
        userRole: currentUserRole,
      });
      setRadioReportInput(response.radioReport);
    } catch (error) {
        console.error("Failed to generate radio report", error);
        setRadioReportInput("Error: Could not generate report.");
        toast({ title: 'Error', description: 'Failed to generate radio report.', variant: 'destructive' });
    } finally {
        setIsGeneratingReport(false);
    }
  };

  const handleTreatmentSelection = (id: string, checked: boolean | 'indeterminate') => {
    const legacyInt = seedInterventions.find((i) => i.id === id);
    const initialSubOptions = legacyInt?.subOptions?.reduce((acc, so) => {
        acc[so.label] = so.options[0]; // Default to the first option
        return acc;
    }, {} as {[key: string]: string}) || {};

    setSelectedTreatments(prev => ({
      ...prev,
      [id]: {
        selected: !!checked,
        subOptions: checked ? (prev[id]?.subOptions || initialSubOptions) : {}
      }
    }));
  };

  const handleSubOptionChange = (interventionId: string, label: string, value: string) => {
    setSelectedTreatments(prev => ({
      ...prev,
      [interventionId]: {
        ...prev[interventionId],
        selected: true,
        subOptions: {
          ...prev[interventionId]?.subOptions,
          [label]: value
        }
      }
    }));
  };

  const handleEndSimClick = () => {
    if (canEndSimulation) {
      handleEndSimulation(false);
    } else {
      setEndSimAlertOpen(true);
    }
  };

  const handleOffloadPatient = useCallback(() => {
    if (!handoverReadyToOffload || !doctorIdentity) return;
    if (simulationEnded) return;
    setMessages((prev) => [
      ...prev,
      {
        role: 'system',
        content: `Patient offloaded to Dr. ${doctorIdentity.name}'s team. Care transferred.`,
      },
    ]);
    void handleEndSimulation(false);
  }, [handoverReadyToOffload, doctorIdentity, simulationEnded, handleEndSimulation]);
  
  const renderActionDetails = (action: UserAction) => {
    if (action.assessment && action.assessment !== 'None') {
      const cleaned = stripGradingMarkers(action.assessment);
      if (cleaned) return `Assessment: ${cleaned}`;
    }
    if (action.treatments.length > 0) {
      const cleanedTreatments = action.treatments
        .map((t) => stripGradingMarkers(t))
        .filter(Boolean);
      if (cleanedTreatments.length > 0) {
        return `Treatments: ${cleanedTreatments.join(', ')}`;
      }
    }
    if (action.destination) {
      return `Destination: ${action.destination} (Mode: ${action.transportMode})`;
    }
    return 'No specific details.';
  };

  const handleReportIssue = async (values: ReportIssueFormValues) => {
    if (!supabase || !authUser || !scenario) {
        toast({ variant: "destructive", title: "Error", description: "Could not submit report. Missing context." });
        return;
    }

    try {
        const ticketId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const { error } = await supabase.from('support_tickets').insert({
            id: ticketId,
            user_id: authUser.id,
            user_email: authUser.email ?? '',
            message: values.message,
            scenario_id: scenario.id,
            scenario_title: scenario.title,
            ticket_kind: 'issue',
            status: 'new',
            responses: [],
        });
        if (error) throw error;

        toast({
            title: "Issue Report Submitted",
            description: "Thank you for your feedback! The admin team will review it.",
        });
        setReportIssueOpen(false);
        reportForm.reset();
    } catch (e: unknown) {
        console.error("Error submitting issue report:", e);
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: e instanceof Error ? e.message : "An unknown error occurred.",
        });
    }
  };

  const handleBadAiReport = async (values: BadAiResponseFormValues) => {
    if (!supabase || !authUser || !scenario || badAiReportMessageIndex === null) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not submit report. Missing context.",
      });
      return;
    }
    if (!sessionId) {
      toast({
        variant: "destructive",
        title: "Session not ready",
        description: "Wait until the simulation session has started, then try again.",
      });
      return;
    }
    const flagged = messages[badAiReportMessageIndex];
    if (!flagged || flagged.role !== "assistant") {
      toast({
        variant: "destructive",
        title: "Invalid message",
        description: "Only patient AI replies can be flagged.",
      });
      return;
    }

    try {
      const feedbackId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const flaggedContent = stripGradingMarkers(flagged.content).slice(0, 8000);

      const { error } = await supabase.from("ai_response_feedback").insert({
        id: feedbackId,
        session_id: sessionId,
        user_id: authUser.id,
        scenario_id: scenario.id,
        scenario_title: scenario.title,
        assistant_message_index: badAiReportMessageIndex,
        flagged_assistant_content: flaggedContent,
        messages_snapshot: messages as unknown as Json,
        user_actions_snapshot: userActions as unknown as Json,
        simulation_role: currentUserRole,
        simulation_time_seconds: time,
        user_comment: values.comment,
        review_status: "pending",
      });
      if (error) throw error;

      toast({
        title: "Report sent",
        description:
          "Thanks — admins can review the full simulation log and note a better reply when appropriate.",
      });
      setBadAiReportOpen(false);
      setBadAiReportMessageIndex(null);
      badAiForm.reset();
    } catch (e: unknown) {
      console.error("ai_response_feedback insert:", e);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: e instanceof Error ? e.message : "Could not save report.",
      });
    }
  };


  if (!userData) {
    return <div className="p-8">Loading scenario...</div>;
  }

  if (!scenario) {
    if (isLoadingScenario) {
      return <div className="p-8">Loading scenario...</div>;
    }
    return <div className="p-8 text-red-500">Error: Scenario not found.</div>;
  }
  
  const cardiacArrestInterventionIds = [
    'PROC_GUIDELINE_CARDIAC_ARREST',
    'PROC_AED_USE',
    'PROC_DEFIBRILLATION',
    'MED_EPI_1_10000',
    'MED_AMIODARONE',
    'MED_LIDOCAINE',
    'PROC_INTUBATION',
    'PROC_SUPRAGLOTTIC_AIRWAY',
    'PROC_CARDIAC_MONITORING',
  ];

  /**
   * Paramedic / admin manual ACLS list — filtered by the AI-reported arrest rhythm
   * so the UI doesn't suggest defibrillation for asystole or PEA, and doesn't push
   * antiarrhythmics on a non-shockable rhythm.
   */
  const isShockable = shockableArrestRhythm(currentArrestRhythm as EcgRhythmKind | null);
  const filteredCardiacIds = cardiacArrestInterventionIds.filter((id) => {
    if (!currentArrestRhythm) return true;
    if (isShockable) return true;
    // Non-shockable: hide defib + antiarrhythmic-only meds.
    return !['PROC_DEFIBRILLATION', 'MED_AMIODARONE', 'MED_LIDOCAINE'].includes(id);
  });
  const cardiacArrestInterventions = availableInterventions.filter((i) =>
    filteredCardiacIds.includes(i.id),
  );


  return (
    <div className="relative grid max-lg:h-auto max-lg:min-h-0 gap-4 sm:gap-6 lg:h-[calc(100vh-100px)] lg:grid-cols-3">
      {/* Pause Overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center">
            <h2 className="text-4xl font-bold text-white mb-4">Paused</h2>
            <Button onClick={() => setIsPaused(false)} size="lg">
                <Play className="mr-2" /> Resume Simulation
            </Button>
        </div>
      )}

      {/* Left Column */}
      <div className="lg:col-span-1 space-y-6 flex flex-col">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User /> Patient Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{scenario.patientProfile}</p>
            <p className="text-sm text-muted-foreground">{scenario.description}</p>
          </CardContent>
        </Card>
        {vitalsReady ? (
          <div className="space-y-2">
            <div data-tour={WELCOME_TOUR_ANCHORS.monitor}>
              <UnifiedCardiacMonitor
                scenario={scenario}
                cprActive={cprStarted && !hasROSC}
                forcedRhythm={monitorForcedRhythm}
                pulseless={Boolean(currentArrestRhythm)}
                onRhythmChange={(kind) => setObservedRhythm(kind)}
                onAction={handleEcgAction}
                onMonitorMedication={(med) =>
                  handleEcgAction(`Medication (monitor menu): ${med.name}`)
                }
              />
            </div>
            <div data-tour={WELCOME_TOUR_ANCHORS.equipment}>
              <EquipmentDrawer />
            </div>
            {(currentUserRole === 'paramedic' || currentUserRole === 'admin') && (
              <div className="flex justify-end">
                <RhythmIdQuiz
                  observedRhythm={observedRhythm}
                  enabled={Boolean(observedRhythm)}
                  onLogAction={handleEcgAction}
                  onPersistAttempt={(payload) => {
                    void recordRhythmQuizAttempt(supabase, authUser?.id, {
                      source: 'scenario',
                      scenarioId: scenario.id,
                      sessionId: sessionId ?? null,
                      rhythmKind: payload.rhythmKind,
                      userAnswer: payload.userAnswer,
                      isCorrect: payload.isCorrect,
                      msToAnswer: payload.msToAnswer,
                    });
                  }}
                />
              </div>
            )}
          </div>
        ) : null}
        <Card>
           <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock /> Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div>
                  <Label>Time Elapsed</Label>
                  <div className="text-2xl font-bold font-mono">{formatTime(time)}</div>
              </div>
              <div>
                  <Label>Current Role</Label>
                  <div className="capitalize text-lg font-semibold">{currentUserRole}</div>
              </div>
              {isSpeechSupported ? (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Hands-free dictation
                  </Label>
                  <Button
                    type="button"
                    onClick={toggleHandsFreeMode}
                    variant={handsFreeMode ? "default" : "outline"}
                    className={cn(
                      "mt-1 w-full",
                      handsFreeMode &&
                        "bg-emerald-700 text-white hover:bg-emerald-700/90",
                    )}
                    disabled={simulationEnded || showCardiacArrestTab}
                    title={
                      handsFreeMode
                        ? "Mic stays on; pauses auto-submit Assessment"
                        : "Continuous dictation into Assessment, auto-submit on a pause"
                    }
                  >
                    {handsFreeMode ? (
                      <>
                        <Mic className="mr-2 h-4 w-4 animate-pulse" />
                        Hands-free ON
                      </>
                    ) : (
                      <>
                        <MicOff className="mr-2 h-4 w-4" />
                        Hands-free OFF
                      </>
                    )}
                  </Button>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                 <Button onClick={() => setIsPaused(true)} variant="outline" className="w-full" disabled={simulationEnded}>
                    <Pause className="mr-2"/> Pause
                 </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => setIsPaused(true)}>
                      <BookOpen className="mr-2" /> User Guide
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="flex max-h-[min(92dvh,800px)] flex-col gap-2 overflow-hidden sm:max-w-3xl"
                    onInteractOutside={() => setIsPaused(false)}
                    onCloseAutoFocus={() => setIsPaused(false)}
                  >
                    <DialogHeader className="shrink-0">
                      <DialogTitle>User Guide</DialogTitle>
                      <DialogDescription>
                        A complete guide to using the EMS Simu-Pro application.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 min-w-0 flex-1">
                      <UserGuide />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Dialog open={reportIssueOpen} onOpenChange={(isOpen) => { setReportIssueOpen(isOpen); if (!isOpen) setIsPaused(false); }}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" onClick={() => setIsPaused(true)}>
                        <AlertCircle className="mr-2" /> Report Issue
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[min(92dvh,800px)] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Report an Issue</DialogTitle>
                        <DialogDescription>
                            Found something wrong with this scenario? Let the admin team know.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...reportForm}>
                        <form onSubmit={reportForm.handleSubmit(handleReportIssue)} className="space-y-4 pt-4">
                            <FormField
                                control={reportForm.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Issue Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="e.g., 'The initial blood pressure seems too high for a patient in this condition...'"
                                                rows={5}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end">
                                <Button type="submit" disabled={reportForm.formState.isSubmitting}>
                                    {reportForm.formState.isSubmitting ? 'Submitting...' : 'Submit Report'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
               </Dialog>

              <Button
                variant="outline"
                className="w-full"
                type="button"
                onClick={() => {
                  setIsPaused(true);
                  setBadAiReportMessageIndex(null);
                  badAiForm.reset({ comment: "" });
                  setBadAiReportOpen(true);
                }}
              >
                <Flag className="mr-2 h-4 w-4" />
                Bad AI reply?
              </Button>

              <Dialog
                open={badAiReportOpen}
                onOpenChange={(isOpen) => {
                  setBadAiReportOpen(isOpen);
                  if (!isOpen) {
                    setBadAiReportMessageIndex(null);
                    setIsPaused(false);
                  }
                }}
              >
                <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Report a bad AI reply</DialogTitle>
                    <DialogDescription>
                      Choose which patient reply was wrong, then describe the problem. We send that reply plus your full
                      simulation log to admins.
                      {!sessionId ? (
                        <span className="mt-2 block text-destructive">
                          Session not active yet — wait until the simulation has started.
                        </span>
                      ) : null}
                    </DialogDescription>
                  </DialogHeader>

                  {assistantReplyPicklist.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      There are no patient replies in the log yet. Run an assessment or treatment step first.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Which reply was wrong?</p>
                      <ScrollArea className="max-h-48 rounded-md border p-3">
                        <RadioGroup
                          value={
                            badAiReportMessageIndex !== null ? String(badAiReportMessageIndex) : ""
                          }
                          onValueChange={(v) => setBadAiReportMessageIndex(parseInt(v, 10))}
                          className="space-y-3"
                        >
                          {assistantReplyPicklist.map((opt, seq) => (
                            <div key={opt.index} className="flex items-start gap-3">
                              <RadioGroupItem
                                value={String(opt.index)}
                                id={`bad-ai-${opt.index}`}
                                className="mt-1"
                              />
                              <Label
                                htmlFor={`bad-ai-${opt.index}`}
                                className="cursor-pointer font-normal leading-snug"
                              >
                                <span className="text-xs font-medium text-muted-foreground">
                                  Patient reply #{seq + 1}
                                </span>
                                <p className="mt-0.5 text-sm">{opt.preview}</p>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </ScrollArea>
                    </div>
                  )}

                  <Form {...badAiForm}>
                    <form onSubmit={badAiForm.handleSubmit(handleBadAiReport)} className="space-y-4 pt-2">
                      <FormField
                        control={badAiForm.control}
                        name="comment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>What was wrong?</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="e.g. contradicts prior vitals, unsafe suggestion, wrong clinical tone…"
                                rows={4}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setBadAiReportOpen(false);
                            setBadAiReportMessageIndex(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={
                            badAiForm.formState.isSubmitting ||
                            !sessionId ||
                            badAiReportMessageIndex === null ||
                            assistantReplyPicklist.length === 0
                          }
                        >
                          {badAiForm.formState.isSubmitting ? "Sending…" : "Submit report"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

                {selectedDestination ? (
                  <Button
                    onClick={handleOffloadPatient}
                    disabled={
                      simulationEnded ||
                      !handoverReadyToOffload ||
                      !doctorIdentity
                    }
                    className={cn(
                      'w-full',
                      handoverReadyToOffload
                        ? 'bg-emerald-700 hover:bg-emerald-700/90 text-white'
                        : 'bg-destructive hover:bg-destructive/90',
                    )}
                    data-tour={WELCOME_TOUR_ANCHORS.endSim}
                    title={
                      handoverReadyToOffload
                        ? 'Transfer care to the ER team and end the run'
                        : 'Give a verbal handover to the receiving doctor first'
                    }
                  >
                    {simulationEnded
                      ? 'Ending...'
                      : handoverReadyToOffload
                        ? 'Offload PT'
                        : 'Offload PT (handover pending)'}
                  </Button>
                ) : (
                  <Button
                      onClick={handleEndSimClick}
                      disabled={simulationEnded}
                      className="w-full bg-destructive hover:bg-destructive/90"
                      data-tour={WELCOME_TOUR_ANCHORS.endSim}
                  >
                      {simulationEnded ? 'Ending...' : 'End Simulation'}
                  </Button>
                )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div
        className="lg:col-span-2 flex flex-col bg-card rounded-lg border lg:h-full lg:min-h-0"
        data-tour={WELCOME_TOUR_ANCHORS.log}
      >
        <div className="shrink-0 border-b p-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><SquareTerminal /> Simulation Log</h2>
        </div>
        <div
          ref={simulationLogScrollRef}
          onScroll={onSimulationLogScroll}
          className="max-h-[min(38dvh,24rem)] shrink-0 overflow-y-auto overscroll-contain px-4 pb-3 pt-4 sm:max-h-[min(52vh,26rem)]"
        >
          <div className="space-y-4">
            {messages.map((message, messageIndex) => {
              if (message.role === "user") return null;
              const isPartner = message.role === "partner";
              const isDoctor = message.role === "doctor";
              const partnerLetter = partnerAvatarLetter(
                message.partnerRole ?? partner?.role ?? "emt",
              );
              const avatarLetter = isDoctor
                ? "Dr"
                : message.role === "assistant"
                  ? "P"
                  : message.role === "system"
                    ? "H"
                    : isPartner
                      ? partnerLetter
                      : "S";
              const bubbleClass = isDoctor
                ? "border border-sky-700/30 bg-sky-50 dark:bg-sky-950/30"
                : message.role === "system"
                  ? "bg-yellow-100 dark:bg-yellow-900/50"
                  : isPartner
                    ? "border border-emerald-800/25 bg-emerald-950/10 dark:bg-emerald-500/10"
                    : "bg-muted";
              const avatarBgClass = isDoctor
                ? "bg-sky-700 text-[10px] font-semibold text-white"
                : isPartner
                  ? "bg-emerald-700 text-xs font-semibold text-emerald-50"
                  : undefined;
              const roleTooltip = isDoctor
                ? `Receiving physician${
                    message.doctorPersonality
                      ? ` — ${message.doctorPersonality}`
                      : ""
                  }`
                : message.partnerRole === "paramedic"
                  ? "Paramedic partner"
                  : message.partnerRole === "aemt"
                    ? "AEMT partner"
                    : message.partnerRole === "emt"
                      ? "EMT partner"
                      : "Partner";
              return (
                <div key={messageIndex} className="flex items-start gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={avatarBgClass}>
                            {avatarLetter}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      {isPartner || isDoctor ? (
                        <TooltipContent>{roleTooltip}</TooltipContent>
                      ) : null}
                    </Tooltip>
                  </TooltipProvider>
                  <div className={`rounded-lg p-3 max-w-lg ${bubbleClass}`}>
                    {isPartner && message.partnerName ? (
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                        {message.partnerName}
                      </p>
                    ) : null}
                    {isDoctor && message.doctorName ? (
                      <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">
                        Dr. {message.doctorName}
                      </p>
                    ) : null}
                    <p className="text-sm whitespace-pre-wrap">
                      {stripGradingMarkers(message.content)}
                    </p>
                    {message.conditionChange ? (
                      <p className="mt-2 border-t border-muted-foreground/20 pt-2 text-sm">
                        Condition: {message.conditionChange}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {isLoading && <p>AI is thinking...</p>}
            {isAnalyzingAED && <p>AED is analyzing...</p>}
          </div>
        </div>
        {partner ? (
          <div
            className="shrink-0 border-b px-4 pb-3 pt-1"
            data-tour={WELCOME_TOUR_ANCHORS.partner}
          >
            <PartnerPanel
              partner={partner}
              adviceHistory={partnerAdviceHistory}
              isPediatric={isPediatricScenario}
              instruction={partnerInstructionInput}
              onInstructionChange={setPartnerInstructionInput}
              onSend={handlePartnerInstruction}
              onToggleMic={
                isSpeechSupported
                  ? () => startDictation("partnerInstruction")
                  : undefined
              }
              micActive={activeDictationTarget === "partnerInstruction"}
              busy={partnerSendBusy || isLoading}
              disabled={simulationEnded || showCardiacArrestTab}
            />
          </div>
        ) : null}
        <div
          className="flex flex-col border-t p-4 lg:min-h-0 lg:flex-1 lg:justify-start"
          data-tour={WELCOME_TOUR_ANCHORS.tabs}
        >
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ActiveTab)}
            className={cn(
              "flex w-full flex-col justify-start gap-2",
              activeTab === "destination" ? "min-h-0 flex-1" : "shrink-0",
            )}
          >
            <TabsList
              className={cn(
                "h-auto min-h-10 w-full max-w-full shrink-0 flex-nowrap justify-start gap-1 overflow-x-auto overflow-y-hidden p-1 [scrollbar-width:thin]",
                showCardiacArrestTab ? "inline-flex" : "flex",
              )}
            >
              {showCardiacArrestTab ? (
                 <TabsTrigger value="cardiacArrest" className="min-h-9 shrink-0">
                    <Zap className="mr-0 sm:mr-2 h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Cardiac Arrest</span>
                    <span className="sm:hidden">Arrest</span>
                </TabsTrigger>
              ) : (
                <>
                  <TabsTrigger value="assessment" className="min-h-9 shrink-0 px-2.5 sm:px-3">
                    <AlertCircle className="mr-0 sm:mr-2 h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Assessment</span>
                    <span className="sm:hidden">Assess</span>
                  </TabsTrigger>
                  <TabsTrigger value="treatment" className="min-h-9 shrink-0 px-2.5 sm:px-3">
                    <Syringe className="mr-0 sm:mr-2 h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Treatment</span>
                    <span className="sm:hidden">Tx</span>
                  </TabsTrigger>
                  <TabsTrigger value="destination" className="min-h-9 shrink-0 px-2.5 sm:px-3">
                    <Hospital className="mr-0 sm:mr-2 h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Destination</span>
                    <span className="sm:hidden">Dest</span>
                  </TabsTrigger>
                  <TabsTrigger value="radioReport" className="min-h-9 shrink-0 px-2.5 sm:px-3">
                    <MessageSquare className="mr-0 sm:mr-2 h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Comms</span>
                    <span className="sm:hidden">Comm</span>
                  </TabsTrigger>
                  {selectedDestination ? (
                    <TabsTrigger
                      value="handover"
                      className="min-h-9 shrink-0 px-2.5 sm:px-3"
                    >
                      <Stethoscope className="mr-0 sm:mr-2 h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">Handover</span>
                      <span className="sm:hidden">Hand</span>
                      {handoverReadyToOffload ? (
                        <span className="ml-2 hidden h-2 w-2 shrink-0 rounded-full bg-emerald-500 sm:inline-block" />
                      ) : null}
                    </TabsTrigger>
                  ) : null}
                </>
              )}
            </TabsList>
             <TabsContent value="cardiacArrest">
                {(currentUserRole === 'emt' || currentUserRole === 'aemt') ? (
                  <div className="space-y-4">
                    <AedPanel
                      role={currentUserRole as 'emt' | 'aemt'}
                      currentArrestRhythm={currentArrestRhythm}
                      hasROSC={hasROSC}
                      onLogAction={handleEcgAction}
                      disabled={isLoading || simulationEnded || isAnalyzingAED}
                    />
                    {hasROSC && (
                      <p className="text-center text-sm font-semibold text-emerald-600">
                        Return of Spontaneous Circulation (ROSC) achieved — proceed with post-arrest care.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <ScrollArea className="max-h-[min(55vh,22rem)] min-h-[11rem]">
                        <div className="space-y-4 pr-4">
                            <Label>Select cardiac arrest interventions</Label>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {cardiacArrestInterventions.map((t) => (
                              <InterventionTile
                                key={t.id}
                                intervention={t}
                                selected={selectedTreatments[t.id]}
                                onToggle={(sel) => handleTreatmentSelection(t.id, sel)}
                                onSubOptionChange={(label, value) =>
                                  handleSubOptionChange(t.id, label, value)
                                }
                              />
                            ))}
                            </div>
                        </div>
                    </ScrollArea>
                    <Button onClick={() => handleSubmitTreatments('cardiacArrest')} disabled={isLoading || simulationEnded || hasROSC || isAnalyzingAED} className="w-full mt-4">
                        {isLoading ? 'Processing...' : 'Perform Actions'} <ArrowRight className="ml-2" />
                    </Button>
                    {hasROSC && <p className="text-center text-green-500 font-bold mt-2">Return of Spontaneous Circulation (ROSC) achieved! Proceed with post-arrest care using the other tabs.</p>}
                  </>
                )}
            </TabsContent>
            <TabsContent value="assessment">
               <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label htmlFor="assessment-input">Ask questions or describe findings</Label>
                    {isSpeechSupported && (
                      <Button
                        type="button"
                        variant={activeDictationTarget === "assessment" ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => startDictation("assessment")}
                        disabled={showCardiacArrestTab || simulationEnded}
                      >
                        {activeDictationTarget === "assessment" ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                        {activeDictationTarget === "assessment" ? "Stop Mic" : "Speak"}
                      </Button>
                    )}
                  </div>
                  <Textarea 
                    id="assessment-input"
                    placeholder="e.g., 'What are the current vitals?', 'I am listening to lung sounds.'"
                    value={assessmentInput}
                    onChange={(e) => setAssessmentInput(e.target.value)}
                    className="h-24"
                    disabled={showCardiacArrestTab}
                  />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={() => submitAction('assessment', { assessment: `${BP_GRADING_MANUAL_MARKER} Obtain a manual blood pressure (auscultation).` })} disabled={showCardiacArrestTab}><Activity className="mr-2 h-4 w-4" /> Manual Blood Pressure</Button>
                    <Button variant="outline" size="sm" onClick={() => submitAction('assessment', { assessment: 'Check blood glucose level.'})} disabled={showCardiacArrestTab}><Droplets className="mr-2 h-4 w-4" /> Blood Glucose</Button>
                    <Button variant="outline" size="sm" onClick={() => submitAction('assessment', { assessment: 'Check patient\'s temperature.'})} disabled={showCardiacArrestTab}><Thermometer className="mr-2 h-4 w-4" /> Temperature</Button>
                </div>
                <Button onClick={handleSubmitAssessment} disabled={isLoading || simulationEnded || showCardiacArrestTab} className="w-full">
                    {isLoading ? 'Processing...' : 'Submit Findings'} <ArrowRight className="ml-2" />
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="treatment">
               <ScrollArea className="max-h-[min(55vh,22rem)] min-h-[11rem]">
                <div className="space-y-4 pr-4">
                  <Label>Select treatments to administer</Label>
                  {availableInterventions.length === 0 && (
                    <p className="text-muted-foreground text-sm">No interventions available for your certification level.</p>
                  )}
                  {availableInterventions.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {availableInterventions.map((t) => (
                    <InterventionTile
                      key={t.id}
                      intervention={t}
                      selected={selectedTreatments[t.id]}
                      onToggle={(sel) => handleTreatmentSelection(t.id, sel)}
                      onSubOptionChange={(label, value) =>
                        handleSubOptionChange(t.id, label, value)
                      }
                    />
                  ))}
                  </div>
                  )}
                </div>
               </ScrollArea>
                <Button onClick={() => handleSubmitTreatments('treatment')} disabled={isLoading || simulationEnded || showCardiacArrestTab} className="w-full mt-4">
                    {isLoading ? 'Processing...' : 'Submit Treatments'} <ArrowRight className="ml-2" />
                </Button>
            </TabsContent>
            <TabsContent value="destination" className="flex min-h-0 flex-1 flex-col outline-none">
                <ScrollArea className="min-h-[14rem] flex-1 pr-4">
                    <div className="space-y-5 pr-1">
                        <div>
                            <Label>Select Hospital Destination</Label>
                            <RadioGroup value={selectedDestination} onValueChange={setSelectedDestination} className="mt-3 space-y-3">
                                {hospitals.map(hospital => (
                                    <Card key={hospital.id} className="flex items-center gap-4 p-4">
                                        <RadioGroupItem value={hospital.id} id={hospital.id} />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <Label htmlFor={hospital.id} className="font-bold">{hospital.name}</Label>
                                                {scenario?.hospitalDistances[hospital.id] !== undefined && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <MapPin className="h-4 w-4"/>
                                                        <span>{scenario.hospitalDistances[hospital.id]} min</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {hospital.capabilities.map(cap => (
                                                    <Badge key={cap} variant="secondary" className="capitalize">{cap}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </RadioGroup>
                        </div>
                        <div className="pt-1">
                           <Label>Select Transport Mode</Label>
                            <RadioGroup value={transportMode} onValueChange={(v) => setTransportMode(v as 'Routine' | 'Emergency')} className="mt-3 flex flex-wrap items-stretch gap-3">
                                <Label htmlFor="routine-transport" className="flex items-center gap-2 p-4 border rounded-md has-[:checked]:bg-muted flex-1 cursor-pointer">
                                    <RadioGroupItem value="Routine" id="routine-transport" className="sr-only" />
                                    <Truck className="h-5 w-5" />
                                    Routine
                                </Label>
                                <Label htmlFor="emergency-transport" className="flex items-center gap-2 p-4 border rounded-md has-[:checked]:bg-muted flex-1 cursor-pointer">
                                    <RadioGroupItem value="Emergency" id="emergency-transport" className="sr-only" />
                                    <Siren className="h-5 w-5" />
                                    Emergency
                                </Label>
                            </RadioGroup>
                        </div>
                    </div>
                </ScrollArea>
                 <Button onClick={handleSubmitDestination} disabled={isLoading || simulationEnded || !selectedDestination || !transportMode || showCardiacArrestTab} className="mt-4 w-full shrink-0">
                    {isLoading ? 'Processing...' : 'Confirm Destination & Transport'} <ArrowRight className="ml-2" />
                </Button>
            </TabsContent>
            <TabsContent value="radioReport" className="flex-none outline-none">
                <div className="space-y-4">
                    <div>
                        <div className="mb-2 flex items-center justify-between">
                          <Label htmlFor="radio-report-input">AI-generated SBAR report (edit before submitting)</Label>
                          {isSpeechSupported && (
                            <Button
                              type="button"
                              variant={activeDictationTarget === "radioReport" ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => startDictation("radioReport")}
                              disabled={showCardiacArrestTab || simulationEnded}
                            >
                              {activeDictationTarget === "radioReport" ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                              {activeDictationTarget === "radioReport" ? "Stop Mic" : "Speak"}
                            </Button>
                          )}
                        </div>
                        <Textarea
                            id="radio-report-input"
                            placeholder="Click 'Generate Radio Report' below..."
                            value={radioReportInput}
                            onChange={(e) => setRadioReportInput(e.target.value)}
                            className="h-28"
                            disabled={showCardiacArrestTab}
                        />
                         <div className="flex gap-2 mt-2">
                             <Button onClick={handleGenerateReport} disabled={isGeneratingReport || showCardiacArrestTab} variant="outline" className="w-full">
                                {isGeneratingReport ? "Generating..." : "Generate Radio Report"}
                            </Button>
                            <Button onClick={handleSubmitRadioReport} disabled={isLoading || simulationEnded || showCardiacArrestTab} className="w-full">
                                Submit Radio Report
                            </Button>
                         </div>
                    </div>
                    <div className="border-t pt-4">
                        <div className="mb-2 flex items-center justify-between">
                          <Label htmlFor="medical-direction-input">Request Medical Direction</Label>
                          {isSpeechSupported && (
                            <Button
                              type="button"
                              variant={activeDictationTarget === "medicalDirection" ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => startDictation("medicalDirection")}
                              disabled={showCardiacArrestTab || simulationEnded}
                            >
                              {activeDictationTarget === "medicalDirection" ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                              {activeDictationTarget === "medicalDirection" ? "Stop Mic" : "Speak"}
                            </Button>
                          )}
                        </div>
                        <Textarea 
                            id="medical-direction-input"
                            placeholder="e.g., 'Requesting permission to administer a second dose of epi.'"
                            value={medicalDirectionInput}
                            onChange={(e) => setMedicalDirectionInput(e.target.value)}
                            className="h-20"
                             disabled={showCardiacArrestTab}
                        />
                        <Button onClick={handleRequestMedicalDirection} size="sm" variant="outline" className="mt-2 w-full" disabled={showCardiacArrestTab}>
                           <PhoneCall className="mr-2 h-4 w-4" /> Request Orders/Advice
                        </Button>
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="handover" className="flex-none outline-none">
              {!doctorIdentity || !selectedDestination ? (
                <p className="text-sm text-muted-foreground p-2">
                  Confirm a destination from the <b>Destination</b> tab to start the bedside handover.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-sky-700 text-white text-sm font-semibold">
                        Dr
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">Dr. {doctorIdentity.name}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] capitalize',
                            doctorIdentity.personality === 'hard'
                              ? 'border-destructive/60 text-destructive'
                              : doctorIdentity.personality === 'skeptical'
                                ? 'border-amber-600/50 text-amber-800 dark:text-amber-200'
                                : doctorIdentity.personality === 'nice'
                                  ? 'border-emerald-700/40 text-emerald-700 dark:text-emerald-300'
                                  : 'border-muted text-muted-foreground',
                          )}
                        >
                          {doctorIdentity.personality ?? 'reading the room'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Receiving physician at{' '}
                        {hospitals.find((h) => h.id === selectedDestination)?.name ??
                          'the receiving hospital'}
                        . Give a verbal handover (SBAR-style works best).
                      </p>
                    </div>
                  </div>

                  {handoverTurns.length > 0 ? (
                    <ScrollArea className="max-h-48 rounded-md border bg-background p-2">
                      <ul className="space-y-2">
                        {handoverTurns.map((turn, i) => (
                          <li key={i} className="text-xs">
                            <span
                              className={cn(
                                'mr-1 font-semibold',
                                turn.speaker === 'doctor'
                                  ? 'text-sky-700 dark:text-sky-300'
                                  : 'text-foreground',
                              )}
                            >
                              {turn.speaker === 'doctor'
                                ? `Dr. ${doctorIdentity.name}:`
                                : 'You:'}
                            </span>
                            <span className="whitespace-pre-wrap">{turn.text}</span>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No turns yet. Open with patient demographics, chief complaint, key
                      findings, treatments given, and why you brought them here.
                    </p>
                  )}

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label htmlFor="handover-input">
                        Your handover{handoverTurns.length > 0 ? ' (continued)' : ''}
                      </Label>
                      {isSpeechSupported && (
                        <Button
                          type="button"
                          variant={
                            activeDictationTarget === 'handover'
                              ? 'destructive'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => startDictation('handover')}
                          disabled={
                            simulationEnded || showCardiacArrestTab || handoverBusy
                          }
                        >
                          {activeDictationTarget === 'handover' ? (
                            <MicOff className="mr-2 h-4 w-4" />
                          ) : (
                            <Mic className="mr-2 h-4 w-4" />
                          )}
                          {activeDictationTarget === 'handover' ? 'Stop Mic' : 'Speak'}
                        </Button>
                      )}
                    </div>
                    <Textarea
                      id="handover-input"
                      placeholder={
                        handoverTurns.length === 0
                          ? "e.g. 'This is a 25-year-old female with a known bee-sting allergy, presenting with anaphylaxis…'"
                          : 'Answer the doctor or add detail.'
                      }
                      className="h-28"
                      value={handoverInput}
                      onChange={(e) => setHandoverInput(e.target.value)}
                      disabled={simulationEnded || handoverBusy}
                    />
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        onClick={() => void handleSubmitHandover()}
                        disabled={
                          handoverBusy ||
                          simulationEnded ||
                          !handoverInput.trim()
                        }
                        className="w-full"
                      >
                        {handoverBusy ? 'Working…' : 'Submit Handover'}{' '}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        onClick={handleOffloadPatient}
                        disabled={
                          !handoverReadyToOffload ||
                          simulationEnded ||
                          handoverBusy
                        }
                        className={cn(
                          'w-full',
                          handoverReadyToOffload &&
                            'bg-emerald-700 text-white hover:bg-emerald-700/90',
                        )}
                        title={
                          handoverReadyToOffload
                            ? 'Transfer care to the ER team and end the run'
                            : 'Doctor still needs more information'
                        }
                      >
                        <Hospital className="mr-2 h-4 w-4" />
                        {handoverReadyToOffload
                          ? 'Offload PT'
                          : 'Offload PT (locked)'}
                      </Button>
                    </div>
                  </div>

                  {doctorCritique.length > 0 ? (
                    <div className="rounded-md border bg-muted/20 p-2">
                      <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                        Doctor&rsquo;s notes for debrief
                      </p>
                      <ul className="list-disc space-y-1 pl-4 text-xs">
                        {doctorCritique.map((note, i) => (
                          <li key={i}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        <div className="shrink-0 border-t px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="h-4 w-4" /> Live Action Log
          </div>
          <ScrollArea className="h-[8rem]">
            <div className="space-y-2 pr-4">
              {userActions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No actions taken yet.</p>
              ) : (
                userActions.map((action, index) => (
                  <div key={index} className="text-xs flex gap-2">
                    <span className="font-mono text-muted-foreground w-12 shrink-0">{formatTime(action.time)}</span>
                    <p className="flex-1 whitespace-pre-wrap">{renderActionDetails(action)}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

       <AlertDialog open={endSimAlertOpen} onOpenChange={setEndSimAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Cannot End Simulation Yet</AlertDialogTitle>
                <AlertDialogDescription>
                    You must give a radio report and choose a destination before ending the simulation. This ensures you follow realistic EMS protocols.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogAction onClick={() => setEndSimAlertOpen(false)}>Got it</AlertDialogAction>
        </AlertDialogContent>
    </AlertDialog>
    <FeatureTour
      open={tourOpen}
      steps={WELCOME_TOUR_STEPS}
      persistKey={WELCOME_TOUR_STORAGE_KEY}
      onClose={() => setTourOpen(false)}
    />
    </div>
  );
}
