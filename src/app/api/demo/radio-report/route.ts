import { NextResponse } from "next/server";
import {
  generateRadioReport,
  GenerateRadioReportInputSchema,
} from "@/ai/flows/generate-radio-report";
import { enforceDemoPatientLimit, RateLimitError } from "@/lib/ratelimit";
import { captureActionError } from "@/lib/observability";

export const runtime = "nodejs";

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  try {
    await enforceDemoPatientLimit(clientIp(request));

    const json: unknown = await request.json();
    const parsed = GenerateRadioReportInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const result = await generateRadioReport(parsed.data);
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof RateLimitError) {
      return NextResponse.json(
        { error: e.message },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(e.retryAfterMs / 1000)) },
        },
      );
    }
    captureActionError("demo.radio-report", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error." },
      { status: 500 },
    );
  }
}
