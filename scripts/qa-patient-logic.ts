/**
 * QA: AI patient-logic regression sweep.
 *
 * Drives multi-turn, clinically realistic sequences across a curated, failure-prone
 * spread of catalog scenarios through the SAME production path as the app — the Genkit
 * flow (`provideDynamicPatientResponses`) + the deterministic reconciler
 * (`reconcilePatientResponse`) — carrying vitals / condition / arrest / deceased state
 * forward each turn like the real runner. After each turn it runs automated invariant
 * checks (arrest⇔pulse consistency, arrest/pulse text contradictions, valid-ROSC,
 * vitals continuity, numeric sanity, deceased continuity) and prints the trajectory so
 * narrative quality can be eyeballed.
 *
 * This is a manual / on-demand harness, not a unit test: it calls a real LLM, so output
 * is non-deterministic and a clean run is evidence, not a hard guarantee. The
 * deterministic invariant guarantees live in src/lib/__tests__/patient-response-guards.test.ts.
 *
 * Run:  npm run qa:patient-logic
 * Needs: GEMINI_API_KEY (or GOOGLE_API_KEY) in .env.local or the environment.
 * Exits non-zero if any automated issue is flagged.
 */
import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { seedScenarios } from "@/lib/scenarios-data";
import { provideDynamicPatientResponses } from "@/ai/flows/provide-dynamic-patient-responses";
import { reconcilePatientResponse } from "@/lib/patient-response-guards";
import { buildPriorPatientState } from "@/lib/patient-state";
import { parseVitalsToNumbers, type VitalsNumbers } from "@/lib/vitals-parse";
import type { UserAction } from "@/lib/types";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

type Role = "emt" | "aemt" | "paramedic";
interface Turn { a: string; t: string }
interface Case { id: string; role: Role; note: string; turns: Turn[] }

// Curated spread chosen to stress the AI patient logic + reconciler invariants:
// arrest/ROSC, drug reversal, correct-vs-wrong treatment response, hemorrhage
// deterioration, pediatric continuity, peri-arrest (unobtainable BP), and scope.
const CASES: Case[] = [
  { id: "cardiac-arrest-vfib", role: "paramedic", note: "VF arrest → CPR → defib → epi → ROSC",
    turns: [
      { a: "Confirm pulselessness, attach pads, analyze rhythm.", t: "Start high-quality CPR, 30:2." },
      { a: "Rhythm check shows VF.", t: "Defibrillate 200J biphasic, resume CPR immediately." },
      { a: "Reassess after 2 min.", t: "Epinephrine 1mg IV, continue CPR, secure airway." },
      { a: "Pulse + rhythm check.", t: "Defibrillate again 200J; strong carotid pulse now palpable, EtCO2 surged." },
    ]},
  { id: "opioid-overdose", role: "aemt", note: "naloxone reversal (correct tx)",
    turns: [
      { a: "Apneic, pinpoint pupils, RR 6, SpO2 80%.", t: "BVM ventilation with high-flow O2." },
      { a: "Still hypoventilating.", t: "Naloxone 0.4mg IV titrated to respiratory effort." },
      { a: "Reassess airway and mental status.", t: "Continue monitoring, prepare for repeat naloxone." },
    ]},
  { id: "opioid-overdose", role: "paramedic", note: "ADVERSARIAL: wrong tx — defibrillate a perfusing bradycardic patient",
    turns: [
      { a: "Bradycardic (HR 50) but has a pulse, hypoventilating.", t: "Defibrillate 200J." },
    ]},
  { id: "anaphylactic-reaction", role: "aemt", note: "epinephrine IM (correct tx → improvement)",
    turns: [
      { a: "Diffuse urticaria, wheezing, hypotensive.", t: "IM epinephrine 0.3mg 1:1000, high-flow O2." },
      { a: "Reassess airway and perfusion.", t: "IV access, 500mL fluid bolus, albuterol nebulizer." },
    ]},
  { id: "tension-pneumothorax", role: "paramedic", note: "needle decompression",
    turns: [
      { a: "Absent breath sounds R, JVD, tracheal deviation, hypotensive.", t: "Needle decompression 2nd ICS MCL right." },
      { a: "Reassess after decompression.", t: "High-flow O2, IV access, rapid transport." },
    ]},
  { id: "gi-bleed", role: "paramedic", note: "hemorrhagic shock → fluids, then NO treatment (deterioration)",
    turns: [
      { a: "Hematemesis, pale, HR 130, BP 85/45, lethargic.", t: "Two large-bore IVs, 500mL fluid bolus, O2." },
      { a: "Reassess perfusion.", t: "No further intervention; reassess only." },
      { a: "Reassess again after time passes with ongoing bleeding.", t: "Reassess only, no intervention." },
    ]},
  { id: "pediatric-dka", role: "paramedic", note: "PEDIATRIC (child): continuity + age-appropriate vitals",
    turns: [
      { a: "Kussmaul breathing, dehydrated, AMS, RR 35.", t: "High-flow O2, IV access, cautious 10mL/kg fluid bolus." },
      { a: "Reassess mental status and breathing.", t: "Continue fluids, monitor glucose and rhythm." },
    ]},
  { id: "bys-hypoglycemia-teen", role: "emt", note: "ADOLESCENT hypoglycemia (GCS 8) → glucose",
    turns: [
      { a: "Obtunded teen, GCS 8, fingerstick 35 mg/dL.", t: "IM glucagon / oral glucose if airway protected; per BLS." },
      { a: "Reassess mental status.", t: "Recheck glucose, monitor airway." },
    ]},
  { id: "foreign-body-airway-obstruction", role: "paramedic", note: "peds FBAO, RR 0, peri-arrest (unobtainable BP)",
    turns: [
      { a: "Unresponsive child, no air movement, complete obstruction.", t: "CPR/back blows, attempt to visualize and remove FBAO, BVM." },
      { a: "Reassess airway after removal attempt.", t: "Ventilate, reassess pulse and rhythm." },
    ]},
  { id: "acute-stemi", role: "emt", note: "EMT SCOPE: should not push paramedic-only drugs",
    turns: [
      { a: "Crushing substernal chest pain, diaphoretic, SpO2 93%.", t: "Aspirin 324mg PO, O2 titrated, assist with patient's nitro, request ALS." },
    ]},
];

