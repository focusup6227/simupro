/**
 * @fileOverview A Genkit flow that generates a SBAR radio report for EMS personnel.
 */
import { ai } from '@/lib/genkit';
import { z } from 'zod';
import { UserActionSchema } from '@/lib/types';


export const GenerateRadioReportInputSchema = z.object({
  patientProfile: z.string().describe('A brief profile of the patient (e.g., "25 y/o Female, known allergy to bees").'),
  scenarioDetails: z.string().describe('The initial scenario details provided at the start of the simulation.'),
  userActions: z.array(UserActionSchema).describe("A log of all actions (assessments and treatments) taken by the user so far."),
  currentVitals: z.object({
    hr: z.string(),
    bp: z.string(),
    rr: z.string(),
    spo2: z.string(),
    gcs: z.string(),
  }).describe("The patient's most recent vital signs."),
  userRole: z.string().describe("The certification level of the user making the report."),
});

export type GenerateRadioReportInput = z.infer<typeof GenerateRadioReportInputSchema>;


export const GenerateRadioReportOutputSchema = z.object({
  radioReport: z.string().describe("A concise SBAR (Situation, Background, Assessment, Recommendation) radio report ready to be delivered to the hospital."),
});

export type GenerateRadioReportOutput = z.infer<typeof GenerateRadioReportOutputSchema>;


export async function generateRadioReport(
  input: GenerateRadioReportInput
): Promise<GenerateRadioReportOutput> {
  return generateRadioReportFlow(input);
}


const prompt = ai.definePrompt({
    name: 'generateRadioReportPrompt',
    input: { schema: GenerateRadioReportInputSchema },
    output: { schema: GenerateRadioReportOutputSchema },
    prompt: `You are an AI assistant for an EMS professional. Your task is to generate a concise and accurate SBAR radio report for handoff to a receiving hospital.

**User's Role:** {{{userRole}}}

**Patient Profile:** {{{patientProfile}}}

**Initial Situation:** {{{scenarioDetails}}}

**Interventions Performed (Action Log):**
{{#each userActions}}
- At time {{{time}}}s: Assessment: '{{{assessment}}}', Treatments: {{#if treatments}}'{{#each treatments}}{{{this}}}{{/each}}'{{else}}'None'{{/if}}
{{/each}}

**Current Vitals:**
- HR: {{{currentVitals.hr}}}
- BP: {{{currentVitals.bp}}}
- RR: {{{currentVitals.rr}}}
- SpO2: {{{currentVitals.spo2}}}
- GCS: {{{currentVitals.gcs}}}

**Your Task:**
Synthesize all the provided information into a structured SBAR report.

- **Situation:** What is the patient's chief complaint and age/gender?
- **Background:** What are the pertinent details of the event and the patient's history?
- **Assessment:** What are the current vital signs and your key findings/field diagnosis?
- **Recommendation/Request:** What are you requesting from the hospital, and what is your ETA? (Assume a 10-minute ETA).

The report should be a single block of text, formatted clearly for verbal delivery over the radio. Be professional and to the point.
`,
});

const generateRadioReportFlow = ai.defineFlow(
  {
    name: 'generateRadioReportFlow',
    inputSchema: GenerateRadioReportInputSchema,
    outputSchema: GenerateRadioReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
