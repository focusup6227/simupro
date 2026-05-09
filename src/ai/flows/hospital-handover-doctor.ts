/**
 * @fileOverview Hospital handover — receiving ER physician role-plays the
 * bedside handoff. The doctor:
 *  - Reads the learner's verbal handover.
 *  - Reviews what was actually done in the field (mandatory actions, the
 *    user-action log, last vitals/condition).
 *  - Decides on a personality based on field performance: nice, neutral,
 *    skeptical, or hard. Personality persists across turns within one
 *    handover (caller pins it on the first turn and replays it back).
 *  - Replies in character. May ask 1 follow-up question.
 *  - Sets `readyToOffload=true` once they've heard enough to take the
 *    patient — at which point the UI surfaces an "Offload PT" button that
 *    ends the scenario.
 *
 * This flow is purely conversational; it does NOT mutate vitals or grade
 * the run. Performance grading still runs through the existing
 * `gradeSimulationPerformance` flow at end-of-scenario.
 */
import { ai } from '@/lib/genkit';
import { z } from 'zod';
import { UserActionSchema } from '@/lib/types';
import { VitalSignsSchema } from '@/ai/flows/provide-dynamic-patient-responses';

export const DoctorPersonalityEnum = z.enum([
  'nice',
  'neutral',
  'skeptical',
  'hard',
]);

const HandoverTurnSchema = z.object({
  speaker: z.enum(['learner', 'doctor']),
  text: z.string(),
});

export const HospitalHandoverInputSchema = z.object({
  hospitalName: z.string(),
  /** Stable doctor identity — caller passes the same on every turn. */
  doctorName: z.string(),
  /**
   * Caller pins personality on turn 1 (first call returns it, then caller
   * passes it back on subsequent turns to keep the doctor in character).
   * Leave undefined on the first turn to let the model pick.
   */
  personality: DoctorPersonalityEnum.optional(),
  /** EMS user role (e.g. emt / paramedic / aemt). */
  userRole: z.string(),
  scenarioSummary: z.string(),
  patientProfile: z.string(),
  mandatoryActions: z.array(z.string()),
  userActions: z.array(UserActionSchema).max(40),
  lastPatientCondition: z.string().optional(),
  currentVitals: VitalSignsSchema.optional(),
  /** What the learner just said this turn. */
  learnerHandover: z.string().min(1).max(4000),
  /** Prior handover turns (oldest → newest), excluding the new learner turn. */
  priorTurns: z.array(HandoverTurnSchema).max(12),
  /** Whether the radio report was given before arrival. */
  gaveRadioReport: z.boolean().optional(),
  /** True once the patient is dead per scenario state. */
  patientIsDeceased: z.boolean().optional(),
});

export type HospitalHandoverInput = z.infer<typeof HospitalHandoverInputSchema>;

export const HospitalHandoverOutputSchema = z.object({
  /** Doctor's spoken reply, first-person, in character. */
  doctorReply: z.string().min(1),
  /** The personality the model committed to (echoed back). */
  personality: DoctorPersonalityEnum,
  /**
   * Optional follow-up question. When present, the learner is expected to
   * answer; UI keeps the textarea open. When absent + readyToOffload=true,
   * the offload button is shown.
   */
  followUpQuestion: z.string().optional(),
  /** True once the doctor is willing to take over care. */
  readyToOffload: z.boolean(),
  /**
   * Brief teaching notes about missed / poor / well-done items, one bullet
   * per note. UI may surface these for review at debrief.
   */
  critiqueNotes: z.array(z.string()).max(8),
});

export type HospitalHandoverOutput = z.infer<
  typeof HospitalHandoverOutputSchema
>;

