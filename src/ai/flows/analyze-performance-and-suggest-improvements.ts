
import { ai } from '@/lib/genkit';
import { z } from 'zod';
import { UserActionSchema } from '@/lib/types';


export const AnalyzePerformanceInputSchema = z.object({
  userRole: z.string(),
  scenarioTitle: z.string(),
  scenarioDescription: z.string(),
  assessmentScore: z.number(),
  treatmentScore: z.number(),
  reasoning: z.string().describe("The justification for the scores provided."),
  userActions: z.array(UserActionSchema),
  isPremium: z.boolean().optional().describe('Whether to produce the deeper Premium feedback report.'),
});

export type AnalyzePerformanceInput = z.infer<typeof AnalyzePerformanceInputSchema>;

export const PremiumDetailedFeedbackSchema = z.object({
  whatWentWell: z
    .array(z.string())
    .describe('2-4 bullet points calling out specific things the user did correctly, citing actions from their log.'),
  criticalIssues: z
    .array(z.string())
    .describe('2-4 bullet points naming the highest-priority misses or errors, with the clinical "why this matters".'),
  protocolReferences: z
    .array(z.string())
    .describe("Short references to the relevant standards or protocols (e.g., 'NREMT psychomotor standard for cardiac arrest', 'AHA 2020 ACLS algorithm', 'NAEMSP airway position paper'). General, not jurisdiction-specific."),
  actionableTips: z
    .array(z.string())
    .describe('3-5 concrete, drillable next-action tips the user can practice immediately.'),
  drillSuggestions: z
    .array(z.string())
    .describe('2-3 short drill or study suggestions tailored to this user\'s gaps.'),
});

export type PremiumDetailedFeedback = z.infer<typeof PremiumDetailedFeedbackSchema>;

export const AnalyzePerformanceOutputSchema = z.object({
  aiFeedback: z.string().describe("Constructive, personalized feedback for the user in paragraph form. Explain what they did well, what they missed, and provide specific, actionable advice for improvement on their next simulation. Be encouraging and educational."),
  premiumFeedback: PremiumDetailedFeedbackSchema
    .optional()
    .describe('Structured deep-dive feedback. ONLY populate when the input isPremium flag is true. Leave undefined otherwise.'),
});

export type AnalyzePerformanceOutput = z.infer<typeof AnalyzePerformanceOutputSchema>;


export async function analyzePerformanceAndSuggestImprovements(
  input: AnalyzePerformanceInput
): Promise<AnalyzePerformanceOutput> {
  return analyzePerformanceFlow(input);
}

const prompt = ai.definePrompt({
    name: 'analyzePerformancePrompt',
    input: { schema: AnalyzePerformanceInputSchema },
    output: { schema: AnalyzePerformanceOutputSchema },
    prompt: `You are an AI EMS instructor providing feedback on a user's simulation performance.

**Scenario:** {{{scenarioTitle}}} - {{{scenarioDescription}}}
**User's Role:** {{{userRole}}}

**Performance Summary:**
- Assessment Score: {{{assessmentScore}}}/100
- Treatment Score: {{{treatmentScore}}}/100
- Justification: {{{reasoning}}}

**User's Action Log:**
{{#each userActions}}
- At time {{{time}}}s: Assessment: '{{{assessment}}}', Treatments: {{#if treatments}}'{{#each treatments}}{{{this}}}{{/each}}'{{else}}'None'{{/if}}
{{/each}}

**Your Task:**
Write a paragraph of personalized, constructive feedback for the user.
- Start by acknowledging their effort.
- Point out one or two things they did well, referencing their action log.
- Gently point out the most critical area for improvement, based on the scores and reasoning. Explain *why* it's important.
- Provide a clear, actionable tip for their next simulation.
- Maintain an encouraging and educational tone. Do not simply list what they did wrong.

Place this paragraph in 'aiFeedback'.

{{#if isPremium}}
**PREMIUM DEEP-DIVE FEEDBACK — REQUIRED FOR THIS USER:**
This learner is on the Premium tier. ALSO populate the 'premiumFeedback' object with structured deep-dive coaching:
- 'whatWentWell': 2-4 specific bullets citing exact actions from the log that were clinically correct, in the right order, or well-timed.
- 'criticalIssues': 2-4 bullets identifying the highest-priority misses or errors. For each one, briefly explain the clinical consequence — *why* it matters for patient outcome.
- 'protocolReferences': 2-4 short references to relevant national standards (e.g., 'AHA 2020 ACLS — Cardiac Arrest Algorithm', 'NREMT Psychomotor Standard — Trauma Assessment', 'NAEMSP Position Paper — Prehospital Airway Management'). Keep them generic, not state-specific.
- 'actionableTips': 3-5 concrete, drillable improvements ("On the next call, perform a 60-second primary survey before any treatment", "Re-check vitals every 5 minutes once transport begins", etc.).
- 'drillSuggestions': 2-3 short practice/study suggestions tailored to the gaps you identified ("Drill 1: rapid trauma assessment under 90 seconds", "Review: AHA push-pause CPR rhythm checks").
Be specific and reference the user's actual actions where possible. Avoid generic advice.
{{else}}
Do NOT populate 'premiumFeedback'. Leave it undefined.
{{/if}}

Generate a JSON object that strictly follows the output schema.
`,
});


const analyzePerformanceFlow = ai.defineFlow(
  {
    name: 'analyzePerformanceFlow',
    inputSchema: AnalyzePerformanceInputSchema,
    outputSchema: AnalyzePerformanceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
