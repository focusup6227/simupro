
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
  gradeSimulationPerformance as gradeSimulationFlow,
} from "@/ai/flows/grade-simulation-performance";
import {
  generateRadioReport as generateRadioReportFlow,
  type GenerateRadioReportInput,
  type GenerateRadioReportOutput,
} from "@/ai/flows/generate-radio-report";
import type { Scenario, UserAction, User, Insight } from '@/lib/types';
import { applyDynamicPatientOutputGuards } from '@/lib/patient-response-guards';
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { enforceAiLimit, RateLimitError } from "@/lib/ratelimit";
import { captureActionError } from "@/lib/observability";

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
  userId,
  sessionId,
  userActions,
  scenario,
  user,
}: {
  userId: string;
  sessionId: string;
  userActions: UserAction[];
  timeElapsed: number;
  scenario: Scenario;
  user: User;
}): Promise<Omit<Insight, 'id'>> {
  await gateAi("processSimulationResults");
  try {
    const gradeResult = await gradeSimulationFlow({
      scenario: {
        mandatoryActions: scenario.mandatoryActions,
        suggestedActions: scenario.suggestedActions,
        criticalFailures: scenario.criticalFailures,
      },
      userActions: userActions,
      userRole: user.role,
    });

    const analysisResult = await analyzePerformanceFlow({
      userRole: user.role,
      scenarioTitle: scenario.title,
      scenarioDescription: scenario.description,
      assessmentScore: gradeResult.assessmentScore,
      treatmentScore: gradeResult.treatmentScore,
      reasoning: gradeResult.reasoning,
      userActions: userActions,
      isPremium: Boolean(user.isPremium),
    });

    return {
      assessmentScore: gradeResult.assessmentScore,
      treatmentScore: gradeResult.treatmentScore,
      aiFeedback: analysisResult.aiFeedback,
      reasoning: gradeResult.reasoning,
      premiumFeedback: analysisResult.premiumFeedback,
    };
  } catch (e) {
    rethrow("processSimulationResults", e, {
      userId,
      sessionId,
      scenarioId: scenario.id,
    });
  }
}
