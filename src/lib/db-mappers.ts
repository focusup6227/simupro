import type {
  Scenario,
  ScenarioCardRow,
  User,
  UserRole,
  LegacySupabaseIntervention,
  SimulationSession,
  Insight,
  ScenarioReview,
  SupportTicket,
  SupportTicketResponse,
  AiResponseFeedback,
  CertificationActions,
  RhythmQuizAttempt,
} from '@/lib/types';
import { AutonomicProfileSchema } from '@/lib/types';
import type { Database, Json } from '@/lib/supabase/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ScenarioRow = Database['public']['Tables']['scenarios']['Row'];
type InterventionRow = Database['public']['Tables']['interventions']['Row'];
type SimSessionRow = Database['public']['Tables']['simulation_sessions']['Row'];
type InsightRow = Database['public']['Tables']['session_insights']['Row'];
type ReviewRow = Database['public']['Tables']['scenario_reviews']['Row'];
type TicketRow = Database['public']['Tables']['support_tickets']['Row'];
type AiFeedbackRow = Database['public']['Tables']['ai_response_feedback']['Row'];
type RhythmQuizAttemptRow = Database['public']['Tables']['rhythm_quiz_attempts']['Row'];

export function rhythmAttemptRowToAttempt(r: RhythmQuizAttemptRow): RhythmQuizAttempt {
  return {
    id: r.id,
    userId: r.user_id,
    source: r.source,
    scenarioId: r.scenario_id ?? null,
    sessionId: r.session_id ?? null,
    rhythmKind: r.rhythm_kind,
    userAnswer: r.user_answer,
    isCorrect: r.is_correct,
    difficulty: r.difficulty ?? null,
    family: r.family,
    msToAnswer: r.ms_to_answer ?? null,
    createdAt: r.created_at,
  };
}

export function profileRowToUser(r: ProfileRow): User {
  return {
    id: r.id,
    email: r.email,
    displayName: r.display_name ?? undefined,
    photoURL: r.photo_url ?? undefined,
    role: r.role as UserRole,
    testRole: (r.test_role as User['testRole']) ?? undefined,
    isAdmin: r.is_admin,
    isPremium: r.is_premium,
    stripeCustomerId: r.stripe_customer_id ?? undefined,
    stripeSubscriptionId: r.stripe_subscription_id ?? undefined,
    premiumStatus: r.premium_status ?? undefined,
    premiumCurrentPeriodEnd: r.premium_current_period_end ?? undefined,
    hasCompletedTutorial: r.has_completed_tutorial,
    disclaimerAcceptedAt: r.disclaimer_accepted_at ?? null,
    disclaimerAcceptedVersion: r.disclaimer_accepted_version ?? null,
    currentStreak: r.current_streak,
    longestStreak: r.longest_streak,
    lastTrainingActivityDate: r.last_training_activity_date ?? undefined,
    totalCompletedSimulations: r.total_completed_simulations,
    emtProgramCompletedOn: r.emt_program_completed_on ?? undefined,
    aemtProgramCompletedOn: r.aemt_program_completed_on ?? undefined,
    activeProtocolImportId: r.active_protocol_import_id ?? null,
    protocolWorkplaceId: r.protocol_workplace_id ?? null,
    activeWorkplaceProtocolImportId: r.active_workplace_protocol_import_id ?? null,
  };
}

/** Insert shape for signup / profile bootstrap */
export function userToProfileInsert(opts: {
  id: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  role: UserRole;
  testRole?: string | null;
  isAdmin?: boolean;
  hasCompletedTutorial?: boolean;
}) {
  return {
    id: opts.id,
    email: opts.email,
    display_name: opts.displayName ?? null,
    photo_url: opts.photoURL ?? null,
    role: opts.role,
    test_role: opts.testRole ?? null,
    is_admin: opts.isAdmin ?? false,
    has_completed_tutorial: opts.hasCompletedTutorial ?? false,
  };
}

