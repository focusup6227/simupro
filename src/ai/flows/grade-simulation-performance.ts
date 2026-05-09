
import { ai } from '@/lib/genkit';
import { z } from 'zod';
import { GradeSimulationInputSchema, GradeSimulationOutputSchema } from '@/lib/types';

export type GradeSimulationInput = z.infer<typeof GradeSimulationInputSchema>;
export type GradeSimulationOutput = z.infer<typeof GradeSimulationOutputSchema>;


export async function gradeSimulationPerformance(
  input: GradeSimulationInput
): Promise<GradeSimulationOutput> {
  return gradeSimulationPerformanceFlow(input);
}


const prompt = ai.definePrompt({
    name: 'gradeSimulationPerformancePrompt',
    input: { schema: GradeSimulationInputSchema },
    output: { schema: GradeSimulationOutputSchema },
    prompt: `You are an AI EMS educator. Your task is to grade a user's performance in a simulation.

**User's Role:** {{{userRole}}}

**Scenario Objectives for this Role:**
- Mandatory Actions: {{#each scenario.mandatoryActions}} - {{{this}}} {{/each}}
- Suggested Actions: {{#each scenario.suggestedActions}} - {{{this}}} {{/each}}
- Critical Failures: {{#each scenario.criticalFailures}} - {{{this}}} {{/each}}

**User's Actions Log:**
{{#each userActions}}
- At time {{{time}}}s: Assessment: '{{{assessment}}}', Treatments: {{#if treatments}}'{{#each treatments}}{{{this}}}{{/each}}'{{else}}'None'{{/if}}
{{/each}}

**Your Task:**
1.  **Analyze Actions vs. Objectives:** Compare the user's action log against the mandatory actions, suggested actions, and critical failures for their role.
2.  **Partner-delegated actions:** Some log entries begin with the tag \`[PARTNER ACTION]\` in the assessment field. Those steps were carried out by the learner's **simulated field partner** under the learner's explicit direction. Treat them as **satisfying mandatory/suggested actions** for completion purposes, but score **delegation and crew resource management** rather than assuming the learner personally performed every physical skill.
3.  **Calculate Assessment Score (0-100):** This score reflects how well the user assessed the patient.
    - Did they ask relevant questions?
    - Did they perform appropriate physical exams?
    - Did they use diagnostic tools correctly (e.g., ECG, glucose check)?
    - Score is based on the 'assessment' field in the user actions. A user who performs thorough and relevant assessments gets a high score. A user who does little or no assessment gets a low score.
4.  **Calculate Treatment Score (0-100):** This score reflects the appropriateness and timeliness of treatments.
    - Did they perform all mandatory actions?
    - Did they perform any suggested actions?
    - Did they commit any critical failures?
    - Performing all mandatory actions should result in a score of at least 80. Performing suggested actions increases the score. Committing a critical failure should result in a score of 20 or less.
5.  **Provide Reasoning:** Briefly explain the scores. Mention specific mandatory actions the user missed or critical failures they committed.

Generate a JSON object that strictly follows the output schema.
`,
});


const gradeSimulationPerformanceFlow = ai.defineFlow(
  {
    name: 'gradeSimulationPerformanceFlow',
    inputSchema: GradeSimulationInputSchema,
    outputSchema: GradeSimulationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
