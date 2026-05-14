/**
 * QA: one patient-response turn each for three published catalog scenarios,
 * each with the certification level that sub-agent testing targeted (EMT / AEMT / Paramedic).
 *
 * Uses the same Genkit flow as production (`provideDynamicPatientResponses`), not /demo.
 *
 * Run: npx tsx scripts/qa-dashboard-scenarios-roles.ts
 * Requires: GEMINI_API_KEY in .env.local (or env).
 */
import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { seedScenarios } from "@/lib/scenarios-data";
import { provideDynamicPatientResponses } from "@/ai/flows/provide-dynamic-patient-responses";
import { applyDynamicPatientOutputGuards } from "@/lib/patient-response-guards";
import type { UserAction } from "@/lib/types";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const k = m[1];
    let v = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

type ClinicalRole = "emt" | "aemt" | "paramedic";

const runs: {
  label: string;
  scenarioId: string;
  userRole: ClinicalRole;
  assessment: string;
  treatment: string;
}[] = [
  {
    label: "EMT persona — metabolic / BLS",
    scenarioId: "diabetic-emergency",
    userRole: "emt",
    assessment: "Alert but confused, airway patent, breathing adequate, radial pulses present.",
    treatment: "Fingerstick blood glucose 48 mg/dL; patient able to swallow — oral glucose per protocol.",
  },
  {
    label: "AEMT persona — anaphylaxis",
    scenarioId: "anaphylactic-reaction",
    userRole: "aemt",
    assessment: "Diffuse urticaria, wheezes bilaterally, hypotension with altered perfusion; epinephrine indicated.",
    treatment: "IM epinephrine 1:1000, high-flow oxygen, IV access, 500 mL isotonic fluid bolus started.",
  },
  {
    label: "Paramedic persona — trauma / shock",
    scenarioId: "motor-vehicle-collision",
    userRole: "paramedic",
    assessment: "MVC restrained driver, seatbelt sign, anxious, pressure-like chest pain, tachycardic with weak pulses and hypotension.",
    treatment: "Spinal motion restriction, high-flow O2, two large-bore IVs, fluid bolus, 12-lead obtained, exposed chest — no obvious flail; rapid packaging for trauma center.",
  },
];

async function oneTurn(
  scenarioId: string,
  userRole: ClinicalRole,
  assessment: string,
  treatment: string,
) {
  const scenario = seedScenarios.find((s) => s.id === scenarioId);
  if (!scenario || scenario.status !== "published") {
    throw new Error(`Missing or unpublished scenario: ${scenarioId}`);
  }
  const mandatory = scenario.mandatoryActions[userRole] ?? [];
  const userActions: UserAction[] = [];
  const currentVitals = scenario.initialVitals;

  const raw = await provideDynamicPatientResponses({
    scenario: scenario.details,
    assessment,
    treatment,
    currentVitals,
    userRole,
    mandatoryActions: mandatory,
    userActions,
    isPremium: true,
  });

  return applyDynamicPatientOutputGuards({ currentVitals, treatment }, raw);
}

async function main() {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.error("Set GEMINI_API_KEY (or GOOGLE_API_KEY) to run this script.");
    process.exit(1);
  }

  console.log("=== Dashboard-equivalent scenario QA (Genkit, catalog payloads) ===\n");

  for (const r of runs) {
    console.log(`— ${r.label}`);
    console.log(`  scenario=${r.scenarioId} role=${r.userRole}`);
    const out = await oneTurn(r.scenarioId, r.userRole, r.assessment, r.treatment);
    const v = out.vitals;
    console.log(
      `  vitals: HR=${v.hr} BP=${v.bp} RR=${v.rr} SpO2=${v.spo2} GCS=${v.gcs} EtCO2=${v.etco2 ?? "—"}`,
    );
    console.log(`  patient: ${(out.patientResponse || "").slice(0, 320).replace(/\s+/g, " ")}…`);
    console.log("");
  }

  console.log("=== Cross-role consistency probe (same scenario + same action, three roles) ===\n");
  const sid = "diabetic-emergency";
  const assessment = "Primary survey complete; patient confused but talking.";
  const treatment = "Blood glucose checked: 44 mg/dL.";
  for (const role of ["emt", "aemt", "paramedic"] as const) {
    const out = await oneTurn(sid, role, assessment, treatment);
    console.log(`${role}: GCS=${out.vitals.gcs} HR=${out.vitals.hr}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
