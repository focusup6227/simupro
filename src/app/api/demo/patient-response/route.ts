import { NextResponse } from "next/server";
import { z } from "zod";
import { provideDynamicPatientResponses } from "@/ai/flows/provide-dynamic-patient-responses";
import { seedScenarios } from "@/lib/scenarios-data";
import { DEMO_SCENARIO_ID, DEMO_MAX_AI_TURNS } from "@/lib/demo-config";
import type { UserAction } from "@/lib/types";
import { enforceDemoPatientLimit, RateLimitError } from "@/lib/ratelimit";
import { captureActionError } from "@/lib/observability";

export const runtime = "nodejs";

const BodySchema = z.object({
  assessment: z.string().max(8000),
  treatment: z.string().max(8000),
  userRole: z.enum(["emt", "aemt", "paramedic"]),
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

    const json: unknown = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { assessment, treatment, userRole, userActions } = parsed.data;

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

    const result = await provideDynamicPatientResponses({
      scenario: scenario.details,
      assessment,
      treatment,
      userRole,
      mandatoryActions: mandatory,
      userActions: userActions as UserAction[],
      isPremium: false,
    });

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
