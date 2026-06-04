/**
 * QA: AI patient-logic EDUCATOR evaluation — does the sim discriminate good care from bad?
 *
 * For each scenario it runs two trajectories through the production path
 * (`provideDynamicPatientResponses` + `reconcilePatientResponse`): a COMPETENT path
 * (correct, timely, in-scope management) and an INCOMPETENT path (wrong / contraindicated
 * / omitted). A teaching sim is only useful if competent care reliably ends healthier than
 * incompetent care on the *same* patient — otherwise it teaches false confidence. A coarse
 * "wellness index" (distance of vitals from normal, with big penalties for arrest/death)
 * scores each path's end state and the harness reports the divergence.
 *
 * Time matters clinically (IM glucagon is slow, IV dextrose is fast), so each turn carries
 * an elapsed-minutes hint that is threaded into the action log — exactly the signal the
 * running app's clock provides.
 *
 * This is a manual / on-demand harness, not a unit test: it calls a real LLM, so output is
 * non-deterministic and a clean run is evidence, not a hard guarantee. Exits non-zero if any
 * scenario INVERTS (incompetent care ends healthier — a real teaching failure).
 *
 * Run:  npm run qa:patient-education
 * Needs: GEMINI_API_KEY (or GOOGLE_API_KEY) in .env.local or the environment.
 */
import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { seedScenarios } from "@/lib/scenarios-data";
import { provideDynamicPatientResponses } from "@/ai/flows/provide-dynamic-patient-responses";
import { reconcilePatientResponse } from "@/lib/patient-response-guards";
import { buildPriorPatientState } from "@/lib/patient-state";
import { parseVitalsToNumbers, type VitalsNumbers } from "@/lib/vitals-parse";
import type { DynamicPatientResponseOutput } from "@/ai/flows/provide-dynamic-patient-responses";
import type { UserAction } from "@/lib/types";

type Scenario = (typeof seedScenarios)[number];

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

type Role = "emt" | "aemt" | "paramedic";
interface Turn { a: string; t: string; mins?: number }
interface Paired { id: string; role: Role; teaching: string; good: Turn[]; bad: Turn[] }

const CASES: Paired[] = [
  { id: "anaphylactic-reaction", role: "aemt",
    teaching: "Early IM epi is the lifesaver; antihistamine-only is the classic fatal mistake.",
    good: [
      { a: "Stridor, diffuse hives, wheezing, hypotensive — recognizing anaphylaxis.", t: "IM epinephrine 0.3mg 1:1000 to lateral thigh immediately, high-flow O2." },
      { a: "Reassess airway and perfusion.", t: "IV access, 1L isotonic fluid bolus, albuterol neb, repeat epi if no improvement.", mins: 5 },
    ],
    bad: [
      { a: "Patient looks unwell with a rash.", t: "Diphenhydramine 25mg IV only. No epinephrine. Apply oxygen." },
      { a: "Reassess.", t: "Continue to monitor and reassess; hold epinephrine.", mins: 5 },
    ]},
  { id: "tension-pneumothorax", role: "paramedic",
    teaching: "Needle decompression is the fix; positive-pressure ventilation WITHOUT decompression worsens a tension pneumo.",
    good: [
      { a: "Absent right breath sounds, JVD, tracheal deviation, hypotensive — tension pneumothorax.", t: "Immediate needle decompression 2nd ICS MCL right." },
      { a: "Reassess after decompression.", t: "High-flow O2, IV access, rapid transport, monitor for recurrence.", mins: 4 },
    ],
    bad: [
      { a: "Patient in respiratory distress, hypotensive.", t: "Intubate and bag aggressively with high tidal volumes. No decompression." },
      { a: "Reassess.", t: "Add CPAP and continue aggressive positive-pressure ventilation. Still no decompression.", mins: 4 },
    ]},
  { id: "opioid-overdose", role: "aemt",
    teaching: "Ventilate first, then titrated naloxone. Withholding ventilation leaves the patient hypoxic.",
    good: [
      { a: "Apneic, RR 6, SpO2 80%, pinpoint pupils.", t: "Immediate BVM ventilation with high-flow O2." },
      { a: "Reassess airway and effort.", t: "Naloxone 0.4mg IV titrated to adequate respiratory effort, continue ventilation.", mins: 3 },
    ],
    bad: [
      { a: "Sleepy patient, breathing slowly.", t: "Apply a non-rebreather mask and wait. No assisted ventilation, no naloxone." },
      { a: "Reassess.", t: "Continue to observe on the non-rebreather only.", mins: 3 },
    ]},
  { id: "bys-hypoglycemia-teen", role: "paramedic",
    teaching: "IV dextrose corrects hypoglycemia briskly; anchoring on 'stroke' and skipping glucose misses an easy save.",
    good: [
      { a: "Obtunded teen, GCS 8, fingerstick glucose 35 mg/dL. Establishing IV.", t: "IV access; D10W 25g IV." },
      { a: "Reassess ~2 minutes after IV dextrose.", t: "Recheck fingerstick glucose, reassess mental status.", mins: 3 },
      { a: "Reassess ~4 minutes after dextrose.", t: "Oral complex carbohydrates now patient is alert; recheck glucose.", mins: 5 },
    ],
    bad: [
      { a: "Obtunded teen — I assume a stroke. No glucose checked.", t: "Position supine, oxygen, expedite transport as a stroke alert. No glucose given." },
      { a: "Reassess.", t: "Continue stroke management; still no glucose checked or given.", mins: 3 },
      { a: "Reassess.", t: "Continue stroke management; glucose still never checked.", mins: 5 },
    ]},
  { id: "sepsis-elderly", role: "paramedic",
    teaching: "Septic shock needs fluids + O2; withholding fluids lets perfusion fail.",
    good: [
      { a: "Hypotensive, tachycardic, febrile, AMS — septic shock.", t: "High-flow O2, two large-bore IVs, 30 mL/kg isotonic fluid bolus, rapid transport." },
      { a: "Reassess perfusion and mental status.", t: "Continue fluids, monitor lactate/EtCO2 trend, pressors per protocol if refractory.", mins: 6 },
    ],
    bad: [
      { a: "Looks weak and warm.", t: "Withhold IV fluids (worried about overload). Oxygen only, slow transport." },
      { a: "Reassess.", t: "Continue oxygen only, still no fluids.", mins: 6 },
    ]},
];

