import { NextResponse } from "next/server";
import { z } from "zod";
import { provideDynamicPatientResponses } from "@/ai/flows/provide-dynamic-patient-responses";
import { applyDynamicPatientOutputGuards } from "@/lib/patient-response-guards";
import { seedScenarios } from "@/lib/scenarios-data";
import { DEMO_SCENARIO_ID, DEMO_MAX_AI_TURNS } from "@/lib/demo-config";
import type { UserAction } from "@/lib/types";
import { enforceDemoPatientLimit, RateLimitError } from "@/lib/ratelimit";
import { captureActionError } from "@/lib/observability";

export const runtime = "nodejs";

const VitalsBodySchema = z.object({
  hr: z.string(),
  bp: z.string(),
  rr: z.string(),
  spo2: z.string(),
  gcs: z.string(),
});

const BodySchema = z.object({
  assessment: z.string().max(8000),
  treatment: z.string().max(8000),
  userRole: z.enum(["emt", "aemt", "paramedic"]),
  patientCondition: z.string().max(2000).optional(),
  currentVitals: VitalsBodySchema.optional(),
  /** Engine truth flag — once a prior turn declared death, the AI must not "wake the patient up". */
  patientAlreadyDeceased: z.boolean().optional(),
  userActions: z.array(
    z.object({
      time: z.number(),
      assessment: z.string(),
      treatments: z.array(z.string()),
      destination: z.string().nullable(),
      transportMode: z.enum(["Routine", "Emergency"]).optional(),
    })
  ),
});

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  try {
    await enforceDemoPatientLimit(clientIp(request));

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const {
      assessment,
      treatment,
      userRole,
      userActions,
      patientCondition,
      currentVitals,
      patientAlreadyDeceased,
    } = parsed.data;

    if (userActions.length >= DEMO_MAX_AI_TURNS) {
      return NextResponse.json(
        { error: "You've reached the demo turn limit. Sign up free to continue training." },
        { status: 429 }
      );
    }

    const scenario = seedScenarios.find((s) => s.id === DEMO_SCENARIO_ID);
    if (!scenario || scenario.status !== "published") {
      return NextResponse.json({ error: "Demo unavailable." }, { status: 503 });
    }

    const mandatory = scenario.mandatoryActions[userRole] ?? [];

    const raw = patientAlreadyDeceased
      ? {
          patientResponse: '',
          vitals: currentVitals ?? {
            hr: 'Asystole',
            bp: '0/0 (no pulse)',
            rr: '0/min',
            spo2: '—',
            gcs: '3',
            etco2: '0 mmHg',
          },
        }
      : await provideDynamicPatientResponses({
          scenario: scenario.details,
          assessment,
          treatment,
          patientCondition,
          currentVitals,
          userRole,
          mandatoryActions: mandatory,
          userActions: userActions as UserAction[],
          isPremium: false,
        });

    const result = applyDynamicPatientOutputGuards(
      { currentVitals, treatment, patientAlreadyDeceased },
      raw,
    );

    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof RateLimitError) {
      return NextResponse.json(
        { error: e.message },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(e.retryAfterMs / 1000)) },
        }
      );
    }
    captureActionError("demo.patient-response", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error." },
      { status: 500 }
    );
  }
}
