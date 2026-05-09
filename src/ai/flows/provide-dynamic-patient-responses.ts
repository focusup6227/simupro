/**
 * @fileOverview A Genkit flow that provides dynamic patient responses for the EMS simulation.
 *
 * This flow takes the current state of the simulation and the user's latest action
 * as input, and generates a realistic patient response, updated vital signs, and
 * changes in the patient's condition.
 *
 * - provideDynamicPatientResponses - The main flow function.
 * - DynamicPatientResponseInput - The Zod schema for the flow's input.
 * - DynamicPatientResponseOutput - The Zod schema for the flow's output.
 */
import { ai } from '@/lib/genkit';
import { z } from 'zod';
import { UserActionSchema } from '@/lib/types';
import { normalizeAiFlowStressors } from '@/lib/physiology/ai-output-stressors';
import { formatMetabolicSnapshotLines } from '@/lib/physiology/metabolic-engine';

export const VitalSignsSchema = z.object({
  hr: z.string().describe('Heart Rate (e.g., "88 bpm")'),
  bp: z.string().describe('Blood Pressure (e.g., "120/80 mmHg")'),
  rr: z.string().describe('Respiratory Rate (e.g., "16/min")'),
  spo2: z.string().describe('Oxygen Saturation (e.g., "98%")'),
  gcs: z.string().describe('Glasgow Coma Scale (e.g., "15")'),
  etco2: z
    .string()
    .optional()
    .describe(
      'End-tidal CO₂ as a string with unit, e.g. "32 mmHg". Physiology rules: ~35 mmHg normal; <30 hyperventilation, shock, or low cardiac output; >45 hypoventilation / CO₂ retention (opioid OD, severe COPD, post-ictal, exhaustion); <20 during active CPR (pulseless); a sudden ≥35 spike during CPR signals **ROSC** and you must omit `arrestRhythm` and revert `hr` to a numeric bpm. Always include this field whenever a perfusing or arrested patient could plausibly have a sensor (i.e. on essentially every turn after the first); omit only on the very first turn before any airway / cannula has been described.',
    ),
  obstruction: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      'Capnogram airway-obstruction factor in [0, 1]. 0 = clean square plateau (normal airways). 0.4–0.7 = developing shark-fin morphology (mild–moderate bronchospasm — early asthma/COPD exacerbation, anaphylaxis). 0.7–1.0 = severe obstructive pattern (status asthmaticus, severe COPD, late anaphylaxis). Increase as bronchospasm worsens; decrease toward 0 with effective bronchodilator therapy (albuterol, epinephrine for anaphylaxis), CPAP, or definitive airway. Omit if the scenario has no airway obstruction component.',
    ),
});

export const DynamicPatientResponseInputSchema = z.object({
  scenario: z.string().describe('The initial setup and details of the simulation scenario.'),
  assessment: z.string().describe("The user's latest assessment action or question."),
  treatment: z.string().describe("The user's latest treatment action."),
  patientCondition: z.string().optional().describe("The patient's last known condition (e.g., 'stable', 'critical', 'improving')."),
  /** Full vital signs BEFORE this turn — use for consistent state (pulse vs pulseless). */
  currentVitals: VitalSignsSchema.optional().describe(
    'The patient vital signs immediately before this action (previous step). Omit only on the first turn; use scenario initial vitals when unknown.'
  ),
  userRole: z.string().describe("The certification level of the user (e.g., 'emt', 'aemt', 'paramedic')."),
  mandatoryActions: z.array(z.string()).describe('A list of mandatory actions for the current scenario and user role.'),
  userActions: z.array(UserActionSchema).describe('A log of all actions taken by the user so far.'),
  isPremium: z.boolean().optional().describe('Whether to render the patient with the deeper Premium realism model.'),
  recentMedications: z
    .array(z.string())
    .optional()
    .describe(
      'Short labels for medications simulated by the PK engine in roughly the prior 120s of simulated time.',
    ),
  decompensationPhase: z
    .string()
    .optional()
    .describe(
      'Current deterministic autonomic decompensation phase from the simulation engine (baseline, compensated, decompensating, crashing, arrested).',
    ),
  engineSummary: z
    .string()
    .optional()
    .describe(
      'Short human-readable summary of autonomic state (bleed rate, volume, tone) for narrative grounding.',
    ),
  metabolicSnapshot: z
    .object({
      lactateMmol: z.number(),
      bicarbMeqL: z.number(),
      ph: z.number(),
    })
    .optional()
    .describe(
      'When present, deterministic metabolic integrator owns lactate / bicarb / pH teaching values — the model must not contradict them in free text.',
    ),
});

