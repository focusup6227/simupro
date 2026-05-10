/**
 * Second-pass audit: drop ungrounded rows and align ids using the source PDF + NASEMSO conventions.
 */
import { ai } from '@/lib/genkit';
import { z } from 'zod';
import { BaselineInterventionSchema } from '@/lib/national-baseline';

const ScrubProtocolExtractionInputSchema = z.object({
  sourceText: z
    .string()
    .max(100000)
    .describe('Plain text from the agency protocol PDF (truncated is acceptable).'),
  interventions: z
    .array(BaselineInterventionSchema)
    .describe('Candidate interventions after deterministic scrub; may still contain hallucinations.'),
});

const ScrubPromptInputSchema = z.object({
  sourceText: z.string().max(100000),
  interventionsJson: z.string().max(450000),
});

const ScrubbedArraySchema = z.array(BaselineInterventionSchema);

export type ScrubProtocolExtractionInput = z.infer<typeof ScrubProtocolExtractionInputSchema>;

export async function scrubProtocolExtractionList(
  input: ScrubProtocolExtractionInput,
): Promise<z.infer<typeof ScrubbedArraySchema>> {
  return scrubProtocolExtractionFlow(input);
}

const scrubPrompt = ai.definePrompt({
  name: 'scrubProtocolExtractionPrompt',
  input: { schema: ScrubPromptInputSchema },
  output: { schema: ScrubbedArraySchema },
  prompt: `You are a **strict clinical data auditor** for EMS protocol extraction.

**Source text (authoritative; training extract only):**
"""
{{{sourceText}}}
"""

**Candidate interventions (JSON array — may contain errors, duplicates, or hallucinations):**
\`\`\`json
{{{interventionsJson}}}
\`\`\`

**Your job:**
1. **Hallucination removal:** Emit a row **only** if the source text (or an unambiguous synonym printed there) clearly discusses that medication or procedure. If the drug/procedure is not mentioned in the source, **drop** it.
2. **Dedupe:** If multiple candidates describe the same real-world entity, emit **one** merged row (prefer the richest dose/route/indication detail that is still grounded in the source).
3. **Normalize IDs to NASEMSO:** When a row clearly matches the national catalog naming (e.g. epinephrine 1:10,000, fentanyl, airway adjuncts), set \`id\` to the canonical \`med_*\` or \`proc_*\` / \`proc_guideline_*\` style from the candidate list. If it is truly agency-unique content grounded in the text, keep an \`agency_*\` id from the candidate.
4. **Strict schema:** Output must satisfy the output schema exactly (valid \`type\`, \`minLevel\`, routes, dosages, etc.). Fix minor inconsistencies rather than dropping unless ungrounded.
5. **Conservative scope:** If unsure whether the source supports a row, **omit** it.

Return **only** the scrubbed JSON array.`,
});

const scrubProtocolExtractionFlow = ai.defineFlow(
  {
    name: 'scrubProtocolExtractionFlow',
    inputSchema: ScrubProtocolExtractionInputSchema,
    outputSchema: ScrubbedArraySchema,
  },
  async (input) => {
    const { output } = await scrubPrompt({
      sourceText: input.sourceText,
      interventionsJson: JSON.stringify(input.interventions),
    });
    return output!;
  },
);
