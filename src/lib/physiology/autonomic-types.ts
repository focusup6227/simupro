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
  /**
   * Intrinsic MAP (volume + tone derived) at t=0, used as the reference so the
   * volume/tone *disturbance* applied to displayed BP is zero at sim start and
   * only grows as the patient bleeds or vasodilates away from baseline.
   */
  intrinsicMapBaselineMmHg: number;
  /**
   * Baroreflex BP actuator — the systolic mmHg the reflex has added via
   * vasoconstriction/inotropy. This is the integral of the reflex output,
   * clamped to a physiologic compensation ceiling so the reflex can't restore
   * an arbitrarily low pressure to target (once exceeded, BP genuinely falls).
   */
  baroBpActuatorSysMmHg: number;
  /** Systolic component of the volume/tone/pneumo disturbance applied last tick (for telescoping). */
  bpDisturbancePrevSysMmHg: number;
  /** Diastolic component of the disturbance applied last tick (for telescoping). */
  bpDisturbancePrevDiaMmHg: number;
};

export type TickAutonomicResult = {
  state: AutonomicState;
  /**
   * The increment applied to `cumulativeDeltas` on this tick. For the
   * baroreflex/disturbance axes (BP, SpO₂) this is the steady-state drive level
   * summed into the integral; for the relaxed passive-readout axes (HR, RR) it
   * is the first-order step toward the target offset, so its sign and magnitude
   * reflect movement toward the target rather than the target itself.
   */
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
