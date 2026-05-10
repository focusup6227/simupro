
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
    prompt: `You are an **auditor for the agency whose protocol is attached as JSON below** — not a general-knowledge grader. Treat the **Protocol Source of Truth** as Law. For every learner treatment, perform the **Three-Point Check**: verify (1) **ID** (is this the right intervention for this presentation?), (2) **Dosage** (does the dose match the protocol row?), (3) **Indication** (do the vitals/context at that second match the row's \`indications\` and not its \`contraindications\`?). A clear mismatch is a Deviation; a clean match is a Win — you must record both.

**User's Role:** {{{userRole}}}

**Scenario Objectives for this Role:**
- Mandatory Actions: {{#each scenario.mandatoryActions}} - {{{this}}} {{/each}}
- Suggested Actions: {{#each scenario.suggestedActions}} - {{{this}}} {{/each}}
- Critical Failures: {{#each scenario.criticalFailures}} - {{{this}}} {{/each}}

**User's Actions Log:**
{{#each userActions}}
- At t={{{time}}}s [vitals: HR {{vitalsAtAction.hr}}, BP {{vitalsAtAction.sbp}}/{{vitalsAtAction.dbp}}, SpO2 {{vitalsAtAction.spo2}}, RR {{vitalsAtAction.rr}}, EtCO2 {{vitalsAtAction.etco2}}, GCS {{vitalsAtAction.gcs}}; context: "{{context}}"]
  Assessment: '{{{assessment}}}', Treatments: {{#if treatments}}'{{#each treatments}}{{{this}}}{{/each}}'{{else}}'None'{{/if}}
{{/each}}

{{#if gradingProtocolNote}}
**Protocol context:** {{{gradingProtocolNote}}}

{{/if}}
**Protocol Source of Truth (national baseline plus any merged agency extract; matched rows for this run, already scoped to the learner's licensure level):**
{{#each relevantInterventions}}
- {{{name}}} (id: {{{id}}}; {{{type}}}, minimum licensure: {{{minLevel}}}). Indications: {{#each indications}}{{{this}}}; {{/each}}Contraindications: {{#each contraindications}}{{{this}}}; {{/each}}{{#if medicationData}} Adult dose: {{{medicationData.dosages.adult}}}; Pediatric: {{{medicationData.dosages.pediatric}}}{{#if medicationData.dosages.maxDose}}; Max: {{{medicationData.dosages.maxDose}}}{{/if}}{{/if}}{{#if procedureData}} Equipment: {{#each procedureData.equipmentNeeded}}{{{this}}}; {{/each}}Parameters: {{{procedureData.parameters}}} Success criteria: {{{procedureData.successCriteria}}}{{/if}}
{{/each}}

**Critical-fail rule:** If a documented learner treatment clearly deviates from the Protocol Source of Truth — wrong drug for the indication, incorrect dose, contraindicated medication, or action above the user's scope of practice — that is a **Critical Fail** and the **treatment score must be 20 or less** (in addition to any other critical failures from the scenario list).

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
5.  **Three-Point Check output:** You MUST emit two arrays describing the audit.
    - **\`protocolDeviations\`**: one entry for every learner treatment that fails the Three-Point Check. Populate \`kind\` (one of \`scope\`, \`dosage\`, \`indication\`, \`contraindication\`, \`other\`), \`actionTime\` (the action's \`time\` in seconds), \`treatment\` (the exact treatment string from the action log), \`expected\` (the precise clause from the protocol JSON — e.g. the matching indication or the dose for the patient's age band), \`observed\` (what the learner did, including the offending vitals/context), and \`reference\` (the intervention's \`id\` plus \`name\`, e.g. \`MED_FENTANYL — Fentanyl\`).
    - **\`protocolWins\`**: one entry for every learner treatment that **passes** the Three-Point Check. Same shape minus \`kind\`. \`expected\` and \`observed\` should briefly note which indication was met and that dose/scope were correct. Aim for at least one entry whenever the learner clearly did something right — do not leave it empty when the run includes obvious correct actions.
6.  **Provide Reasoning:** Briefly explain the scores. Mention specific mandatory actions the user missed or critical failures they committed.

**Tone rule:** Be a fair auditor, not a critic. Open the \`reasoning\` paragraph with a one-sentence acknowledgement of what the learner clearly did right (cite an actual action from the log), then state misses and their clinical impact. Use direct, professional language — no sarcasm, no piling-on. If the learner committed no protocol deviations, say so plainly and keep the reasoning encouraging.

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