export function scenarioRowToScenario(r: ScenarioRow): Scenario {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status as Scenario['status'],
    isPremium: r.is_premium,
    category: (r.category as Scenario['category']) ?? undefined,
    patientProfile: r.patient_profile,
    comorbidities: r.comorbidities ?? undefined,
    initialVitals: r.initial_vitals as Scenario['initialVitals'],
    details: r.details,
    difficulty: r.difficulty as Scenario['difficulty'],
    tags: r.tags ?? [],
    destination: r.destination,
    destinationRationale: r.destination_rationale,
    hospitalDistances: r.hospital_distances as Scenario['hospitalDistances'],
    suggestedActions: r.suggested_actions as CertificationActions,
    mandatoryActions: r.mandatory_actions as CertificationActions,
    criticalFailures: r.critical_failures ?? [],
    patientPresentation: r.patient_presentation ?? undefined,
    initialRhythm: (r.initial_rhythm as Scenario['initialRhythm']) ?? undefined,
    acsPattern: (r.acs_pattern as Scenario['acsPattern']) ?? undefined,
    autonomicProfile: r.autonomic_profile
      ? AutonomicProfileSchema.parse(r.autonomic_profile)
      : undefined,
    defaultWeightKg: r.patient_weight_kg ?? undefined,
    ageBand: (r.age_band as Scenario['ageBand']) ?? undefined,
    icpMmHg: r.icp_mm_hg ?? undefined,
    interventionsEnabled: r.interventions_enabled ?? true,
  };
}

export function scenarioRowToScenarioCard(r: {
  id: string;
  title: string;
  description: string;
  status: string;
  is_premium: boolean;
  category: string | null;
  difficulty: string;
  tags: string[] | null;
}): ScenarioCardRow {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status as Scenario['status'],
    isPremium: r.is_premium,
    category: (r.category as Scenario['category']) ?? undefined,
    difficulty: r.difficulty as Scenario['difficulty'],
    tags: r.tags ?? [],
  };
}

/** Maps form / domain scenario to Postgres row payload */
export function scenarioToDbUpsert(values: Omit<Scenario, 'id'> & { id: string }) {
  const row: Database['public']['Tables']['scenarios']['Insert'] = {
    id: values.id,
    title: values.title,
    description: values.description,
    status: values.status,
    is_premium: values.isPremium ?? false,
    category: values.category ?? null,
    patient_profile: values.patientProfile,
    comorbidities: values.comorbidities ?? null,
    initial_vitals: values.initialVitals as Json,
    details: values.details,
    difficulty: values.difficulty,
    tags: values.tags,
    destination: values.destination,
    destination_rationale: values.destinationRationale,
    hospital_distances: values.hospitalDistances as Json,
    suggested_actions: values.suggestedActions as Json,
    mandatory_actions: values.mandatoryActions as Json,
    critical_failures: values.criticalFailures,
    patient_presentation: values.patientPresentation ?? null,
    initial_rhythm: values.initialRhythm ?? null,
    acs_pattern: values.acsPattern ?? null,
    autonomic_profile: values.autonomicProfile
      ? (values.autonomicProfile as Json)
      : null,
    patient_weight_kg: values.defaultWeightKg ?? null,
    age_band: values.ageBand ?? null,
    icp_mm_hg: values.icpMmHg ?? null,
    interventions_enabled: values.interventionsEnabled ?? true,
  };
  return row;
}

export function interventionRowToIntervention(r: InterventionRow): LegacySupabaseIntervention {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    indication: r.indication ?? undefined,
    mechanism: r.mechanism ?? undefined,
    certificationLevel: r.certification_level as LegacySupabaseIntervention['certificationLevel'],
    subOptions: (r.sub_options as LegacySupabaseIntervention['subOptions']) ?? undefined,
  };
}

export function interventionToDbInsert(values: Omit<LegacySupabaseIntervention, 'id'> & { id: string }) {
  return {
    id: values.id,
    name: values.name,
    description: values.description,
    indication: values.indication ?? null,
    mechanism: values.mechanism ?? null,
    certification_level: values.certificationLevel,
    sub_options: values.subOptions ?? null,
  };
}

