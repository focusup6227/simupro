
"use server";

import {
  generateScenario as generateScenarioFlow,
  type GenerateScenarioInput,
  type GenerateScenarioOutput,
} from "@/ai/flows/generate-scenario-from-prompt";
import {
  analyzePerformanceAndSuggestImprovements as analyzePerformanceFlow,
} from "@/ai/flows/analyze-performance-and-suggest-improvements";
import {
  provideDynamicPatientResponses as provideDynamicResponsesFlow,
  type DynamicPatientResponseInput,
  type DynamicPatientResponseOutput,
} from "@/ai/flows/provide-dynamic-patient-responses";
import {
  providePartnerAdvice,
  PartnerAdviceInputSchema,
  type PartnerAdviceOutput,
} from '@/ai/flows/provide-partner-advice';
import {
  gradeSimulationPerformance as gradeSimulationFlow,
} from "@/ai/flows/grade-simulation-performance";
import {
  generateRadioReport as generateRadioReportFlow,
  type GenerateRadioReportInput,
  type GenerateRadioReportOutput,
} from "@/ai/flows/generate-radio-report";
import { UserActionSchema, type Insight, type UserAction } from '@/lib/types';
import { applyDynamicPatientOutputGuards } from '@/lib/patient-response-guards';
import { adjustScoresForBloodPressure } from '@/lib/bp-grading-adjust';
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { enforceAiLimit, RateLimitError } from "@/lib/ratelimit";
import { captureActionError } from "@/lib/observability";
import { profileRowToUser, scenarioRowToScenario } from '@/lib/db-mappers';
import { pickRelevantBaselineInterventions } from '@/lib/national-baseline';
import { z } from 'zod';

async function getActionUserId(): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function gateAi(actionName: string): Promise<string | null> {
  const userId = await getActionUserId();
  await enforceAiLimit(userId);
  return userId;
}

function rethrow(actionName: string, err: unknown, tags?: Record<string, string | undefined | null>): never {
  if (err instanceof RateLimitError) {
    throw err;
  }
  captureActionError(actionName, err, tags);
  throw err;
}

export async function generateScenario(
  input: GenerateScenarioInput
): Promise<GenerateScenarioOutput> {
  const userId = await gateAi("generateScenario");
  try {
    return await generateScenarioFlow(input);
  } catch (e) {
    rethrow("generateScenario", e, { userId });
  }
}

export async function getPatientResponse(
  input: DynamicPatientResponseInput
): Promise<DynamicPatientResponseOutput> {
  const userId = await gateAi("getPatientResponse");
  try {
    const raw = await provideDynamicResponsesFlow(input);
    return applyDynamicPatientOutputGuards(
      { currentVitals: input.currentVitals, treatment: input.treatment },
      raw,
    );
  } catch (e) {
    rethrow("getPatientResponse", e, {
      userId,
      userRole: input.userRole,
    });
  }
}

export async function generateRadioReport(
  input: GenerateRadioReportInput
): Promise<GenerateRadioReportOutput> {
  const userId = await gateAi("generateRadioReport");
  try {
    return await generateRadioReportFlow(input);
  } catch (e) {
    rethrow("generateRadioReport", e, { userId });
  }
}

export async function processSimulationResults({
  sessionId,
  scenarioId,
}: {
  sessionId: string;
  scenarioId: string;
}): Promise<Omit<Insight, 'id'>> {
  const userId = await gateAi("processSimulationResults");
  if (!userId) {
    throw new Error('Sign in required to analyze your run.');
  }

  const supabase = createServerSupabaseClient();
  const { data: sessionRow, error: sessionErr } = await supabase
    .from('simulation_sessions')
    .select('id, user_id, scenario_id, actions')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionErr || !sessionRow) {
    throw new Error('Could not load simulation session.');
  }
  if (sessionRow.scenario_id !== scenarioId) {
    throw new Error('Session does not match this scenario.');
  }

  const { data: scenarioRow, error: scenarioErr } = await supabase
    .from('scenarios')
    .select('*')
    .eq('id', scenarioId)
    .maybeSingle();

  if (scenarioErr || !scenarioRow) {
    throw new Error('Could not load scenario.');
  }

  const { data: profileRow, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sessionRow.user_id)
    .maybeSingle();

  if (profileErr || !profileRow) {
    throw new Error('Could not load user profile.');
  }

  const parsedActions = z.array(UserActionSchema).safeParse(
    sessionRow.actions ?? [],
  );
  const userActions: UserAction[] = parsedActions.success
    ? parsedActions.data
    : [];

  const scenario = scenarioRowToScenario(scenarioRow);
  const user = profileRowToUser(profileRow);

  try {
    const bpMandatory = 'Obtain a blood pressure (manual or NIBP).';
    const scenarioForGrader = {
      mandatoryActions: {
        emt: [...scenario.mandatoryActions.emt, bpMandatory],
        aemt: [...scenario.mandatoryActions.aemt, bpMandatory],
        paramedic: [...scenario.mandatoryActions.paramedic, bpMandatory],
      },
      suggestedActions: scenario.suggestedActions,
      criticalFailures: scenario.criticalFailures,
    };
    const relevantInterventions = pickRelevantBaselineInterventions(
      scenarioForGrader,
      userActions,
      user.role,
      { max: 30 },
    );
    const gradeResult = await gradeSimulationFlow({
      scenario: scenarioForGrader,
      userActions: userActions,
      userRole: user.role,
      relevantInterventions,
    });

    const bpAdjusted = adjustScoresForBloodPressure(
      userActions,
      gradeResult.assessmentScore,
      gradeResult.reasoning,
    );

    const analysisResult = await analyzePerformanceFlow({
      userRole: user.role,
      scenarioTitle: scenario.title,
      scenarioDescription: scenario.description,
      assessmentScore: bpAdjusted.assessmentScore,
      treatmentScore: gradeResult.treatmentScore,
      reasoning: bpAdjusted.reasoning,
      userActions: userActions,
      isPremium: Boolean(user.isPremium),
    });

    return {
      assessmentScore: bpAdjusted.assessmentScore,
      treatmentScore: gradeResult.treatmentScore,
      aiFeedback: analysisResult.aiFeedback,
      reasoning: bpAdjusted.reasoning,
      premiumFeedback: analysisResult.premiumFeedback,
      protocolDeviations: gradeResult.protocolDeviations ?? [],
      protocolWins: gradeResult.protocolWins ?? [],
    };
  } catch (e) {
    rethrow("processSimulationResults", e, {
      userId,
      sessionId,
      scenarioId: scenario.id,
    });
  }
}

export async function getPartnerAdvice(
  input: z.infer<typeof PartnerAdviceInputSchema>,
): Promise<PartnerAdviceOutput> {
  const userId = await gateAi("getPartnerAdvice");
  try {
    const parsed = PartnerAdviceInputSchema.parse(input);
    return await providePartnerAdvice(parsed);
  } catch (e) {
    rethrow("getPartnerAdvice", e, { userId });
  }
}
