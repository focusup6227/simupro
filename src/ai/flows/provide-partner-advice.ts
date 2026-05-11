/**
 * @fileOverview AI partner — proactive / on-demand coaching within the learner's scope.
 */
import { ai } from '@/lib/genkit';
import { z } from 'zod';
import { UserActionSchema } from '@/lib/types';
import { VitalSignsSchema } from '@/ai/flows/provide-dynamic-patient-responses';

export const PartnerAdviceInputSchema = z.object({
  mode: z.enum(['proactive', 'asked']),
  partnerRole: z.enum(['emt', 'aemt', 'paramedic']),
  partnerName: z.string(),
  userRole: z.string(),
  scenarioSummary: z.string(),
  mandatoryActions: z.array(z.string()),
  recentUserActions: z.array(UserActionSchema).max(12),
  lastPatientCondition: z.string().optional(),
  currentVitals: VitalSignsSchema.optional(),
  userQuestion: z.string().optional(),
  /**
   * Recent things this partner already said, so the model can deliberately
   * vary phrasing / openings rather than repeating itself. Most-recent first.
   */
  priorAdviceTexts: z.array(z.string()).max(6).optional(),
  /** When true, partner stays inside pediatric (PALS) dosing and cadence. */
  isPediatric: z.boolean().optional(),
});

export type PartnerAdviceInput = z.infer<typeof PartnerAdviceInputSchema>;

export const PartnerAdviceOutputSchema = z.object({
  shouldSpeak: z.boolean(),
  advice: z.string(),
  urgency: z.enum(['low', 'medium', 'high']),
});

export type PartnerAdviceOutput = z.infer<typeof PartnerAdviceOutputSchema>;

export async function providePartnerAdvice(
  input: PartnerAdviceInput,
): Promise<PartnerAdviceOutput> {
  return providePartnerAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'providePartnerAdvicePrompt',
  input: { schema: PartnerAdviceInputSchema },
  output: { schema: PartnerAdviceOutputSchema },
  prompt: `You are {{{partnerName}}}, a {{{partnerRole}}} field partner working with a {{{userRole}}} on an EMS simulation. You are on scene — not online medical direction.

**Scenario (summary):**
{{{scenarioSummary}}}

{{#if isPediatric}}
**Pediatric patient.** Use PALS-appropriate dosing/cadence (e.g. 0.01 mg/kg epi 1:10,000, 20 mL/kg fluid bolus, 2→4 J/kg defib, ~1/3 AP-depth compressions, 1 breath every 2–3s for BVM). Don't quote adult doses.
{{/if}}

**Mandatory actions for the learner's role:**
{{#each mandatoryActions}}
- {{{this}}}
{{/each}}

**Recent simulation log (oldest first):**
{{#each recentUserActions}}
- t={{{time}}}s assessment: {{{assessment}}} | treatments: {{#each treatments}}{{{this}}}; {{/each}}
{{/each}}

**Patient condition (last known):** {{{lastPatientCondition}}}

{{#if currentVitals}}
**Current vitals:**
- HR {{{currentVitals.hr}}}, BP {{{currentVitals.bp}}}, RR {{{currentVitals.rr}}}, SpO₂ {{{currentVitals.spo2}}}, GCS {{{currentVitals.gcs}}}
{{/if}}

{{#if priorAdviceTexts.length}}
**Things you already said this run (most recent first — DO NOT repeat them verbatim or near-verbatim):**
{{#each priorAdviceTexts}}
- "{{{this}}}"
{{/each}}
If you would otherwise say the same thing, either stay quiet (set shouldSpeak: false) or rephrase materially — change the opening word, the framing (action vs observation vs question), and the focus.
{{/if}}

{{#if userQuestion}}
The learner asked: "{{{userQuestion}}}"
Answer briefly in first person. Stay within {{{partnerRole}}} scope — if something needs a higher certification, say so and suggest they check protocol or medical direction.
Set shouldSpeak to true.
{{else}}
**Proactive mode:** Set shouldSpeak to false if the team is on track or you have nothing useful to add. If true, one short nudge (max 2 sentences) about a reasonable next step they might be missing — without spoiling the entire scenario. Sound like a peer, not a lecturer.
{{/if}}

**Voice guidance (always):**
- First-person, peer-to-peer, on-scene tone. Contractions are fine.
- For arrest, brady, or tachy management when the scenario does not specify doses, align oral coaching with **AHA Guidelines for CPR and ECC (2020)** ACLS patterns (e.g., epinephrine timing in arrest, shock vs no-shock rhythms)—without overriding explicit scenario instructions.
- Vary your openings across turns — alternate among action ("I can grab..."), observation ("Their EtCO₂ is dropping..."), check-in ("You good if I..."), and a brief question ("Want me to set up...?").
- Don't restate the same vital twice in the run unless it changed clinically.
- No greetings, no sign-offs, no "as your partner". Just the line.

Output JSON only per schema. urgency: low / medium / high based on clinical time-sensitivity.`,
});

const providePartnerAdviceFlow = ai.defineFlow(
  {
    name: 'providePartnerAdviceFlow',
    inputSchema: PartnerAdviceInputSchema,
    outputSchema: PartnerAdviceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
      ...input,
      lastPatientCondition: input.lastPatientCondition ?? '(unknown)',
      userQuestion: input.userQuestion ?? '',
      priorAdviceTexts: (input.priorAdviceTexts ?? []).slice(0, 6),
      isPediatric: input.isPediatric ?? false,
    });
    if (!output) {
      throw new Error('providePartnerAdvice: empty model output');
    }
    if (input.mode === 'asked' && !output.advice.trim()) {
      return {
        ...output,
        shouldSpeak: true,
        advice: "I'm not sure — what does your protocol say?",
      };
    }
    return output;
  },
);
