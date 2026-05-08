

"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { Message, Scenario, Intervention, User as UserType, UserRole, UserAction, ArrestRhythmKind } from "@/lib/types";
import type { EcgRhythmKind } from "@/lib/ecg-rhythm";
import { shockableArrestRhythm } from "@/lib/ecg-rhythm";
import { effectiveSimulationRole, isTesterOrAdminUser } from "@/lib/user-permissions";
import type { Json } from "@/lib/supabase/database.types";
import { interventionCertifications } from "@/lib/types";
import { getPatientResponse, generateRadioReport } from "@/app/actions";
import { bumpTrainingStreakAfterSuccessfulSimulation } from "@/app/training-actions";
import { AlertCircle, ArrowRight, Clock, HeartPulse, Hospital, MapPin, MessageSquare, Siren, SquareTerminal, Syringe, User, Truck, Droplets, Thermometer, Waves, FileHeart, PhoneCall, Pause, Play, Zap, ListChecks, BookOpen, Star, Lock, Mic, MicOff } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useDoc,
  useSupabase,
  useUser,
  useCollection,
  useMemoSupabase,
  useDashboardProfile,
} from "@/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { hospitals } from "@/lib/hospitals-data";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { EcgMonitor } from "@/components/ecg-monitor";
import { AedPanel } from "@/components/aed-panel";
import { RhythmIdQuiz } from "@/components/rhythm-id-quiz";
import { recordRhythmQuizAttempt } from "@/lib/rhythm-quiz-attempts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from "next/link";


type SelectedTreatments = { 
  [interventionId: string]: {
    selected: boolean;
    subOptions: { [label: string]: string };
  }
};

type ActiveTab = "assessment" | "treatment" | "destination" | "radioReport" | "cardiacArrest";

const reportIssueSchema = z.object({
  message: z.string().min(10, {
    message: "Please provide a detailed description of the issue (minimum 10 characters).",
  }),
});

type ReportIssueFormValues = z.infer<typeof reportIssueSchema>;

