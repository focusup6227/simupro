/**
 * Structured extraction of protocol rows from plain PDF text (Premium import pipeline).
 */
import { ai } from '@/lib/genkit';
import { z } from 'zod';
import { BaselineInterventionSchema } from '@/lib/national-baseline';

export const ExtractProtocolFromPdfTextInputSchema = z.object({
  documentText: z
    .string()
    .max(120000)
    .describe('Plain text from one section of an EMS agency protocol PDF.'),
});

const ExtractedInterventionsSchema = z.array(BaselineInterventionSchema);

export type ExtractProtocolFromPdfTextInput = z.infer<typeof ExtractProtocolFromPdfTextInputSchema>;

export async function extractProtocolFromPdfText(
  input: ExtractProtocolFromPdfTextInput,
): Promise<z.infer<typeof ExtractedInterventionsSchema>> {
  return extractProtocolFromPdfTextFlow(input);
}

const extractPrompt = ai.definePrompt({
  name: 'extractProtocolFromPdfTextPrompt',
  input: { schema: ExtractProtocolFromPdfTextInputSchema },
  output: { schema: ExtractedInterventionsSchema },
  prompt: `You convert **agency EMS protocol prose** into a JSON array of interventions that matches the output schema exactly.

**Input text (PDF extract):**
"""
{{{documentText}}}
"""

**Rules:**
- Output **only** JSON matching the schema: an array of objects, each either type "MEDICATION" or "PROCEDURE".
- Use **stable ids** when the drug/procedure clearly maps to NASEMSO national rows (e.g. \`MED_EPI_1_1000\`, \`MED_EPI_1_10000\`, \`proc_guideline_airway_adjuncts\`). If the protocol names something not in the national list, use a unique id prefixed with \`agency_\` (e.g. \`agency_region_d10_protocol\`).
- **minLevel** is the **minimum** licensure allowed to perform the intervention in *this* agency text. When ambiguous, choose the **higher** scope (more restrictive): prefer AEMT or PARAMEDIC over EMT if the text is unclear.
- **category:** one of Airway, Cardiac, Pharmacology, Trauma, Medical.
- **Medications:** include realistic routes and adult/pediatric dose strings copied or paraphrased from the text; use "Per protocol / medical direction" only when doses are not stated.
- **Procedures:** list equipment from the text when present; **successCriteria** must be a concrete, auditable statement.
- **Indications / contraindications:** short clinical phrases; use empty arrays only if truly absent.
- Omit entries you cannot support with the given text; do not invent medications not mentioned.

Generate JSON that strictly follows the output schema.`,
});

const extractProtocolFromPdfTextFlow = ai.defineFlow(
  {
    name: 'extractProtocolFromPdfTextFlow',
    inputSchema: ExtractProtocolFromPdfTextInputSchema,
    outputSchema: ExtractedInterventionsSchema,
  },
  async (input) => {
    const { output } = await extractPrompt(input);
    return output!;
  },
);
