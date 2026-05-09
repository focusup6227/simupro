import { z } from 'zod';
import { isoDateOnlyNotAfterToday } from '@/lib/certification-attestation';
import { ALL_ECG_RHYTHM_KINDS, type EcgRhythmKind } from '@/lib/ecg-rhythm';
import { ACS_PATTERN_KINDS, type AcsPatternKind } from '@/lib/ecg-acs';

/** Serialized dates from DB / legacy Firestore-shaped payloads */
export const TimestampLikeSchema = z.union([
  z.date(),
  z.string(),
  z.number(),
  z.any(),
]);

/** Subset of arrest-only rhythm kinds used by AI patient flow output. */
export const ARREST_RHYTHM_KINDS = ['vfib', 'pulseless_vt', 'pea', 'asystole'] as const;
export type ArrestRhythmKind = (typeof ARREST_RHYTHM_KINDS)[number];


export type UserRole = 'emt' | 'aemt' | 'paramedic' | 'admin' | 'tester' | 'student';

const optionalCompactDateSchema = z.union([
  z.literal(''),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD.'),
]);

export const UserProfileSchema = z
  .object({
    displayName: z.string().min(2, "Display name must be at least 2 characters."),
    photoURL: z.string().optional(),
    role: z.enum(['emt', 'aemt', 'paramedic']),
    emtProgramCompletedOn: optionalCompactDateSchema.optional(),
    aemtProgramCompletedOn: optionalCompactDateSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const emt = data.emtProgramCompletedOn ?? '';
    const aemt = data.aemtProgramCompletedOn ?? '';
    const emtProvided = emt !== '';
    const aemtProvided = aemt !== '';

    if (emtProvided && !isoDateOnlyNotAfterToday(emt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date cannot be in the future.',
        path: ['emtProgramCompletedOn'],
      });
    }
    if (aemtProvided && !isoDateOnlyNotAfterToday(aemt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date cannot be in the future.',
        path: ['aemtProgramCompletedOn'],
      });
    }
  });

export type UserProfile = z.infer<typeof UserProfileSchema>;


export type User = {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  testRole?: 'emt' | 'aemt' | 'paramedic';
  isAdmin?: boolean;
  isPremium?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  premiumStatus?: string;
  premiumCurrentPeriodEnd?: string | Date;
  hasCompletedTutorial?: boolean;
  /** UTC-date streak rules (see training-actions). */
  currentStreak?: number;
  longestStreak?: number;
  lastTrainingActivityDate?: string | null;
  totalCompletedSimulations?: number;
  /** User-attested EMT program completion (YYYY-MM-DD). */
  emtProgramCompletedOn?: string | null;
  /** User-attested AEMT program completion (YYYY-MM-DD). */
  aemtProgramCompletedOn?: string | null;
};
const CertificationActionsSchema = z.object({
    emt: z.array(z.string()),
    aemt: z.array(z.string()),
    paramedic: z.array(z.string()),
});
export type CertificationActions = z.infer<typeof CertificationActionsSchema>;


export const AutonomicProfileSchema = z.object({
  initialVolumeMl: z.number().optional(),
  baselineBleedRateMlPerMin: z.number().optional(),
  baselineDistributiveToneFactor: z.number().optional(),
  baselineMapMmHg: z.number().optional(),
  initialPulmonaryEdemaSeverity: z.number().optional(),
  initialTensionPneumoSeverity: z.number().optional(),
  initialDecompensationPhase: z
    .enum(['baseline', 'compensated', 'decompensating', 'crashing', 'arrested'])
    .optional(),
});
export type AutonomicProfile = z.infer<typeof AutonomicProfileSchema>;

