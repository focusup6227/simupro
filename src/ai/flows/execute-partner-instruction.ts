/**
 * @fileOverview AI partner — execute a free-form instruction from the
 * learner. The model:
 *  1) decides which (if any) in-scope interventions the partner should
 *     perform from the supplied catalog (treatmentIds);
 *  2) writes a one-line in-character chatter line the partner says back;
 *  3) summarises what the partner actually did into a short
 *     `assessmentDetail` string suitable for the simulation log; and
 *  4) refuses / pushes back when the request is out of the partner's scope
 *     of practice (per certification level).
 *
 * Replaces the old structured Quick / category Delegate buttons.
 */
import { ai } from '@/lib/genkit';
import { z } from 'zod';

const ScopeInterventionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  certificationLevel: z.enum(['emt', 'aemt', 'paramedic']),
});

export const ExecutePartnerInstructionInputSchema = z.object({
  partnerRole: z.enum(['emt', 'aemt', 'paramedic']),
  partnerName: z.string(),
  userRole: z.string(),
  /** What the learner said to the partner, verbatim (free text). */
  instruction: z.string().min(1).max(2000),
  /** Compact scenario context — patient profile + last condition note. */
  scenarioSummary: z.string(),
  lastPatientCondition: z.string().optional(),
  /**
   * Catalog of interventions the partner is *allowed* to perform given their
   * role. The model MUST only return treatmentIds present in this list.
   */
  interventions: z.array(ScopeInterventionSchema).max(120),
  isPediatric: z.boolean().optional(),
});

export type ExecutePartnerInstructionInput = z.infer<
  typeof ExecutePartnerInstructionInputSchema
>;

export const ExecutePartnerInstructionOutputSchema = z.object({
  /** True when the partner actually carried out (some of) the request. */
  performed: z.boolean(),
  /**
   * IDs from the supplied `interventions` list that the partner performed.
   * Empty when the action is purely an assessment / observation / refusal.
   */
  treatmentIds: z.array(z.string()).max(8),
  /**
   * Plain English summary of what the partner did, suitable for the
   * action log. Example: "Drew obtained a 12-lead ECG and established an
   * 18g IV in the left AC."
   */
  assessmentDetail: z.string().min(1),
  /**
   * One short sentence the partner says back, peer-to-peer, on-scene tone.
   * Example: "Running the strip now — line's in."
   */
  chatter: z.string().min(1),
  /** Pushback / refusal text. Empty when fully in scope and performed. */
  refusalReason: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high']),
});

export type ExecutePartnerInstructionOutput = z.infer<
  typeof ExecutePartnerInstructionOutputSchema
>;

export async function executePartnerInstruction(
  input: ExecutePartnerInstructionInput,
): Promise<ExecutePartnerInstructionOutput> {
  return executePartnerInstructionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'executePartnerInstructionPrompt',
  input: { schema: ExecutePartnerInstructionInputSchema },
  output: { schema: ExecutePartnerInstructionOutputSchema },
  prompt: `You are {{{partnerName}}}, a {{{partnerRole}}} field partner working with a {{{userRole}}} on an EMS simulation. The learner just gave you a verbal order. Decide what to do.

**Scenario (summary):**
{{{scenarioSummary}}}

{{#if lastPatientCondition}}
**Patient condition (last known):** {{{lastPatientCondition}}}
{{/if}}

{{#if isPediatric}}
**Pediatric patient.** Use PALS-appropriate dosing/cadence. Don't quote adult doses in chatter.
{{/if}}

**Interventions you (the partner) may perform (your scope of practice). Only return ids from this list:**
{{#each interventions}}
- id: {{{this.id}}} | {{{this.name}}}{{#if this.description}} — {{{this.description}}}{{/if}}
{{/each}}

**Learner's instruction (verbatim):**
"{{{instruction}}}"

**How to decide:**
1. If the request is an *order* in scope, set performed=true and pick the matching id(s) from the list above. Multiple are fine if the learner asked for several at once (e.g. "get a 12-lead and start an IV").
2. If the request is *partially* in scope (e.g. one of two asks is above your level), perform what you can, set performed=true for what you did, and use refusalReason to flag the rest.
3. If everything ordered is above your level, set performed=false, treatmentIds=[], and explain in refusalReason ("That's a paramedic skill — want me to call medical control?"). Still produce a brief chatter line.
4. Pure assessment / questioning of the patient ("ask about allergies", "auscultate lung sounds") IS in scope for any level — return treatmentIds=[] but performed=true and describe what was *done* in assessmentDetail in plain language. Do not invent vitals or numeric findings.
5. If the learner is *asking your opinion* rather than ordering ("should we shock?", "what's your read on this rhythm?", "do we need a line?") — set performed=false, treatmentIds=[], leave refusalReason blank, and answer briefly in chatter (1–2 sentences, peer tone). assessmentDetail can be a short note like "Discussed: should we shock?".

**Output guidance:**
- chatter: first-person, 1 short sentence, peer tone. No greetings, no "as your partner", no sign-off. Just the line.
- assessmentDetail: 3rd-person past-tense ("{{{partnerName}}} obtained..."). Concise, log-worthy. Don't fabricate findings the engine hasn't given you — describe what was *done*, not numeric results.
- urgency: time-sensitivity of the request (low / medium / high).

Output JSON only per schema.`,
});

const executePartnerInstructionFlow = ai.defineFlow(
  {
    name: 'executePartnerInstructionFlow',
    inputSchema: ExecutePartnerInstructionInputSchema,
    outputSchema: ExecutePartnerInstructionOutputSchema,
  },
  async (input) => {
    const allowedIds = new Set(input.interventions.map((i) => i.id));
    const { output } = await prompt({
      ...input,
      lastPatientCondition: input.lastPatientCondition ?? '',
      isPediatric: input.isPediatric ?? false,
    });
    if (!output) {
      throw new Error('executePartnerInstruction: empty model output');
    }
    // Defensively drop any ids the model hallucinated outside the supplied
    // scope catalog.
    const treatmentIds = output.treatmentIds.filter((id) => allowedIds.has(id));
    return {
      ...output,
      treatmentIds,
    };
  },
);