export type DynamicPatientResponseInput = z.infer<typeof DynamicPatientResponseInputSchema>;

export const DynamicPatientResponseOutputSchema = z.object({
  patientResponse: z.string().describe("The patient's verbal and physical response to the user's action. This should be from the patient's perspective, e.g., 'I can't breathe!' or 'The patient groans.'"),
  vitals: VitalSignsSchema.describe('The patient\'s new vital signs as a direct result of the user\'s action and the passage of time.'),
  conditionChange: z.string().optional().describe("A brief, one-sentence summary of the change in the patient's overall condition (e.g., 'Patient is deteriorating rapidly,' 'Patient shows slight improvement.')."),
  medicalDirection: z.string().optional().describe("If the user was asking for medical direction, this is the response from the doctor."),
  hospitalResponse: z.string().optional().describe("If the user was giving a radio report, this is the response from the receiving hospital."),
  patientIsDeceased: z.boolean().optional().describe("Set to true if the patient has died as a result of their condition or the user's actions (or inaction)."),
  arrestRhythm: z
    .enum(['vfib', 'pulseless_vt', 'pea', 'asystole'])
    .optional()
    .describe("If the patient is currently pulseless, the specific arrest rhythm. Choose the rhythm most consistent with the underlying cause (see Cardiac Arrest Modeling rules in the prompt). Omit for any non-arrest state."),
  arrestRhythmRationale: z
    .string()
    .optional()
    .describe('One concise clinical sentence explaining why this arrest rhythm fits the cause. Used for teaching feedback.'),
  stressors: z
    .array(
      z.object({
        kind: z
          .string()
          .describe(
            'Pathophysiology stressor: engine kind (e.g. fluid_bolus, tension_pneumo_start) or semantic key (hemorrhage_worsening, sepsis_worsening, rebleed, bronchospasm, tension_pneumo, metabolic_worsening).',
          ),
        payload: z
          .record(z.unknown())
          .optional()
          .describe('Optional parameters; normalized server-side to engine-safe rows.'),
      }),
    )
    .optional()
    .describe(
      'Optional structured stressors for the deterministic autonomic log. Omit if nothing new beyond user treatments.',
    ),
  metabolicLabs: z
    .object({
      lactate: z.string(),
      bicarb: z.string(),
      ph: z.string(),
    })
    .optional()
    .describe('Formatted metabolic labs when the deterministic engine provides them.'),
});

export type DynamicPatientResponseOutput = z.infer<typeof DynamicPatientResponseOutputSchema>;


export async function provideDynamicPatientResponses(
  input: DynamicPatientResponseInput
): Promise<DynamicPatientResponseOutput> {
  return provideDynamicPatientResponsesFlow(input);
}