export const ScenarioSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  status: z.enum(['draft', 'published']),
  isPremium: z.boolean().optional(),
  category: z.enum(['cardiac-arrest']).optional(),
  patientProfile: z.string().min(1, "Patient profile is required."),
  /** Explicit pathophysiology condition ids (see COMORBIDITY_MATRIX). Overrides text extraction when set. */
  comorbidities: z.array(z.string()).optional(),
  initialVitals: z.object({
    hr: z.string().min(1, "Heart rate is required."),
    bp: z.string().min(1, "Blood pressure is required."),
    rr: z.string().min(1, "Respiratory rate is required."),
    spo2: z.string().min(1, "Oxygen saturation is required."),
    gcs: z.string().min(1, "GCS is required."),
  }),
  initialRhythm: z
    .enum(ALL_ECG_RHYTHM_KINDS as readonly [EcgRhythmKind, ...EcgRhythmKind[]])
    .optional()
    .describe('Optional structured rhythm seed. If omitted, the patient AI picks one from scenario context.'),
  acsPattern: z
    .enum(ACS_PATTERN_KINDS as readonly [AcsPatternKind, ...AcsPatternKind[]])
    .optional()
    .describe('Optional structured ACS injury pattern. Drives ST elevation/depression geography across all 12 leads via a single XYZ injury vector. Omit to let the scenario text decide.'),
  details: z.string().min(1, "Details are required."),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  tags: z.array(z.string()).min(1, "At least one tag is required."),
  destination: z.string().min(1, "Destination is required."),
  destinationRationale: z.string().min(1, "Destination rationale is required."),
  hospitalDistances: z.record(z.string().min(1), z.number().min(0)),
  suggestedActions: CertificationActionsSchema,
  mandatoryActions: CertificationActionsSchema,
  criticalFailures: z.array(z.string()).min(1, "At least one critical failure is required."),
  patientPresentation: z.string().optional(),
  autonomicProfile: AutonomicProfileSchema.optional(),
  /** Mapped to `patient_weight_kg`; explicit mass when set overrides age-band heuristic. */
  defaultWeightKg: z.number().positive().max(300).optional(),
  /**
   * `pediatric` / `adult` are legacy LMS cohort tags; granular bands derive default weight when
   * `defaultWeightKg` is unset.
   */
  ageBand: z
    .enum([
      'adult',
      'pediatric',
      'neonate',
      'infant',
      'toddler',
      'child',
      'adolescent',
    ])
    .optional(),
  /** Optional ICP (mmHg) for educator CPP rails (CPP ≈ MAP − ICP) when MAP is available. */
  icpMmHg: z.number().min(0).max(80).optional(),
});
export type Scenario = z.infer<typeof ScenarioSchema>;
export type ScenarioData = Omit<Scenario, 'id'>;

/** Narrow scenario shape for list/catalog queries (avoids heavy blobs). */
export type ScenarioCardRow = Pick<
  Scenario,
  | 'id'
  | 'title'
  | 'description'
  | 'status'
  | 'isPremium'
  | 'category'
  | 'difficulty'
  | 'tags'
>;

export const ScenarioReviewSchema = z.object({
    id: z.string(),
    scenarioId: z.string(),
    testerId: z.string(),
    testerName: z.string(),
    testedAsRole: z.enum(['emt', 'aemt', 'paramedic']),
    approved: z.boolean(),
    comments: z.string().optional(),
    createdAt: TimestampLikeSchema,
});
export type ScenarioReview = z.infer<typeof ScenarioReviewSchema>;


export const UserActionSchema = z.object({
  time: z.number().describe("The simulation time in seconds when the action was taken."),
  assessment: z.string().describe("The user's written assessment notes for this action."),
  treatments: z.array(z.string()).describe("A list of treatments administered in this action."),
  destination: z.string().nullable().describe("The hospital destination selected by the user."),
  transportMode: z.enum(['Routine', 'Emergency']).optional().describe("The transport mode selected by the user."),
});
export type UserAction = z.infer<typeof UserActionSchema>;

export const SimulationSessionSchema = z.object({
    id: z.string(),
    userId: z.string(),
    scenarioId: z.string(),
    scenarioTitle: z.string(),
    startTime: TimestampLikeSchema,
    endTime: TimestampLikeSchema.optional(),
    status: z.enum(['in-progress', 'completed', 'failed']),
    timeElapsed: z.number().optional(),
    actions: z.array(UserActionSchema).optional(),
    messages: z.array(z.unknown()).optional(),
    userRole: z.custom<UserRole>().optional(),
});
export type SimulationSession = z.infer<typeof SimulationSessionSchema>;


export const UserActionLogSchema = z.object({
    log: z.array(UserActionSchema),
});
export type UserActionLog = z.infer<typeof UserActionLogSchema>;


export const PremiumFeedbackSchema = z.object({
  whatWentWell: z.array(z.string()).optional(),
  criticalIssues: z.array(z.string()).optional(),
  protocolReferences: z.array(z.string()).optional(),
  actionableTips: z.array(z.string()).optional(),
  drillSuggestions: z.array(z.string()).optional(),
});
export type PremiumFeedback = z.infer<typeof PremiumFeedbackSchema>;

export const InsightSchema = z.object({
  id: z.string(),
  assessmentScore: z.number(),
  treatmentScore: z.number(),
  aiFeedback: z.string(),
  reasoning: z.string(),
  premiumFeedback: PremiumFeedbackSchema.optional(),
});
export type Insight = z.infer<typeof InsightSchema>;


export type PerformanceData = {
  id: string;
  userId: string;
  scenarioId: string;
  date: string;
  assessmentAccuracy: number;
  treatmentAppropriateness: number;
  timeToIntervention: number;
  finalOutcome: string;
};