export async function getHospitalHandoverDoctorReply(
  input: HospitalHandoverInput,
): Promise<HospitalHandoverOutput> {
  return hospitalHandoverDoctorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'hospitalHandoverDoctorPrompt',
  input: { schema: HospitalHandoverInputSchema },
  output: { schema: HospitalHandoverOutputSchema },
  prompt: `You are Dr. {{{doctorName}}}, an emergency physician at {{{hospitalName}}}. An EMS crew ({{{userRole}}} lead) just rolled in with a patient and is giving you a verbal handover at the bedside.

**Personality rules:**
{{#if personality}}
- You have already committed to a personality this run: **{{{personality}}}**. Stay in character. Echo it back unchanged in the personality field.
{{else}}
- This is the first turn. Pick a personality based on field performance:
  - "nice" — competent run, clear handover, on-protocol.
  - "neutral" — adequate care with minor gaps, professional tone.
  - "skeptical" — multiple gaps or muddled handover; ask probing questions.
  - "hard" — missed mandatory time-sensitive action, clinically dangerous decisions, sloppy handover, or patient deterioration that EMS didn't address. Direct, terse, may openly question competence — but never abusive. Always still professional.
{{/if}}

**Patient (from EMS dispatch):** {{{patientProfile}}}

**Scenario context (truncated):**
{{{scenarioSummary}}}

**Mandatory actions for this {{{userRole}}}:**
{{#if mandatoryActions.length}}
{{#each mandatoryActions}}
- {{{this}}}
{{/each}}
{{else}}
- (none specified)
{{/if}}

**Field action log (oldest → newest):**
{{#each userActions}}
- t={{{time}}}s assessment: {{{assessment}}} | treatments: {{#each treatments}}{{{this}}}; {{/each}}{{#if destination}} | destination: {{{destination}}}{{/if}}
{{/each}}

**Last known patient condition:** {{{lastPatientCondition}}}

{{#if currentVitals}}
**Vitals on arrival:**
- HR {{{currentVitals.hr}}}, BP {{{currentVitals.bp}}}, RR {{{currentVitals.rr}}}, SpO₂ {{{currentVitals.spo2}}}, GCS {{{currentVitals.gcs}}}
{{/if}}

{{#if gaveRadioReport}}
EMS gave you a prior radio patch.
{{else}}
EMS did NOT call ahead with a radio report. A "hard" or "skeptical" Dr. will mention this.
{{/if}}

{{#if patientIsDeceased}}
**The patient is in cardiac arrest / pulseless on arrival.** Act accordingly — fast triage, terse questions.
{{/if}}

**Conversation so far (between you and EMS):**
{{#each priorTurns}}
- {{{this.speaker}}}: {{{this.text}}}
{{/each}}

**Latest line from EMS:**
"{{{learnerHandover}}}"

**Your task:**
- Respond in 1–3 sentences, first person, bedside tone, in character per personality.
- A "hard" or "skeptical" Dr. should call out *specific* missed mandatory items or unsafe choices visible in the action log. A "nice" Dr. praises specifically rather than generically.
- If the SBAR is incomplete or you have one important clinical question, set followUpQuestion (≤1 question per turn). Otherwise omit it.
- Set readyToOffload=true once you've heard a competent age/sex + chief complaint + key findings + treatments + transport reason — i.e. enough to take over. Tolerable gaps are fine for "nice"; "hard" demands a tighter handover before taking the patient.
- critiqueNotes: 0–6 short bullets summarising what they did well or missed. These are for the learner's debrief, not spoken — keep them objective.

Output JSON only per schema.`,
});

const hospitalHandoverDoctorFlow = ai.defineFlow(
  {
    name: 'hospitalHandoverDoctorFlow',
    inputSchema: HospitalHandoverInputSchema,
    outputSchema: HospitalHandoverOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
      ...input,
      lastPatientCondition: input.lastPatientCondition ?? '(unknown)',
      gaveRadioReport: input.gaveRadioReport ?? false,
      patientIsDeceased: input.patientIsDeceased ?? false,
      priorTurns: input.priorTurns ?? [],
    });
    if (!output) {
      throw new Error('hospitalHandoverDoctor: empty model output');
    }
    return output;
  },
);