// Coarse "wellness index" — higher is healthier. Used only to check good-vs-bad divergence.
function wellness(n: VitalsNumbers, arrest: boolean, deceased: boolean): number {
  if (deceased) return -200;
  let s = 100;
  if (arrest) s -= 100;
  if (n.spo2 !== null) s -= Math.max(0, 95 - n.spo2) * 1.5;
  if (n.hr !== null) s -= Math.abs(n.hr - 80) * 0.25;
  if (n.sys !== null) s -= Math.max(0, 100 - n.sys) * 0.5 + Math.max(0, n.sys - 180) * 0.2;
  if (n.rr !== null) s -= Math.abs(n.rr - 16) * 0.8;
  if (n.gcs !== null) s -= (15 - n.gcs) * 4;
  return Math.round(s);
}

async function runPath(scenario: Scenario, role: Role, turns: Turn[], tag: string): Promise<number> {
  const mandatory = scenario.mandatoryActions[role] ?? [];
  const userActions: UserAction[] = [];
  let lastVitals = scenario.initialVitals;
  let lastCond: string | undefined;
  let lastArrest: DynamicPatientResponseOutput["arrestRhythm"];
  let lastDeceased = false;
  let endIdx = wellness(parseVitalsToNumbers(lastVitals), false, false);
  for (let i = 0; i < turns.length; i++) {
    const { a, t, mins } = turns[i];
    const raw = await provideDynamicPatientResponses({
      scenario: scenario.details, assessment: a, treatment: t, patientCondition: lastCond,
      currentVitals: lastVitals, userRole: role, mandatoryActions: mandatory, userActions, isPremium: true,
    });
    const prior = buildPriorPatientState({
      lastAssistantMessage: { vitals: lastVitals, arrestRhythm: lastArrest, conditionChange: lastCond },
      priorVitals: lastVitals, patientAlreadyDeceased: lastDeceased, scenario,
    });
    const { output } = reconcilePatientResponse(prior, t, raw);
    const v = output.vitals;
    endIdx = wellness(parseVitalsToNumbers(v), Boolean(output.arrestRhythm), Boolean(output.patientIsDeceased));
    console.log(`   [${tag} T${i + 1}] HR=${v.hr} BP=${v.bp} SpO2=${v.spo2} RR=${v.rr} GCS=${v.gcs} idx=${endIdx}`);
    console.log(`      cond: ${(output.conditionChange || "").slice(0, 130).replace(/\s+/g, " ")}`);
    lastVitals = v; lastCond = output.conditionChange; lastArrest = output.arrestRhythm; lastDeceased = Boolean(output.patientIsDeceased);
    userActions.push({ time: (mins ?? i + 1) * 60, assessment: a, treatments: [t], destination: null } as UserAction);
  }
  return endIdx;
}

async function main() {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.error("Set GEMINI_API_KEY (or GOOGLE_API_KEY) to run this harness.");
    process.exit(1);
  }
  console.log("=== Educator evaluation: competent vs incompetent care, same scenario ===\n");
  const verdicts: string[] = [];
  let inverted = 0;
  for (const c of CASES) {
    const scenario = seedScenarios.find((s) => s.id === c.id);
    if (!scenario) { console.log(`SKIP ${c.id}`); continue; }
    const startIdx = wellness(parseVitalsToNumbers(scenario.initialVitals), false, false);
    console.log(`\n### ${c.id} (${c.role})  [start idx=${startIdx}]`);
    console.log(`    teaching point: ${c.teaching}`);
    console.log(`  -- COMPETENT path --`);
    const goodEnd = await runPath(scenario, c.role, c.good, "GOOD");
    console.log(`  -- INCOMPETENT path --`);
    const badEnd = await runPath(scenario, c.role, c.bad, "BAD ");
    const d = goodEnd - badEnd;
    let verdict: string;
    if (d <= -5) { verdict = `❌ INVERTED — bad care ended HEALTHIER (good ${goodEnd} vs bad ${badEnd}, Δ=${d})`; inverted++; }
    else if (d >= 15) verdict = `✅ DISCRIMINATES (good ${goodEnd} vs bad ${badEnd}, Δ=${d})`;
    else verdict = `⚠️ WEAK divergence (good ${goodEnd} vs bad ${badEnd}, Δ=${d})`;
    console.log(`  => ${verdict}`);
    verdicts.push(`  ${c.id}: ${verdict}`);
  }
  console.log(`\n\n======== EDUCATOR VERDICTS ========\n${verdicts.join("\n")}`);
  if (inverted > 0) { console.log(`\n${inverted} scenario(s) INVERTED — bad care should never end healthier.`); process.exit(1); }
}
main().catch((e) => { console.error(e); process.exit(1); });