export type Message = {
    role: 'user' | 'assistant' | 'system';
    content: string;
    vitals?: Scenario['initialVitals'];
    conditionChange?: string;
    patientIsDeceased?: boolean;
    /** Set when the patient AI flags the patient as pulseless. */
    arrestRhythm?: ArrestRhythmKind;
    /** Brief teaching note about why this arrest rhythm fits the underlying cause. */
    arrestRhythmRationale?: string;
}

export const RhythmQuizAttemptSchema = z.object({
  id: z.string(),
  userId: z.string(),
  source: z.enum(['trainer', 'scenario']),
  scenarioId: z.string().nullable().optional(),
  sessionId: z.string().nullable().optional(),
  rhythmKind: z.string(),
  userAnswer: z.string(),
  isCorrect: z.boolean(),
  difficulty: z.string().nullable().optional(),
  family: z.string(),
  msToAnswer: z.number().nullable().optional(),
  createdAt: TimestampLikeSchema,
});
export type RhythmQuizAttempt = z.infer<typeof RhythmQuizAttemptSchema>;

export type SubOption = {
  label: string;
  options: string[];
};

export const interventionCertifications = ['emt', 'aemt', 'paramedic'] as const;
export type InterventionCertification = typeof interventionCertifications[number];


export const InterventionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required."),
  description: z.string().min(1, "Description is required."),
  indication: z.string().optional(),
  mechanism: z.string().optional(),
  certificationLevel: z.enum(interventionCertifications),
  subOptions: z.array(z.object({
    label: z.string().min(1, "Label is required."),
    options: z.array(z.string()).min(1, "At least one option is required."),
  })).optional(),
});
export type Intervention = z.infer<typeof InterventionSchema>;
export type InterventionData = Omit<Intervention, 'id'>;


const GradeScenarioSchema = ScenarioSchema.pick({
    mandatoryActions: true,
    suggestedActions: true,
    criticalFailures: true,
}).describe("The objectives for the scenario.");

export const GradeSimulationInputSchema = z.object({
  scenario: GradeScenarioSchema,
  userActions: z.array(UserActionSchema).describe("A log of all actions taken by the user during the simulation."),
  userRole: z.string().describe("The user's certification level (e.g., emt, aemt, paramedic)."),
});
export type GradeSimulationInput = z.infer<typeof GradeSimulationInputSchema>;


export const GradeSimulationOutputSchema = z.object({
  assessmentScore: z.number().describe("A numerical score from 0-100 for the user's assessment skills, based on their logged assessment notes."),
  treatmentScore: z.number().describe("A numerical score from 0-100 for the user's treatment choices, based on the mandatory, suggested, and critical failure actions relevant to their certification level."),
  reasoning: z.string().describe("A brief justification for the scores provided, explaining which key actions were missed or performed correctly based on their certification level."),
});
export type GradeSimulationOutput = z.infer<typeof GradeSimulationOutputSchema>;


export type Hospital = {
  id: string;
  name: string;
  capabilities: ('cath lab' | 'OB' | 'neuro' | 'trauma' | 'psych')[];
}

export const SupportTicketResponseSchema = z.object({
  responder: z.string(),
  message: z.string(),
  createdAt: TimestampLikeSchema,
});
export type SupportTicketResponse = z.infer<typeof SupportTicketResponseSchema>;

export const SUPPORT_TICKET_KINDS = ['support', 'issue', 'feature_request'] as const;
export type SupportTicketKind = (typeof SUPPORT_TICKET_KINDS)[number];

export const SupportTicketSchema = z.object({
    id: z.string(),
    userId: z.string(),
    userEmail: z.string().email(),
    message: z.string(),
    scenarioId: z.string().optional(),
    scenarioTitle: z.string().optional(),
    ticketKind: z.enum(SUPPORT_TICKET_KINDS),
    createdAt: TimestampLikeSchema,
    status: z.enum(['new', 'in-progress', 'resolved']),
    responses: z.array(SupportTicketResponseSchema).optional(),
});
export type SupportTicket = z.infer<typeof SupportTicketSchema>;

export const AI_FEEDBACK_REVIEW_STATUSES = ['pending', 'validated', 'dismissed'] as const;
export type AiFeedbackReviewStatus = (typeof AI_FEEDBACK_REVIEW_STATUSES)[number];

export type AiResponseFeedback = {
  id: string;
  sessionId: string | null;
  userId: string;
  scenarioId: string;
  scenarioTitle: string;
  assistantMessageIndex: number;
  flaggedAssistantContent: string;
  messagesSnapshot: unknown;
  userActionsSnapshot: unknown;
  simulationRole: string | null;
  simulationTimeSeconds: number | null;
  userComment: string;
  reviewStatus: AiFeedbackReviewStatus;
  adminPreferredResponse: string | null;
  adminReviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