export function sessionRowToSimulationSession(r: SimSessionRow): SimulationSession {
  return {
    id: r.id,
    userId: r.user_id,
    scenarioId: r.scenario_id,
    scenarioTitle: r.scenario_title,
    startTime: new Date(r.start_time),
    endTime: r.end_time ? new Date(r.end_time) : undefined,
    status: r.status as SimulationSession['status'],
    timeElapsed: r.time_elapsed ?? undefined,
    actions: r.actions as SimulationSession['actions'],
    messages: (r.messages as SimulationSession['messages']) ?? undefined,
    userRole: (r.user_role as UserRole) ?? undefined,
  };
}

export function insightRowToInsight(r: InsightRow): Insight {
  return {
    id: r.id,
    assessmentScore: Number(r.assessment_score),
    treatmentScore: Number(r.treatment_score),
    aiFeedback: r.ai_feedback,
    reasoning: r.reasoning,
    premiumFeedback: (r.premium_feedback as Insight['premiumFeedback']) ?? undefined,
    protocolDeviations:
      (r.protocol_deviations as unknown as Insight['protocolDeviations']) ?? undefined,
    protocolWins:
      (r.protocol_wins as unknown as Insight['protocolWins']) ?? undefined,
  };
}

export function reviewRowToScenarioReview(r: ReviewRow): ScenarioReview {
  return {
    id: r.id,
    scenarioId: r.scenario_id,
    testerId: r.tester_id,
    testerName: r.tester_name,
    testedAsRole: r.tested_as_role as ScenarioReview['testedAsRole'],
    approved: r.approved,
    comments: r.comments ?? undefined,
    createdAt: new Date(r.created_at),
  };
}

function parseTicketResponses(raw: unknown): SupportTicket['responses'] {
  if (!raw || !Array.isArray(raw)) return undefined;
  return raw.map((r: Record<string, unknown>) => ({
    responder: String(r.responder ?? ''),
    message: String(r.message ?? ''),
    createdAt: r.createdAt
      ? typeof r.createdAt === 'string'
        ? new Date(r.createdAt)
        : ((r.createdAt as { seconds?: number })?.seconds
            ? new Date((r.createdAt as { seconds: number }).seconds * 1000)
            : new Date(r.createdAt as string | number))
      : new Date(),
  })) as SupportTicketResponse[];
}

function rowTicketKind(r: TicketRow): SupportTicket['ticketKind'] {
  const k = r.ticket_kind;
  if (k === 'support' || k === 'issue' || k === 'feature_request') return k;
  return r.scenario_id ? 'issue' : 'support';
}

export function ticketRowToSupportTicket(r: TicketRow): SupportTicket {
  return {
    id: r.id,
    userId: r.user_id,
    userEmail: r.user_email,
    message: r.message,
    scenarioId: r.scenario_id ?? undefined,
    scenarioTitle: r.scenario_title ?? undefined,
    ticketKind: rowTicketKind(r),
    createdAt: new Date(r.created_at),
    status: r.status as SupportTicket['status'],
    responses: parseTicketResponses(r.responses),
  };
}

function rowAiFeedbackReviewStatus(s: string): AiResponseFeedback['reviewStatus'] {
  if (s === 'pending' || s === 'validated' || s === 'dismissed') return s;
  return 'pending';
}

export function aiFeedbackRowToFeedback(r: AiFeedbackRow): AiResponseFeedback {
  return {
    id: r.id,
    sessionId: r.session_id,
    userId: r.user_id,
    scenarioId: r.scenario_id,
    scenarioTitle: r.scenario_title,
    assistantMessageIndex: r.assistant_message_index,
    flaggedAssistantContent: r.flagged_assistant_content,
    messagesSnapshot: r.messages_snapshot,
    userActionsSnapshot: r.user_actions_snapshot,
    simulationRole: r.simulation_role,
    simulationTimeSeconds: r.simulation_time_seconds,
    userComment: r.user_comment,
    reviewStatus: rowAiFeedbackReviewStatus(r.review_status),
    adminPreferredResponse: r.admin_preferred_response,
    adminReviewNotes: r.admin_review_notes,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at ? new Date(r.reviewed_at) : null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}