type DictationTarget = "assessment" | "radioReport" | "medicalDirection";

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

  const interventionsSpec = useMemoSupabase(
    () =>
      supabase
        ? ({
            table: 'interventions',
            order: { column: 'name' as const, ascending: true },
            live: false,
          } as const)
        : null,
    [supabase]
  );
  const { data: allInterventions, isLoading: isLoadingInterventions } =
    useCollection<Intervention>(interventionsSpec);


  useEffect(() => {
    if (userData) {
      if (userData.role === 'tester') {
        setCurrentUserRole(userData.testRole || 'emt');
      } else {
        setCurrentUserRole(userData.role);
      }
    }
  }, [userData]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentVitals, setCurrentVitals] = useState<Scenario['initialVitals'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentInput, setAssessmentInput] = useState('');
  const [radioReportInput, setRadioReportInput] = useState('');
  const [medicalDirectionInput, setMedicalDirectionInput] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatments>({});
  const [selectedDestination, setSelectedDestination] = useState<string | undefined>(undefined);
  const [transportMode, setTransportMode] = useState<'Routine' | 'Emergency' | undefined>(undefined);
  const [time, setTime] = useState(0);
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
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [activeDictationTarget, setActiveDictationTarget] = useState<DictationTarget | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const simulationLogScrollRef = useRef<HTMLDivElement>(null);
  const simulationLogNearBottomRef = useRef(true);

  const reportForm = useForm<ReportIssueFormValues>({
    resolver: zodResolver(reportIssueSchema),
  });

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

    if (target === "assessment") {
      setAssessmentInput((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${normalized}`);
    } else if (target === "radioReport") {
      setRadioReportInput((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${normalized}`);
    } else {
      setMedicalDirectionInput((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${normalized}`);
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

    if (activeDictationTarget && activeDictationTarget !== target) {
      stopDictation();
    }

    if (activeDictationTarget === target) {
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
    const hr = (currentVitals?.hr ?? '').toLowerCase();
    return /asystole|v-?fib|pulseless|pea\b|cardiac arrest|no pulse/.test(hr);
  }, [scenario, currentVitals, currentArrestRhythm]);

  const hasROSC = useMemo(() => {
    if (!isCardiacArrestScenario || !currentVitals) return false;
    if (currentArrestRhythm) return false;
    const hr = currentVitals.hr.toLowerCase();
    if (/asystole|v-?fib|pulseless|pea\b|no pulse|0\s*bpm/.test(hr)) return false;
    return parseInt(hr) > 0;
  }, [isCardiacArrestScenario, currentVitals, currentArrestRhythm]);

  /** Translate the AI's arrest-rhythm enum into the broader EcgRhythmKind union. */
  const monitorForcedRhythm: EcgRhythmKind | null = useMemo(() => {
    if (currentArrestRhythm) return currentArrestRhythm as EcgRhythmKind;
    if (scenario?.initialRhythm) return scenario.initialRhythm as EcgRhythmKind;
    return null;
  }, [currentArrestRhythm, scenario]);

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
            setCurrentVitals(lastVitals ?? scenario.initialVitals);
          } else {
            setCurrentVitals(scenario.initialVitals);
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
          return;
        }

        const newSessionId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const { error } = await supabase.from('simulation_sessions').insert({
          id: newSessionId,
          user_id: authUser.id,
          scenario_id: scenario.id,
          scenario_title: scenario.title,
          status: 'in-progress',
          user_role: effectiveSimulationRole(userData),
        });
        if (error) throw error;

        setSessionId(newSessionId);
        setCurrentVitals(scenario.initialVitals);

        const initialMessage: Message = { role: 'assistant', content: scenario.details, vitals: scenario.initialVitals };

        setMessages([
          { role: 'system', content: 'Simulation Started. Patient details loaded.'},
          initialMessage,
        ]);

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
   }, [scenario, authUser, supabase, sessionId, toast, userData]);

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


  const availableInterventions = useMemo(() => {
    if (!allInterventions) return [];
    
    const effectiveRole = (currentUserRole === 'admin') ? 'paramedic' : currentUserRole;
    
    const userLevel = interventionCertifications.indexOf(effectiveRole as 'emt' | 'aemt' | 'paramedic');

    if (userLevel === -1) return [];

    return allInterventions.filter(intervention => {
      const interventionLevel = interventionCertifications.indexOf(intervention.certificationLevel);
      return interventionLevel <= userLevel;
    });
  }, [currentUserRole, allInterventions]);

  const submitAction = useCallback(async (
    actionType: ActiveTab | "medicalDirection" | "cardiacArrest", 
    payload: { assessment?: string; treatments?: string[]; destination?: string; transport?: 'Routine' | 'Emergency' }
  ) => {
    if (!scenario || !allInterventions || !userData || isLoading) return;
    
    setIsLoading(true);

    const assessmentText = payload.assessment || 'None';
    const treatmentsArray = payload.treatments || [];
    const destination = payload.destination || null;

    if (treatmentsArray.includes("Cardiopulmonary Resuscitation (CPR)") && !cprStarted) {
        setCprStarted(true);
    }

    let actionDescription = '';
    if (assessmentText !== 'None') actionDescription = `Assessment: ${assessmentText}`;
    if (treatmentsArray.length > 0) actionDescription = `Treatments: ${treatmentsArray.join(', ')}`;
    if (destination) {
        actionDescription = `Selected Destination: ${destination}`;
        if (payload.transport) {
            actionDescription += ` (Transport: ${payload.transport})`;
        }
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: actionDescription }];
    setMessages(newMessages);

    const newAction: UserAction = {
      time: time,
      assessment: assessmentText,
      treatments: treatmentsArray,
      destination: destination,
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
      const mandatoryActionsForRole = scenario.mandatoryActions[userRole as keyof typeof scenario.mandatoryActions] || [];
      const priorVitals = currentVitals ?? scenario.initialVitals;

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

      setMessages(updatedMessages);
      setCurrentVitals(newVitals);

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
  }, [scenario, allInterventions, userData, isLoading, messages, time, userActions, toast, handleEndSimulation, currentUserRole, selectedDestination, cprStarted, currentVitals]);

  /**
   * Logs a cardiac monitor / ECG action into the user-action log so it counts
   * for grading (matches `mandatoryActions` / `suggestedActions` phrasing) and
   * appears in the simulation chronology. Does not call the patient AI flow —
   * monitoring is observational and shouldn't burn rate-limit quota.
   */
  const handleEcgAction = useCallback((label: string) => {
    if (!scenario || !authUser) return;
    const newAction: UserAction = {
      time,
      assessment: '',
      treatments: [label],
      destination: null,
    };
    setUserActions((prev) => [...prev, newAction]);
    setMessages((prev) => [
      ...prev,
      { role: 'system', content: `Action logged · ${label}` },
    ]);
  }, [scenario, authUser, time]);

  const handleSubmitAssessment = () => {
    const assessmentText = assessmentInput.trim();
    if (assessmentText) {
      submitAction("assessment", { assessment: assessmentText });
    } else {
      toast({ title: 'No Input', description: 'Please enter your assessment findings.', variant: 'destructive' });
    }
  };

  const handleSubmitTreatments = (actionType: 'treatment' | 'cardiacArrest' = 'treatment') => {
    const treatmentsArray = Object.entries(selectedTreatments)
      .filter(([, details]) => details.selected)
      .map(([id, details]) => {
        const intervention = allInterventions?.find(i => i.id === id);
        if (!intervention) return '';
        const subOptionsStr = Object.entries(details.subOptions).map(([label, value]) => `${label}: ${value}`).join(', ');
        return `${intervention.name}${subOptionsStr ? ` (${subOptionsStr})` : ''}`;
      }).filter(Boolean);
    
    if (treatmentsArray.length > 0) {
      submitAction(actionType, { treatments: treatmentsArray });
    } else {
      toast({ title: 'No Treatments Selected', description: 'Please select at least one treatment.', variant: 'destructive' });
    }
  };

  const handleSubmitDestination = () => {
      const hospital = hospitals.find(h => h.id === selectedDestination);
      if (hospital && transportMode) {
          submitAction("destination", { destination: hospital.name, transport: transportMode });
      } else {
          toast({ title: 'Incomplete Selection', description: 'Please select both a hospital destination and a transport mode.', variant: 'destructive' });
      }
  };


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
    if (!scenario || !currentVitals || !userData) return;
    setIsGeneratingReport(true);
    setRadioReportInput("Generating report...");
    try {
      const response = await generateRadioReport({
        patientProfile: scenario.patientProfile,
        scenarioDetails: scenario.details,
        userActions,
        currentVitals,
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
    if (!allInterventions) return;
    const intervention = allInterventions.find(i => i.id === id);
    const initialSubOptions = intervention?.subOptions?.reduce((acc, so) => {
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
  
  const renderActionDetails = (action: UserAction) => {
    if (action.assessment !== 'None') {
      return `Assessment: ${action.assessment}`;
    }
    if (action.treatments.length > 0) {
      return `Treatments: ${action.treatments.join(', ')}`;
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


  if (isLoadingScenario || isUserDataLoading) {
    return <div className="p-8">Loading scenario...</div>;
  }

  if (!scenario) return <div className="p-8 text-red-500">Error: Scenario not found.</div>;
  
  const cardiacArrestInterventionIds = [
    'cpr',
    'apply-monitor-pads',
    'defibrillation',
    'epinephrine-cardiac',
    'amiodarone',
    'lidocaine',
    'intubation',
    'supraglottic-airway',
    'pulse-rhythm-check',
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
    return !['defibrillation', 'amiodarone', 'lidocaine'].includes(id);
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HeartPulse /> Current Vitals</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            {currentVitals ? Object.entries(currentVitals).map(([key, value]) => (
              <div key={key}>
                <span className="font-semibold uppercase text-muted-foreground">{key}: </span>
                <span>{value}</span>
              </div>
            )) : <Skeleton className="h-20 w-full" />}
          </CardContent>
        </Card>
        {currentVitals?.hr ? (
          <div className="space-y-2">
            <EcgMonitor
              scenario={scenario}
              currentVitals={currentVitals}
              cprActive={cprStarted && !hasROSC}
              forcedRhythm={monitorForcedRhythm}
              pulseless={Boolean(currentArrestRhythm)}
              onRhythmChange={(kind) => setObservedRhythm(kind)}
              onAction={handleEcgAction}
            />
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
                    onClick={handleEndSimClick}
                    disabled={simulationEnded}
                    className="w-full bg-destructive hover:bg-destructive/90"
                >
                    {simulationEnded ? 'Ending...' : 'End Simulation'}
                </Button>
          </CardContent>
        </Card>
        <Card className="flex-grow flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ListChecks /> Live Action Log</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="space-y-3 pr-4">
                        {userActions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No actions taken yet.</p>
                        ) : (
                            userActions.map((action, index) => (
                                <div key={index} className="text-sm flex gap-2">
                                    <span className="font-mono text-muted-foreground w-12">{formatTime(action.time)}</span>
                                    <p className="flex-1 whitespace-pre-wrap">{renderActionDetails(action)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-2 flex flex-col h-full min-h-0 bg-card rounded-lg border">
        <div className="shrink-0 border-b p-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><SquareTerminal /> Simulation Log</h2>
        </div>
        <div
          ref={simulationLogScrollRef}
          onScroll={onSimulationLogScroll}
          className="max-h-[min(38dvh,24rem)] shrink-0 overflow-y-auto overscroll-contain px-4 pb-3 pt-4 sm:max-h-[min(52vh,26rem)]"
        >
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role !== 'user' && <Avatar className="w-8 h-8"><AvatarFallback>{message.role === 'assistant' ? 'P' : message.role === 'system' ? 'H' : 'S'}</AvatarFallback></Avatar>}
                <div className={`rounded-lg p-3 max-w-lg ${message.role === 'user' ? 'bg-primary text-primary-foreground' : message.role === 'system' ? 'bg-yellow-100 dark:bg-yellow-900/50' : 'bg-muted'}`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.conditionChange && <p className="text-sm mt-2 pt-2 border-t border-muted-foreground/20">Condition: {message.conditionChange}</p>}
                   {message.role === 'assistant' && message.vitals && (
                     <div className="mt-2 text-xs text-muted-foreground border-t pt-2 grid grid-cols-2 gap-x-4">
                       {Object.entries(message.vitals).map(([key, value]) => <span key={key}>{key.toUpperCase()}: {value}</span>)}
                     </div>
                   )}
                </div>
                 {message.role === 'user' && <Avatar className="w-8 h-8"><AvatarFallback>U</AvatarFallback></Avatar>}
              </div>
            ))}
            {isLoading && <p>AI is thinking...</p>}
            {isAnalyzingAED && <p>AED is analyzing...</p>}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-start border-t p-4">
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
                            <div className="flex items-center justify-between">
                              <Label>Select cardiac arrest interventions</Label>
                              {currentArrestRhythm && (
                                <Badge variant={isShockable ? "destructive" : "secondary"} className="text-[11px]">
                                  {isShockable ? "Shockable rhythm" : "Non-shockable rhythm"}
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                            {cardiacArrestInterventions.map(t => {
                              const showSubs =
                                !!(selectedTreatments[t.id]?.selected && t.subOptions && t.subOptions.length > 0);
                              return (
                                <div key={t.id} className={cn(showSubs && "col-span-full")}>
                                    <div className="flex items-start gap-2">
                                        <Checkbox id={`cardiac-${t.id}`} className="mt-0.5 shrink-0" onCheckedChange={(checked) => handleTreatmentSelection(t.id, checked)} checked={selectedTreatments[t.id]?.selected || false} />
                                        <label htmlFor={`cardiac-${t.id}`} className="text-sm font-medium leading-snug">{t.name}</label>
                                    </div>
                                    {showSubs && (
                                    <div className="mt-2 space-y-2 border-l-2 border-muted pl-4 ml-1 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-4 md:gap-y-2 md:space-y-0">
                                        {t.subOptions!.map(so => (
                                        <div key={so.label} className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">{so.label}</Label>
                                            <Select onValueChange={(value) => handleSubOptionChange(t.id, so.label, value)} defaultValue={selectedTreatments[t.id]?.subOptions?.[so.label] || so.options[0]}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={`Select ${so.label}`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {so.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
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
                    <Button variant="outline" size="sm" onClick={() => submitAction('assessment', { assessment: 'Request a 4-lead ECG reading.'})} disabled={showCardiacArrestTab}><FileHeart className="mr-2 h-4 w-4" /> 4-Lead ECG</Button>
                    <Button variant="outline" size="sm" onClick={() => submitAction('assessment', { assessment: 'Request a 12-lead ECG reading.'})} disabled={showCardiacArrestTab}><FileHeart className="mr-2 h-4 w-4" /> 12-Lead ECG</Button>
                    <Button variant="outline" size="sm" onClick={() => submitAction('assessment', { assessment: 'Check blood glucose level.'})} disabled={showCardiacArrestTab}><Droplets className="mr-2 h-4 w-4" /> Blood Glucose</Button>
                    <Button variant="outline" size="sm" onClick={() => submitAction('assessment', { assessment: 'Check patient\'s temperature.'})} disabled={showCardiacArrestTab}><Thermometer className="mr-2 h-4 w-4" /> Temperature</Button>
                    <Button variant="outline" size="sm" onClick={() => submitAction('assessment', { assessment: 'Check end-tidal CO2 reading.'})} disabled={showCardiacArrestTab}><Waves className="mr-2 h-4 w-4" /> End-Tidal CO2</Button>
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
                  {isLoadingInterventions && <p>Loading interventions...</p>}
                  {!isLoadingInterventions && availableInterventions.length === 0 && (
                    <p className="text-muted-foreground text-sm">No interventions available for your certification level.</p>
                  )}
                  {availableInterventions.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                  {availableInterventions.map(t => {
                    const showSubs =
                      !!(selectedTreatments[t.id]?.selected && t.subOptions && t.subOptions.length > 0);
                    return (
                    <div key={t.id} className={cn(showSubs && "col-span-full")}>
                      <div className="flex items-start gap-2">
                        <Checkbox id={t.id} className="mt-0.5 shrink-0" onCheckedChange={(checked) => handleTreatmentSelection(t.id, checked)} checked={selectedTreatments[t.id]?.selected || false} />
                        <label htmlFor={t.id} className="text-sm font-medium leading-snug">{t.name}</label>
                      </div>
                      {showSubs && (
                        <div className="mt-2 space-y-2 border-l-2 border-muted pl-4 ml-1 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-4 md:gap-y-2 md:space-y-0">
                          {t.subOptions!.map(so => (
                            <div key={so.label} className="space-y-2">
                              <Label className="text-xs text-muted-foreground">{so.label}</Label>
                               <Select onValueChange={(value) => handleSubOptionChange(t.id, so.label, value)} defaultValue={selectedTreatments[t.id]?.subOptions?.[so.label] || so.options[0]}>
                                <SelectTrigger>
                                  <SelectValue placeholder={`Select ${so.label}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {so.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
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
          </Tabs>
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
    </div>
  );
}