const issues: string[] = [];
function flag(scn: string, turn: number, msg: string) { issues.push(`  [ISSUE] ${scn} turn ${turn}: ${msg}`); }

interface PrevState { n: VitalsNumbers; arrest: boolean; deceased: boolean }

function checkTurn(scn: string, turn: number, prev: PrevState | null, out: Awaited<ReturnType<typeof provideDynamicPatientResponses>>): PrevState {
  const v = out.vitals;
  const text = `${out.conditionChange ?? ""} ${out.patientResponse ?? ""}`.toLowerCase();
  const n = parseVitalsToNumbers(v);
  const bpIsZero = /0\s*\/\s*0/.test(v.bp);

  if (out.arrestRhythm && !bpIsZero) flag(scn, turn, `arrestRhythm=${out.arrestRhythm} but BP not 0/0 (${v.bp})`);
  if (!out.arrestRhythm && !out.patientIsDeceased && bpIsZero) flag(scn, turn, `BP 0/0 but no arrestRhythm`);

  const saysArrest = /(cardiac arrest|pulseless|no pulse|asystole|v-?fib|\bpea\b)/.test(text);
  const saysPulse = /(has a pulse|strong pulse|palpable pulse|stop compressions|stop cpr|inappropriate cpr|perfusing)/.test(text);
  if (saysArrest && saysPulse) flag(scn, turn, `text asserts BOTH arrest and pulse: "${(out.conditionChange || "").slice(0, 120)}"`);

  if (n.hr !== null && (n.hr < 10 || n.hr > 260)) flag(scn, turn, `implausible HR ${n.hr}`);
  if (n.sys !== null && n.dia !== null && n.sys <= n.dia) flag(scn, turn, `systolic<=diastolic ${v.bp}`);
  if (n.spo2 !== null && (n.spo2 < 0 || n.spo2 > 100)) flag(scn, turn, `SpO2 out of range ${n.spo2}`);
  if (n.gcs !== null && (n.gcs < 3 || n.gcs > 15)) flag(scn, turn, `GCS out of range ${n.gcs}`);

  if (prev?.arrest && !out.arrestRhythm && !out.patientIsDeceased && !bpIsZero) {
    if (n.etco2 === null || n.etco2 < 35) flag(scn, turn, `pulse regained from arrest but EtCO2=${v.etco2} (<35, not a valid ROSC)`);
  }
  if (prev?.deceased && !out.patientIsDeceased) flag(scn, turn, `patient was deceased but output not deceased`);

  const narrated = /(deteriorat|worsen|improv|arrest|rosc|sever|crash|shock|seiz|bleed|hemorrhage|decompensat|collaps|tension|anaphyla|overdose|reversal|naloxone)/.test(text);
  const transition = prev?.arrest || Boolean(out.arrestRhythm);
  if (prev && !narrated && !transition) {
    const big = (a: number | null, b: number | null, lim: number) => a !== null && b !== null && Math.abs(a - b) > lim;
    if (big(prev.n.hr, n.hr, 55)) flag(scn, turn, `HR jump ${prev.n.hr}->${n.hr} w/o narrated cause`);
    if (big(prev.n.sys, n.sys, 55)) flag(scn, turn, `SBP jump ${prev.n.sys}->${n.sys} w/o narrated cause`);
  }

  return { n, arrest: Boolean(out.arrestRhythm), deceased: Boolean(out.patientIsDeceased) };
}

