import type { VitalDeltas } from '@/lib/physiology/pk-types';
import type { PathophysiologyAxes } from '@/lib/physiology/types';
import type { AutonomicProfile } from '@/lib/types';
import type { PhysiologyFeedbackSnapshot } from '@/lib/physiology/feedback';

export type { AutonomicProfile };

/** Phase III — durable autonomic / volume stressor events (append-only log). */
export const AUTONOMIC_EVENT_KINDS = [
  'fluid_bolus',
  'bleed_rate_set',
  'bleed_rate_change',
  'distributive_tone_set',
  'oxygen_change',
  'tension_pneumo_resolve',
  'tension_pneumo_start',
  'cpap_started',
  'airway_secured',
  'ai_stressor',
] as const;

export type AutonomicEventKind = (typeof AUTONOMIC_EVENT_KINDS)[number];

export type DecompensationPhase =
  | 'baseline'
  | 'compensated'
  | 'decompensating'
  | 'crashing'
  | 'arrested';

export type AutonomicEventPayload = Record<string, unknown>;

export type AutonomicEvent = {
  id: string;
  sessionId: string;
  userId: string;
  kind: AutonomicEventKind;
  payload: AutonomicEventPayload;
  simSeconds: number;
  recordedAt: string;
};

/** Mutable integrator state advanced at 1 Hz. */
export type AutonomicState = {
  intravascularVolumeMl: number;
  volumeBaselineMl: number;
  currentBleedRateMlPerMin: number;
  distributiveToneFactor: number;
  sympatheticDrive: number;
  baroreflexErrorIntegral: number;
  workOfBreathing: number;
  oxygenationDriveDeficit: number;
  /** 0–1 supplemental O₂ effect on chemoreflex (reduces hypoxic RR drive). */
  supplementalO2Boost: number;
  pulmonaryEdemaSeverity: number;
  tensionPneumoSeverity: number;
  decompensationPhase: DecompensationPhase;
  /** Sim second through which `tickAutonomic` last integrated (inclusive). */
  lastIntegratedSimSec: number;
  /** Seconds MAP < threshold while in crashing (for arrest latched). */
  crashingSecondsAccumulated: number;
  /** Bolus “active” window for capillary leak / edema coupling (sim seconds). */
  fluidBolusActiveUntilSimSec: number;
  mapBaselineMmHg: number;
  cpapActive: boolean;
  airwaySecured: boolean;
};

export type TickAutonomicResult = {
  state: AutonomicState;
  /** Accumulated deltas since baseline tick 0 — for this tick step, engine returns incremental? */
  deltasForStep: VitalDeltas;
  /** Total vital deltas from autonomic layer (cumulative since session start / replay). */
  cumulativeDeltas: VitalDeltas;
};

export type AutonomicReplayContext = {
  axes: PathophysiologyAxes;
  weightKg: number;
  profile: AutonomicProfile | undefined;
  /** Vital strings shape matching `Scenario['initialVitals']`. */
  baselineVitals: {
    hr: string;
    bp: string;
    rr: string;
    spo2: string;
    gcs: string;
  };
  getPkDeltasAt: (simSec: number) => VitalDeltas;
  feedback?: PhysiologyFeedbackSnapshot | null;
};

/** Supabase row — snake_case (matches simulation_pk_doses pattern). */
export type SimulationAutonomicEventRowSnake = {
  id: string;
  session_id: string;
  user_id: string;
  kind: string;
  payload: unknown;
  sim_seconds: number;
  recorded_at: string;
};