const prompt = ai.definePrompt({
    name: 'provideDynamicPatientResponsesPrompt',
    input: { schema: DynamicPatientResponseInputSchema.extend({
      metabolicLine: z.string().optional(),
    }) },
    output: { schema: DynamicPatientResponseOutputSchema },
    prompt: `You are an advanced AI patient simulator for training EMS professionals.
Your role is to act as the patient and the environment, responding realistically to the user's actions.

**Scenario:**
{{{scenario}}}

**User's Role:** {{{userRole}}}

**Mandatory Actions for this Role:**
{{#each mandatoryActions}}
- {{{this}}}
{{/each}}

**Simulation History (User Actions So Far):**
{{#each userActions}}
- Time: {{{time}}}s, Assessment: {{{assessment}}}, Treatments: {{#each treatments}}{{{this}}}{{/each}}
{{/each}}

**User's Latest Action:**
- Assessment: {{{assessment}}}
- Treatment: {{{treatment}}}

{{#if recentMedications.length}}
**Recent medications (already modeled by deterministic PK simulation, last ~120s sim time):**
{{#each recentMedications}}
- {{{this}}}
{{/each}}

Drug-driven changes to HR/BP/RR/SpO₂ are represented elsewhere. Unless you are documenting hypoxia from airway interventions, fluid shifts / shock progression / ROSC / arrest physiology, do NOT change numerical HR, BP, RR, or SpO₂ fields in vitals solely because items above were given. You may still adjust those vitals when they reflect illness trajectory, airway/oxygenation, bleeding, pacing/shock/cardioversion endpoints, CPR quality, acidosis reversal, or glucose correction in other clinically appropriate ways—but not repeating drug hemodynamic dosing effects.

You should still freely update the patient narrative in patientResponse (comfort, cognition, airway exam, cyanosis/improvement narration) referencing these medications conceptually, without rewriting vitals numeric fields for pharmacology already listed above.
{{/if}}

{{#if decompensationPhase}}
**Deterministic autonomic phase (already modeled):** {{{decompensationPhase}}}
{{/if}}
{{#if engineSummary}}
**Autonomic / volume engine snapshot:** {{{engineSummary}}}
{{/if}}

{{#if metabolicLine}}
**Deterministic metabolic labs (already modeled):** {{{metabolicLine}}}
Do **not** mention different numeric lactate, bicarbonate, or arterial pH values in patientResponse or conditionChange than these approximations imply. You may reference qualitative dyspnea, nausea, or malaise consistent with acidemia.
{{/if}}

When an autonomic phase / engine snapshot is present, fluids, hemorrhage control, supplemental oxygen, CPAP, definitive airway, and needle decompression (for tension pneumothorax) are also represented in deterministic simulation. Do **not** re-apply large HR/BP/RR/SpO₂ numeric shifts in vitals purely to reflect those interventions or the autonomic snapshot—focus vitals on illness trajectory, perfusion extremes, ROSC/arrest rules, and exam-consistent changes. You may still narrate comfort, work of breathing, skin, lung sounds, and mental status.

For evolving **extra** pathophysiology the engine does not know (rebleed, sepsis worsening, unexpected bronchospasm, metabolic worsening), populate optional structured **stressors** in the output using implemented keys only (e.g. hemorrhage_worsening, sepsis_worsening, rebleed, bronchospasm, tension_pneumo, metabolic_worsening, or direct engine kinds like tension_pneumo_start). Each stressor becomes a deterministic event; keep the list minimal and do not duplicate treatments already in the user's action text.

**Patient's Previous Condition:** {{{patientCondition}}}

**Current Vital Signs (before this action):**
{{#if currentVitals}}
- HR: {{{currentVitals.hr}}}
- BP: {{{currentVitals.bp}}}
- RR: {{{currentVitals.rr}}}
- SpO2: {{{currentVitals.spo2}}}
- GCS: {{{currentVitals.gcs}}}
{{#if currentVitals.etco2}}- EtCO₂: {{{currentVitals.etco2}}}
{{/if}}{{#if currentVitals.obstruction}}- Capnogram obstruction (0–1): {{{currentVitals.obstruction}}}
{{/if}}{{else}}
(First turn — infer initial vitals from the scenario only.)
{{/if}}

**Your Task:**
Based on the scenario, the user's role, the history of actions, and the latest action, generate the next state of the simulation.

**Clinical reasoning (must follow):**
- **Causal discipline:** Do not switch a patient from **perfusing** to **pulseless** solely because the user clicked an intervention. State changes must follow from assessment findings, time progression, pathology, or treatments with **known physiologic effects**—not from UI choices alone.
- **Inappropriate CPR:** If **Current Vital Signs** and the scenario support a **palpable circulation / perfusing blood pressure** (non-trivial BP, organized rate) and the patient is **not** already in cardiac arrest, initiating CPR is an **error**. Describe **pain, confusion, resistance, rib injury risk, or bystander alarm**—do **not** set \`arrestRhythm\` and do **not** declare VF/asystole. Keep vitals consistent with a **live, perfusing** patient unless a **separate** credible event occurs (e.g., actual loss of pulse after a believable delay).
- **Arrest rhythms (\`arrestRhythm\`):** Set **only** when the patient is **actually pulseless** in-universe (scenario started in arrest, or you have established pulselessness through vitals/narrative over time). Wrong treatment on a stable patient must **not** automatically produce VF, asystole, or PEA.
- **Patient demise (\`patientIsDeceased\`):** Use **sparingly**—only after prolonged refractory arrest, unsurvivable injury, or untreated lethal trajectory **over multiple turns**. Do not kill the patient as a shortcut penalty for one mistake.

1.  **Patient Response:** Formulate a direct response from the patient or a description of their physical reaction. Be realistic. If the user asks a question, answer it from the patient's perspective. If they perform a treatment, describe how the patient reacts.
2.  **Update Vitals:** Determine the new set of vital signs. The vitals should change logically based on the scenario's progression and the effectiveness (or ineffectiveness) of the user's actions. For example, if a patient is bleeding and no treatment is given, their blood pressure should drop and heart rate should increase. If a user administers oxygen for hypoxia, the SpO2 should improve. When **Current Vital Signs** are provided, the new vitals must be **physiologically continuous** with them unless you narrate a clear new event.
3.  **Condition Change:** Provide a concise, one-sentence summary of the patient's new overall condition.
4.  **Special Responses:**
    - If the assessment includes a request for 'medical direction', provide a realistic response from a doctor in the 'medicalDirection' field.
    - If the assessment includes 'Gave the following radio report:', provide a brief acknowledgment from the receiving hospital in the 'hospitalResponse' field (e.g., 'Copy that, we'll be ready.').
    - If the assessment includes an 'ECG' request (e.g., '4-lead ECG', '12-lead ECG', or 'ECG reading'), you MUST include the ECG rhythm:
      - Put the clinician-style ECG interpretation (rhythm + rate + brief significance) in 'medicalDirection'.
    - Also set 'conditionChange' to a concise one-sentence summary that begins with "ECG rhythm: ..." so it shows in the UI even if medicalDirection isn't displayed.
5.  **Patient Demise:** If the patient's condition deteriorates to a point of being non-survivable due to the underlying pathology or user error **over a credible timeline**, set 'patientIsDeceased' to true.

6.  **Cardiac Arrest Modeling — pick the right rhythm** (only when the patient is pulseless in the simulation). Whenever the patient is pulseless, you MUST set \`arrestRhythm\` to one of **vfib**, **pulseless_vt**, **pea**, or **asystole** chosen from the underlying cause:
    - Acute MI / ischemia / primary electrical event (long QT, WPW, R-on-T) → start with **vfib** or **pulseless_vt**; without timely defibrillation it degrades to asystole.
    - Hypoxia / respiratory failure / drowning / asthma / smoke inhalation → bradyasystolic **pea** or **asystole**.
    - PE / cardiac tamponade / tension pneumothorax / hypovolemia / hyperkalemia / acidosis → **pea** (the H's & T's).
    - Severe hypothermia → severe bradycardia → **vfib** → **asystole**.
    - Toxicologic (TCA / cocaine / digoxin) → wide-complex **pulseless_vt** is most common.
    - Untreated arrest > 8–10 min → **asystole**.
    Also set 'arrestRhythmRationale' to one short sentence explaining the choice (e.g. "Acute STEMI – pVT/VF most likely from ischemic re-entry").

    When 'arrestRhythm' is set, format 'vitals.hr' EXACTLY as one of:
    - "V-fib"
    - "Pulseless VT"
    - "PEA @ <rate> bpm" (rate 20–60 typical)
    - "Asystole"
    so older clients without the structured field still classify correctly. Set 'vitals.bp' to "0/0 (no pulse)" while pulseless. After successful defibrillation / ROSC, OMIT 'arrestRhythm' and revert 'vitals.hr' to a numeric BPM string.

7.  **Capnography ('vitals.etco2', 'vitals.obstruction') — set on EVERY turn the patient could plausibly have a CO₂ sensor:**
    - **Numeric value ('vitals.etco2'):** always include the unit "mmHg" (e.g. "32 mmHg").
        * Normal perfusing adult: 35–45 mmHg.
        * **Hyperventilation / early shock / low cardiac output / DKA Kussmaul:** drop into 20–30 mmHg.
        * **Hypoventilation / opioid overdose / severe COPD / post-ictal:** rise into 50–70 mmHg.
        * **Active CPR (pulseless, any arrest rhythm):** must be **<20 mmHg** — typical 10–18 mmHg with quality compressions, drifting toward 6–10 mmHg with poor CPR or prolonged downtime.
        * **Sudden jump to ≥35 mmHg during CPR = ROSC.** When you raise EtCO₂ across that threshold from an arrested state, you MUST also omit 'arrestRhythm' and revert 'vitals.hr' to a numeric bpm and 'vitals.bp' to a perfusing pressure.
        * Trend changes must be **physiologically continuous** with the previous EtCO₂ unless you narrate a clear new event (intubation, ROSC, re-arrest, sudden bronchospasm).
    - **Obstruction factor ('vitals.obstruction', 0–1):** non-zero only when the patient has airway obstruction physiology — asthma exacerbation, COPD flare, anaphylaxis with bronchospasm, late upper-airway obstruction. 0.4–0.7 = mild/moderate shark-fin; 0.7–1.0 = severe shark-fin. Decrease toward 0 in response to effective bronchodilators (albuterol nebulizer, IM epinephrine for anaphylaxis), CPAP, or a definitive airway. Omit entirely (do not set 0) for scenarios with no obstructive component.
    - **Assisted ventilation is already modeled deterministically.** When the user selects CPAP or bag-valve-mask oxygen delivery, the simulation engine independently softens the capnogram shark-fin (CPAP and BVM both reduce 'obstruction' on the displayed waveform) and pulls EtCO₂ partway toward 38 mmHg (BVM = strong pull, CPAP = mild pull). Set 'vitals.etco2' and 'vitals.obstruction' as the **patient's underlying physiology** — do **not** double-correct toward normal solely because the user picked BVM / CPAP. You may still narrate exam improvement (less work of breathing, reduced wheezing, easier bagging) and use realistic perfusion-driven numbers (e.g. 12 mmHg during CPR even while being bagged).

{{#if isPremium}}
**PREMIUM REALISM MODE — APPLY THE FOLLOWING ADDITIONAL RULES:**
This learner is on the Premium tier. Render the patient with maximum clinical fidelity:
- **Deeper pathophysiology:** Reflect the underlying mechanism in vital sign trajectories. Compensated shock should show narrowing pulse pressure before actual hypotension. Hypoxia should track SpO2 → mental status → respiratory effort in a physiologically correct order. Cardiac ischemia should evolve realistically (rate, rhythm, ectopy, pain character).
- **Dynamic complications:** Where realistic, introduce evolving complications when the user delays or skips a mandatory action — e.g., aspiration, dysrhythmias, secondary injury, decompensation, anxiety/agitation, family bystander interference, scene safety changes.
- **Realistic verbal responses:** The patient's language should match their LOC, pain, dyspnea, age, and emotional state. A patient in respiratory distress speaks in 2-3 word sentences. An altered patient gives confused or fragmentary answers. A pediatric patient speaks differently than an adult.
- **Treatment realism:** Effects of interventions should be partial, delayed, or imperfect when clinically appropriate (e.g., nitro doesn't fully relieve a true cardiac chest pain in 30 seconds; a fluid bolus only modestly raises BP in distributive shock; oxygen alone doesn't fix a tension pneumo).
- **Subtle physical findings:** Include realistic exam findings when the user assesses for them — accessory muscle use, JVD, skin signs, lung sounds, pupil response, capillary refill.
- **Time pressure:** Patient should deteriorate at a clinically realistic rate when critical interventions are missed; conversely, clear improvement when they are performed correctly and in the right order.
{{/if}}

Generate a JSON object that strictly follows the output schema.
`,
});