async function runCase(c: Case, idx: number) {
  const scenario = seedScenarios.find((s) => s.id === c.id);
  if (!scenario) { console.log(`SKIP ${c.id} (missing)`); return; }
  const mandatory = scenario.mandatoryActions[c.role] ?? [];
  const userActions: UserAction[] = [];
  let lastVitals = scenario.initialVitals;
  let lastCond: string | undefined;
  let lastArrest: NonNullable<Awaited<ReturnType<typeof provideDynamicPatientResponses>>["arrestRhythm"]> | undefined;
  let lastDeceased = false;
  let prev: PrevState | null = null;

  console.log(`\n### [${idx}] ${c.id} (${c.role}) — ${c.note}`);
  console.log(`    init: ${JSON.stringify(lastVitals).slice(0, 160)}`);

  for (let i = 0; i < c.turns.length; i++) {
    const { a, t } = c.turns[i];
    try {
      const raw = await provideDynamicPatientResponses({
        scenario: scenario.details, assessment: a, treatment: t,
        patientCondition: lastCond, currentVitals: lastVitals,
        userRole: c.role, mandatoryActions: mandatory, userActions, isPremium: true,
      });
      const prior = buildPriorPatientState({
        lastAssistantMessage: { vitals: lastVitals, arrestRhythm: lastArrest, conditionChange: lastCond },
        priorVitals: lastVitals, patientAlreadyDeceased: lastDeceased, scenario,
      });
      const { output, corrections } = reconcilePatientResponse(prior, t, raw);
      const v = output.vitals;
      console.log(`  T${i + 1} tx="${t.slice(0, 52)}"`);
      console.log(`     HR=${v.hr} BP=${v.bp} RR=${v.rr} SpO2=${v.spo2} GCS=${v.gcs} EtCO2=${v.etco2 ?? "—"} arrest=${output.arrestRhythm ?? "-"} dead=${!!output.patientIsDeceased} corr=[${corrections.join(",")}]`);
      console.log(`     cond: ${(output.conditionChange || "").slice(0, 150).replace(/\s+/g, " ")}`);
      if (output.stressors?.length) console.log(`     stressors: ${JSON.stringify(output.stressors)}`);
      prev = checkTurn(c.id, i + 1, prev, output);
      lastVitals = output.vitals; lastCond = output.conditionChange; lastArrest = output.arrestRhythm; lastDeceased = Boolean(output.patientIsDeceased);
      userActions.push({ time: (i + 1) * 60, assessment: a, treatments: [t], destination: null } as UserAction);
    } catch (e) {
      flag(c.id, i + 1, `flow threw: ${(e as Error).message}`);
      console.log(`  T${i + 1} ERROR: ${(e as Error).message}`);
      break;
    }
  }
}

async function main() {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.error("Set GEMINI_API_KEY (or GOOGLE_API_KEY) to run this harness.");
    process.exit(1);
  }
  console.log("=== AI patient-logic QA (real flow + reconciler, multi-turn) ===");
  for (let i = 0; i < CASES.length; i++) await runCase(CASES[i], i + 1);
  console.log(`\n\n======== ISSUE SUMMARY (${issues.length}) ========`);
  console.log(issues.length ? issues.join("\n") : "  (no automated issues flagged)");
  if (issues.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
