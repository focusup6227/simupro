/**
 * @fileOverview A Genkit flow that generates a complete EMS scenario from a user's text prompt.
 */

import { ai } from '@/lib/genkit';
import { z } from 'zod';
import { ScenarioSchema } from '@/lib/types';
import { hospitals } from '@/lib/hospitals-data';

const hospitalNames = hospitals.map(h => h.name) as [string, ...string[]];

export const GenerateScenarioInputSchema = z.object({
  prompt: z.string().describe('A text prompt describing the desired EMS scenario. Include patient demographics, the situation, and the core medical or traumatic complaint.'),
});
export type GenerateScenarioInput = z.infer<typeof GenerateScenarioInputSchema>;

// We ask the AI to generate everything except the ID and status.
export const GenerateScenarioOutputSchema = ScenarioSchema.omit({ id: true, status: true }).extend({
    destination: z.enum(hospitalNames).describe(`The name of the most appropriate hospital destination. Must be one of: ${hospitalNames.join(', ')}`),
});

export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;


export async function generateScenario(
  input: GenerateScenarioInput
): Promise<GenerateScenarioOutput> {
  return generateScenarioFlow(input);
}

const generationPrompt = ai.definePrompt({
    name: 'generateScenarioPrompt',
    input: { schema: GenerateScenarioInputSchema },
    output: { schema: GenerateScenarioOutputSchema },
    prompt: `You are an AI EMS scenario developer. Based on the user's prompt, create a complete, realistic, and medically plausible simulation scenario for training.

**User Prompt:**
"{{{prompt}}}"

**Your Task:**
Flesh out the user's prompt into a detailed scenario. You must fill out ALL fields in the output schema.

**Key Considerations:**
- **Difficulty:** Determine a difficulty (Beginner, Intermediate, Advanced) based on the complexity of the case.
- **Vitals:** Initial vital signs should be consistent with the patient's condition.
- **Objectives:**
    - **Mandatory Actions:** Define the absolute critical steps for each certification level (EMT, AEMT, Paramedic).
    - **Suggested Actions:** List important but not life-or-death actions.
    - **Critical Failures:** List actions that would cause immediate harm or patient death.
- **Destination:** Choose the most appropriate destination from the provided list and explain your choice in the 'destinationRationale'.
- **Tags:** Provide relevant, searchable tags (e.g., "Trauma", "Pediatric", "Cardiac").
- **Hospital Distances:** Assign realistic, varied travel times in minutes to each hospital for this specific scenario. The hospital IDs are: 'mercy_general', 'county_trauma_center', 'st_marys_community', 'university_medical', 'hope_psychiatric'.
- **Initial Rhythm:** Set 'initialRhythm' to the EcgRhythmKind that matches the chief complaint when reasonably specific:
    - Chest pain / unstable angina with normal pulse → 'sinus_tach' (or 'sinus' if asymptomatic).
    - Palpitations + irregular pulse → 'afib'.
    - Palpitations + regular narrow tachy → 'svt'.
    - Syncope + bradycardia → 'sinus_brady', 'av_block_2_mobitz1', 'av_block_3', or 'junctional' depending on cause.
    - Cardiac arrest, witnessed VF arrest → 'vfib' or 'pulseless_vt'.
    - Cardiac arrest, asphyxial / drowning / strangulation → 'asystole'.
    - Cardiac arrest, PE / tamponade / hyperkalemia → 'pea'.
    - Pacer-dependent patient → 'paced_ventricular' or 'paced_dual'.
    OMIT this field if the rhythm is unclear from the prompt — the patient AI will pick at runtime.
- **ACS Pattern:** Set 'acsPattern' when the scenario clearly involves an acute coronary syndrome or ST mimic. Choose ONE of:
    - 'inferior' — inferior STEMI (RCA territory).
    - 'inferolateral' — inferior + lateral involvement (e.g. dominant RCA / circumflex).
    - 'anterior' — LAD territory anterior STEMI.
    - 'anteroseptal' — proximal LAD with septal involvement.
    - 'lateral' — circumflex lateral STEMI.
    - 'high_lateral' — I + aVL STEMI (high lateral branch).
    - 'posterior' — true posterior STEMI (V1–V3 ST depression).
    - 'pericarditis' — diffuse ST elevation with PR depression.
    - 'nstemi_lateral' — NSTEMI / unstable angina with lateral ST depression and T inversion.
    OMIT this field for non-ACS scenarios. Use 'none' explicitly only if you want to force "no ST shift" despite cardiac wording.

Generate a JSON object that strictly follows the output schema.
`,
});

const generateScenarioFlow = ai.defineFlow(
  {
    name: 'generateScenarioFlow',
    inputSchema: GenerateScenarioInputSchema,
    outputSchema: GenerateScenarioOutputSchema,
  },
  async (input) => {
    const { output } = await generationPrompt(input);
    return output!;
  }
);