const provideDynamicPatientResponsesFlow = ai.defineFlow(
  {
    name: 'provideDynamicPatientResponsesFlow',
    inputSchema: DynamicPatientResponseInputSchema,
    outputSchema: DynamicPatientResponseOutputSchema,
  },
  async (input) => {
    const metabolicLine =
      input.metabolicSnapshot != null
        ? `Lactate ≈ ${input.metabolicSnapshot.lactateMmol.toFixed(1)} mmol/L; bicarb ≈ ${input.metabolicSnapshot.bicarbMeqL.toFixed(0)} mEq/L; pH ≈ ${input.metabolicSnapshot.ph.toFixed(2)}.`
        : '';

    const { output } = await prompt({
      ...input,
      recentMedications: input.recentMedications ?? [],
      decompensationPhase: input.decompensationPhase ?? '',
      engineSummary: input.engineSummary ?? '',
      metabolicLine,
    });

    if (!output?.patientResponse || !output.vitals) {
      throw new Error('provideDynamicPatientResponses: model returned incomplete output');
    }

    const normalizedStressors = normalizeAiFlowStressors(output.stressors);
    const stressorsForClient = normalizedStressors.map((s) => ({
      kind: s.kind,
      payload: s.payload,
    }));

    let metabolicLabs = output.metabolicLabs;
    if (input.metabolicSnapshot != null) {
      const fmt = formatMetabolicSnapshotLines(input.metabolicSnapshot);
      metabolicLabs = {
        lactate: fmt.lactateText,
        bicarb: fmt.bicarbText,
        ph: fmt.phText,
      };
    }

    return {
      ...output,
      patientResponse: output.patientResponse,
      vitals: output.vitals,
      stressors: stressorsForClient,
      metabolicLabs,
    } as DynamicPatientResponseOutput;
  }
);
