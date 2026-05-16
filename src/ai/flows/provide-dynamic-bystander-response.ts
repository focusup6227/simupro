/**
 * @fileOverview Genkit flow that voices a single bystander (family, friend,
 * witness, police, fire, prior first responder) during a SimuPro scenario.
 *
 * Bystanders are role-scoped NPCs: they answer only from what someone in
 * their position would plausibly know, honor admin-authored guardrails, and
 * never speak as the patient or the monitor.
 */
import { ai } from '@/lib/genkit';
import { z } from 'zod';
import { BYSTANDER_ROLES, BYSTANDER_DEMEANORS } from '@/lib/types';
import { BYSTANDER_ROLE_RULES, BYSTANDER_ROLE_LABEL } from '@/lib/bystander-prompts';

const BystanderInputSchema = z.object({
  id: z.string(),
  role: z.enum(BYSTANDER_ROLES),
  name: z.string(),
  relationship: z.string().optional(),
  demeanor: z.enum(BYSTANDER_DEMEANORS),
  knowledge: z.string(),
  guardrails: z.string().optional(),
});

const TranscriptTurnSchema = z.object({
  speaker: z.enum(['medic', 'bystander']),
  text: z.string(),
});

export const DynamicBystanderResponseInputSchema = z.object({
  scenarioSummary: z
    .string()
    .describe('Scenario details / patient presentation so the bystander knows the broader case context.'),
  bystander: BystanderInputSchema,
  transcript: z
    .array(TranscriptTurnSchema)
    .describe('Prior Q&A with THIS bystander only. Each entry is one exchange turn.'),
  medicQuestion: z.string().describe('The medic’s latest question to this bystander.'),
  userRole: z.string().describe('EMS provider level (emt / aemt / paramedic) for tone tuning.'),
});
export type DynamicBystanderResponseInput = z.infer<typeof DynamicBystanderResponseInputSchema>;

export const DynamicBystanderResponseOutputSchema = z.object({
  bystanderResponse: z
    .string()
    .describe('What this bystander says in reply, in-character. Single turn, no narration.'),
  volunteersAdditionalInfo: z
    .string()
    .optional()
    .describe('Optional extra info the bystander offers proactively (e.g. wife adds "...and his sugar has been weird this week") when it fits demeanor.'),
  endsConversation: z
    .boolean()
    .optional()
    .describe('True if this bystander disengages (hostile witness walks off, family member needs to call relatives, etc.).'),
});
export type DynamicBystanderResponseOutput = z.infer<typeof DynamicBystanderResponseOutputSchema>;

export async function provideDynamicBystanderResponse(
  input: DynamicBystanderResponseInput,
): Promise<DynamicBystanderResponseOutput> {
  return provideDynamicBystanderResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideDynamicBystanderResponsePrompt',
  input: {
    schema: DynamicBystanderResponseInputSchema.extend({
      roleLabel: z.string(),
      roleRule: z.string(),
    }),
  },
  output: { schema: DynamicBystanderResponseOutputSchema },
  prompt: `You are voicing a single bystander on the scene of an EMS call.
You are NOT the patient. You are NOT the monitor. You are NOT a narrator.

**You are:** {{{bystander.name}}} ({{{roleLabel}}}{{#if bystander.relationship}}, {{{bystander.relationship}}}{{/if}})
**Demeanor:** {{{bystander.demeanor}}}
**EMS provider level you are speaking with:** {{{userRole}}}

**Role rules (you must follow):**
{{{roleRule}}}

**What you personally know (this is your knowledge ceiling — do not invent clinically pivotal facts beyond this):**
{{{bystander.knowledge}}}

{{#if bystander.guardrails}}
**ADMIN GUARDRAILS (these OUTRANK the role rules above when they conflict — follow them exactly):**
{{{bystander.guardrails}}}
{{/if}}

**Scenario context (for situational awareness only — do not recite this back):**
{{{scenarioSummary}}}

{{#if transcript.length}}
**Prior exchanges with this medic (most recent last):**
{{#each transcript}}
- {{{speaker}}}: {{{text}}}
{{/each}}
{{/if}}

**Medic's question to you right now:**
"{{{medicQuestion}}}"

**Hard rules:**
1. NEVER read out vitals, monitor numbers, ECG rhythms, or exam findings — those belong to the patient/monitor, not you.
2. NEVER claim clinical training you do not have (only "first_responder" role bystanders may speak in clinical terms; everyone else uses lay language).
3. If the medic asks something outside what your role and knowledge would know, say so in-character ("I'm sorry, I have no idea, I just walked up", "I don't know his meds, my sister does"). Do NOT invent.
4. Stay in your demeanor: a "distraught" person rambles, asks questions back, struggles to focus; "uncooperative" gives one-word answers or pushes back; "intoxicated" is unreliable and may contradict themselves; "professional" (police / fire / SNF nurse) is concise.
5. ADMIN GUARDRAILS, when present, override your default behavior. If a guardrail says "do not reveal X unless asked directly," do not reveal X otherwise — even if it would be helpful.
6. Speak in first person, in-character. One conversational turn. No stage directions in brackets.

Return a JSON object that strictly follows the output schema.
`,
});

const provideDynamicBystanderResponseFlow = ai.defineFlow(
  {
    name: 'provideDynamicBystanderResponseFlow',
    inputSchema: DynamicBystanderResponseInputSchema,
    outputSchema: DynamicBystanderResponseOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
      ...input,
      roleLabel: BYSTANDER_ROLE_LABEL[input.bystander.role],
      roleRule: BYSTANDER_ROLE_RULES[input.bystander.role],
    });

    if (!output?.bystanderResponse) {
      throw new Error('provideDynamicBystanderResponse: model returned no response');
    }

    return output;
  },
);
